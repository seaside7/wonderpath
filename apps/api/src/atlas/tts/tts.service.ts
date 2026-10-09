import {
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { TextToSpeechClient } from "@google-cloud/text-to-speech/build/src/v1";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

export const TTS_CONFIG = {
  uploadsRoot: process.env.TTS_UPLOADS_DIR || "uploads/tts",
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

@Injectable()
export class TtsService implements OnModuleInit {
  private readonly logger = new Logger(TtsService.name);
  private readonly defaultVoice: string;
  private client: TextToSpeechClient | null = null;
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
        speakingRate: options.speakingRate ?? 0.95,
        pitch: options.pitch ?? 7.0,
        sampleRateHertz: 24000,
      },
    });

    if (!response.audioContent) {
      throw new Error("No audioContent in TTS response");
    }

    const audioBuffer = Buffer.from(response.audioContent as string, "base64");
    return audioBuffer;
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
      speakingRate: 0.95,
      pitch: 7.0,
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
