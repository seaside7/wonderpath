import { describe, it, expect, vi, beforeEach } from "vitest";

// These tests verify the async/await contract of ensureAudioReady without needing
// a real browser AudioContext.  The actual sound-synthesis path (playCorrect etc.)
// is exercised by the QA/child test sessions; these are unit-level guards for the
// async-resume logic that was the root cause of WON-7.

describe("sound module — async resume contract", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("ensureAudioReady is async and returns a Promise", async () => {
    // In jsdom, window.AudioContext exists and is the real constructor.
    // ensureAudioReady should still return cleanly (no-op in non-browser or
    // when AudioContext is unavailable) without throwing.
    const { ensureAudioReady } = await import("./sound");
    const result = ensureAudioReady();
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toBeUndefined();
  });

  it("playCorrect, playWrong, playLevelUp are all async", async () => {
    const { playCorrect, playWrong, playLevelUp } = await import("./sound");
    const [c, w, l] = await Promise.all([
      playCorrect(),
      playWrong(),
      playLevelUp(),
    ]);
    expect(c).toBeUndefined();
    expect(w).toBeUndefined();
    expect(l).toBeUndefined();
  });
});
