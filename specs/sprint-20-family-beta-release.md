# Sprint 20 — Family Beta Release

## Goal

Everything through Sprint 19 works on a developer's machine. This sprint is what turns it into something your daughter opens on a tablet and your wife can actually use day to day: a real deploy, real (not synthetic) content, a safety fix that must land before real data exists, and a way for them to send feedback that reaches you without a conversation.

**This sprint is a release gate, not a feature sprint.** Items 1 and 2 below are hard prerequisites — do not deploy real users onto this system before they're done.

## Depends On

Sprints 17-19 (child mode, child experience, parent dashboard) — this sprint deploys and hardens what they built, it doesn't add new learning-facing UI.

## Scope

### 1. Fix Child Deletion — Soft Delete (prerequisite, do first)

Flagged in `docs/05-database-design.md` and still true: `ChildService.remove()` does `prisma.child.delete(...)`, and every related table (`QuestionAttempt`, `StudentMastery`, `LearningSession`, `MisconceptionSignal`, etc.) cascades on delete. Once your daughter has real attempt history, an accidental delete destroys it permanently with no recovery path.

- Add `deletedAt DateTime?` to `Child` (migration).
- `ChildService.remove()` sets `deletedAt: new Date()` instead of deleting.
- **Every place that looks up a child must now exclude soft-deleted ones** — this is the part most likely to be missed. At minimum: `ChildService`'s own list/find methods, and `apps/api/src/common/get-owned-child.ts` (the shared helper used by `student-model`, `exam-prep`, `misconception`, `learning-pattern`, `recommendation`, `learning-session`, and `child.service.ts` itself per Section 46's restructure) — add `deletedAt: null` to its lookup `where` clause once, in the shared helper, rather than patching every call site separately.
- No "restore" UI for v1 — a soft delete is enough to make this safe; undo-from-the-UI is a future nice-to-have.

### 2. Production Deployment

- Deploy `apps/api` + `apps/web` to the VPS, as **real production processes** (e.g. `pm2`, not `nest start`/`next dev`) — separate from the `qa-agent` setup, which stays dev-mode on its own ports against `wonderpath_qa`.
- Production uses its own real database (the `wonderpath` database already defined in `docker-compose.yml`, distinct from `wonderpath_qa`) — never point production at the QA database or vice versa.
- nginx reverse proxy + HTTPS (Let's Encrypt/certbot) on **`wonderpath.itsmesaid.id`** (confirmed — a temporary choice for now, matching the existing `second-brain` project's pattern on this same VPS; revisit if the founder wants a different domain later).
- **VPS resource check:** this VPS is shared with several other projects and currently sits at 2GB RAM. Confirm actual headroom with production API + web + Postgres + the existing other projects running together before going live — upgrade to the 4GB plan (already identified, cheap: ~Rp 90k/month, ~Rp 4k to switch) if it's tight. Do this check, don't assume either way.
- Daily automated database backup (`pg_dump` on a cron, retained for some rolling window, e.g. 14 days) for the **production** `wonderpath` database. Once real attempt history exists, this is the actual safety net — soft delete (above) protects against one mistaken action, backups protect against everything else (bad migration, disk failure, etc.).

### 3. Real Content

**Resolved:** the founder's daughter is Grade 5, IB curriculum (Al Jabar Islamic School, Jakarta) — this matches the existing seed content exactly (`apps/api/prisma/qa-seed/` already covers IB Grade 5-6, Math + English). No new curriculum hierarchy needed.

- Re-run the existing seed pipeline (`apps/api/prisma/seed-qa-test-questions.ts` + `qa-seed/`) targeted at the **production** `wonderpath` database instead of `wonderpath_qa` — same generation code, same 15% QA cross-check pass, different `DATABASE_URL`. Do not skip the QA cross-check for production content just because it worked once for the test batch.
- **Guardrail, not a suggestion:** the seed script's existing refusal check (`QA_DATABASE_URL` must contain `"wonderpath_qa"`) was written to protect against accidentally seeding test content into production. Running against production means deliberately using the real `DATABASE_URL`, not weakening or removing that check — if anything, add the mirror-image guard (refuse to run against a URL that *does* contain `wonderpath_qa` when a `--production` flag is passed, or similar) so the two directions can't be confused.
- Grade 6 content already exists too (generated alongside Grade 5) — fine to leave seeded for when she moves up; no need to filter it out.

