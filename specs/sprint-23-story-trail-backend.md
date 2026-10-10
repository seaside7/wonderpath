# Sprint 23 — Story Trail (Leveled Reading Library): Backend + Generation Pipeline

## Goal

Add **Story Trail**, a Raz-Plus-style leveled reading library. Each book has illustrated pages, an optional **Listen with Atlas** mode (narration with word highlighting) or **Read by myself** mode, and a short comprehension quiz at the end.

This sprint is **backend only**: data model, AI generation pipeline with a content auditor, review workflow, and the API. The reader UI (page-flip book, Atlas narration, quiz screen) is a separate frontend sprint built against this API.

Pilot target: **3 books, Grade 5, English**. Never auto-publish — every book goes to `IN_REVIEW` and the founder approves it.

## Depends On

- The lazy TTS work (audio generated on first request, `/tts` static serving with CORS fixed). Build on top of it; do not start until it's merged.
- Independent of Sprint 22 (points). Do not award points for books in this sprint.

## 1. Content Policy (single source of truth)

Create `apps/api/src/atlas/books/content-policy.ts` exporting the rules as a list. **Both** the writer prompt (as constraints) and the auditor read from this one file, so they can never drift apart. The founder may edit this list; keep it plain and readable.

Rules:
- No LGBTQ+ themes, characters, or relationships.
- No romance, dating, or crushes.
- No pork, alcohol, or gambling.
- No depictions of prophets or religious figures.
- Respectful toward all religions; no mocking of beliefs.
- No violence, horror, or frightening content.
- No unsafe behavior a child might copy (e.g. playing with fire, talking to strangers as a positive act).
- No brand names or real commercial products.
- Age-appropriate vocabulary and themes for the target grade.

## 2. Data Model (Prisma)

```prisma
enum BookStatus {
  DRAFT
  IN_REVIEW
  PUBLISHED
  REJECTED
}

enum ReadingMode {
  LISTEN
  READ
}

model Book {
  id               String          @id @default(cuid())
  title            String
  summary          String
  grade            Grade
  trailStop        Int             // reading level within the grade, 1 = easiest
  language         PreferredLanguage @default(ENGLISH)  // match existing enum naming
  coverImageUrl    String?
  status           BookStatus      @default(DRAFT)
  wordCount        Int
  readabilityGrade Float           // Flesch-Kincaid grade level
  auditResult      Json?           // auditor verdicts (text + images), all attempts
  generationMeta   Json?           // models used, token usage, image count, est. cost
  createdAt        DateTime        @default(now())
  publishedAt      DateTime?
  pages            BookPage[]
  characters       BookCharacter[]
  quizQuestions    BookQuizQuestion[]
  readings         BookReading[]

  @@index([status, grade, trailStop])
}

model BookCharacter {
  id                 String @id @default(cuid())
  bookId             String
  book               Book   @relation(fields: [bookId], references: [id], onDelete: Cascade)
  name               String
  description        String // visual description used in every page prompt
  referenceImageUrl  String
}

model BookPage {
  id          String  @id @default(cuid())
  bookId      String
  book        Book    @relation(fields: [bookId], references: [id], onDelete: Cascade)
  pageNumber  Int
  text        String
  imageUrl    String?
  audioUrl    String? // generated lazily on first listen
  wordTimings Json?   // [{ word, startSec }] for highlighting, generated with audio

  @@unique([bookId, pageNumber])
}

model BookQuizQuestion {
  id            String @id @default(cuid())
  bookId        String
  book          Book   @relation(fields: [bookId], references: [id], onDelete: Cascade)
  order         Int
  prompt        String
  options       Json   // string[]
  correctAnswer String
  explanation   String
  attempts      BookQuizAttempt[]
}

model BookReading {
  id          String      @id @default(cuid())
  childId     String
  child       Child       @relation(fields: [childId], references: [id], onDelete: Cascade)
  bookId      String
  book        Book        @relation(fields: [bookId], references: [id], onDelete: Cascade)
  mode        ReadingMode
  lastPage    Int         @default(1)
  completedAt DateTime?
  quizScore   Int?        // number correct, set when quiz submitted
  updatedAt   DateTime    @updatedAt

  @@unique([childId, bookId])
}

model BookQuizAttempt {
  id                 String           @id @default(cuid())
  childId            String
  child              Child            @relation(fields: [childId], references: [id], onDelete: Cascade)
  bookQuizQuestionId String
  bookQuizQuestion   BookQuizQuestion @relation(fields: [bookQuizQuestionId], references: [id], onDelete: Cascade)
  selectedAnswer     String
  correct            Boolean
  createdAt          DateTime         @default(now())

  @@index([childId])
}
```

