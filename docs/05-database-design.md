# 05 — Database Design & Audit

> Read-only audit. No schema or migration changes were made while producing this document.
> Source: `apps/api/prisma/schema.prisma` as of 2026-09-20.

**Important framing note before anything else:** this audit was requested as if Sprint 05 (Question Attempt, Student Mastery) is still upcoming. It isn't — the schema already contains full models for Sprints 05 through 11 (`QuestionAttempt`, `StudentMastery`, `MisconceptionSignal`, `ChildLearningPattern`, `ChildPersonalityPreference`, `QuestionPerformance`, `ExamPrepPlan`/`ExamMaterial`/`ExamTopic`), all reviewed and passing tests in an earlier session. Section 5 below evaluates what's actually built against what Sprint 05 required, rather than treating it as hypothetical.

---

## 1. Current Schema, Model by Model

### Parent
| Column | Type | Notes |
|---|---|---|
| id | String @id | cuid() |
| email | String | `@unique` |
| password | String | argon2 hash (see §3) |
| createdAt / updatedAt | DateTime | present |

Relations: `Parent 1—N Child` (`onDelete: Cascade`).

### Admin
Same shape as Parent (id, email `@unique`, password, timestamps). No relations — a fully separate identity, not a role flag on `Parent`. Matches the staff/parent trust-boundary separation already documented elsewhere in this project.

### Child
| Column | Type | Notes |
|---|---|---|
| id | String @id | |
| fullName | String | |
| nickname | String? | |
| dateOfBirth | DateTime @db.Date | date-only, correct |
| gender | Gender enum | BOY / GIRL |
| grade | Grade enum | GRADE_1..GRADE_6 |
| curricula | Curriculum[] | array of enum, multi-select |
| preferredLanguage | PreferredLanguage enum | |
| schoolName | String? | |
| parentId | String → Parent | `onDelete: Cascade` |
| createdAt / updatedAt | DateTime | present |

Index: `@@index([parentId])`.
Relations (all `onDelete: Cascade` from Child except where noted): `learningSessions`, `attempts` (QuestionAttempt), `masteryRecords`, `misconceptionSignals`, `subjectDifficulties`, `learningPatterns`, `personalityPreference` (1-1), `examPrepPlans`.

### LearningSession
| Column | Type | Notes |
|---|---|---|
| id | String @id | |
| childId | String → Child | `onDelete: Cascade` |
| curriculum | Curriculum enum | |
| subject | Subject enum | |
| status | LearningSessionStatus | STARTED / COMPLETED / CANCELLED, default STARTED |
| context | LearningSessionContext | NORMAL_LEARNING / EXAM_TOMORROW / HOMEWORK_HELP / QUICK_SESSION, default NORMAL_LEARNING |
| focusLearningObjectiveId | String? → LearningObjective | `onDelete: SetNull`, named relation `SessionFocus` |
| startedAt / createdAt / updatedAt | DateTime | present |

Index: `@@index([childId, status])` — good, this is exactly the lookup pattern `getCurrentSession` uses.

Note: `context` and `focusLearningObjectiveId` are **not** in Sprint 03's spec — they were added by Sprint 06 (Recommendation Engine / session context) onto the same table rather than a new one. Not a gap; flagging so it's not mistaken for scope creep in Sprint 03's own history.

### Learning Graph: SubjectArea → Topic → Subtopic → LearningObjective
All four models are **curriculum-agnostic** — none of them has a `curriculum` column. Only `Subject` (Mathematics/English) shapes the hierarchy.

- `SubjectArea`: `code: Subject @unique`, `name`. No timestamps.
- `Topic`: `name`, `subjectAreaId` → SubjectArea (Cascade). `@@unique([subjectAreaId, name])`, indexed on `subjectAreaId`. No timestamps.
- `Subtopic`: `name`, `topicId` → Topic (Cascade). `@@unique([topicId, name])`, indexed. No timestamps.
- `LearningObjective`: `name`, `description`, `estimatedMasteryTime`, `subtopicId` → Subtopic (Cascade). `@@unique([subtopicId, name])`, indexed. No timestamps.

