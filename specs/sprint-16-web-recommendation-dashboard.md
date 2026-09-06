# Sprint 16 — Web Recommendation & Mastery Dashboard

## Goal

Show the parent what makes WonderPath different: Atlas's recommendation, its reasoning, and the child's mastery per learning objective. This is the screen that carries the actual demo story — everything before this sprint is plumbing to reach it.

## Depends On

Sprint 15 (attempts flowing in) and Sprint 06 (Recommendation Engine backend).

## Scope

### 1. Today's Recommendation

Replaces the manual curriculum/subject picker from Sprint 14 as the default entry into "Start Learning" — Atlas suggests first, manual selection becomes the override path.

```text
Today's Recommendation

Decimals

Why?
- Fractions are strong
- Decimals need practice
- Estimated session: 15 minutes

[Start Learning]
[Choose Another Topic]
```

- Fetch via `GET /children/:childId/recommendations` (Sprint 06).
- "Why?" text is built from the recommendation's reason code(s) (e.g. `LOW_MASTERY`, `HIGH_MASTERY + LONG_TIME_NO_PRACTICE`) translated into the parent-facing language style already established in WonderPath_CLAUDE_CONTEXT.md Section 4 Principle 4 — human-readable, never raw reason codes shown to the parent.
- "Start Learning" accepts the recommendation (`POST /learning-sessions/:sessionId/recommendation/accept` per Sprint 06, or whatever the session-start flow actually wires it to).
- "Choose Another Topic" falls back to Sprint 14's manual curriculum/subject picker.

### 2. Mastery View

Per child, a simple list/grid of learning objectives with mastery:

```text
Emma — Mathematics (IB)

Equivalent Fractions      Mastery: 72%   Last practiced: 2 days ago
Decimals                  Mastery: 45%   Review recommended
Geometry Basics           Mastery: 88%   Last practiced: 180 days ago · Review recommended
```

- Fetch via `GET /children/:childId/mastery` (Sprint 05).
- Show `Review Recommended` as a visible badge/tag, not just a raw boolean — this is the "mastery doesn't decay but recency matters" story (Section 21).
- No editing here — this view is read-only for the parent.

### 3. Post-Session Summary (optional, include if time allows)

A short summary shown right after ending a session (Sprint 15's "End Session" action):

```text
Great session!
Emma answered 4 of 6 questions correctly.
Decimals mastery moved from 45% → 52%.
```

Ground this in real numbers from the attempt/mastery data — per Section 5 Principle 5, avoid generic praise ("Great job!") with nothing behind it. If the exact before/after numbers aren't easily available yet, show what's real (e.g. correct count) rather than fabricating a mastery delta.

## API Dependencies

```text
GET  /children/:childId/recommendations
POST /learning-sessions/:sessionId/recommendation/accept
GET  /children/:childId/mastery
```

Confirm exact paths against the actual Sprint 05/06 implementations.

## Architecture Note

Still no new state-management library. This is the most data-dense screen so far — keep formatting/derivation logic (e.g. "180 days ago" from a timestamp) in small pure helper functions, not scattered inline in JSX, so it's easy to unit-test later if needed.

## Out of Scope

- Editing mastery or recommendations directly (parent can only accept/override, never edit numbers — matches Section 23 "Atlas recommends. Parent can override.")
- Misconception explanations (Sprint 08, backend not built yet)
- Personality/relationship-brain messaging beyond the grounded post-session summary above (Sprint 09)
- Exam mode UI (Sprint 11)

## Manual QA Checklist

- Recommendation shown matches what the API returns, including the reason translated to plain language.
- "Choose Another Topic" correctly falls back to manual selection.
- Mastery view shows correct percentages and `Review Recommended` badges matching the API response.
- Post-session summary (if built) shows real numbers, not placeholder/generic text.
- Full loop works end-to-end for a fresh child with zero history: recommendation gracefully handles "no data yet" (e.g. suggests starting fresh rather than erroring).

---

## This Completes the Friend-Demo Scope

Sprints 12-16 cover: register/login → manage children → start a session (manually or via Atlas's recommendation) → answer real questions → see mastery and an explained recommendation. That is the full loop described in WonderPath_CLAUDE_CONTEXT.md Section 42 ("What Atlas Should Eventually Become"), at v1 depth.

Sprints 08-11 (misconceptions, personality, living question bank, exam assistant) add depth but are not required to tell this story to a friend. Two things outside these frontend sprints still need a decision before an actual demo, not a spec gap — a project/logistics call, not an engineering one:

1. **Where will the demo run?** Localhost on your machine (no deploy needed) vs. a real URL your friend opens themselves (needs `apps/web` + `apps/api` + Postgres deployed somewhere).
2. **Seed data.** A brand-new child has zero attempt history, so mastery/recommendation screens will look empty on a truly fresh account — decide whether to seed a demo child with some fake attempt history beforehand so the "wow" screens (Sprint 16) have something to show.
