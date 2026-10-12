import { NarrationResult, WordTiming } from './tts.service';

// Story Trail narration only, pre-recorded via scripts/narrate-books.ts
// (~15s per page is too slow for on-demand). Questions stay on Google TTS.
// The founder picked this storyteller voice; override with ELEVENLABS_VOICE_ID.
const DEFAULT_VOICE_ID = 'd15jrIAARvF899pDoC6T';
// v3 is ElevenLabs' expressive storytelling model: it follows audio tags
// like [excited] or [whispers] and reads Indonesian and English alike.
const DEFAULT_MODEL = 'eleven_v3';

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
 * `spoken` is the text actually sent - the page text plus optional acting
 * cues ("[excited] Tok... tok..."); timings are mapped back onto `text`.
 */
export async function narrateWithElevenLabs(
  text: string,
  spoken: string = text,
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
        text: spoken,
        model_id: process.env.ELEVENLABS_MODEL || DEFAULT_MODEL,
        voice_settings: { stability: 0.5 },
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

/**
 * Maps character start times onto the same \S+ words the reader renders.
 * The aligned text may contain acting cues, so each displayed word is found
 * in order in the aligned characters rather than by position.
 */
function wordTimingsFrom(
  text: string,
  alignment: NonNullable<ElevenLabsTimestampResponse['alignment']>,
): WordTiming[] | null {
  const aligned = alignment.characters.join('');
  const starts = alignment.character_start_times_seconds;
  if (starts.length !== alignment.characters.length) return null;
  const timings: WordTiming[] = [];
  let cursor = 0;
  for (const [word] of text.matchAll(/\S+/g)) {
    const at = aligned.indexOf(word, cursor);
    if (at < 0) return null;
    timings.push({ word, startSec: starts[at] });
    cursor = at + word.length;
  }
  return timings.length > 0 ? timings : null;
}
