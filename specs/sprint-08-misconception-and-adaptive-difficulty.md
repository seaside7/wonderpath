# Sprint 08 — Misconception Signals & Adaptive Difficulty v1

## Goal

Make Atlas understand more than correct/wrong.

Atlas should begin identifying repeated patterns that may indicate a misconception and adapt question challenge to the individual child.

## Principle

> One wrong answer is a signal, not a conclusion.

## Misconception Signal

Example:

```text
Equivalent Fractions

Wrong
Wrong
Correct
Wrong

↓

Possible Misconception
Confidence: 65%
```

More evidence can increase confidence.

Only strong repeated evidence should become a high-confidence misconception.

## Data

Track:

- Child
- Learning Objective
- Signal type
- Evidence count
- Confidence
- First detected
- Last detected
- Status
- Supporting attempt IDs / metadata where appropriate

## Question Metadata

Use existing flexible metadata to detect patterns such as:

- Story question
- Visual question
- Word problem
- Operation type
- Language complexity
- Representation type

Example:

```json
{
  "questionType": "story",
  "visual": false,
  "languageComplexity": "high"
}
```

Do not put core relational fields into JSON.

## Adaptive Difficulty

Difficulty should be personalized from observed performance.

Example:

```text
Question technically rated 3

Emma:
Correct
Fast
Easy

↓

Atlas may increase challenge.
```

Another child:

```text
Question technically rated 3

Emma:
Wrong
Slow
Difficult

↓

Atlas may reduce challenge or provide scaffolding.
```

## Important

Do not treat AI-suggested difficulty as absolute.

Do not ask the parent to manually classify every question.

Student interaction is the primary personalization signal.

## Tests

Test:

- Repeated misconception signals
- Confidence accumulation
- No premature strong misconception
- Adaptive difficulty recommendation
- Question metadata usage
- Parent/child authorization

## Out of Scope

- Full ML classifier
- Knowledge tracing model
- Advanced statistical psychometrics
- Exam PDF/photo upload
