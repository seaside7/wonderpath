# Sprint 14 — Web Learning Session Setup

## Goal

Let a parent start (or resume) a learning session for a child from the browser — curriculum and subject selection, the step right before actual questions appear.

## User Story

As a parent, I want to choose what my child studies today and start a session, so WonderPath can deliver the right content.

## Depends On

Sprint 13 (child profile UI, "Start Learning" entry point).

## Scope

### 1. Curriculum & Subject Selection

Triggered by a child's "Start Learning" button (Sprint 13).

- Curriculum: only the options in that child's supported curricula (from their profile) are selectable — do not show curricula the child isn't configured for.
- Subject: Mathematics / English (MVP subjects per Sprint 04).
- Example:

```text
Curriculum
○ IB
○ Nasional

Subject
○ Mathematics
○ English

[Start Learning]
```

- On submit, call the learning-session start endpoint with `childId`, `curriculum`, `subject`.

### 2. Current Session Card

- If the child already has an active/started session, show a "Resume" card instead of forcing curriculum/subject selection again:

```text
Current Session
Emma — IB Mathematics
Started 5 minutes ago
[Resume]
```

- "Resume" navigates into the same place Sprint 15's question flow will pick up.

### 3. Session Context (optional for this sprint)

Sprint 06's context concept (Normal Learning / Exam Tomorrow / Homework Help / Quick Session) is backend scope for a later sprint. If the current session-start API doesn't yet accept a context parameter, skip this UI entirely rather than building UI for a parameter the API doesn't take yet. Do not invent a context field the backend hasn't implemented.

## API Dependencies

```text
POST /learning-sessions        (start — confirm exact path/verb against the Sprint 03 implementation)
GET  /learning-sessions/current (or equivalent "get current session" route)
```

Inspect the actual Sprint 03 implementation for exact route names — the spec's wording ("Start Learning Session", "Get Current Session") may not match the literal path.

## Validation

- Selected curriculum must be one of the child's supported curricula — this is enforced server-side already (Sprint 03); the UI should also simply not offer invalid options, as a UX courtesy, not as the security boundary.
- Subject is required.

## Architecture Note

No new library. Continue reusing the auth/fetch pattern from Sprint 12.

## Out of Scope

- Question answering (Sprint 15)
- Atlas recommendation (Sprint 16 — for this sprint, curriculum/subject selection is fully manual, no "Atlas suggests" step yet)
- Session context UI (see note above — only add once the backend supports it)

## Manual QA Checklist

- Start a session for a child with two curricula → both appear as options, the child's other unsupported curricula do not.
- Start a session → current-session card appears with correct child/curriculum/subject.
- Reload the dashboard → current session persists (not lost on refresh).
- Attempt to start a session for a curriculum the child doesn't support → rejected (whether by the UI not offering it, or by a clean error if forced via direct request).
