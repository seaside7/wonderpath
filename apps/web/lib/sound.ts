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

function getContext(): AudioContext | null {
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
      void context.resume();
    }
    return context;
  } catch {
    return null;
  }
}

/**
 * Create (and resume) the shared AudioContext. Call synchronously inside the
 * click handler that leads to a sound - browsers only allow audio startup
 * from a real user gesture, and every feedback sound follows a tap.
 */
export function ensureAudioReady(): void {
  getContext();
}

function playNotes(notes: Note[]): void {
  const ctx = getContext();
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
export function playCorrect(): void {
  playNotes([
    { frequency: 523.25, startOffsetSec: 0, durationSec: 0.16 },
    { frequency: 659.25, startOffsetSec: 0.11, durationSec: 0.24 },
  ]);
}

/**
 * A single soft, neutral tone for a wrong answer. Deliberately not a buzzer:
 * mid-range sine at gentle gain, acknowledges without punishing.
 */
export function playWrong(): void {
  playNotes([
    { frequency: 329.63, startOffsetSec: 0, durationSec: 0.3, gain: 0.11 },
  ]);
}

/** Brighter, slightly longer ascending arpeggio for a level-up moment. */
export function playLevelUp(): void {
  const type: OscillatorType = "triangle";
  playNotes([
    { frequency: 523.25, startOffsetSec: 0, durationSec: 0.22, type },
    { frequency: 659.25, startOffsetSec: 0.1, durationSec: 0.22, type },
    { frequency: 783.99, startOffsetSec: 0.2, durationSec: 0.22, type },
    { frequency: 1046.5, startOffsetSec: 0.3, durationSec: 0.34, type },
  ]);
}
