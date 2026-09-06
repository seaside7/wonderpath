# Sprint 13 — Web Child Profile Management

## Goal

Let a logged-in parent create and manage child profiles from the browser — the first screen that makes WonderPath feel like a real product instead of an empty shell.

## User Story

As a parent, I want to add and manage my children's profiles, so WonderPath knows who I'm setting up learning for.

## Depends On

Sprint 12 (auth + protected dashboard shell) must be complete.

## Scope

### 1. My Children (Dashboard)

- List all of the parent's children (`GET /children` or equivalent — follow whatever the existing API actually exposes).
- Each child card shows: Name, Grade, Supported Curricula.
- Example:

```text
Emma
Grade 5
IB + Nasional

[Start Learning]   [Edit]
```

- Empty state: "No children yet" + an "Add Child" call to action.

### 2. Add / Edit Child Form

Fields (match Sprint 02's Child Information exactly):

- Full Name (required)
- Nickname (optional)
- Date of Birth (required)
- Gender: Boy / Girl (required)
- Grade: 1-6 (required)
- Supported Curricula: multi-select — IB, Cambridge, Merdeka, Nasional (at least one required)
- Preferred Language: English / Bahasa Indonesia (required)
- School Name (optional)

Behavior:

- Create calls `POST /children` (or existing equivalent route); Edit calls the update route; both redirect back to "My Children" on success.
- Show field-level validation errors matching the API's validation responses — do not duplicate different rules on the client.

### 3. Delete Child

- Delete action with a confirmation step (e.g. a confirm dialog) — this is destructive and not undoable from the UI, so don't make it a single accidental click.

### 4. "Start Learning" Entry Point

- Each child card's "Start Learning" button navigates into the Sprint 14 flow (curriculum/subject selection). This sprint only needs the button and the navigation target to exist — the flow itself is Sprint 14's scope.

## API Dependencies (all already exist)

```text
POST   /children
GET    /children
GET    /children/:id
PATCH  /children/:id  (or PUT — match existing convention)
DELETE /children/:id
```

Inspect the actual Sprint 02 implementation in `apps/api` for exact route names/verbs and mirror them — do not guess if they differ from the spec's wording.

## Security

- The API already enforces "parent can only access their own children" (Sprint 02). The frontend must not assume it can show/edit a child by ID without the API's own authorization check backing it up — never trust a client-side route guard as the only protection.

## Architecture Note

Same as Sprint 12: no new state-management/data-fetching library. Reuse whatever auth/session pattern Sprint 12 established for attaching the JWT to requests.

## Out of Scope

- Learning session start/resume (Sprint 14)
- Question answering (Sprint 15)
- Atlas recommendations (Sprint 16)
- CMS child-related admin views (separate app)

## Manual QA Checklist

- Add a child with all required fields → appears in "My Children".
- Try to submit with a required field missing → inline error, no request sent (or a clean server-error surface if it is sent).
- Edit a child's grade/curricula → change persists after reload.
- Delete a child → requires confirmation, disappears from the list after confirming.
- Log in as a second parent → does not see the first parent's children.
