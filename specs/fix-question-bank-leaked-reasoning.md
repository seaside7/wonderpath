# Fix: Leaked LLM Reasoning in Question Bank (3 corrupted rows + pipeline guard)

**Type:** Bug fix, not a feature sprint. Found 2026-10-03 while live-verifying Sprint 21 in a real browser session.

## What's wrong

3 of 1080 questions in the content bank have the LLM's raw self-correction
monologue saved directly into `explanation` instead of a clean final
explanation — and on all 3, the stored `correctAnswer` contradicts the
reasoning's own conclusion. In practice: a child answers correctly and is
told they're wrong (or vice versa).

Confirmed present in both the local `wonderpath_qa` database and the
staging VPS's `wonderpath` database (staging was seeded from a dump of the
local bank, so the corruption migrated 1:1 — no additional bad rows found
on staging beyond these same 3).

All 3 have `generationId: null` — they were not created through the
`/generations` content-generation pipeline's tracked flow, so there is no
`QuestionGeneration` record to retry/regenerate against. They need a
direct, manual data fix.

## Part 1 — Fix the 3 known rows

Each fix is independently verified by hand below (re-derived from the
question text itself, not just trusted from the leaked reasoning).

### Row 1 — `cmu9aelzp0093w2mgtstnjar9`

- Question: "True or False: 5/7 is closer to 1 than 3/4 is to 1."
- Current `correctAnswer`: `"True"` ← **wrong**
- Correct `correctAnswer`: `"False"`
  - Distance of 5/7 from 1: `1 − 5/7 = 2/7 ≈ 0.286`
  - Distance of 3/4 from 1: `1 − 3/4 = 1/4 = 0.25`
  - `0.286 > 0.25`, so 5/7 is *farther* from 1, not closer. Statement is false.
- New `explanation`:
  > "The distance from 1 is 1 − 5/7 = 2/7 ≈ 0.286, and 1 − 3/4 = 1/4 = 0.25. Since 0.286 is greater than 0.25, 5/7 is actually farther from 1 — 3/4 is closer. The statement is false."

### Row 2 — `cmu9bpc6s005ow2j0ns7qqsg1`

- Question: "A rectangular garden is 15 m long and 10 m wide. A path of width 1 m runs around the outside of the garden. What is the perimeter of the garden including the path?"
- Options: `["50 m", "54 m", "58 m", "60 m"]`
- Current `correctAnswer`: `"54 m"` ← **wrong**
- Correct `correctAnswer`: `"58 m"`
  - New length = 15 + 2(1 m each side) = 17 m; new width = 10 + 2 = 12 m
  - Perimeter = 2 × (17 + 12) = 2 × 29 = 58 m
- New `explanation`:
  > "The path adds 1 m to each side, so the new length = 15 + 2 = 17 m and new width = 10 + 2 = 12 m. Perimeter = 2 × (17 + 12) = 58 m."

### Row 3 — `cmu9bpw40006ow2j0nko1f8xe`

- Question: "A rectangular garden is 12 m long and 8 m wide. A path of width 2 m is built around it on all sides. The area of the path alone is 96 m²." (True/False)
- Current `correctAnswer`: `"False"` ← **wrong**
- Correct `correctAnswer`: `"True"`
  - Outer dimensions with the 2 m path: length = 12 + 2+2 = 16 m, width = 8 + 2+2 = 12 m
  - Outer area = 16 × 12 = 192 m²; garden (inner) area = 12 × 8 = 96 m²
  - Path area = 192 − 96 = 96 m² — the stated claim is correct
- New `explanation`:
  > "With the 2 m path on all sides, the outer dimensions are 16 m by 12 m, giving an outer area of 192 m². The garden itself is 96 m². Path area = 192 − 96 = 96 m² — so the statement is true."

### Apply to both databases

Run the equivalent of this against **both** the local `wonderpath_qa` database
and the staging VPS's `wonderpath` database (`docker exec wonderpath-postgres
psql -U postgres -d <db> -c "..."` on each host):

```sql
UPDATE "Question" SET
  "correctAnswer" = 'False',
  "explanation" = 'The distance from 1 is 1 − 5/7 = 2/7 ≈ 0.286, and 1 − 3/4 = 1/4 = 0.25. Since 0.286 is greater than 0.25, 5/7 is actually farther from 1 — 3/4 is closer. The statement is false.'
