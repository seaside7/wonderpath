# Sprint 15 — Web Question Answering Flow

## Goal

Let a child actually answer questions inside a learning session, and submit each attempt to Atlas — the screen that makes WonderPath a learning product rather than a form-filling app.

## Depends On

Sprint 14 (session started/resumed) and Sprint 05 (Question Attempt backend).

## ⚠️ Backend Gap — Read Before Starting

None of the existing specs (Sprints 01-11) define an endpoint for **serving a question to a child during a session**. What exists:

- Sprint 04 gives admin-only Question CRUD/search (`Parents cannot access Question CRUD APIs` — explicitly out of reach for this flow).
- Sprint 05 gives `POST /attempts` (submit an answer) and `GET /children/:childId/mastery` — but nothing that returns "here is the next question to show."

This sprint cannot be completed without first adding a small, scoped backend endpoint, e.g.:

```text
GET /learning-sessions/:sessionId/next-question
```

...that selects an appropriate question for the session's child/curriculum/subject/learning-objective and returns it in a parent-safe shape (no `correctAnswer`, no internal difficulty metadata beyond what the UI needs). Treat adding this endpoint as a prerequisite task at the start of this sprint — either as a small addendum to this sprint's backend work, or as its own short sprint inserted before this one. Do not have OpenCode invent this endpoint's selection logic ad hoc without it being reviewed the same way any other Atlas-adjacent logic is (see WonderPath_CLAUDE_CONTEXT.md Section 44/48 — this is exactly the kind of "Atlas decides what to teach" logic that should live in the `atlas` module, not be improvised inside a controller).

## Scope (once the endpoint above exists)

### 1. Fetch & Display a Question

- On entering/resuming a session, fetch the next question via the endpoint above.
- Render based on `questionType`:
  - Multiple Choice: options as selectable buttons/radio group.
  - True/False: two buttons.
- Show question text, options, and (if present) any supporting visual/story context the question data includes.

### 2. Answer Submission

- On selecting an answer, capture:
  - Selected answer
  - Time spent (start a timer when the question renders, stop on submit)
  - Hint used (only if a hint feature exists in the question data for this sprint — if not, omit rather than fake it)
- Submit via `POST /attempts` with: child, session, question, learning objective, selected answer, time spent, hint used, attempt number.

### 3. Immediate Feedback

- Show correct/incorrect after submission, plus the question's `Explanation` if the backend returns one.
- Do not show the correct answer before submission.

### 4. Perceived Difficulty

- After feedback, ask the self-assessment question (per Sprint 05/WonderPath_CLAUDE_CONTEXT.md Section 13):

```text
😊 Easy
🙂 Just Right
😓 Difficult
```

- Include this in the same or a follow-up `POST /attempts` call, matching whatever the actual Sprint 05 API expects (single call vs. two-step — confirm against the implementation, don't assume).

### 5. Session Flow

- After each question, advance to the next one (fetch again) until the session's question count for that sitting is reached, or the parent/child ends the session.
- A basic "End Session" action, calling whatever session-completion endpoint Sprint 03 provides (mark session `Completed`).

## Architecture Note

No new state-management library. This screen has more local state (timer, current question, answer selection) than earlier sprints — a single component-level `useState`/`useReducer` is enough; do not reach for global state management for one screen's local flow.

## Security

- Never fetch or display `correctAnswer` before submission — verify the "next question" endpoint's response shape doesn't leak it.
- Attempts must be tied to the authenticated parent's own child/session — this is a server-side check (mirrors existing Sprint 01-05 authorization pattern), but the UI should never let a parent navigate into another child's session URL and expect it to silently work.

## Out of Scope

- Atlas recommendation of *which learning objective* to practice (Sprint 16 — this sprint assumes the session's subject/curriculum from Sprint 14 is enough to pick questions from)
- Mastery display to the parent (Sprint 16)
- AI-generated questions (Sprint 07, backend-only for now)

## Manual QA Checklist

- Question renders correctly for both Multiple Choice and True/False types.
- Submitting an answer shows correct/incorrect + explanation, never before submission.
- Perceived-difficulty prompt appears after every question.
- Time spent is captured and looks reasonable (not 0, not absurd).
- Ending a session marks it `Completed` and returns to the dashboard.
- Attempting to reach another parent's child's session via a guessed URL fails.