### Question
| Column | Type | Notes |
|---|---|---|
| id | String @id | |
| questionText, questionType, options (Json), correctAnswer, explanation | | |
| curriculum | Curriculum enum | **lives here**, not on the graph — see §3 |
| grade | Grade enum | |
| difficulty | Int | |
| metadata | Json? | |
| learningObjectiveId | String → LearningObjective | `onDelete: Restrict` |
| generationId | String? → QuestionGeneration | `onDelete: SetNull` |
| createdAt / updatedAt | present |

Indexes: `learningObjectiveId`, `(curriculum, grade, difficulty)`, `generationId`. Good coverage for the search filters Sprint 04 specifies.

`Subject` and `Topic`/`Subtopic` are **not** direct columns on `Question` — they're derived transitively via `learningObjectiveId → subtopic → topic → subjectArea.code`. Confirmed this isn't a gap: `question.service.ts`'s `buildSearchWhere` filters by subject/topic through nested relation `where` clauses, and it works correctly. This is the *better* design (single source of truth) versus literally storing Subject/Topic/Subtopic as redundant columns on every question row — see §2 for the one place this reads as a spec mismatch.

### QuestionGeneration, QuestionAttempt, StudentMastery, MisconceptionSignal, ChildSubjectDifficulty, ChildLearningPattern, ChildPersonalityPreference, QuestionPerformance, ExamPrepPlan/ExamMaterial/ExamTopic

These are Sprints 06-11's tables. Full column lists are in `schema.prisma` directly; summarizing only what's load-bearing for this audit:

