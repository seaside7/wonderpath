# Sprint 18 — The Child's Learning Experience

## Goal

Everything inside child mode (Sprint 17's screen lock) needs to actually feel built for a child, not a re-skinned admin form. This sprint reworks the "Today" entry point and the question-answering flow for a ~10-year-old on a tablet, and replaces the bare answer-count summary with Atlas's real, grounded encouragement message.

This is the sprint your daughter will actually spend time in — prioritize it being pleasant to tap through over adding new backend capability.

## Depends On

Sprint 17 (child mode routing/lock), Sprint 16 (recommendation + mastery data already fetchable), Sprint 15 (question-serving flow already works end to end).

## Scope

### 1. "Today" Card (child-facing)

Reuses Sprint 16's `RecommendationDashboard` data (`GET /children/:childId/recommendations`), but as a new, separate kid-facing component — do not just drop the existing parent component into child mode, its density and tone are written for a parent.

```text
Hi Emma! 👋

Today let's practice: Decimals

[Start Learning]   [Choose Something Else]
```

- One sentence of "why", not a bulleted reason-code list — reuse the existing `reasonBullets()`/translation logic from `lib/format.ts` but condense to the single most relevant reason, written in second person ("You're doing great with fractions — let's try decimals next.").
- "Choose Something Else" opens a simplified topic picker (reuse Sprint 14's curriculum/subject selection, simplified to big tappable cards — no dropdowns).
- No "Estimated session: 15 minutes" clinical copy — if shown at all, phrase it as "About 15 minutes."

### 2. Kid-Friendly Question Screen

Reworks `SessionQuestionFlow` for this context (new component, or a `variant="kid"` prop — whichever keeps the diff smaller; parent/testing flows must keep working unchanged).

```text
●●●○○○  Question 3 of 6

What is 0.5 + 0.25?

┌──────────────┐  ┌──────────────┐
│    0.75      │  │     0.6      │
└──────────────┘  └──────────────┘
┌──────────────┐  ┌──────────────┐
│    0.65      │  │     0.8      │
└──────────────┘  └──────────────┘

           [Next →]
```

- Progress dots/bar instead of nothing — needs a question count. If the session doesn't have a fixed planned length today, show a simpler "Question 3" counter without "of N" rather than inventing a fake total.
- Answer options as large tap targets (min ~64px tall), grid layout instead of a stacked radio list — same underlying `<input type="radio">` semantics for accessibility, just restyled.
- "How did that feel?" becomes three big face/emoji buttons instead of a radio list:
  ```text
  😊 Easy      😐 Just Right      😣 Tricky
  ```
  Maps to the same `PerceivedDifficulty` values (`"Easy" | "Just Right" | "Difficult"`) already sent to `submitAttempt` — `"Tricky"` is display-only copy for `"Difficult"`, the API contract doesn't change.
- Feedback screen: keep "Correct!" / "Not quite." but larger, with a simple visual (color flash / icon) — and always show the explanation, same as today.

### 3. End-of-Session Summary (real encouragement, not a bare count)

Today, ending a session just shows "You answered X of Y questions correctly" from local component state. Replace with the actual `GET /children/:childId/encouragement` endpoint (exists in the backend already — Sprint 09 — but has no frontend client function yet; add one to `lib/api.ts`).

```text
Awesome work, Emma! 🎉

You answered your latest session 40% faster than last time.
Keep that rhythm up!

[Back to Today]
```

- Call `fetchEncouragement(childId)` when the session ends (both the "answered everything" and the "manually ended" paths), show its real `message`.
- If the encouragement call fails or returns the generic no-data fallback, fall back to today's local count-based message rather than showing an error — this screen should never look broken to a child.
- "Back to Today" returns to this sprint's "Today" card (not the parent dashboard — a child should never land on a parent-facing route).

## API Dependencies

```text
GET  /children/:childId/recommendations   (existing, Sprint 06)
GET  /children/:childId/encouragement     (existing, Sprint 09 — no frontend client yet, add one)
GET  /learning-sessions/:sessionId/next-question   (existing, Sprint 15)
POST /attempts                                      (existing, Sprint 05)
```

## Architecture Note

Keep the kid-facing components in their own directory (e.g. `components/kid/`) rather than sprinkling `variant="kid"` conditionals through the existing parent/testing components — Sprint 17 already separates kid-facing routes into their own route group, so the component layer should mirror that split. Shared logic (the `fetchNextQuestion`/`submitAttempt` API calls, the `PerceivedDifficulty` type) stays in `lib/api.ts` either way.

## Out of Scope

- Hints (not built in the backend yet, per `answer-questions.js`'s own comment in the QA agent — `useHint` is reserved for when the UI has one).
- Sound effects/animations beyond simple color/icon feedback — nice-to-have, not required for the family beta.
- Misconception-aware messaging to the child directly (Section 5 Principle 1 — misconceptions are for the parent/Atlas's internal model, not something to narrate to the child as "you have a misconception").

## Manual QA Checklist

- "Today" card shows a real recommendation in plain, encouraging language — no raw reason codes or parent-facing phrasing leaking through.
- A full question-answering loop works on a touch device/tablet viewport: big tap targets, no accidental double-taps, face buttons correctly map to the three `PerceivedDifficulty` values.
- Progress indicator updates correctly across multiple questions.
- Ending a session (both "ran out of questions" and manually tapping end) shows the real encouragement message, grounded in actual numbers — not a generic phrase with nothing behind it (Section 5 Principle 5).
- If the encouragement endpoint fails, the summary screen still renders something reasonable, not a blank/broken state.
- "Back to Today" returns to the child-facing Today card, never to `/dashboard/manage` or any parent-only page.
- Existing parent-facing/testing flows (`session-setup.tsx`, the original `SessionQuestionFlow`) still work unchanged — this sprint adds a parallel kid-facing path, it does not replace the existing one.
