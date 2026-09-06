# Sprint 06 — Atlas Recommendation Engine v1

## Goal

Make Atlas capable of deciding what the child should learn next.

## Product Principle

> Atlas recommends. The parent remains in control.

Parents should not have to manually select a learning objective every day.

## Inputs

Atlas should use:

- Student Mastery
- Confidence
- Attempts
- Wrong answers
- Response time
- Hint usage
- Perceived difficulty
- Last Practiced At
- Review Recommended
- Learning Objective relationships
- Selected Curriculum
- Session Context

## Recommendation Decisions

Atlas can recommend:

- Continue current topic
- Review
- Practice
- Increase difficulty
- Decrease difficulty
- Move to another learning objective

## Recommendation Reason

Every recommendation must have an explainable reason.

Example:

```text
LOW_MASTERY
```

or:

```text
HIGH_MASTERY + LONG_TIME_NO_PRACTICE
```

Parent-facing explanation example:

> Fractions are strong, but decimals need more practice.

## Parent Flow

```text
Start Learning
      ↓
Atlas recommendation
      ↓
Why?
      ↓
[Start Learning]
[Choose Another Topic]
```

The parent can override Atlas.

## Curriculum

Respect the curriculum selected for the session.

A child may have multiple curricula.

Example:

```text
National
Cambridge
IB
```

A parent may choose National for this week's focus.

Atlas must not recommend learning objectives outside the selected curriculum unless explicitly allowed by the product flow.

## Session Context

Support temporary contexts such as:

- Normal Learning
- Exam Tomorrow
- Homework Help
- Quick Session

Do not permanently alter the Student Model because of temporary session context.

## API

Suggested:

```text
GET /children/:childId/recommendations
POST /learning-sessions/:sessionId/recommendation/accept
```

Follow existing architecture and naming conventions if the repository already has equivalent patterns.

## Tests

Create:

```text
apps/api/test/recommendation/recommendation.e2e.ts
```

Test:

- Recommendation for weak objective
- Recommendation for review due to recency
- Curriculum filtering
- Session context
- Parent authorization
- Parent override
- Explainability reason

## Out of Scope

- LLM
- Advanced ML
- Misconception detection
- AI-generated questions
- PDF/photo exam analysis
