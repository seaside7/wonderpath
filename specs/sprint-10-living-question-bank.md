# Sprint 10 — Living Question Bank v1

## Goal

Turn the Question Bank into a continuously improving inventory.

## Principle

> Generate when needed, learn from usage, reuse good questions, retire bad questions.

## Lifecycle

```text
AI Generates
     ↓
Validate
     ↓
Question Bank
     ↓
Student Uses
     ↓
Attempts
     ↓
Question Performance
     ↓
Reuse / Retire
     ↓
Inventory Replenishment
```

## Question Performance

Track signals such as:

- Times served
- Correct rate
- Average response time
- Perceived difficulty
- Hint usage
- Abandonment/failure signals
- Reported problems
- Metadata patterns

Do not conclude a question is bad from one student.

## Inventory

Atlas should know whether there are enough usable questions for:

```text
Curriculum
Grade
Subject
Learning Objective
```

If inventory is low:

```text
Inventory threshold reached
        ↓
Generate batch
        ↓
Store
```

## Background Generation

Generation should eventually happen asynchronously.

Avoid blocking the student's learning session when a suitable question can already be selected.

If no suitable question exists, a generation fallback may be used.

## Scheduling

Do not generate every possible combination every night.

Prefer:

- Demand-driven generation
- Inventory thresholds
- Background workers
- New-user/active-user demand

This reduces cost and unused content.

## Question Quality

Potential future status:

```text
ACTIVE
LOW_PERFORMANCE
REVIEW
RETIRED
```

Questions with consistently poor evidence can be retired.

## Storage

Keep structured query fields normalized.

Use JSON for flexible question metadata.

## Tests

Test:

- Inventory threshold
- Question selection
- Reuse
- Low-quality question handling
- Retirement
- Background generation trigger
- No duplicate uncontrolled generation
- Authorization

## Out of Scope

- Teacher review workflow for every question
- Advanced ML question-quality model
- PDF/photo exam assistant
