# WonderPath — QA Agent Notes

Founder-facing notes on what the QA agent has checked and found, in plain
language. Newest entry first. This is distinct from `daily-update.md` (the
broader project diary) and from `qa-agent/daily-summary/` (the agent's own
automated per-run report, kept inside its own folder) — this file is
specifically "what the automated tester found and what I did about it,"
kept at the repo root so it's easy to find.

To run it yourself: `cd qa-agent && npm run check` (just tests, changes
nothing) or `npm run fix` (tests AND attempts fixes for anything it finds,
gated by the full test suite, capped at 5 kept fixes/day, never touches
`main` directly).

---

## 2026-09-20

**What changed today:** the QA agent used to only really test login. Today
it was expanded to test the full child's-eye journey end to end — register,
add a child, start a session, answer questions — plus everything Atlas
itself does: recommendations, misconceptions ("this looks like a pattern of
mistakes"), adaptive difficulty ("this question was too easy/hard, adjust
the level"), learning patterns, the personality/encouragement messages, and
the admin-only Living Question Bank view. Three simulated parents (a
steady learner, a struggling one, a fast/confident one) each went through
the whole thing, answering 8 questions each.

**What it found:** on the first real run with this wider coverage, it
flagged 7 things — but every one of them turned out to be a mistake in the
QA agent's own checking code, not a real problem in the app. I had guessed
the wrong text format for two values (e.g. checking for "Confirmed" when
the app actually uses "CONFIRMED"). Fixed those checks, ran it again, and
got a genuinely clean result — confirmed by looking directly at the test
database afterward (3 parents, 3 children, 3 completed sessions, 24
question attempts, 3 real misconception signals, 3 adaptive-difficulty
records, 9 learning-pattern records all present and correct), not just
trusting the "0 findings" summary line.

**Also fixed along the way (bugs in the QA agent's own plumbing, not the
app):** on a cold start, the app sometimes took longer to boot than the
agent was willing to wait, and when that happened the agent could get
stuck running forever instead of cleanly giving up and reporting the
problem. Fixed so it now waits long enough for a slow cold start and always
exits cleanly either way.

**Bottom line:** nothing wrong with the actual product was found today —
the work today was making the QA agent's coverage genuinely match what
WonderPath/Atlas actually does, and proving that coverage works by
checking the real data it produced, not just trusting its own report.

**Still to do before this can run fully unattended:** a live test of the
"find something wrong, fix it, verify, keep or undo" cycle against a real
issue (not yet tried for real), and registering it with Windows Task
Scheduler so it runs on its own daily.
