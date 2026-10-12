import { NarrationResult, WordTiming } from './tts.service';

// Story Trail narration only, pre-recorded via scripts/narrate-books.ts
// (~15s per page is too slow for on-demand). Questions stay on Google TTS.
// The founder picked this storyteller voice; override with ELEVENLABS_VOICE_ID.
const DEFAULT_VOICE_ID = 'd15jrIAARvF899pDoC6T';
// Multilingual v2 reads Indonesian and English with the same voice.
const DEFAULT_MODEL = 'eleven_multilingual_v2';

interface ElevenLabsTimestampResponse {
  audio_base64: string;
  alignment?: {
    characters: string[];
    character_start_times_seconds: number[];
  } | null;
}

/**
 * Narrates one page and returns per-word start times taken from ElevenLabs'
 * character alignment, so the reader's highlight follows the voice exactly.
 */
export async function narrateWithElevenLabs(
  text: string,
): Promise<NarrationResult> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY is not set');
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL || DEFAULT_MODEL,
      }),
    },
  );
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`ElevenLabs ${response.status}: ${detail}`);
  }
  const data = (await response.json()) as ElevenLabsTimestampResponse;

  return {
    audio: Buffer.from(data.audio_base64, 'base64'),
    wordTimings: data.alignment ? wordTimingsFrom(text, data.alignment) : null,
  };
}

/** Maps character start times onto the same \S+ words the reader renders. */
function wordTimingsFrom(
  text: string,
  alignment: NonNullable<ElevenLabsTimestampResponse['alignment']>,
): WordTiming[] | null {
  const starts = alignment.character_start_times_seconds;
  if (alignment.characters.join('') !== text || starts.length !== text.length) {
    return null;
  }
  const timings: WordTiming[] = [];
  for (const match of text.matchAll(/\S+/g)) {
    timings.push({ word: match[0], startSec: starts[match.index ?? 0] });
  }
  return timings.length > 0 ? timings : null;
}
