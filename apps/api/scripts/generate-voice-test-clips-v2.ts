import "dotenv/config";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { TextToSpeechClient } from "@google-cloud/text-to-speech/build/src/v1";

// Round 2: starting from the winner (Standard-F, pitch +4.0), isolating
// two separate levers - pitch (more kid-like) and speaking rate (more
// excited) - so it's clear which one actually gets closer to what's wanted,
// rather than changing both at once and guessing why it sounds different.
//
// Also testing a WRONG-answer sentence at the same settings - the tone
// that works for excited "Great job!" might not automatically work for
// gentle "Not quite" (per the Sprint 21 spec: wrong-answer tone must stay
// neutral/encouraging, never harsh). Need to hear both, not just correct.
const SENTENCES = {
  correct:
    "Great job! That means the answer is blue because the cube has six sides, and six is an even number.",
  wrong:
    "Not quite! Let's take a look together. The answer is actually blue, because the cube has six sides, and six is an even number.",
};

const VARIANTS = [
  { label: "baseline-pitch4-rate0.85", pitch: 4.0, rate: 0.85 },
  { label: "samepitch-faster-rate1.0", pitch: 4.0, rate: 1.0 },
  { label: "samepitch-excited-rate1.15", pitch: 4.0, rate: 1.15 },
  { label: "samepitch-veryexcited-rate1.3", pitch: 4.0, rate: 1.3 },
  { label: "higherpitch6-rate1.0", pitch: 6.0, rate: 1.0 },
  { label: "higherpitch6-excited-rate1.15", pitch: 6.0, rate: 1.15 },
  { label: "higherpitch8-excited-rate1.15", pitch: 8.0, rate: 1.15 },
];

const VOICE_NAME = "en-US-Standard-F";
const OUTPUT_DIR = "test-clips-v2";

async function main() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    console.error(
      "ERROR: GOOGLE_APPLICATION_CREDENTIALS not set. Point it at google-tts-credentials.json.",
    );
    process.exit(1);
  }

  const client = new TextToSpeechClient({ keyFilename: credentialsPath });
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const v of VARIANTS) {
    for (const [kind, sentence] of Object.entries(SENTENCES)) {
      const filename = `${v.label}-${kind}.mp3`;
      const filepath = join(OUTPUT_DIR, filename);

      process.stdout.write(
        `Generating ${filename} (pitch +${v.pitch}, rate ${v.rate}, ${kind})… `,
      );

      try {
        const [response] = await client.synthesizeSpeech({
          input: { text: sentence },
          voice: {
            languageCode: "en-US",
            name: VOICE_NAME,
            ssmlGender: "FEMALE" as const,
          },
          audioConfig: {
            audioEncoding: "MP3" as const,
            speakingRate: v.rate,
            pitch: v.pitch,
            sampleRateHertz: 24000,
          },
        });

        if (!response.audioContent) {
          console.error("✗ no audioContent in response");
          continue;
        }

        const buffer = Buffer.from(response.audioContent as string, "base64");
        await writeFile(filepath, buffer);
        console.log(`✓ saved → ${filepath}`);
      } catch (err) {
        console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  console.log(
    "\nDone. Each variant has a -correct and -wrong clip - listen to both for whichever" +
      "\nvariant you like, since the tone needs to work for both (wrong-answer must stay" +
      "\ngentle/encouraging, never harsh, per the Sprint 21 spec)." +
      "\n\nListen in this order: baseline -> samepitch-faster -> samepitch-excited -> samepitch-veryexcited" +
      "\n(isolates the 'excited' lever at your already-liked pitch), then the higherpitch ones" +
      "\n(isolates the 'more kid-like' lever). Pick whichever combination actually sounds right for BOTH.",
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