- `QuestionAttempt` — immutable event row (child, session, question, learningObjective, selectedAnswer, correct, timeSpent, hintUsed, perceivedDifficulty, attemptNumber, metadata, reasonCodes, createdAt only — **no `updatedAt`**, correctly, since it's append-only evidence). Indexes: `(childId, learningObjectiveId)`, `childId`, `learningSessionId`, `questionId` — well covered for the query patterns Sprint 05/06 need.
- `StudentMastery` — one row per (child, learningObjective), `@@unique([childId, learningObjectiveId])`, indexed on `childId`. `onDelete: Restrict` from LearningObjective (can't delete an objective that has mastery data — reasonable).

---

## 2. Spec Compliance Check (Sprints 01-04)

| Sprint | Spec requirement | Schema reality | Verdict |
|---|---|---|---|
| 01 | Parent: email, password, JWT | `Parent.email` (unique), `password` | Matches. Spec says "bcrypt" in its Non-Functional section; actual implementation is argon2 (already a known, deliberate deviation documented elsewhere in this project — not a new finding). |
| 02 | Child: fullName, nickname, DOB, gender, grade, curricula (multi), preferredLanguage, schoolName | All present, correct types | Matches exactly. |
| 02 | "Parent can only access their own children" | `Child.parentId` FK + app-level `getOwnedChild` check | Matches (verified in prior review, not re-audited here since this pass is schema-only). |
| 03 | LearningSession: Child, Curriculum, Subject, StartedAt, Status | All present | Matches. `context` + `focusLearningObjectiveId` are later, additive columns (Sprint 06) — see §1 note. |
| 04 | Question: text, type, options, correctAnswer, explanation | All present | Matches. |
| 04 | "Every question must have: Subject, Curriculum, Grade, Difficulty, Topic, Subtopic, Learning Objective" | Curriculum, Grade, Difficulty are direct columns. Subject/Topic/Subtopic are **derived**, not stored, via `learningObjectiveId`. | **Technical deviation from a literal reading, but the better design.** Worth a one-line confirmation in the spec itself that this was intentional, so a future reader doesn't "fix" it into denormalized columns. |
| 04 | "Only Admin can manage Question Bank" | Question CRUD controller is guarded by `AdminAuthGuard` | Matches. |
| — | Undocumented-in-spec additions | `Question.metadata` (Json?) — not mentioned in Sprint 04's spec but consistent with the project's stated "hybrid JSON metadata" philosophy for future-proofing. Not a concern. | Informational only. |

No spec requirement from Sprints 01-04 is missing from the schema. No undocumented schema addition looks accidental — everything traces to either a later sprint's spec or the project's own stated JSON-metadata philosophy.

---

## 3. Specific Risk Checks

### 3.1 Curriculum reuse — clean, confirmed

Adding a 5th curriculum (e.g. `SINGAPORE`) does **not** require touching any `Question` or `LearningObjective` row. Concretely, today, to add it:

1. One migration: `ALTER TYPE "Curriculum" ADD VALUE 'SINGAPORE'` (via `prisma migrate`) — enum value only.
2. Nothing else changes in `SubjectArea` / `Topic` / `Subtopic` / `LearningObjective` — they're curriculum-agnostic already (§1).
3. An admin creates new `Question` rows tagged `curriculum: SINGAPORE`, each pointing at an **existing** `learningObjectiveId` — the graph is reused, not duplicated.
4. `Child.curricula` can now include `SINGAPORE`; parents can select it for a session immediately.

This is the single cleanest part of the current schema. No recommendation needed — just confirming it's real, not accidental.

### 3.2 Child deletion — hard delete, real risk once Sprint 05 data exists

`ChildService.remove()` calls `this.prisma.child.delete({ where: { id: childId } })` — a genuine hard delete. Every relation from `Child` is `onDelete: Cascade`: `learningSessions`, `attempts` (QuestionAttempt), `masteryRecords` (StudentMastery), `misconceptionSignals`, `subjectDifficulties`, `learningPatterns`, `personalityPreference`, `examPrepPlans` (which cascades further into `ExamMaterial`/`ExamTopic`).

**This needs a decision, not a fix, before it matters in practice:** since Sprint 05+ is already built and `QuestionAttempt` is explicitly meant to be permanent evidence (this project's own stated principle: raw attempt history "should not be overwritten" and "future Atlas/ML systems may discover patterns not anticipated today"), a parent deleting a child today would permanently destroy that evidence — including any attempt history matching sprint 5-11's schema, since Cascade is already wired for it. If the founder wants attempt-level data preserved for research/ML even after a child profile is removed from the parent's view, this needs a soft-delete approach (e.g. a `deletedAt` column on `Child`, filtered out of normal queries) instead of the current hard `Cascade`. If losing that history on deletion is actually fine (e.g. "parent asked to delete their data, we delete it"), then the current behavior is correct as-is and no change is needed — but that should be a stated decision, not an implicit one.

### 3.3 Auth — confirmed

Both `Parent.password` and `Admin.password` are argon2 hashes (`argon2.hash()` / `argon2.verify()`, confirmed directly in `auth.service.ts` and `admin.service.ts` — not bcrypt, not plaintext). Column type is plain Prisma `String` (Postgres `TEXT`, unbounded) — no length constraint issue; argon2 hashes (~95-100 chars) fit with room to spare.

### 3.4 Timestamps — mostly consistent, four models have none

Present consistently on: `Parent`, `Admin`, `Child`, `LearningSession`, `Question`, `QuestionGeneration`, `ChildPersonalityPreference`, `ExamPrepPlan`, `MisconceptionSignal`.

**Missing entirely** (no `createdAt`/`updatedAt` at all): `SubjectArea`, `Topic`, `Subtopic`, `LearningObjective` — the whole Learning Graph. Low urgency (this is largely admin-managed, low-write-frequency reference data), but worth adding `createdAt` at minimum if you ever want to audit when curriculum content was added, or debug a "when did this learning objective show up" question.

**Partial** (one timestamp but not the other): `StudentMastery` and `ChildSubjectDifficulty` have `updatedAt` only, no `createdAt` (minor — first-write time is recoverable from the first `QuestionAttempt`, but not for free). `ExamMaterial` and `ExamTopic` have `createdAt` only, no `updatedAt` — meaning when an exam topic's `status` flips (CANDIDATE → CONFIRMED/REJECTED) or a material's `extractionStatus` changes, there's no record of *when*. This is a real gap if you ever want to show a parent "reviewed 2 minutes ago" or debug extraction timing.

None of this blocks anything — it's a documentation/observability gap, not a correctness bug.

### 3.5 Indexes — good coverage, one gap worth naming

Every foreign key that gets queried per-child or per-session already has an index: `Child.parentId`, `LearningSession.(childId, status)`, `Question.learningObjectiveId` + `(curriculum, grade, difficulty)`, `QuestionAttempt.(childId, learningObjectiveId)` + `childId` + `learningSessionId` + `questionId`, `StudentMastery.childId`.

One gap: `LearningObjective.subtopicId`, `Subtopic.topicId`, `Topic.subjectAreaId` are indexed (good), but none of `Question`, `QuestionAttempt`, etc. carry a denormalized `subjectAreaId`/`topicId` — so any query that wants "all attempts for this Topic" has to join up through `learningObjectiveId → subtopic → topic`. Fine at current data volume; worth knowing this join chain exists before someone writes a topic-level analytics query and wonders why it's slow at scale.

---

## 4. Sprint 05 Readiness (retrospective — this is already built)

The four tables Sprint 05 needed as FK targets — `Child`, `LearningSession`, `Question`, `LearningObjective` — all have:
- Stable `String @id @default(cuid())` primary keys (Postgres auto-indexes primary keys; nothing to add here).
- Adequate secondary indexes for the access patterns `QuestionAttempt`/`StudentMastery` actually use (confirmed in §3.5).

`QuestionAttempt` and `StudentMastery` themselves are well-structured for the volume this project expects (attempts growing into the millions): correct immutability (no `updatedAt` on `QuestionAttempt`, confirmed no `.update()`/`.delete()` calls touch it anywhere in `apps/api/src` per an earlier code review pass), correct separation of raw evidence vs. derived state, and correct indexing for both "all attempts for child+objective" and "all attempts in this session" lookups.

**One structural thing that would've made Sprint 05+ awkward, and did show up as a real bug in the prior code review:** `LearningObjective` ownership is completely clear (`subtopicId` → `Subtopic` → `Topic` → `SubjectArea`, all `Cascade`/unique-constrained) — that part was never awkward. What *was* awkward, because nothing in the schema enforces it, is that a `LearningSession.subject` and the `subject` implied by a `LearningObjective`'s hierarchy can silently disagree — the schema has no constraint tying `LearningSession.focusLearningObjectiveId` to `LearningSession.subject`. That's exactly the bug the last code review found and fixed at the application layer (`acceptRecommendation` now validates it, `question-serving` no longer drops the subject filter) — but it's worth naming here as a **schema-level gap**: this consistency currently lives entirely in application code, not in the database. Not recommending a schema change for it now (a check constraint across a relation like this isn't natural in Postgres/Prisma anyway) — just flagging that this is app-enforced, not DB-enforced, so any new code path that writes `focusLearningObjectiveId` needs to remember the same check.

---

## Summary of Findings Needing a Decision (not applied — awaiting review)

1. **Child hard-delete cascades into attempt history** (§3.2) — decide soft-delete vs. accept the data loss, before it matters at real scale.
2. **Learning Graph has no timestamps** (§3.4) — low urgency, add `createdAt` if content-audit ability matters.
3. **`ExamMaterial`/`ExamTopic` have no `updatedAt`** (§3.4) — add if "when did this status change" ever needs to be shown or debugged.
4. **Subject consistency between `LearningSession` and its `focusLearningObjective` is app-enforced only** (§4) — already patched at the application layer; flagging that it's not a DB-level guarantee, in case a new write path is added later.

Nothing above was applied. This document is investigation and documentation only, per the task's scope.
