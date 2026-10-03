# Sprint 17 — Child Mode ("Who's Learning?")

## Goal

Today, a child uses WonderPath on the parent's own logged-in screen — full access to add/edit/delete children, no restriction at all. This sprint adds a profile picker and a screen lock so a child can open the app and land in a kid-only view, without being able to reach parent-only actions (editing profiles, deleting a child, account settings).

**This is a UI-layer screen lock, not a new account system.** There is still only one login: the parent's. "Entering child mode" restricts what the current parent session can reach in the UI; it does not create a second authentication principal. This is deliberately simple for a family-beta release — do not build a separate child login/JWT. If that's ever wanted, it's a much bigger, separate piece of work.

## Depends On

Sprint 13 (child profiles exist), Sprint 01 (parent auth — PIN logic extends `AuthService`, not a new module).

## Scope

### 1. Parent PIN (backend)

- Add `pinHash String?` to the `Parent` model (nullable — a parent may not have set one up yet; child mode is unavailable until they do). Migration only, no backfill needed.
- Add to the existing `ParentController` (`apps/api/src/parent/`, already has the authenticated `GET /me` → `ParentProfileDto`), not a new module:
  - `POST /me/pin` — `JwtAuthGuard`, body `{ pin: string }` (exactly 4 digits, validate with `class-validator`). Hashes with `argon2` (same convention as `AuthService.register`) and stores on the caller's own `Parent` row via `ParentService`. Setting a new PIN always overwrites — no "confirm old PIN" step for v1 (acceptable since this requires an already-authenticated parent session).
  - `POST /me/pin/verify` — `JwtAuthGuard`, body `{ pin: string }`, returns `{ valid: boolean }`. No lockout/throttle for v1 — this is a convenience lock for a home device, not a security boundary protecting sensitive data.
- Extend `ParentProfileDto` (returned by the existing `GET /me`) with `hasPin: boolean`, so the frontend knows whether to prompt "set up a PIN" vs "enter your PIN." Never return `pinHash` itself in any response.

### 2. Profile Picker (frontend)

Replaces today's behavior of landing directly on `/dashboard` (the children list) right after login.

```text
Who's learning today?

  [Emma]        [Dad]
  (avatar)      (parent icon)
```

- New route, e.g. `/dashboard` becomes this picker; the existing children list moves to `/dashboard/manage` (parent-only).
- Each child renders as a large tappable card (name + an avatar — a simple colored initial circle is enough, no image upload needed for v1).
- A separate "Parent" card/icon always present. Tapping it:
  - If no PIN is set yet: go straight to `/dashboard/manage` and show a one-time banner prompting them to set a PIN (link to a simple settings page with the `POST /me/pin` form).
  - If a PIN is set: show a PIN entry (4 single-digit boxes, numeric keypad on mobile) → `POST /me/pin/verify` → on success, go to `/dashboard/manage`.
- Tapping a child card enters child mode for that child (see below) and navigates straight to that child's "Today" screen (built in Sprint 18).

### 3. Child Mode (frontend)

- A simple client-side flag (e.g. `sessionStorage.setItem('childModeChildId', child.id)`), read by a layout wrapper around the kid-facing routes.
- Kid-facing routes live under a route group, e.g. `app/(kid)/learn/...`, rendered by a layout that:
  - Hides all parent navigation (no link to `/dashboard/manage`, no edit/delete anywhere reachable).
  - Shows a small, unobtrusive lock icon in a corner at all times.
  - Tapping the lock icon prompts the PIN (same `POST /me/pin/verify` flow) → on success, clears `childModeChildId` and returns to the profile picker.
- If `childModeChildId` is missing (e.g. direct URL entry, or `sessionStorage` cleared), the kid-facing layout redirects to the profile picker — never renders a kid screen with no selected child.
- **This is enforced in the UI only.** The API routes underneath are unchanged — still authorized by the parent's own JWT, same as today. Do not add any backend check for "is this request in child mode," since the backend has no concept of child mode at all; that would conflate a UI convenience with a real trust boundary (see Section 44 — `StaffUser`/`Parent` separation is the only real trust-boundary split in this system, and child mode must not be confused with it).

## API Dependencies

```text
POST /me/pin
POST /me/pin/verify
GET  /me               (existing — ParentController, extend ParentProfileDto with hasPin)
```

## Out of Scope

- Separate child login/account/JWT.
- PIN recovery flow ("forgot PIN") — for v1, a locked-out parent can reset it directly in the database, or via a future "forgot PIN → re-enter your account password" flow. Not needed for a two-user family beta.
- Avatar image upload — initials/color only.
- Rate-limiting or lockout on PIN attempts.

## Manual QA Checklist

- Fresh parent account (no PIN set): tapping "Parent" goes straight through, with a visible prompt to set a PIN.
- After setting a PIN: tapping "Parent" requires it; wrong PIN shows an error and does not unlock; correct PIN unlocks.
- Tapping a child card enters child mode and lands on that child's screen (Sprint 18 — if not built yet, a placeholder page is fine for this sprint's QA).
- From inside child mode: no link, button, or back-navigation reaches `/dashboard/manage`, any `/children/:id/edit` page, or the add-child flow.
- Tapping the lock icon from child mode prompts the PIN and returns to the profile picker on success.
- Directly navigating to a kid-facing URL with no child selected (e.g. a fresh tab, `sessionStorage` cleared) redirects to the profile picker, not a broken/empty screen.
- Switching between two children's profiles works correctly — no leftover state (e.g. previous child's session data) bleeding into the newly selected child's view.
