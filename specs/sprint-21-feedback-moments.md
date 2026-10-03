# Sprint 21 — Feedback Moments (Level-Up, Correct/Wrong Animation & Sound)

## Goal

Right now, three things that should feel like moments are silent and flat: a correct answer, a wrong answer, and an adaptive-difficulty level-up. The level-up in particular is currently invisible to the child entirely — it's a database field that changes with nobody told (see `DISCUSSION_LOG.md`, 2026-10-03). This sprint adds sound and animation to the existing correct/wrong feedback, and makes leveling up an actual celebrated event for the child.

## Depends On

Sprint 18 (kid question flow exists), Sprint 08 (adaptive difficulty logic — `misconception.service.ts#evaluateSubjectDifficulty` already computes level changes, it just doesn't tell anyone).

## Scope

### 1. Backend: Surface the Level-Up Signal

`MisconceptionService.recordAttempt(attemptId)` (`apps/api/src/atlas/misconception/misconception.service.ts`) currently returns `Promise<void>` and calls `this.evaluateSubjectDifficulty(attempt)` as its last line, discarding the result. `evaluateSubjectDifficulty` already computes `current` and `next` difficulty and knows the `direction` (`'increase' | 'decrease' | 'maintain'`) — it just never returns any of that.

- Change `evaluateSubjectDifficulty` to return `{ subject: string; newLevel: number } | null` — **only when `direction === 'increase'` and the level actually changed** (never surface a decrease as a "moment"; a difficulty drop should stay exactly as invisible as it is today — this product does not narrate setbacks to the child, per the existing "praise must be grounded, never discouraging" principle).
- Change `MisconceptionService.recordAttempt` to return that same value (`{ levelUp: {...} | null }`).
- In `StudentModelService.recordAttempt` (`apps/api/src/atlas/student-model/student-model.service.ts`), the `sideEffects`/`Promise.allSettled` block already **awaits** the misconception call before the function returns (it just currently throws away everything but rejection logging) — no new latency, just read the resolved value:

```ts
const results = await Promise.allSettled(sideEffects.map(([, p]) => p));
let levelUp: { subject: string; newLevel: number } | null = null;
results.forEach((result, index) => {
  if (result.status === 'rejected') {
    this.logger.error(/* unchanged */);
  } else if (sideEffects[index][0] === 'misconception' && result.value?.levelUp) {
    levelUp = result.value.levelUp;
  }
});
return { ...response, explanation, levelUp };
```

- Add `levelUp: { subject: string; newLevel: number } | null` to `AttemptResponseDto` (`apps/api/src/atlas/student-model/dto/attempt-response.dto.ts`).
- Add the matching field to the frontend `AttemptResult` type (`apps/web/lib/api.ts`).

No new database fields, no new endpoint — this is purely "stop discarding information that's already being computed."

### 2. Frontend: The Level-Up Moment

In `KidQuestionFlow`'s feedback screen (`apps/web/components/kid/kid-question-flow.tsx`, the `status === "feedback"` branch), when `attempt.levelUp` is present, show an additional celebration **above** the existing "Correct!" message (don't replace it — the level-up is a consequence of this correct answer, not a separate screen):

```text
🎉 Level Up!
Mathematics is now Level 3

Correct!
[explanation text]

[Next Question]   [Finish for today]
```

- Reuse the existing trail/waypoint visual language (the dotted-path motif, the waypoint-gold dot accents already used elsewhere) for this banner rather than inventing new decoration — it should feel like reaching a new waypoint on the path, not a generic game badge.
- The existing `waypoint-pop` CSS keyframe (`apps/web/app/globals.css`) was built for the register page's animated route and isn't used anywhere else — reuse it (or a close variant) for this banner's entrance.
- Must respect `prefers-reduced-motion` (reduce/skip the animation), matching the existing convention in `globals.css` for `route-draw`/`waypoint-pop`/`resume-pulse`.

### 3. Sound & Animation for Every Answer (Correct/Wrong)

- **Sound:** synthesize tones directly via the Web Audio API (`AudioContext` + oscillators) rather than shipping audio file assets — no licensing/sourcing question, near-zero bundle size, and trivially themeable later. Three distinct, short (under ~500ms) sounds:
  - Correct: a pleasant short ascending two-note chime.
  - Wrong: a single soft, neutral tone — **not a harsh buzzer or negative-sounding cue**. This product's whole philosophy is "a patient coach, never discouraging" (Section 5 Principle 5) — the sound for a wrong answer should acknowledge, not punish.
  - Level-up: a brighter, slightly longer ascending arpeggio (3-4 notes) — distinctly more celebratory than the regular correct chime, so it reads as a bigger moment.
  - Initialize/resume the `AudioContext` lazily on first use (inside the click handler that triggers it), not at component mount — browsers require a user gesture before audio will play, and every one of these sounds is already triggered by a button click, so this is naturally satisfied as long as the context isn't created earlier.
- **Animation:** a brief, subtle animation on the feedback banner itself — a small scale/pop for correct, a gentle fade/settle for wrong (nothing jarring). Respect `prefers-reduced-motion` the same way as everywhere else in this app.
- Trigger point: when the feedback screen first renders after `submitAttempt` resolves (both the existing "Correct!"/"Not quite." banner and, if present, the new level-up banner above it).

## API Dependencies

```text
POST /attempts   (existing — response shape extended with levelUp, no behavior change)
```

## Architecture Note

Keep the sound-synthesis logic in one small module (e.g. `apps/web/lib/sound.ts`) with three exported functions (`playCorrect()`, `playWrong()`, `playLevelUp()`) rather than inlining oscillator setup in the component — this is exactly the kind of thing worth a tiny shared helper, unlike most of this codebase's deliberate avoidance of premature abstraction, because the Web Audio API setup/teardown boilerplate is real and would otherwise be duplicated three times.

## Out of Scope

- A mute toggle / sound settings (v1 has no way to disable sound — browsers already respect system volume, so this isn't a hard requirement, just not building a custom control for it yet).
- Any notification to the parent when a level-up happens (no push/email notification system exists in this app at all — the parent dashboard's existing read-only "Current Level" card is still the only parent-facing view of this).
- Sound/animation on the parent-facing/testing session flow (`session-question-flow.tsx`, `/sessions/:id`) — this sprint is scoped to the kid-facing experience only.
- Making the correct/wrong sounds configurable or varying by subject/difficulty — one fixed set of three sounds for v1.

## Manual QA Checklist

- A level-up (trigger it by answering several questions correctly and quickly in the same subject, per Sprint 08's thresholds) shows the celebration banner above the normal "Correct!" feedback, with the right subject name and new level number.
- A level-*down* (answer several wrong/slow/"Difficult" in a row) stays completely silent/invisible as it does today — confirm no celebration-style banner ever appears for a decrease.
- Correct and wrong answers each play their own distinct sound and show their own distinct (subtle) animation.
- The wrong-answer sound genuinely sounds neutral/encouraging on a real listen, not like a buzzer or error tone — this is a judgment call worth a second opinion before calling it done.
- With `prefers-reduced-motion: reduce` set, animations are skipped/instant but sounds and text content are unaffected.
- No console errors/warnings about blocked audio autoplay — confirm the `AudioContext` is only created after a real click, not at page load.
