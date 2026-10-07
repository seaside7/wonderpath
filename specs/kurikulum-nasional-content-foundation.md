# Kurikulum Nasional Content Foundation (Math + English, no new subject yet)

**Type:** Content/pipeline foundation work, not a full feature sprint.

## Context

The question bank currently has 1080 questions, 100% tagged `curriculum: IB`
(verified directly: `SELECT curriculum, count(*) FROM "Question" GROUP BY
curriculum` returns a single row, `IB|1080`). `Curriculum.NASIONAL` exists
as an enum value and is selectable on a child's profile, but has zero
content behind it today.

This spec covers the **code/schema changes only** needed before Nasional
content can be generated - it does not generate the actual question
volume. That's a separate content-ops execution step (calling the existing
`/generations` endpoint repeatedly), done directly afterward, not part of
this implementation task.

Explicitly deferred (do not build in this pass): a dedicated
`BAHASA_INDONESIA` subject. This wave reuses the two existing subjects,
`MATHEMATICS` and `ENGLISH`, just tagged `curriculum: NASIONAL` - Math
content gets written in Bahasa Indonesia (the actual language of
instruction for this curriculum), English content stays in English (it's
an English-language class either way, so no language change needed there).

## Part 1 — Add the missing Math topic: Data & Peluang

Confirmed by reading every existing Mathematics learning objective
directly: the current bank covers Number Sense, Fractions, Decimals,
Percentages, Geometry, and Measurement - a reasonable match for Kurikulum
Merdeka/Nasional's Grade 5-6 Matematika domains (Bilangan, Geometri,
Pengukuran). It is **missing** the "Analisis Data dan Peluang" domain
entirely (basic data reading - tables, bar charts - and simple probability
concepts), which is a real part of that curriculum's scope at this grade
band.

Add one new `Topic` under the existing `MATHEMATICS` `SubjectArea`, with a
`Subtopic` and 2-3 `LearningObjective` rows, matching the shape and level
of the existing ones. Suggested (adjust naming/scope as needed, this is a
starting point not a rigid spec):

- Topic: "Data & Probability" (English label is fine - existing topic
  names are all English regardless of curriculum, e.g. "Fractions",
  "Geometry" - the learning objective is a curriculum-agnostic concept,
  only the generated `Question` text differs by curriculum/language)
  - Subtopic: "Reading & Interpreting Data"
    - LO: "Read and interpret data from tables and bar charts"
    - LO: "Find the mean (average) of a simple data set"
  - Subtopic: "Basic Probability"
    - LO: "Describe the likelihood of simple events (certain, likely, unlikely, impossible)"

Write this as a small, idempotent seed script (upsert-based, so it's safe
to re-run) following the same pattern already used in
`apps/api/test/student-model/attempt-levelup.e2e.ts`'s `beforeAll` (which
does `prisma.subjectArea.upsert(...)` then nested `topic.create` with
`subtopics: { create: { learningObjectives: { create: {...} } } }`) -
except this needs to be a real, runnable script (e.g.
`apps/api/scripts/seed-data-probability-topic.ts` or similar, run via
`ts-node` or compiled, not a test file), not a test. It needs to run
successfully against both the local `wonderpath_qa` database and
eventually the staging VPS's `wonderpath` database (same transfer pattern
as before - this script itself is portable, just run it against each
target `DATABASE_URL`).

## Part 2 — Add a language parameter to the generation pipeline

Confirmed exact code path by reading the source:

- `apps/api/src/atlas/content-generation/dto/create-generation.dto.ts` -
  `CreateGenerationDto` has no language field at all today.
- `apps/api/src/atlas/content-generation/providers/content-generator.interface.ts`
  - `GenerationRequest` interface (lines 14-29) also has no language field.
- `apps/api/src/atlas/content-generation/providers/llm-content-generator.ts`
  - `buildPrompt()` (line 100) hardcodes no language instruction at all -
    the LLM just defaults to English because the few-shot/system prompt
    implicitly assumes it.

