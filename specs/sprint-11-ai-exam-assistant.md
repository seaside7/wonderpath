# Sprint 11 — AI Exam Assistant v1

## Goal

Allow parents to tell Atlas that an exam is coming and, later, provide exam/review material so Atlas can create a targeted preparation plan.

## Product Flow

```text
Parent starts session
        ↓
Exam Tomorrow
        ↓
Choose subject
        ↓
Use child's profile
        ↓
Atlas identifies weak/relevant objectives
        ↓
Targeted preparation
```

## Current MVP Flow

Parent chooses:

```text
Exam Tomorrow

○ Math
○ English
○ Science
```

The subject options should respect the child's configured subjects/profile.

Parent does not need to type a long instruction.

## PDF / Photo Upload

This sprint is the planned place for:

- PDF upload
- Photo upload
- OCR / vision extraction
- Exam/review-topic extraction

The purpose is to allow a parent to provide:

- School review sheet
- Exam outline
- Teacher worksheet
- Study guide
- Other relevant material

## Processing Flow

```text
Parent uploads PDF/photo
        ↓
File validation
        ↓
Text / visual extraction
        ↓
AI identifies topics
        ↓
Map topics to Learning Graph
        ↓
Compare with Student Model
        ↓
Atlas creates preparation plan
```

## Atlas Behavior

Atlas should combine:

1. What the exam material appears to cover.
2. The child's current mastery.
3. Misconception signals.
4. Recency.
5. The selected curriculum.
6. The available question inventory.

Example:

```text
Exam topics:
Fractions
Decimals
Geometry

Emma:
Fractions = 92%
Decimals = 61%
Geometry = 78%

↓

Atlas priority:
1. Decimals
2. Geometry
3. Fractions review
```

## Safety / Reliability

AI-extracted exam topics are not automatically considered ground truth.

Store extraction confidence.

Allow the parent to correct/remove an extracted topic before Atlas uses it if the UX requires confirmation.

Do not fabricate exam content.

## File Handling

Use secure file validation.

Consider:

- File type
- File size
- Malware/security controls
- Storage lifecycle
- Access authorization
- Parent/child ownership

Do not expose uploaded files across families.

## Tests

Test:

- Exam context
- Subject selection
- PDF upload
- Photo upload
- Extraction
- Topic mapping
- Student Model integration
- Authorization
- Invalid files
- Large files
- Extraction failure

Mock external AI/OCR services in automated tests.

## Out of Scope

- Full school LMS integration
- Teacher portal
- Automatic grading of official school exams
- Guaranteed exam prediction
- Replacing teachers
