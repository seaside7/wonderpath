# Sprint 07 — AI Content Generation v1

## Goal

Introduce the LLM as a content-generation component without turning Atlas into an LLM wrapper.

## Core Principle

> AI generates. Atlas decides.

The LLM does not decide the child's learning path.

Atlas determines:

- Curriculum
- Grade
- Subject
- Topic
- Learning Objective
- Desired difficulty signal
- Question type
- Quantity

The AI generates the content.

## Generation Flow

```text
Atlas needs questions
        ↓
Generation request
        ↓
LLM
        ↓
Question
Answer
Explanation
Metadata
        ↓
Validation
        ↓
Question Bank
```

## Batch Generation

Do not call the LLM once for every student question.

Generate batches.

Example:

```text
Generate 10 questions
```

Store them and let Atlas select from the inventory.

## Generated Data

Each generated question should contain:

- Question text
- Answer/options as appropriate
- Explanation
- Curriculum
- Grade
- Subject
- Topic
- Learning Objective
- Question type
- AI generation metadata
- Provider/model metadata
- Generation timestamp

## AI Difficulty

AI may return a suggested difficulty signal.

This is NOT the final personalized difficulty.

A question can be:

```text
AI suggested difficulty = 3
```

while:

```text
Emma perceives it as difficult.
```

Atlas should learn from actual student interaction.

Do not force admins to manually rate every question.

## Validation

Before saving AI output:

- Validate schema
- Validate required fields
- Validate answer structure
- Reject malformed output
- Prevent obvious missing metadata
- Keep generation failures retryable

## Cost / Latency

Use batch generation and background processing where possible.

Do not generate all possible:

```text
curriculum × grade × subject × topic × difficulty
```

every day.

Prefer demand-driven inventory.

## API / Worker

Choose architecture consistent with the existing project.

A future worker should be able to generate questions asynchronously.

## Tests

Test:

- Generation request validation
- Successful generation
- Invalid AI output
- Question persistence
- Metadata persistence
- Failure/retry behavior

Mock the LLM in automated tests.

Do not make the e2e test suite dependent on live LLM API calls.

## Out of Scope

- Advanced ML
- Misconception engine
- Exam PDF/photo upload
- Autonomous agents
- MCP requirement
