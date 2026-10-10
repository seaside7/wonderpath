import {
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { TextToSpeechClient } from "@google-cloud/text-to-speech/build/src/v1";
import { TextToSpeechClient as BetaTextToSpeechClient } from "@google-cloud/text-to-speech/build/src/v1beta1";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

export const TTS_CONFIG = {
  uploadsRoot: process.env.TTS_UPLOADS_DIR || "uploads/tts",
} as const;

// Atlas's voice, shared by question explanations and Story Trail narration.
// Changing these means previously cached audio no longer matches.
export const ATLAS_VOICE = {
  speakingRate: 0.85,
  pitch: 5.0,
} as const;

export interface TtsVoice {
  name: string;
  languageCodes: string[];
  ssmlGender: "MALE" | "FEMALE" | "NEUTRAL";
  naturalSampleRateHertz: number;
}

export interface SynthesizeOptions {
  text: string;
  voiceName?: string;
  pitch?: number;
  speakingRate?: number;
}

export interface WordTiming {
  word: string;
  startSec: number;
}

export interface NarrationResult {
  audio: Buffer;
  wordTimings: WordTiming[] | null;
}

@Injectable()
export class TtsService implements OnModuleInit {
  private readonly logger = new Logger(TtsService.name);
  private readonly defaultVoice: string;
  private client: TextToSpeechClient | null = null;
  private betaClient: BetaTextToSpeechClient | null = null;
  private credentialsPath: string | undefined;

  constructor() {
    this.credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    this.defaultVoice =
      process.env.TTS_VOICE_NAME ?? "en-US-Neural2-F";
  }

  async onModuleInit() {
    await mkdir(TTS_CONFIG.uploadsRoot, { recursive: true });

    if (!this.credentialsPath || !require("fs").existsSync(this.credentialsPath)) {
      this.logger.warn(
        "GOOGLE_APPLICATION_CREDENTIALS not set or file not found — TTS will run in mock mode",
      );
      return;
    }

    try {
      this.client = new TextToSpeechClient({
        keyFilename: this.credentialsPath,
      });
      this.betaClient = new BetaTextToSpeechClient({
        keyFilename: this.credentialsPath,
      });
      this.logger.log(
        `TTS initialized — credentials: ${this.credentialsPath} — default voice: ${this.defaultVoice}`,
      );
    } catch (err) {
      this.logger.warn(
        `TTS client init failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async listVoices(): Promise<TtsVoice[]> {
    if (!this.client) throw new Error("TTS client not initialized");
    const [response] = await this.client.listVoices({});
    return (response.voices ?? []).map((v) => ({
      name: v.name ?? "",
      languageCodes: v.languageCodes ?? [],
      ssmlGender: ((v.ssmlGender?.toString().toUpperCase() ?? "NEUTRAL") as TtsVoice["ssmlGender"]),
      naturalSampleRateHertz: v.naturalSampleRateHertz ?? 24000,
    }));
  }

  async synthesizeToBuffer(options: SynthesizeOptions): Promise<Buffer> {
    if (!this.client) {
      return this.mockSynthesize(options);
    }

    const voiceName = options.voiceName ?? this.defaultVoice;
    const [response] = await this.client.synthesizeSpeech({
      input: { text: options.text },
      voice: {
        languageCode: "en-US",
        name: voiceName,
        ssmlGender: "FEMALE" as const,
      },
      audioConfig: {
        audioEncoding: "MP3" as const,
        speakingRate: options.speakingRate ?? ATLAS_VOICE.speakingRate,
        pitch: options.pitch ?? ATLAS_VOICE.pitch,
        sampleRateHertz: 24000,
      },
    });

    if (!response.audioContent) {
      throw new Error("No audioContent in TTS response");
    }

    const audioBuffer = Buffer.from(response.audioContent as string, "base64");
    return audioBuffer;
  }

  /**
   * Uses v1beta1 only for Story Trail because SSML timepoints are not exposed
   * by the existing v1 path. Missing credentials deliberately remain mock-safe.
   */
  async synthesizeWithWordTimings(options: SynthesizeOptions): Promise<NarrationResult | null> {
    if (!this.betaClient) return null;

    const words = options.text.match(/\S+/g) ?? [];
    const ssml = words
      .map((word, index) => `<mark name="w${index}"/>${escapeSsml(word)}`)
      .join(' ');
    const voiceName = options.voiceName ?? this.defaultVoice;
    const [response] = await (this.betaClient.synthesizeSpeech as unknown as (
      request: unknown,
    ) => Promise<[any]> )({
      input: { ssml: `<speak>${ssml}</speak>` },
      voice: { languageCode: 'en-US', name: voiceName, ssmlGender: 'FEMALE' as const },
      audioConfig: {
        audioEncoding: 'MP3' as const,
        speakingRate: options.speakingRate ?? ATLAS_VOICE.speakingRate,
        pitch: options.pitch ?? ATLAS_VOICE.pitch,
        sampleRateHertz: 24000,
      },
      enableTimePointing: [1],
    });

    if (!response.audioContent) throw new Error('No audioContent in TTS response');
    const timepoints = response.timepoints ?? [];
    const wordTimings = timepoints
      .map((point) => {
        const index = Number((point.markName ?? '').replace(/^w/, ''));
        const startSec = Number(point.timeSeconds ?? 0);
        return Number.isInteger(index) && words[index] && Number.isFinite(startSec)
          ? { word: words[index], startSec }
          : null;
      })
      .filter((timing): timing is WordTiming => timing !== null);

    return {
      audio: Buffer.from(response.audioContent as string, 'base64'),
      wordTimings: wordTimings.length > 0 ? wordTimings : null,
    };
  }

  private mockSynthesize(options: SynthesizeOptions): Buffer {
    this.logger.debug(
      `[mock TTS] voice=${options.voiceName ?? this.defaultVoice} text="${options.text.slice(0, 40)}..."`,
    );
    return Buffer.alloc(0);
  }

  async synthesizeAndSave(
    questionId: string,
    text: string,
    options: Partial<SynthesizeOptions> = {},
  ): Promise<string> {
    const buffer = await this.synthesizeToBuffer({
      text,
      speakingRate: ATLAS_VOICE.speakingRate,
      pitch: ATLAS_VOICE.pitch,
      ...options,
    });

    if (buffer.length === 0) {
      return "";
    }

    const filename = `${questionId}.mp3`;
    const storageKey = join(TTS_CONFIG.uploadsRoot, filename);
    await mkdir(TTS_CONFIG.uploadsRoot, { recursive: true });
    await writeFile(storageKey, buffer);
    this.logger.debug(`Saved TTS audio: ${storageKey}`);
    return filename;
  }
}

function escapeSsml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
