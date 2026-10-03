# Sprint 19 — Parent Dashboard

## Goal

This is your wife's view: what is my child actually doing, what does Atlas think, and can I steer it. Most of the underlying data already exists and is already fetchable (Sprint 16 built the recommendation + mastery view) — this sprint is mainly about **surfacing and linking** what's built but currently unreachable, plus two new views (misconceptions, recent sessions) and one small new backend endpoint.

## Depends On

Sprint 16 (`RecommendationDashboard` already exists at `/children/:id/recommendations` — currently orphaned, nothing links to it), Sprint 08 (misconceptions/adaptive difficulty backend), Sprint 17 (this becomes the destination behind the PIN-protected "Parent" picker card).

## Scope

### 1. Link What Already Exists

`children-list.tsx` currently links each child to `/edit` and `/start` only. Add a link to the existing `/children/:id/recommendations` page (e.g. "View Progress"). This alone surfaces Sprint 16's work, which nothing currently reaches.

### 2. Misconceptions (new section)

```text
Things to Watch

Decimals — Place Value
  Emma has made the same kind of mistake a few times in a row.
  (Confirmed · 4 pieces of evidence)
```

- `GET /children/:childId/misconceptions` → `{ childId, signals: [...] }`.
- **Only show `status: "CONFIRMED"`** — per Section 5 Principle 1 ("Atlas accumulates evidence before declaring misconceptions"), `POTENTIAL`/`SUGGESTED` signals are not solid enough to show a parent as a claim about their child. If there are no `CONFIRMED` signals, show nothing (not an empty-state card — silence here is correct, not a bug).
- Translate `signalType` (e.g. `RepeatedMistake`, `StoryProblem`) into a plain sentence per type — do not show the raw enum value.
- No parent action here for v1 (no "dismiss"/"mark resolved" — that's a future write path, not needed yet).

### 3. Adaptive Difficulty (new section)

```text
Current Level

Mathematics   Level 3 of 5   ↑ increasing
  Why: Emma's gotten several recent questions right in a row.
```

- `GET /children/:childId/adaptive-difficulty` (list form) for the levels; `GET /children/:childId/adaptive-difficulty?subject=X` per subject for the `direction`/`rationale` to explain it (see `qa-agent/lib/expectations/adaptive-difficulty.js` for the confirmed exact response shapes — the list endpoint has no rationale, only the per-subject one does).
- `direction` is `"increase" | "decrease" | "maintain"` (lowercase, confirmed from `misconception.service.ts`) — map to parent-facing arrows/words, don't show the raw string.
- Read-only — per Section 44, difficulty is Atlas's adaptive signal, not something a parent manually overrides in v1.

### 4. Recent Sessions (new backend endpoint + frontend section)

No endpoint currently lists a child's past sessions — only `GET /learning-sessions/current` exists. Add:

```text
GET /children/:childId/learning-sessions?limit=10
```

- Returns most recent sessions first: `{ id, subject, curriculum, status, startedAt, questionsAnswered, correctCount }` (the last two aggregated from the session's `attempts` relation).
- **Known gap to flag, not silently work around:** `LearningSession` has no `completedAt`/`endedAt` field (only `startedAt`/`updatedAt`) — this was already flagged in `docs/05-database-design.md`. For this sprint, it's fine to omit a duration/end-time from the list rather than rely on `updatedAt` as an imprecise proxy. If a real "how long did this session take" figure is wanted later, that needs its own small migration — don't quietly repurpose `updatedAt` for it here.

```text
Recent Sessions

Mathematics · 2 days ago · 6 questions, 4 correct
English      · 4 days ago · 8 questions, 7 correct
```

### 5. Parent Override (already exists — just confirm it still works from here)

"Choose Another Topic" on the recommendation card is already the override path (Section 23: "Atlas recommends. Parent can override."). No new UI needed — just verify it's reachable and working from this consolidated dashboard. Do not add a second, separate "set today's focus" control — that would be the "complicated goal-management system" Section 24 explicitly says not to build for MVP.

## API Dependencies

```text
GET /children/:childId/recommendations          (existing)
GET /children/:childId/mastery                  (existing)
GET /children/:childId/misconceptions            (existing)
GET /children/:childId/adaptive-difficulty       (existing, list + ?subject= forms)
GET /children/:childId/learning-sessions         (NEW — this sprint, backend + frontend)
```

## Out of Scope

- Any write path for misconceptions or difficulty (dismiss, manual override of level).
- Semester/outcome goal-setting (Section 24 — explicitly deferred past MVP).
- Cross-child comparison views ("how does Emma compare to...") — not a stated goal anywhere in the spec, don't invent it.
- Personality/learning-pattern detail views (Sprint 09's full pattern data) — the encouragement message is already covered in Sprint 18's child-facing summary; a dedicated parent-facing "here's how your child learns best" view is a reasonable future sprint, not this one.

## Manual QA Checklist

- Each child's card on the dashboard links to their recommendation/mastery/progress view.
- Misconceptions section shows only `CONFIRMED` signals in plain language; shows nothing (not an empty-state) when there are none.
- Adaptive difficulty shows the correct level (1-5) and a real, non-empty rationale per subject.
- Recent sessions list shows correct counts matching the actual attempt data (cross-check against the database directly for at least one child, the way the QA agent does — don't just trust the UI rendering).
- "Choose Another Topic" override still works end-to-end from this page.
- A brand-new child with zero history shows sensible empty states throughout (no crashes, no "undefined" text) — same bar as Sprint 16's existing checklist item.