- `BookQuizAttempt` is **append-only**, same rule as `QuestionAttempt`.
- Match the existing enum mapping conventions in `schema.prisma` / `child.mapper.ts` for `Grade` and `PreferredLanguage`.
- **Apply the migration to both local databases (`wonderpath` and `wonderpath_qa`).** Missed migrations on one database have crashed the app twice this month.

## 3. Generation Pipeline

Script: `apps/api/scripts/generate-story-books.ts`
Usage: `pnpm tsx scripts/generate-story-books.ts --count 3 --grade "Grade 5" --trail-stop 3`

Reuse `apps/api/prisma/qa-seed/llmGateway.ts`'s `generate()` for all LLM calls (pass the provider/model explicitly). Follow the structure of `seed-nasional-questions.ts`: per-book try/catch, keep going on failure, print a summary at the end.

Per book:

1. **Write (DeepSeek, `deepseek-chat`).** One call returns strict JSON: title, summary, characters (name + detailed visual description), pages (text only, page by page), and 3 multiple-choice quiz questions (4 options, correct answer, short explanation). Include the content policy as hard constraints in the prompt. Target per trail stop is set in a config object (`BOOK_LEVELS` — word count range, pages, sentence length, Flesch-Kincaid band). Grade 5 pilot defaults: 8–10 pages, 600–1,000 words, FK grade 4.5–5.5. Fiction or non-fiction alternate; topics should fit an international Grade 5 child (adventure, nature, science curiosity, friendship, family, culture of Indonesia and the world).

2. **Rule checks (no LLM).** Word count in range; Flesch-Kincaid grade in band (implement a small syllable counter, no new heavy dependency); banned-words list from the content policy file; quiz answers must appear in their options; no leaked-reasoning phrases (reuse the marker list from `content-generation.validator.ts`).

3. **Text audit (GPT-4o-mini, a different model from the writer on purpose).** Model name from env `BOOK_AUDITOR_MODEL`, default `gpt-4o-mini`. Prompt with the full content policy and the full story + quiz; require strict JSON `{ pass: boolean, violations: [{ rule, quote, reason }] }`. On fail, rewrite with the violations fed back to the writer, max 2 rewrites, then save as `REJECTED` with the audit trail. Store every verdict in `auditResult`.

4. **Character reference sheets (Higgsfield `higgsfield-ai/soul/v2/standard`).** One image per main character: full body, plain background, the book's fixed art style (define one shared style string in config, e.g. "soft colorful children's book illustration, warm lighting, rounded shapes"). **No text in any image** — say so explicitly in every image prompt.

5. **Page illustrations (Higgsfield `xai/grok-imagine-image-2.0`).** Generate each page from the character reference images (pass their URLs in `image_urls`) so characters stay consistent — do not generate pages from text alone. Cover image the same way. Pilot: one image per page.

6. **Image audit (GPT-4o-mini vision).** Check each image for policy violations, visible text/letters, and obvious defects (extra limbs/fingers, distorted faces). On fail, regenerate that image once; if it fails again, keep it but flag it in `auditResult` for human review.

7. **Save.** Download every image to `apps/api/uploads/books/<bookId>/` (Higgsfield URLs may expire), store local paths, set status `IN_REVIEW`. Record models, token usage, image generation count, and estimated cost in `generationMeta`, and print per-book cost in the summary.