Add a `language` field, typed against the existing `PreferredLanguage` enum
(`ENGLISH | BAHASA_INDONESIA`, already defined in `schema.prisma` and used
elsewhere for a child's own preferred language) - reuse that enum, don't
invent a new one:

1. `CreateGenerationDto`: add `@IsEnum(PreferredLanguage) language: PreferredLanguage;`
2. Thread it through wherever `content-generation.service.ts` builds the
   `GenerationRequest` from the DTO (`executeGeneration()`/`create()`/
   `retry()` - check `retry()` specifically, since it rebuilds the request
   from stored `generationMetadata` and needs to preserve the original
   language on a retry, not default back to English).
3. Add `language: PreferredLanguage` to the `GenerationRequest` interface.
4. In `llm-content-generator.ts`'s `buildPrompt()`, add an explicit
   instruction line when `request.language === PreferredLanguage.BahasaIndonesia`
   (check the actual enum member casing in the generated Prisma client,
   it may be `BahasaIndonesia` or `BAHASA_INDONESIA` depending on how
   `prisma-client`'s JS enum mapping works - verify, don't guess), e.g.:
   `"Write the question text, options, and explanation entirely in Bahasa Indonesia (not English)."`
   placed clearly near the top of the prompt, not buried at the end.
5. Also update `mock-content-generator.ts` (used when
   `ATLAS_CONTENT_PROVIDER` is unset/`mock`) so local dev/tests don't break
   - it doesn't need real translation, just needs to accept the new field
   without erroring (e.g. it can keep returning English mock text
   regardless of `language` - that provider's whole point is being a fast,
   deterministic stand-in, not a real content generator).
6. **Also update `content-generation.validator.ts`'s leaked-reasoning
   check** (just added in commit `4b6bd09`) - the current marker list
   ("wait,", "let me recalculate", etc.) is English-specific. If an
   Indonesian-language generation leaks the same kind of self-correction
   monologue, it won't be in English, so those markers won't catch it.
   Either add Bahasa Indonesia equivalents ("tunggu,", "biar saya
   hitung ulang", "jadi saya perlu", etc.) or flag this as a known gap in
   a code comment if full bilingual coverage feels like overkill for now -
   don't silently leave non-English generations unchecked without at least
   noting it.

## Out of scope (explicitly, so this doesn't scope-creep)

- Do not add a `BAHASA_INDONESIA` `Subject` (separate from
  `PreferredLanguage`) - that's deferred, a different piece of work.
- Do not actually call `/generations` to produce the Nasional question
  volume - that's a content-ops execution step done separately after this
  lands, not part of this task.
- Do not touch `CAMBRIDGE` or `MERDEKA` curricula - Nasional only, for now.
- Do not build an admin UI/endpoint for creating topics/subtopics/LOs -
  the seed script in Part 1 is sufficient; there is no existing
  admin-facing CRUD for the learning graph today and this doesn't need to
  introduce one.

## Verification

1. Run the seed script against local `wonderpath_qa`, confirm the new
   topic/subtopic/LOs exist and the existing Math LOs are untouched.
2. Full `test:e2e` suite - must stay green (currently 102/102).
3. Add a focused test (unit or e2e, whichever fits the existing test
   conventions in `test/content-generation/`) asserting that a
   `CreateGenerationDto` with `language: BAHASA_INDONESIA` produces a
   `GenerationRequest`/prompt that actually contains the Indonesian-language
   instruction, and that one with `language: ENGLISH` does not add it -
   this doesn't need a real LLM call, just assert on the constructed
   prompt string or request object.
4. Manually trigger one real generation call (against the mock provider is
   fine for this check, or the real provider if `ATLAS_CONTENT_PROVIDER`
   is configured) with `curriculum: NASIONAL`, `language: BAHASA_INDONESIA`,
   against the new Data & Peluang learning objective, and eyeball the
   result once before calling this done.
