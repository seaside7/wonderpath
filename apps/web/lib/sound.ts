// Tiny Web Audio API tone synthesis for kid-facing feedback moments.
// No audio file assets: three short synthesized sounds, silent no-ops when
// audio is unavailable (SSR, old browsers, or any playback failure). Sound
// must never break the learning flow, so every failure path is swallowed.

interface Note {
  frequency: number;
  startOffsetSec: number;
  durationSec: number;
  type?: OscillatorType;
  gain?: number;
}

let context: AudioContext | null = null;
let contextResumePromise: Promise<void> | null = null;

async function getContext(): Promise<AudioContext | null> {
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    if (!context) {
      context = new Ctor();
    }
    if (context.state === "suspended") {
      if (!contextResumePromise) {
        contextResumePromise = context.resume().then(() => {
          contextResumePromise = null;
        });
      }
      await contextResumePromise;
    }
    return context;
  } catch {
    return null;
  }
}

/**
 * Resume the shared AudioContext. Call inside the click handler that triggers
 * sound — browsers require user gesture for audio.  Returns a promise that
 * resolves once the context is running; sound functions will wait for it.
 */
export async function ensureAudioReady(): Promise<void> {
  await getContext();
}

async function playNotes(notes: Note[]): Promise<void> {
  const ctx = await getContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + note.startOffsetSec;
      osc.type = note.type ?? "sine";
      osc.frequency.setValueAtTime(note.frequency, start);
      const peak = note.gain ?? 0.16;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.durationSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + note.durationSec + 0.05);
    }
  } catch {
    // Sound is decorative - never let it interrupt the session.
  }
}

/** Pleasant short ascending two-note chime for a correct answer. */
export async function playCorrect(): Promise<void> {
  await playNotes([
    { frequency: 523.25, startOffsetSec: 0, durationSec: 0.16 },
    { frequency: 659.25, startOffsetSec: 0.11, durationSec: 0.24 },
  ]);
}

/**
 * A single soft, neutral tone for a wrong answer. Deliberately not a buzzer:
 * mid-range sine at gentle gain, acknowledges without punishing.
 */
export async function playWrong(): Promise<void> {
  await playNotes([
    { frequency: 329.63, startOffsetSec: 0, durationSec: 0.3, gain: 0.11 },
  ]);
}

/** Brighter, slightly longer ascending arpeggio for a level-up moment. */
export async function playLevelUp(): Promise<void> {
  const type: OscillatorType = "triangle";
  await playNotes([
    { frequency: 523.25, startOffsetSec: 0, durationSec: 0.22, type },
    { frequency: 659.25, startOffsetSec: 0.1, durationSec: 0.22, type },
    { frequency: 783.99, startOffsetSec: 0.2, durationSec: 0.22, type },
    { frequency: 1046.5, startOffsetSec: 0.3, durationSec: 0.34, type },
  ]);
}

function noiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * durationSec), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    // Occasional louder grains give the papery crinkle.
    data[i] = (Math.random() * 2 - 1) * (Math.random() < 0.08 ? 1 : 0.4);
  }
  return buffer;
}

/**
 * Paper page turn: a filtered noise swish sweeping up then down, followed by
 * a soft low "flap" as the page lands (~0.6s, matching the page animation).
 */
export async function playPageFlip(): Promise<void> {
  const ctx = await getContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;

    const swish = ctx.createBufferSource();
    swish.buffer = noiseBuffer(ctx, 0.5);
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 500;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 0.7;
    band.frequency.setValueAtTime(1400, now);
    band.frequency.exponentialRampToValueAtTime(4200, now + 0.2);
    band.frequency.exponentialRampToValueAtTime(1600, now + 0.5);
    const swishGain = ctx.createGain();
    swishGain.gain.setValueAtTime(0.0001, now);
    swishGain.gain.exponentialRampToValueAtTime(0.32, now + 0.07);
    swishGain.gain.exponentialRampToValueAtTime(0.1, now + 0.3);
    swishGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    swish.connect(highpass);
    highpass.connect(band);
    band.connect(swishGain);
    swishGain.connect(ctx.destination);
    swish.start(now);
    swish.stop(now + 0.5);

    const landAt = now + 0.55;
    const flap = ctx.createBufferSource();
    flap.buffer = noiseBuffer(ctx, 0.12);
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 900;
    const flapGain = ctx.createGain();
    flapGain.gain.setValueAtTime(0.0001, landAt);
    flapGain.gain.exponentialRampToValueAtTime(0.3, landAt + 0.012);
    flapGain.gain.exponentialRampToValueAtTime(0.0001, landAt + 0.12);
    flap.connect(lowpass);
    lowpass.connect(flapGain);
    flapGain.connect(ctx.destination);
    flap.start(landAt);
    flap.stop(landAt + 0.12);
  } catch {
    // Decorative only.
  }
}
