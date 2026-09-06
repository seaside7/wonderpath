# Sprint 12 — Web Foundation & Parent Auth

## Goal

Give parents a real browser app to register, log in, and land on a dashboard — the foundation every later web sprint builds on. Nothing here is Atlas-specific; this sprint exists purely so a human can use WonderPath without Postman/curl.

## User Story

As a parent, I want to create an account and log in from a browser, so I can access WonderPath the way a real user would.

## Scope

### 1. App Shell

- `apps/web` App Router layout with two zones:
  - Public routes: landing, `/login`, `/register`
  - Protected routes: everything under a `(dashboard)` group
- A minimal top bar (logo/name + logout once authenticated). No full design pass yet — calm, readable, functional.
- Route protection: unauthenticated users hitting a protected route are redirected to `/login`.

### 2. Register Screen

Fields (match the existing API exactly):

- Email
- Password

Behavior:

- On submit, call `POST /auth/register`.
- On success, store the returned JWT and redirect to the dashboard.
- On duplicate email (409), show an inline "email already registered" message.
- On validation failure (400), show field-level errors.

### 3. Login Screen

Fields:

- Email
- Password

Behavior:

- On submit, call `POST /auth/login`.
- On success, store JWT and redirect to dashboard.
- On invalid credentials (401), show a generic "invalid email or password" message — do not reveal whether the email exists.

### 4. Session Handling

- On app load, if a JWT is present, call `GET /me` to restore the session before rendering protected routes.
- If `GET /me` fails (expired/invalid token), clear the stored token and redirect to `/login`.
- Logout clears the stored token and redirects to `/login`.

### 5. Dashboard Placeholder

- After login, show an empty "My Children" placeholder (Sprint 13 fills this in). This sprint only needs the authenticated shell to exist and render something.

## API Dependencies (all already exist)

```text
POST /auth/register
POST /auth/login
GET  /me
```

No backend changes needed for this sprint.

## Token Storage

Decide and document one approach — do not leave it ambiguous:

- Prefer an httpOnly cookie set by the API if that's feasible with the current CORS/auth setup, since it's the safer default against XSS.
- If the API only returns the JWT in the response body (current behavior per Sprint 01), store it in memory/`sessionStorage` for now rather than `localStorage`, and treat moving to httpOnly cookies as a fast-follow, not something to defer indefinitely.

## Architecture Note

Next.js 16 App Router, React 19, Tailwind v4 — use what's already in `apps/web`'s `package.json`; do not add a state-management or data-fetching library (Redux, Zustand, TanStack Query, etc.) for this sprint. A parent app-context/provider plus native `fetch` is enough at this scope. Introduce a fetching library later only if the manual approach genuinely becomes painful.

## Validation

- Email must be a valid email format (client-side check, but the server is the source of truth — never assume client validation replaces server validation).
- Password: enforce whatever minimum the API already enforces; do not invent new rules the backend doesn't know about.

## Security

- Never log the JWT or password to the console.
- Never render the password field's value back from any API response (it never should be returned, but don't assume — verify).

## Out of Scope

- Child management UI (Sprint 13)
- Learning session UI (Sprint 14)
- Forgot password / email verification (matches Sprint 01's Out of Scope — still not needed)
- CMS/staff login (separate app, separate sprint track)

## Manual QA Checklist

- Register with a new email → lands on dashboard.
- Register with an existing email → inline 409 error, no crash.
- Login with correct credentials → lands on dashboard.
- Login with wrong password → generic error shown.
- Reload the page while logged in → session restored via `GET /me`, no forced re-login.
- Manually visit a protected route while logged out → redirected to `/login`.
- Logout → redirected to `/login`, protected routes no longer accessible.
