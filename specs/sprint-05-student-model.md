# Sprint 05 — Atlas Student Model v1

## Goal

Build the first version of Atlas Student Model.

Atlas must start understanding what each child knows by recording every question attempt and deriving mastery per learning objective.

## Product Principle

> Raw attempts are evidence. Student Mastery is derived knowledge.

Never replace raw attempt history with the current mastery result.

## Architecture Note

This is a project-wide rule (see WonderPath_CLAUDE_CONTEXT.md Sections 44 and 48), not specific to this sprint: implement mastery/Atlas logic at `apps/api/src/atlas/` — a module alongside `attempts`, `questions`, `sessions` — not in `packages/atlas`. Keep `packages/atlas` empty/minimal; do not build it out or wire it in yet.

Prioritize consistency with the existing Sprint 1-4 architecture, simplicity, and avoiding unnecessary ESM/CJS or package-wiring complexity. Keep the module boundary reasonably clean (no tangled cross-imports into `attempts`/`questions`/`sessions` internals) so extraction stays possible later, but do not build toward any future extraction now — there is no current plan to move this, only a goal to keep the door open.

## Scope

### 1. Question Attempt

Create an immutable attempt record containing:

- Child
- Learning Session
- Question
- Learning Objective
- Selected Answer
- Correct / Wrong
- Time Spent
- Hint Used
- Perceived Difficulty
  - Easy
  - Just Right
  - Difficult
- Attempt Number
- Metadata JSON
- Created At

### 2. Student Mastery

Create one mastery record per:

- Child
- Learning Objective

Store:

- Mastery Score
- Confidence Score
- Total Attempts
- Correct Attempts
- Wrong Attempts
- Average Response Time
- Hint Usage Count
- Last Practiced At
- Review Recommended
- Updated At

### 3. Mastery Calculation

Use a simple, explainable v1 heuristic based on:

- Correctness
- Response Time
- Hint Usage
- Perceived Difficulty

Keep weights in one configuration location.

Do not scatter magic numbers across the codebase.

This is a v1 heuristic, not a scientifically final model.

### 4. Recency

Mastery does not automatically decay.

Store:

- Last Practiced At
- Review Recommended

A child can have high mastery and still receive a review recommendation because the topic has not been practiced recently.

### 5. Explainability

Store reason codes such as:

- CORRECT_ANSWER
- WRONG_ANSWER
- FAST_RESPONSE
- SLOW_RESPONSE
- HINT_USED
- PERCEIVED_DIFFICULT
- LONG_TIME_NO_PRACTICE

## API

Implement:

```text
POST /attempts
GET /children/:childId/mastery
```

## Security

A parent can only:

- Submit attempts for their own child.
- Read mastery for their own child.

## Tests

Create:

```text
apps/api/test/student-model/student-model.e2e.ts
```

Test:

- Record attempt
- Update mastery
- Multiple attempts
- Mastery calculation
- Parent authorization
- Wrong-parent rejection
- Read mastery

Run all previous sprint tests as regression tests.

## Out of Scope

- LLM
- GPT
- AI question generation
- Recommendation engine
- Full misconception engine
- Parent dashboard UI