WHERE id = 'cmu9aelzp0093w2mgtstnjar9';

UPDATE "Question" SET
  "correctAnswer" = '58 m',
  "explanation" = 'The path adds 1 m to each side, so the new length = 15 + 2 = 17 m and new width = 10 + 2 = 12 m. Perimeter = 2 × (17 + 12) = 58 m.'
WHERE id = 'cmu9bpc6s005ow2j0ns7qqsg1';

UPDATE "Question" SET
  "correctAnswer" = 'True',
  "explanation" = 'With the 2 m path on all sides, the outer dimensions are 16 m by 12 m, giving an outer area of 192 m². The garden itself is 96 m². Path area = 192 − 96 = 96 m² — so the statement is true.'
WHERE id = 'cmu9bpw40006ow2j0nko1f8xe';
```

Any existing `QuestionAttempt` rows against these 3 questions (from real or
test sessions, before the fix) were graded against the old, wrong
`correctAnswer` — leave those historical attempts alone, don't try to
retroactively "correct" past grading. This fix only affects attempts going
forward.

## Part 2 — Prevent recurrence in the generation pipeline

Confirmed code path (read directly, not guessed):

- `apps/api/src/atlas/content-generation/content-generation.service.ts`,
  `executeGeneration()` calls `this.generator.generateQuestions(request)`
  then `validateGeneratedSeeds(seeds, fields.quantity)` *before* the
  `prisma.$transaction` that persists each seed into `Question`. This
  validator runs for both the initial `create()` path and the
  `retry()` path — one fix point covers both.
- `apps/api/src/atlas/content-generation/content-generation.validator.ts`,
  `validateGeneratedSeeds()` already loops over each seed and does a
  truthiness/trim check on `explanation` (non-empty) alongside other shape
  checks (option count, correctAnswer ∈ options, difficulty range). There is
  currently **no semantic/content check** on what the explanation text
  actually contains.

Add a check in that same per-seed loop in `validateGeneratedSeeds()`: scan
`seed.explanation` (case-insensitive) for self-referential LLM reasoning
markers, and reject the seed if any match. Suggested marker list — tune
based on what you see in practice, but at minimum:

```
"wait,", "wait -", "let me recalculate", "let me correct", "let me check",
"i'll fix", "so i need to", "actually the correct answer", "but correct answer is",
"so correct answer should be", "let's recalculate"
```

On a match, throw the same way the existing checks do (`BadRequestException`
with a clear message naming which seed/question text failed and why) so the
generation run fails loudly and visibly rather than silently persisting
corrupted content — this mirrors how the other shape checks in this function
already behave on failure.

Don't build a queued/async re-check pass or a content-scanning cron job for
this — the one validation gate before persistence is the only thing that
needs to exist. No new infrastructure.

## Out of scope (explicitly, so this doesn't scope-creep)

- Do not build a general profanity/content-safety filter — only the
  specific self-referential-reasoning pattern described above.
- Do not build per-question regeneration via the `/generations/:id/retry`
  endpoint — that endpoint regenerates a whole batch and is unrelated to
  this fix; the 3 known-bad rows are fixed by direct UPDATE, not regeneration.
- Do not touch the `metadata` field drop noticed during investigation
  (`executeGeneration()` currently never persists `seed.metadata` even
  though the LLM prompt asks for it) — that's a separate, pre-existing gap,
  not connected to this bug. Worth a note for the founder, not a fix here.

## Verification

1. After the UPDATE statements: re-run the same read-only query used to
   find these in the first place (`explanation ILIKE '%wait, check%' OR ...`)
   against both databases — should return the same 3 rows but with the new
   clean explanation text, and a direct check that `correctAnswer` now
   matches each row's actual correct answer as derived above.
2. Add a unit test for `validateGeneratedSeeds()` (alongside whatever
   existing tests cover `content-generation.validator.ts`, if any — check
   first) asserting a seed whose `explanation` contains e.g. `"wait, let me
   recalculate"` is rejected, and a clean seed with the same question still
   passes.
3. Run the full `test:e2e` suite — must stay green, same count as before
   this change plus the new test(s).
