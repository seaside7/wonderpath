# WonderPath — Daily Update Log

A running diary of what's been done, in plain language, newest entry first. Updated whenever asked.

---

## 2026-09-20

**Backend review & fixes (Sprints 5-11):**
- Full code review of everything OpenCode had built (student model, recommendation engine, content generation, misconception, learning patterns, question performance, exam prep, question serving) — found and fixed real bugs: a seconds-vs-milliseconds unit mismatch that silently broke adaptive difficulty and the "Response Pace" pattern, mastery permanently contaminated by temporary session contexts (Exam Tomorrow/Quick Session), `replenish()` reporting success even when generation failed, a missing subject-validation gap in recommendation accept, unguarded post-transaction side-effect calls, and several smaller cleanups.
- Restructured Sprints 5-11 into `apps/api/src/atlas/` per the project's own architecture rule (they'd been built as flat top-level modules instead).
- Fixed a real concurrency bug in the e2e test suite (a shared `SubjectArea` race, plus every test file's `afterAll` was wiping *other* suites' data via a wildcard email-domain delete).
- Fixed frontend auth bugs (no global 401 handling, a session-end error being silently swallowed, a token-before-verify race) and separated admin/parent JWT secrets.

**Frontend design review (Sprints 12-14):** verified the new Fraunces/Inter theme, colors, and interactions actually render correctly (screenshots), caught and fixed one real violation of the design brief (an "eyebrow label" on the landing page that was explicitly banned in the brief).

**Database audit:** full audit of the schema against Sprints 1-4's specs, written to `docs/05-database-design.md`. Flagged: child deletion is a hard delete that would destroy attempt history once real data exists (needs a decision), a few tables missing timestamps, and confirmed curriculum reuse is clean (no content duplication needed to add a new curriculum).

**Fixed a real environment blocker:** the API couldn't boot at all outside of Jest on this machine (Node v24) — root-caused to two separate issues (missing `"type": "commonjs"` in `apps/api/package.json`, and Prisma's newer generator emitting ESM-only `import.meta` syntax). Fixed both, verified with a real end-to-end register call against a live server.

**QA/seed test content:** generated 1,080 original practice questions (IB curriculum, Grade 5 & 6, Math + English) into a new, separate `wonderpath_qa` test database — using a dual-provider pipeline (OpenAI `gpt-5.6-sol` for harder questions and Reading Comprehension/Writing, DeepSeek for the rest) with a 15% QA cross-check pass. One real content issue found and flagged (not auto-fixed) in a 3D Shapes question.

**Built the QA/self-improvement agent (`qa-agent/`):** a local, unattended system that drives the real app end-to-end (Playwright), checks behavior against the specs, logs findings, and can attempt fixes via headless Claude Code — gated by the full test suite, on an isolated daily branch that's never auto-merged to `main`. Planned and approved via a dedicated design pass (git safety mechanics reviewed separately) before writing any code, given the real risk of unattended commits. Got it running for real (not just "0 findings" on faith — verified against the actual database) after finding and fixing three bugs in the agent itself along the way: a stale Next.js dev cache silently pointing the browser at the wrong API, a Windows-specific process-cleanup bug that was leaking orphaned servers on every run, and two flow-timing bugs (clicking past the last question before ending a session; checking recommendations after the session had already ended, which correctly 404s by design).

**Finished expanding the QA agent's coverage (was "in progress" earlier today, now done and verified):** it no longer just tests login — it now goes through the full journey (register, add child, start session, answer questions, end session) plus every Atlas concept: recommendations, misconceptions, adaptive difficulty ("this question is hard" / level changes), learning patterns, personality/encouragement messages, and the admin-only Living Question Bank view. Three simulated parents (steady, struggling, confident) each answer 8 questions.

- Before wiring the new checks in, read the real backend code for each route (misconceptions, adaptive-difficulty, learning-patterns, admin question-performance) to confirm the actual response shape and field values, rather than guessing — this caught several mismatches up front (e.g. the adaptive-difficulty list endpoint doesn't include a rationale at all, only the single-subject endpoint does).
- First full test run with the new coverage flagged 7 things — but all 7 turned out to be mistakes in my own new checking code (wrong text casing: checking for `"Confirmed"` when the app actually returns `"CONFIRMED"`), not real problems in the app. Fixed those, re-ran, and got a genuinely clean result — confirmed by querying the actual test database directly afterward (3 parents, 3 completed sessions, 24 real question attempts, 3 misconception signals, 3 adaptive-difficulty records, 9 learning-pattern records all present), not just trusting the "0 findings" summary line.
- Also found and fixed two real bugs in the QA agent's own boot/cleanup plumbing (not the app): on a slow cold start, the agent could time out and, in a rare timing race, get stuck running forever instead of cleanly giving up. Fixed so it always exits cleanly either way, with a longer and more reliable startup check.
- Added easy commands for later: `cd qa-agent && npm run check` (test only, safe) and `npm run fix` (test and attempt fixes, capped and gated).
- Wrote `QA_NOTES.md` at the repo root — a plain-language, dated log specifically for QA agent findings, separate from this diary.
- Explained (but have not yet run) Windows Task Scheduler registration — the step that would let the QA agent run automatically every day without either of us starting it by hand. Recommended running `npm run fix` manually at least once first, to watch the real fix-cycle (commit/test/keep-or-revert) work before making it fully automatic.

**Key docs updated today:** `WonderPath_CLAUDE_CONTEXT.md` (Sections 44, 46, 49, 50, 51 — current sprint status, the Node/Prisma boot-fix note, and the QA agent + test-DB conventions; Section 50 updated again this afternoon to reflect the finished coverage expansion).

**Nothing from today is committed to git yet** — Sprint 5-11 fixes, the Atlas restructure, frontend fixes, the boot-fix, and all qa-agent work (including this afternoon's coverage expansion) are sitting uncommitted, by design (each was built/reviewed incrementally, commit timing hasn't been decided yet).

**Picking up tomorrow:** a live test of the QA agent's real fix cycle against an actual finding (not yet tried for real, since today's clean run had nothing to fix), and deciding whether to register it with Windows Task Scheduler to run on its own daily.