### 4. Feedback — Two Separate Paths

**a. "Report a problem with this question"** (feeds the existing, currently-unused Living Question Bank counter):
- New endpoint `POST /questions/:questionId/report` (parent or child-mode session, i.e. same `JwtAuthGuard` as everything else — no new auth concept). Increments `QuestionPerformance.reportedProblemCount` (create the row if a question has never been served to anyone yet, same pattern as `recordAttempt`'s create-if-missing). Does not automatically change `status` — that stays driven by the existing wrong-rate logic in `question-performance.service.ts`; don't invent a new auto-retire rule tied to report count without that being its own explicit decision.
- Small "Something wrong with this question?" link/icon on the question screen (both kid-facing from Sprint 18 and the original parent/testing flow) — tapping it calls the endpoint and shows a brief "Thanks, we'll take a look" confirmation. No form/reason picker needed for v1.

**b. General "Send Feedback"** (reaches you directly):
- A simple always-reachable feedback entry point from the parent dashboard (not child mode) — a short form (free text + which child, if applicable).
- Given Sprint 2026-10-03's Linear integration already exists for QA findings (`qa-agent/lib/linear.js`), reuse the same mechanism: submitted feedback creates a Linear issue (same team, tagged distinctly from `[QA]` — e.g. `[Feedback]` prefix) so you and your wife see both QA findings and real human feedback in one place.
- This needs a small backend endpoint (`POST /feedback`, authenticated, stores nothing beyond what's needed to create the Linear issue — no need for a new `Feedback` database table for v1, the Linear issue *is* the record) that calls a shared version of the Linear issue-creation logic. If reusing `qa-agent/lib/linear.js` directly from `apps/api` turns out to be awkward (different runtime, different env/config loading), a small duplicated `createIssue` call is fine — don't force a shared package for two call sites.

## API Dependencies

```text
POST /questions/:questionId/report   (NEW)
POST /feedback                        (NEW)
```

## Out of Scope

- A full support/ticketing UI — Linear is the system of record, the app just opens issues into it.
- Restore-from-soft-delete UI.
- Multi-region/HA deployment — a single VPS, backed up daily, is the right scope for a family beta.
- Payments, billing, any multi-tenant/public-signup concerns — this release is for your own family, not a public launch.

## Manual QA Checklist

- Soft delete: deleting a child via the UI makes them disappear from every list, but the row (and all related attempt/mastery data) still exists in the database with `deletedAt` set. Confirm via a direct database check, not just the UI.
- A soft-deleted child cannot be reached through any existing endpoint (recommendations, mastery, sessions) even with a guessed/old ID — `getOwnedChild`'s filter must hold across all the modules that use it.
- Production deploy: `apps/web` reaches `apps/api` over HTTPS through the real subdomain, not `localhost`.
- Confirm production is reading from the `wonderpath` database and definitely not `wonderpath_qa` (check this explicitly — the entire point of the QA/prod split breaks silently if this is wrong).
- A real backup file is produced and is restorable (actually test a restore once, don't just trust that the cron ran).
- "Report a problem" increments the right question's counter and shows the confirmation — verify via the admin question-performance view (`GET /admin/question-performance`).
- Submitting general feedback creates a real Linear issue, visible to both you and your wife.
- Your daughter and wife can each independently open the app on their own device and get through: pick profile → learn → see today's summary (daughter), and dashboard → progress → misconceptions/difficulty (wife) — this is the actual acceptance test for the whole 17-20 arc, not just this sprint.
