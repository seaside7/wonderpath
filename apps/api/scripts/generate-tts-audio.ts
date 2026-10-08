import 'dotenv/config';
/**
 * Batch TTS generation for the existing question bank.
 *
 * One-time pass: fetches every question that has an explanation but no audioUrl,
 * synthesizes audio via Google Cloud TTS WaveNet, and writes the audio file to
 * uploads/tts/{questionId}.mp3, then updates the audioUrl column.
 *
 * Safe to re-run: questions with audioUrl already set are skipped.
 *
 * Run: npx ts-node scripts/generate-tts-audio.ts
 * Or:   npm run build && node dist/scripts/generate-tts-audio.js
 *
 * Required env vars (see apps/api/.env):
 *   GOOGLE_CLOUD_TTS_API_KEY  — Google Cloud TTS API key
 *   TTS_UPLOADS_DIR          — output directory (default: uploads/tts)
 */

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { PrismaClient } from '../generated/prisma/client';

const TTS_API_ENDPOINT = 'texttospeech.googleapis.com';
const TTS_UPLOADS_DIR = process.env.TTS_UPLOADS_DIR ?? 'uploads/tts';
const API_KEY = process.env.GOOGLE_CLOUD_TTS_API_KEY ?? '';

interface SynthesizeOptions {
  text: string;
  voiceName?: string;
  pitch?: number;
  speakingRate?: number;
}

async function synthesizeToBuffer(options: SynthesizeOptions): Promise<Buffer> {
  if (!API_KEY) {
    throw new Error('GOOGLE_CLOUD_TTS_API_KEY not set');
  }

  const url = `https://${TTS_API_ENDPOINT}/v1/text:synthesize?key=${API_KEY}`;

  const body = {
    input: { text: options.text },
    voice: {
      languageCode: 'en-US',
      name: options.voiceName ?? 'en-US-Neural2-F',
      ssmlGender: 'FEMALE',
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: options.speakingRate ?? 0.9,
      pitch: options.pitch ?? 2.0,
      sampleRateHertz: 24000,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TTS API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { audioContent?: string };
  if (!data.audioContent) throw new Error('No audioContent in response');
  return Buffer.from(data.audioContent, 'base64');
}

async function synthesizeAndSave(
  questionId: string,
  text: string,
  voiceName: string,
): Promise<string> {
  const buffer = await synthesizeToBuffer({ text, voiceName, pitch: 2.0, speakingRate: 0.9 });
  const filename = `${questionId}.mp3`;
  await mkdir(TTS_UPLOADS_DIR, { recursive: true });
  await writeFile(join(TTS_UPLOADS_DIR, filename), buffer);
  return filename;
}

const prisma = new PrismaClient();

async function main() {
  if (!API_KEY) {
    console.error('[tts-batch] ERROR: GOOGLE_CLOUD_TTS_API_KEY env var not set');
    console.error('[tts-batch] Set it in apps/api/.env and re-run');
    process.exit(1);
  }

  console.log('[tts-batch] Fetching questions without audio…');

  const questions = await prisma.question.findMany({
    where: {
      audioUrl: null,
      explanation: { not: '' },
    },
    select: { id: true, explanation: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`[tts-batch] Found ${questions.length} questions to process`);

  if (questions.length === 0) {
    console.log('[tts-batch] Nothing to do — all questions have audio.');
    return;
  }

  const voiceName = 'en-US-Neural2-F';
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const q of questions) {
    process.stdout.write(`[tts-batch] ${q.id}… `);
    try {
      const filename = await synthesizeAndSave(q.id, q.explanation, voiceName);
      await prisma.question.update({
        where: { id: q.id },
        data: { audioUrl: `/tts/${filename}` },
      });
      console.log(`OK → ${filename}`);
      success++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`FAILED: ${msg}`);
      errors.push(`${q.id}: ${msg}`);
      failed++;
    }
  }

  console.log(`\n[tts-batch] Done. ${success} succeeded, ${failed} failed.`);
  if (errors.length > 0) {
    console.error('[tts-batch] Errors:');
    for (const e of errors) console.error(' ', e);
  }
}

main()
  .catch((err) => {
    console.error('[tts-batch] Fatal:', err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