**Higgsfield API notes:**
- Base `https://api.higgsfield.ai`; auth header `Authorization: Key {HIGGSFIELD_API_KEY}`. The env value is already in combined `<key-id>:<key-secret>` form — use it as-is, do not split or reformat it.
- Async jobs: POST returns `{ status: "queued", request_id, status_url }`; poll `status_url` until `completed` or `failed` (add a timeout).
- Read the key from env var `HIGGSFIELD_API_KEY` (already set in `apps/api/.env`); fail with a clear message if missing. Add it (empty) to `apps/api/.env.example`. Never log the key value.
- Verify exact request/response field names against Higgsfield's current API docs before relying on the names above.

**Review script:** `apps/api/scripts/review-books.ts`
- `--list` — IN_REVIEW books with audit flags and per-book cost
- `--approve <bookId>` → `PUBLISHED`, sets `publishedAt`
- `--reject <bookId>` → `REJECTED`

## 4. API

All JWT-protected; child-scoped routes use `getOwnedChild` (404 for another parent's child, matching existing convention).

| Method | Path | Purpose |
|---|---|---|
| GET | `/children/:childId/books?grade=&trailStop=` | Published books (defaults to the child's grade), each with the child's `BookReading` progress |
| GET | `/children/:childId/books/:bookId` | Book with pages (text, imageUrl, audioUrl if generated), characters, quiz questions **without `correctAnswer`/`explanation`** |
| GET | `/books/:bookId/pages/:pageNumber/narration` | Lazy narration: if `audioUrl` is null, generate it now, save `audioUrl` + `wordTimings`, return both; otherwise return the saved ones. Never regenerate existing audio. |
| PUT | `/children/:childId/books/:bookId/progress` | `{ mode, lastPage, completed? }` upserts `BookReading` |
| POST | `/children/:childId/books/:bookId/quiz` | `{ answers: [{ questionId, selectedAnswer }] }` → per question `{ correct, correctAnswer, explanation }` + score; writes `BookQuizAttempt` rows and `BookReading.quizScore` |

- Only `PUBLISHED` books are visible, **except** when env `BOOKS_ALLOW_PREVIEW=true` (local only), where `IN_REVIEW` books are also returned, flagged `preview: true`, so the founder can look at a book in the reader before approving it.
- Narration uses the existing `TtsService` (Atlas voice `en-US-Wavenet-H`, pitch +7.0, rate 0.95). For word timings, use Google TTS **SSML marks with time pointing**: wrap each word in `<mark name="w{n}"/>` and request `enableTimePointing: ["SSML_MARK"]`. Timepoints are only available in the `v1beta1` client (`@google-cloud/text-to-speech` `v1beta1`), so add a method for it rather than changing the existing `v1` path. Store as `[{ word, startSec }]`. If TTS is in mock mode (no credentials), return `{ audioUrl: null, wordTimings: null }` without failing.
- Serve book images and audio statically the same way `/tts` is served (same CORS handling), e.g. `/book-media/<bookId>/<file>`.
- Add `apps/api/uploads/` to `.gitignore` if it isn't already.

## Out of Scope

- The reader UI, page-flip, home-screen tiles (separate frontend sprint)
- Points/rewards for reading (Sprint 22 integration comes later)
- Feeding quiz results into `StudentMastery`
- Bahasa Indonesia books, other grades, record-yourself mode
- Admin UI for review (scripts are enough for the pilot)

## Acceptance Criteria

- Running the pipeline with `--count 3 --grade "Grade 5"` produces 3 books in `IN_REVIEW` (or `REJECTED` with a clear audit trail), with all images downloaded locally, and prints per-book cost.
- A story that violates the content policy is caught by the auditor and rewritten or rejected (cover with a test using a mocked LLM response).
- No image prompt asks for text; image audit flags images containing letters.
- Unpublished books are invisible to the API unless `BOOKS_ALLOW_PREVIEW=true`.
- Book detail never exposes `correctAnswer` or `explanation` before quiz submission.
- Narration is generated once per page and reused on every later request; mock mode returns nulls without errors.
- Another parent's child → 404 on every child-scoped route.

## Testing

E2E tests in `apps/api/test/books/` for every acceptance criterion above (mock the LLM, Higgsfield, and TTS calls — tests must not spend money or need network). Then run the real pipeline once for the 3-book pilot and report the cost per book and any audit failures.
