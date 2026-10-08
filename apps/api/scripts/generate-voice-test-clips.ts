import "dotenv/config";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { TextToSpeechClient } from "@google-cloud/text-to-speech/build/src/v1";

const CLIENT = new TextToSpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS!,
});

const OUTPUT_DIR = "test-clips";

interface Variant {
  label: string;
  rate: number;
  pitch: number;
  ssmlGender: "FEMALE";
}

interface Sentence {
  tag: string;
  text: string;
  note: string;
}

const CORRECT = {
  tag: "correct",
  text: "Great job! That means the answer is blue because the cube has six sides, and six is an even number.",
  note: "warm celebration — the primary use case",
};

const WRONG = {
  tag: "wrong",
  text: "Not quite! That's okay — keep going, you'll get it next time.",
  note: "gentle encouragement — must never sound rushed or harsh",
};

const VARIANTS: Variant[] = [
  { label: "rate1_0-pitch2",  rate: 1.0, pitch: 2,  ssmlGender: "FEMALE" },
  { label: "rate1_2-pitch2",  rate: 1.2, pitch: 2,  ssmlGender: "FEMALE" },
  { label: "rate1_4-pitch2",  rate: 1.4, pitch: 2,  ssmlGender: "FEMALE" },
  { label: "rate1_0-pitch10", rate: 1.0, pitch: 10, ssmlGender: "FEMALE" },
  { label: "rate1_0-pitch12", rate: 1.0, pitch: 12, ssmlGender: "FEMALE" },
  { label: "rate1_2-pitch10", rate: 1.2, pitch: 10, ssmlGender: "FEMALE" },
  { label: "rate1_2-pitch12", rate: 1.2, pitch: 12, ssmlGender: "FEMALE" },
];

const ALL_SENTENCES: Sentence[] = [CORRECT, WRONG];

async function generateClip(
  sentence: Sentence,
  variant: Variant,
): Promise<void> {
  const filename = `voice-${variant.label}-${sentence.tag}.mp3`;
  const filepath = join(OUTPUT_DIR, filename);

  process.stdout.write(
    `  [${sentence.tag}] ${variant.label} — ${sentence.note.slice(0, 40)}… `,
  );

  try {
    const [response] = await CLIENT.synthesizeSpeech({
      input: { text: sentence.text },
      voice: {
        languageCode: "en-US",
        name: "en-US-Neural2-F",
        ssmlGender: variant.ssmlGender,
      },
      audioConfig: {
        audioEncoding: "MP3" as const,
        speakingRate: variant.rate,
        pitch: variant.pitch,
        sampleRateHertz: 24000,
      },
    });

    if (!response.audioContent) {
      console.error("\n    ✗ no audioContent in response");
      return;
    }

    const buffer = Buffer.from(response.audioContent as string, "base64");
    await writeFile(filepath, buffer);
    console.log(`✓ ${(buffer.length / 1024).toFixed(1)} KB → ${filename}`);
  } catch (err) {
    console.error(`\n    ✗ ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error("ERROR: GOOGLE_APPLICATION_CREDENTIALS not set.");
    process.exit(1);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log(
    "\nGenerating TTS test clips — 7 variants × 2 sentence tones = 14 MP3s\n",
  );
  console.log("Variants:");
  VARIANTS.forEach((v) => {
    console.log(`  ${v.label}  (rate=${v.rate}, pitch=+${v.pitch})`);
  });
  console.log("\nSentences:");
  console.log(`  [correct] "${CORRECT.text.slice(0, 60)}..."`);
  console.log(`  [wrong]   "${WRONG.text}"`);
  console.log("");

  for (const variant of VARIANTS) {
    console.log(`\n${variant.label}:`);
    for (const sentence of ALL_SENTENCES) {
      await generateClip(sentence, variant);
    }
  }

  console.log("\n───");
  console.log("Done. Open test-clips/ and listen.");
  console.log("");
  console.log("PICKING GUIDE:");
  console.log("  1. Find the correct-tone clip that sounds warmest/clearest for kids");
  console.log("  2. Check the matching wrong-tone clip — does it stay gentle, not rushed?");
  console.log("  3. If a fast rate sounds great for 'Great job!' but too brisk for 'Not quite',");
  console.log("     that variant is disqualified — both must pass.");
  console.log("  4. Set TTS_VOICE_NAME=en-US-Neural2-F and note the winning rate+pitch.");
  console.log("");
  console.log("Then update apps/api/src/atlas/tts/tts.service.ts synthesizeAndSave() defaults.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
