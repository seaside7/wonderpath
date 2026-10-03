# WonderPath — Discussion Log

Things raised in conversation worth remembering — ideas, open product questions, decisions — not yet turned into Linear tickets. Newest entry first. The founder reviews this periodically and turns entries into Linear tickets himself.

This is distinct from `daily-update.md` (a diary of what was *done*) and `QA_NOTES.md` (automated QA findings specifically) — this file is for things *discussed*, not yet acted on.

---

## 2026-10-03 (later)

**Found: the built question flow's ordering contradicts its own written spec.**
Checked `specs/sprint-15-web-question-answering-flow.md` directly: it explicitly says submit → show correct/incorrect first → *then* ask "how did that feel?" afterward. What's actually built (both the original parent-facing flow and the kid-facing one from Sprint 18) does it backwards — asks perceived difficulty *before* revealing correctness. No documented reason found for why it was built the opposite way; looks like a deviation that happened during implementation, not a decision anyone wrote down.

Worth noting: there's a real argument the as-built order is actually *better* than the original spec — revealing correctness first could bias the child's self-report (calling something "Easy" in hindsight just because they got it right, or "Difficult" out of frustration after a careless wrong answer rather than genuine difficulty), which would quietly corrupt the exact signal the misconception/difficulty logic depends on. But that's a reasoned guess, not a documented decision. Founder said to just log this for now — needs an actual decision (keep as-built and update the spec to match reality, or "fix" it back to the original written order) before it's worth anyone touching the code.

## 2026-10-03

**Idea → spec: a "level up" moment when adaptive difficulty increases, plus sound/animation for every correct/wrong answer.**
Right now, when Atlas automatically raises a child's difficulty level (see the finding below), it's a completely silent backend change — the only place it's visible at all is a plain read-only line on the parent dashboard. The founder wants a real celebrated moment for this, and also asked for sound + animation on ordinary correct/wrong answers while we were at it. **Written up as `specs/sprint-21-feedback-moments.md` (2026-10-03), handed to OpenCode to build** — sounds are synthesized via the Web Audio API (no audio file assets needed), the level-up banner reuses the existing trail/waypoint visual language, and a level *decrease* stays exactly as invisible as it is today (never narrated as a setback). No longer just an idea — this entry stays as a record of where the ask came from.

**Open question: is the adaptive-difficulty "fast" threshold (10 seconds) too tight?**
Confirmed by reading the real code (`misconception.service.ts`): a correct answer only counts as "strong" (counts toward leveling up) if it was *also* answered within 10 seconds, not marked "Difficult," and without a hint. Checked against the founder's daughter's real attempts on staging: several of her correct, self-labeled "Easy" answers took 11-19 seconds, so they didn't count as "strong" even though she experienced them as easy. This may be too tight for longer/reading-heavy questions specifically — worth deciding whether the threshold should vary by question type/length, or stay global. Founder said "leave it as-is" for now, but flagged as worth revisiting.

**Idea: a future "visual/design-quality QA agent" using LLM vision.**
Distinct from the existing QA agent (which only makes deterministic API/DB assertions — right or wrong, no judgment calls). Prompted by a real example: the kid-facing question screen rendered number-comparison answer options (e.g. "5,623 5,632 5,326 5,263") in Fraunces, a decorative display serif — bad for scanning similar digit sequences, and missing tabular figures. No automated check caught it; the founder spotted it by eye. Proposed approach: periodically screenshot key screens and run them through a vision-capable design critique (Claude Code already has a `design-critique` skill for this), filing findings into Linear the same way the QA agent already does. Full written-up context already given to the founder in chat on this date for him to paste into a Linear ticket himself. Explicitly deferred until after the Sprint 17-20 family-beta track ships — needs a stable real product to have opinions about first.
