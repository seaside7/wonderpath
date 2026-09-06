# WonderPath — Claude Project Context

> **Purpose:** This document is the handoff context for Claude/Claude Code. Read this before modifying the WonderPath codebase.
>
> **Current development status:** Sprint 04 completed and tested. Sprint 05 is planned but should not be implemented until explicitly requested.

---

# 1. What is WonderPath?

WonderPath is an Indonesian EdTech product focused on personalized learning for children.

Initial target:

- Indonesian children
- Grade 1–6
- MVP focuses on Math and English
- Multiple curriculum support
- Parent-controlled learning
- Adaptive learning powered by an intelligence layer called **Atlas**

The long-term vision is not simply "AI generates educational questions."

The product vision is:

> **Every child deserves a learning journey as unique as they are.**

Mission:

> **Empower parents with confidence and children with personalized learning through adaptive intelligence.**

---

# 2. Founder/Product Thinking

WonderPath is being built initially by a very small team: the founder and his wife.

Therefore:

- Avoid solutions that require a large teaching/content team.
- Avoid workflows where a teacher must manually review every AI-generated question.
- Automation is extremely important.
- MVP should be technically strong but operationally realistic.
- AI should reduce operational workload rather than create a new manual workload.

The founder is technical and is actively building the product himself with AI coding tools such as Cursor/Kiro/Claude Code.

Communication preference:

- Simple English.
- Be concise unless deeper explanation is requested.
- When discussing architecture, explain objectively.
- Challenge assumptions when appropriate.
- Think like a senior engineer + CTO + startup product strategist.
- Do not blindly agree with every product idea.
- Prefer practical MVP decisions with a clear path to scale.

---

# 3. Core Product Differentiation

The founder does NOT want WonderPath to become another generic AI tutoring app.

The important differentiation is:

Competitors often provide:

- Generic content
- Same learning path for everyone
- Limited personalization
- Static question banks

WonderPath should instead learn:

1. What the child knows.
2. What the child struggles with.
3. How the child learns.
4. How difficult a question feels to that child.
5. Which misconceptions may exist.
6. What should be learned next.
7. Why Atlas made a recommendation.

The long-term moat is **Atlas's accumulated understanding of how children learn**, not the underlying LLM.

---

# 4. Atlas — What It Is

Atlas is the intelligence layer of WonderPath.

Important terminology:

Atlas is NOT itself an LLM.

Atlas is NOT simply "generative AI."

Atlas is an **adaptive learning intelligence / decision engine**.

A useful mental model:

```text
LLM / AI
    ↓
Generates educational content
    ↓
Atlas
    ↓
Understands evidence about the child
    ↓
Decides what to teach
    ↓
Decides how to teach
    ↓
Explains why
```

The LLM is a tool used by Atlas.

Atlas should eventually be able to use:

- Rules
- Statistical models
- Student history
- Question performance
- Self-assessment
- Recommendation logic
- Future ML models
- LLM-generated content

Do not design the architecture so that WonderPath is fundamentally dependent on one LLM provider.

---

# 5. Atlas Core Philosophy

## Principle 1 — Atlas accumulates evidence

Atlas should not make strong conclusions from one answer.

Example:

```text
One wrong answer
    ↓
Potential signal

Several repeated signals
    ↓
Higher confidence

Strong repeated evidence
    ↓
Possible misconception
```

Atlas should express uncertainty internally.

Example:

```text
Possible misconception:
Equivalent Fractions

Confidence: 65%
```

Later:

```text
Confidence: 95%
```

Only then should it become a strong student insight.

---

## Principle 2 — Parents think in outcomes; Atlas thinks in learning objectives

A parent may think:

```text
Semester 1 Math = 70

Target:
Semester 2 Math = 80
```

Atlas thinks:

```text
Fractions
Decimals
Geometry
Measurement
...
```

The parent should not have to manually manage dozens of learning objectives.

Atlas should translate the parent's desired outcome into learning actions.

---

## Principle 3 — Mastery does not silently decay

If a child has:

```text
Fractions = 95%
```

and does not practice for six months, do NOT automatically change:

```text
95% → 75%
```

Instead store:

```text
Mastery = 95%
Last Practiced = 180 days ago
Review Recommended = true
```

Mastery and recency are separate concepts.

---

## Principle 4 — Atlas must be explainable

Every important Atlas recommendation should have an explanation.

Internal reason codes can include:

```text
LOW_MASTERY
LOW_CONFIDENCE
HIGH_RESPONSE_TIME
SLOW_RESPONSE
HINT_USED
PERCEIVED_DIFFICULT
LONG_TIME_NO_PRACTICE
POSSIBLE_MISCONCEPTION
```

Parent-facing language should be human-readable.

Example:

> Emma answered 4 of her last 6 fraction questions correctly, but took longer than usual and marked several questions as difficult. Atlas recommends a short review.

Never make Atlas feel like a mysterious black box.

---

## Principle 5 — Praise must be grounded in data

Atlas can have personality from the first release.

However, avoid generic AI praise.

Bad:

> Great job!

Better:

> You solved today's questions 40% faster than yesterday.

Atlas should be a personal learning coach, not a generic chatbot.

---

# 6. Atlas Architecture Concept

Long-term conceptual architecture:

```text
                    ATLAS
                      │
       ┌──────────────┼──────────────┐
       │              │              │
 Student Model   Recommendation   Relationship
       │              │              │
       │              │              │
 Mastery         Next Lesson      Personality
 Confidence      Sequencing       Motivation
 Signals         Difficulty       Memory
 Recency         Context          Communication
       │
       ├── Misconception Signals
       ├── Learning Style Signals
       └── Question Performance
```

Atlas should eventually contain:

1. Learning Graph
2. Question Inventory Manager
3. Student Model
4. Mastery Engine
5. Misconception Engine
6. Recommendation Engine
7. Session Context
8. Explainability Layer
9. Relationship/Personality Layer
10. AI Content Generation Worker

Not all of these are MVP features yet.

---

# 7. Learning Graph

Conceptual hierarchy:

```text
Curriculum
    ↓
Grade
    ↓
Subject
    ↓
Topic
    ↓
Subtopic
    ↓
Learning Objective
    ↓
Question
```

Atlas reasons primarily around **Learning Objectives**, not individual questions.

Example:

```text
Math
  ↓
Fractions
  ↓
Equivalent Fractions
  ↓
Learning Objective
  ↓
Questions
```

A question is evidence about a learning objective.

---

# 8. Multiple Curricula

WonderPath supports multiple curricula.

Examples discussed:

- Nasional
- Cambridge
- IB / PYP

The parent may configure the child's curriculum.

Important product behavior:

A child can have multiple curricula available.

When starting a learning session, the parent can choose which curriculum to focus on.

Example:

```text
Today's Learning

Which curriculum?

○ Nasional
○ Cambridge
○ IB
```

A parent may decide:

> This week, focus only on the Nasional curriculum.

This should be supported by the learning-session model.

Do not assume a child has only one curriculum.

---

# 9. Session Context

Before starting a learning session, the parent may select an optional context.

Examples:

```text
Normal Learning
Exam Tomorrow
Homework Help
Quick Session (10 min)
```

This is temporary context.

It should influence today's strategy without permanently changing the Student Model.

Example:

```text
Exam Tomorrow
    ↓
Ask subject
    ↓
Math
    ↓
Atlas recommends weak/relevant topics
```

For the MVP, avoid making the parent type long free-form instructions.

Prefer one-tap choices.

---

# 10. Exam Mode

If parent chooses:

```text
Exam Tomorrow
```

Atlas should:

1. Ask the subject.
2. Use the child's existing profile.
3. Recommend the topics that need attention.
4. Parent can accept Atlas's recommendation or choose manually.
5. Review weak areas.
6. Potentially provide a short mock exam.

Future feature:

- Parent uploads PDF.
- Parent uploads photo of teacher worksheet/review sheet.
- AI/OCR/Vision extracts topics.
- Atlas combines exam material with Student Model.
- Atlas generates targeted preparation.

This upload/PDF/photo functionality is intentionally deferred to approximately **Sprint 11**.

Do not implement it early unless explicitly requested.

---

# 11. Question Generation Strategy

Important architectural decision:

Do NOT generate a new GPT question for every question the child answers.

Instead:

```text
Atlas determines need
        ↓
AI generates a batch (e.g. 10 questions)
        ↓
Store questions
        ↓
Atlas selects questions
        ↓
Child answers
```

Benefits:

- Lower AI cost
- Lower latency
- Better sequencing
- Reusable questions
- Easier quality evaluation

The first user may experience a short generation delay if there is no existing inventory.

Future optimization:

```text
Background worker
    ↓
Question inventory threshold
    ↓
Generate before needed
```

Do not generate every curriculum × grade × topic × difficulty combination every night. That wastes money and produces unused content.

Preferred long-term strategy:

**Demand-driven + inventory threshold + background pre-generation.**

---

# 12. Living Question Bank

The question bank should be "living", not a manually maintained static library.

Concept:

```text
AI generates
    ↓
Students use
    ↓
Attempts generate evidence
    ↓
Question quality evaluated
    ↓
Good questions reused
    ↓
Poor questions retired
    ↓
Inventory replenished
```

The question bank grows naturally from actual demand.

Question metadata should eventually include things like:

```text
questionType
visual
story
operation
languageComplexity
concept
difficulty signals
```

Do not require the founder to manually rate every question.

---

# 13. Difficulty Philosophy

A question can have an objective/technical difficulty, but the important personalization signal is:

> **How difficult was this question for this child?**

After answering, the child can provide:

```text
😊 Easy
🙂 Just Right
😓 Difficult
```

This is called perceived difficulty/self-assessment.

Example:

```text
Emma
Correct
18 sec
Perceived: Difficult
```

This tells Atlas more than correctness alone.

Another child may get the same question:

```text
Ryan
Correct
7 sec
Perceived: Easy
```

Same question, different learner experience.

This is central to personalization.

---

# 14. Raw Question Attempt Data

Every question attempt should be treated as immutable event/history data.

Conceptual fields:

```text
child
learningSession
question
learningObjective
selectedAnswer
correct
timeSpent
hintUsed
perceivedDifficulty
attemptNumber
metadata JSON
createdAt
```

The raw event should not be overwritten just because Student Mastery changes.

Why?

Because future Atlas/ML systems may discover patterns that were not anticipated today.

Example:

A child may be:

- Strong on normal fraction questions
- Weak on fraction word problems
- Strong when visuals are present
- Slow when language complexity is high

If only "correct/wrong" is stored, those patterns are lost.

---

# 15. JSON Metadata Philosophy

Use a hybrid database design.

Frequently queried fields should be normal structured columns.

Example:

```text
correct
timeSpent
hintUsed
questionId
learningObjectiveId
childId
```

Flexible/future metadata can be JSON.

Example:

```json
{
  "questionType": "story",
  "visual": false,
  "languageComplexity": "high",
  "operation": "comparison"
}
```

This allows Atlas to learn new patterns without constantly changing the database schema.

However:

**Do not put everything into JSON.**

Core business/query fields should remain normalized.

---

# 16. Student Model

Student Model is **derived knowledge**.

Raw history:

```text
Question 1 → Correct
Question 2 → Wrong
Question 3 → Correct
...
```

Derived knowledge:

```text
Equivalent Fractions
Mastery: 72%
Confidence: Medium
Last Practiced: 2 days ago
Review Recommended: Yes
```

Student Model should be recalculable from raw attempts.

Think:

```text
Question Attempts
       ↓
Atlas calculation
       ↓
Student Mastery
```

This is important for future model improvements.

---

# 17. Mastery

Mastery is not simply:

```text
correct / total
```

It should eventually incorporate:

- Correctness
- Response time
- Hint usage
- Perceived difficulty
- Consistency
- Confidence
- Other future signals

For early versions, use a simple, explainable weighted formula.

Important:

Keep the weights configurable in one place.

Do not scatter magic numbers throughout services.

Also, do not pretend the initial formula is scientifically perfect.

It is a **v1 heuristic** that should be validated with real student data.

---

# 18. Mastery Update Timing

Decision:

**Hybrid real-time approach.**

Every question creates an internal signal/update.

Atlas should be able to react immediately during a session.

However, the system should avoid large, unstable visible mastery jumps based on a single question.

Conceptually:

```text
Question 1
    ↓
Internal evidence

Question 2
    ↓
Internal evidence

Question 3
    ↓
Internal evidence

...
    ↓
Stable Student Model update/display
```

The exact smoothing/aggregation algorithm can evolve later.

The important principle is:

> Real-time evidence, but stable conclusions.

---

# 19. Misconception Model

Misconceptions are a major future Atlas capability.

Do not infer a strong misconception from one wrong answer.

Instead:

```text
Wrong
Wrong
Correct
Wrong
    ↓
Potential misconception
    ↓
More evidence
    ↓
Higher confidence
    ↓
Misconception
```

Example:

```text
Equivalent Fractions
Confidence: 65%
```

Later:

```text
Equivalent Fractions
Confidence: 95%
```

Then AI can generate targeted questions:

> Generate 5 questions targeting the misconception that equivalent fractions represent different quantities.

The goal is not merely:

```text
Fractions = 72%
```

but:

```text
What specifically is Emma misunderstanding?
```

---

# 20. Learning Style / Learning Pattern Model

Atlas should learn **how** a child learns.

Do not overclaim scientific "learning styles" without evidence.

Prefer the concept:

**Learning Patterns / Learning Preferences**

Potential signals:

- Visual vs text performance
- Story/word problem performance
- Short vs long sessions
- Explanation preferences
- Response time patterns
- Best study time
- Engagement patterns
- Motivation style

The important product question is:

> Not only "What should Emma learn?" but also "How should Atlas teach Emma?"

---

# 21. Recency

Track:

```text
Last PracticedAt
```

and:

```text
ReviewRecommended
```

Do not automatically decay mastery.

Recency influences recommendations.

Example:

```text
Fractions
Mastery: 95%
Last practiced: 180 days ago
Review recommended: Yes
```

---

# 22. Recommendation Engine

Atlas should eventually decide:

```text
Continue
Review
Practice
Increase Difficulty
Decrease Difficulty
Switch Topic
```

Inputs include:

- Mastery
- Confidence
- Recency
- Perceived difficulty
- Response time
- Hint usage
- Misconception signals
- Learning patterns
- Session context
- Parent-selected curriculum
- Parent-selected temporary context

The parent should remain in control.

---

# 23. Who Owns the Learning Plan?

Decision:

**Atlas recommends. Parent can override.**

Example:

```text
Today's Recommendation

Decimals

Why?
- Fractions are strong
- Decimals need practice
- Estimated session: 15 minutes

[Start Learning]

[Choose Another Topic]
```

If parents have to decide every day's topic manually, Atlas is not doing enough.

But Atlas should not remove parental control.

---

# 24. Parent Goals

Do NOT build a complicated goal-management system for MVP.

Parents primarily care about outcomes.

Example:

```text
Semester 1
Math = 70

↓

Semester 2 target
Math = 80
```

Atlas should eventually use this as the high-level outcome.

Atlas internally works with:

```text
Learning Objectives
Mastery
Misconceptions
Practice
Recommendations
```

Product principle:

> Parents think in outcomes. Atlas thinks in learning objectives.

---

# 25. Atlas Personality

Decision:

Personality is part of the first release.

Atlas should feel like a friendly personal learning coach.

Not a chatbot.

Not a generic assistant.

Not excessive conversation.

Examples:

> You solved today's questions 40% faster than yesterday.

> You struggled with this yesterday, but today you got 3 in a row correct.

Personality may eventually use non-sensitive preferences such as:

```text
favorite animal
favorite theme
favorite color
motivation style
```

But personality must not become more important than the Student Model.

Prioritize:

1. Learning intelligence
2. Accuracy
3. Explainability
4. Personalization
5. Personality

---

# 26. Two Atlas Brains

Long-term conceptual model:

## Learning Brain

```text
Student Model
Mastery
Learning Graph
Misconceptions
Recommendations
Question Performance
```

## Relationship Brain

```text
Personality
Memory
Motivation
Communication Style
Engagement
```

The Learning Brain answers:

> What should Emma learn?

The Relationship Brain answers:

> How should Atlas communicate with Emma?

---

# 27. AI/ML Roadmap

The founder wants to learn AI/ML while building WonderPath.

Long-term progression:

### Phase 1 — Rule/heuristic Atlas

Current stage.

Use:

- Structured data
- SQL
- Deterministic calculations
- Simple weighted mastery
- Rule-based recommendations

### Phase 2 — LLM-assisted Atlas

Use LLMs for:

- Question generation
- Explanations
- Metadata extraction
- Misconception interpretation
- Personalized language

### Phase 3 — Data-driven personalization

Once enough real student data exists:

- Statistical modeling
- Recommendation models
- Difficulty estimation
- Response prediction
- Pattern detection

### Phase 4 — ML-powered adaptive learning

Potential future systems:

- Knowledge tracing
- Item response theory
- Bayesian student modeling
- Personalized sequencing
- Question difficulty prediction
- Misconception classification
- Reinforcement/optimization approaches where justified

Do NOT build complex ML before enough data exists.

The first 10–20 free-trial users are especially important as a learning dataset.

---

# 28. Initial User Research / Data Strategy

The founder plans to recruit approximately 10–20 users for free trials.

Purpose:

- Validate UX
- Observe real student behavior
- Collect question attempt data
- Validate mastery assumptions
- Learn where children struggle
- Discover question patterns
- Improve Atlas
- Identify whether parents understand recommendations

Do not assume the first mastery formula is correct.

The system should be designed so the formula can evolve.

---

# 29. MCP Server Discussion

MCP was discussed as a technology the founder learned about.

Decision:

Do not introduce MCP merely because it is modern.

MCP is useful when an AI agent needs standardized access to tools/data/resources.

For WonderPath, it may become useful later for an Atlas agent to access:

- Student Model
- Question Bank
- Learning Graph
- Curriculum data
- Analytics
- Content generation tools

But MCP is not required for the core backend.

Current architecture should remain conventional:

```text
NestJS
PostgreSQL
Prisma
REST API
Workers
LLM APIs
```

If MCP becomes useful later, add it as an integration layer rather than rebuilding the core architecture around it.

---

# 30. Current Technical Stack

Known project stack:

- Monorepo
- `apps/api`
- `apps/web`
- `packages/*`
- NestJS 11
- Node.js
- Prisma 6
- PostgreSQL 16
- React / Next.js for web
- pnpm
- Docker / docker-compose
- TypeScript

Backend database:

```text
PostgreSQL
database: wonderpath
host: localhost
port: 5432
```

Current Prisma schema:

```text
apps/api/prisma/schema.prisma
```

Generated Prisma client exists under the project's generated Prisma path.

---

# 31. Important Prisma Note

At an earlier stage, `prisma db pull` reported:

```text
P4001 The introspected database was empty
```

This happened because the target database had no tables.

The database/schema is now being used by the application.

Do not assume Prisma introspection should be used to create the application schema.

For WonderPath, application schema changes should be managed through Prisma migrations.

---

# 32. Prisma Build Script Note

There was a pnpm security/build-policy issue:

```text
ERR_PNPM_IGNORED_BUILDS
Ignored build scripts: @prisma/client
```

The project later allowed the necessary native build for `argon2` via workspace configuration.

Current auth implementation uses **argon2**, not bcrypt.

Do not blindly replace argon2 with bcrypt.

---

# 33. Sprint History

## Sprint 01 — Parent Authentication

Completed.

Built:

- PrismaModule
- AuthModule
- ParentModule
- Registration
- Login
- JWT
- `/me`
- DTO validation
- Password hashing
- JWT guard
- JWT strategy

Endpoints:

```text
POST /auth/register
POST /auth/login
GET /me
```

Behavior:

```text
Register → 201
Login → 200
Duplicate email → 409
Wrong password → 401
Missing/invalid JWT → 401
Validation failure → 400
```

E2E tests were created and passed.

Sprint 1 test result:

```text
6 passed
0 failed
```

---

## Sprint 02 — Child Management

Completed.

Child CRUD functionality was implemented.

Tests:

```text
Create Child
Update Child
Get Children
Unauthorized Access
Delete Child
```

Result:

```text
5 passed
0 failed
```

Important security rule:

Parents must only access their own children.

---

## Sprint 03 — Learning Session

Completed.

Learning session functionality implemented.

Tests:

```text
Start Learning Session
Reject Other Parent Child
Reject Unsupported Curriculum
Reject Missing Subject
Get Current Session
Unauthorized Access
```

Result:

```text
6 passed
0 failed
```

Important product decision:

A child can have multiple curricula and the parent can choose which curriculum to focus on for a learning session/week.

---

## Sprint 04 — Question Bank

Completed.

Question Bank functionality implemented.

Tests:

```text
Create Question
Update Question
Get Question
Search Question
Unauthorized Access
Delete Question
```

Result:

```text
6 passed
0 failed
```

The Question Bank is a foundation for the future Living Question Bank.

---

# 34. Current Test Convention

The project uses:

```text
apps/api/test/
```

NOT:

```text
apps/api/tests/
```

Keep the `test` directory.

Current test organization:

```text
apps/api/test/
├── auth/
│   └── auth.e2e.ts
├── child/
│   └── child.e2e.ts
├── learning-session/
│   └── learning-session.e2e.ts
├── question-bank/
│   └── question-bank.e2e.ts
├── app.e2e-spec.ts
└── jest-e2e.json
```

Future tests should follow:

```text
apps/api/test/<feature>/<feature>.e2e.ts
```

Do not create `tests/` unless explicitly requested.

---

# 35. Test Philosophy

The founder wants to be able to return later and run individual feature tests.

Examples:

```bash
pnpm run test:e2e -- test/auth/auth.e2e.ts
```

Future tests must be:

- Automated
- Repeatable
- Independent
- Self-cleaning
- No manual input
- Clear PASS/FAIL output

Tests should protect previous functionality.

When implementing a new sprint:

1. Create the feature test.
2. Run the feature test.
3. Run previous tests.
4. Fix regressions.
5. Only then consider the sprint complete.

---

# 36. Sprint 05 Planned Scope

The next planned sprint is:

**Sprint 05 — Atlas Student Model v1**

Specification file:

```text
specs/sprint-05-student-model.md
```

Planned scope:

- Question Attempt
- Student Mastery
- Mastery calculation
- Real-time evidence
- Recency
- Explainability reason codes
- Parent authorization
- E2E tests

Planned endpoints:

```text
POST /attempts

GET /children/:childId/mastery
```

Question Attempt should store:

- Child
- Session
- Question
- Learning Objective
- Selected Answer
- Correct/Wrong
- Time Spent
- Hint Used
- Perceived Difficulty
- Attempt Number
- Metadata JSON
- Created At

Student Mastery should store:

- Child
- Learning Objective
- Mastery Score
- Confidence Score
- Total Attempts
- Correct Attempts
- Wrong Attempts
- Average Response Time
- Hint Count
- Last PracticedAt
- ReviewRecommended
- UpdatedAt

Out of scope for Sprint 05:

- GPT
- AI generation
- Recommendation engine
- Full misconception engine
- Parent dashboard UI

---

# 37. Sprint Workflow

For every sprint:

```text
1. Read sprint specification
2. Inspect existing architecture
3. Inspect previous sprint implementation
4. Plan changes
5. Implement
6. Create/update Prisma migration if needed
7. Build
8. Run feature E2E tests
9. Run all previous E2E tests
10. Review security
11. Review database design
12. Review maintainability
13. Report results
```

Do not skip regression testing.

---

# 38. Coding Rules for Claude

Before modifying code:

- Inspect existing code.
- Follow existing conventions.
- Do not rewrite working modules unnecessarily.
- Do not introduce dependencies without justification.
- Prefer small, composable services.
- Keep business logic out of controllers.
- Use DTO validation.
- Use proper authorization checks.
- Use Prisma transactions when appropriate.
- Keep raw event history immutable.
- Keep derived state recalculable.
- Avoid magic numbers.
- Keep Atlas logic modular so it can evolve.

When making architecture decisions, explain the trade-off briefly.

Do not over-engineer the MVP.

But do not create shortcuts that prevent Atlas from becoming sophisticated later.

---

# 39. Security Principles

Important:

- Parent can only access their own children.
- Parent cannot access another parent's child.
- Passwords must never be returned.
- JWT-protected endpoints must validate authorization.
- Never trust child IDs supplied by clients without checking ownership.
- Never expose secrets in source control.
- Environment variables should be documented in `.env.example`.
- AI prompts should not expose unnecessary private student data.
- Student data should be treated as sensitive educational information.

---

# 40. Data Architecture Principle

Use this separation:

```text
RAW EVENTS
    ↓
Question Attempts
    ↓
DERIVED KNOWLEDGE
    ↓
Student Model
    ↓
DECISIONS
    ↓
Recommendations
```

Never make the raw event history dependent on today's interpretation.

Future Atlas algorithms should be able to recalculate Student Model from historical attempts.

This is important for future ML.

---

# 41. Future Sprint Direction

Exact sprint numbering may evolve, but broad direction:

```text
Sprint 1
Parent Authentication

Sprint 2
Child Management

Sprint 3
Learning Sessions

Sprint 4
Question Bank

Sprint 5
Student Model

Sprint 6+
Atlas recommendation / adaptive logic

Later
AI question generation

Later
Misconception intelligence

Later
Living Question Bank automation

Later
Advanced ML / knowledge tracing

~Sprint 11
AI Exam Assistant
PDF/photo upload
OCR/Vision
Exam-topic extraction

Sprint 12
Web Foundation & Parent Auth (apps/web)

Sprint 13
Web Child Profile Management (apps/web)

Sprint 14
Web Learning Session Setup (apps/web)

Sprint 15
Web Question Answering Flow (apps/web)
Note: requires a new backend "serve next question" endpoint not covered by any Sprint 1-11 spec — see specs/sprint-15-web-question-answering-flow.md

Sprint 16
Web Recommendation & Mastery Dashboard (apps/web)
This is the friend-demo milestone — see specs/sprint-16-web-recommendation-dashboard.md
```

Sprints 12-16 are a frontend track for `apps/web`, added to reach a demoable parent-facing product on top of the Sprint 1-6 backend. They deliberately stop at Sprint 6-level backend depth (Student Model + Recommendation Engine) — they do not wait for Sprints 07-11. `apps/cms` (internal admin tooling) is a separate, not-yet-scoped track.

Do not implement future features just because they are mentioned here.

Use this document as context, not as permission to build everything.

---

# 42. What Atlas Should Eventually Become

Long-term:

```text
Parent
  ↓
"Emma needs better Math results this semester."
  ↓
Atlas
  ↓
Understands curriculum
  ↓
Understands Emma
  ↓
Understands what Emma knows
  ↓
Understands how Emma learns
  ↓
Identifies possible misconceptions
  ↓
Chooses the next learning objective
  ↓
Chooses the appropriate question
  ↓
Generates new content when necessary
  ↓
Observes the response
  ↓
Updates Student Model
  ↓
Explains its decision
  ↓
Repeats
```

The system becomes a continuous learning loop:

```text
Observe
  ↓
Understand
  ↓
Decide
  ↓
Teach
  ↓
Measure
  ↓
Learn
  ↓
Adapt
```

That loop is the heart of Atlas.

---

# 43. Product North Star

WonderPath is not trying to win because it has the best chatbot.

It is trying to win because:

> **Atlas becomes increasingly good at understanding each individual child.**

The long-term moat is the accumulated combination of:

```text
Learning Graph
+
Question Bank
+
Question Metadata
+
Question Attempts
+
Student Models
+
Misconception Signals
+
Learning Patterns
+
Recommendation History
+
Outcome Data
```

This dataset and intelligence layer should become more valuable as more children use WonderPath.

---

# 44. Important Product Decisions Already Made

These are decisions that should not be casually reversed:

- Multiple curricula are supported.
- Parent can choose today's/weekly curriculum focus.
- Atlas recommends; parent can override.
- Mastery does not decay simply because time passes.
- Recency is tracked separately.
- Question attempts are stored as raw evidence.
- Perceived difficulty is collected from the child.
- Atlas accumulates evidence before declaring misconceptions.
- Recommendations must be explainable.
- Atlas personality exists in the first release.
- Atlas should not be a generic chatbot.
- AI generates content; Atlas makes decisions.
- Question generation should happen in batches, not one question per LLM call.
- Question inventory should eventually be demand-driven.
- The question bank should become a Living Question Bank.
- MVP should avoid requiring teachers to manually review every question.
- PDF/photo exam assistant is planned for around Sprint 11.
- `apps/api/test/` is the canonical test directory.
- Previous tests must remain and pass after new sprints.
- Atlas logic lives at `apps/api/src/atlas/` — a module alongside `attempts`, `questions`, `sessions` — for now, across **all** sprints, not just Sprint 05. `packages/atlas` stays empty/minimal; do not build it out or wire it in yet. This is a placement decision for the current stage only, not a permanent rule that Atlas always lives in `apps/api`. See Section 48 for the "Now vs. Later" diagrams — the "Later" state (separate services, possibly separate repos) is a goal to keep the door open for, not something to build toward now.
- `apps/cms` (internal team admin tooling) will be added alongside the existing `apps/web` (parent/student-facing FE), both in this monorepo for now. Staff/admin users must be a separate model (e.g. `StaffUser`) from `Parent`, with their own guard — not a role flag on the same entity — to keep the two trust boundaries from mixing.

---

# 45. How Claude Should Work With the Founder

Development workflow: OpenCode implements sprints from the `specs/sprint-*.md` files. The founder batches this — he does not hand off after every sprint, but brings roughly 3 sprints' worth of work to Claude Code at once for review. When that happens, review the accumulated diff for security, code best practices, database/schema design, and maintainability (per Section 37 steps 10-12), run the relevant e2e tests plus regression tests, and apply needed fixes directly — this has been pre-authorized by the founder. This authorization covers fixing the code produced for those sprints; it does not extend to unrelated changes, git pushes, or destructive operations.

When the founder says:

> "next"

Continue from the current project/sprint state.

When the founder says:

> "give me the prompt"

Provide a complete copy-paste prompt for the coding agent.

When the founder says:

> "short answer"

Be concise.

When the founder asks a product/architecture question:

- Think objectively.
- Challenge assumptions.
- Give recommendation.
- Explain trade-offs.
- Do not blindly agree.

When implementing a sprint:

- Read the sprint `.md`.
- Inspect current code.
- Implement the specified scope.
- Test it.
- Report exactly what happened.
- Do not silently expand scope.

---

# 46. Current State at Handoff

Current status:

```text
Sprint 01  ✅ Complete
Sprint 02  ✅ Complete
Sprint 03  ✅ Complete
Sprint 04  ✅ Complete
Sprint 05  🟡 Planned
```

Latest confirmed Sprint 04 test:

```text
PASS test/question-bank/question-bank.e2e.ts

Question Bank (e2e)

✓ Create Question
✓ Update Question
✓ Get Question
✓ Search Question
✓ Unauthorized Access
✓ Delete Question

Test Suites: 1 passed
Tests: 6 passed
Failures: 0
```

The next engineering task is Sprint 05, but only begin when explicitly instructed.

---

# 47. Final Instruction

Before doing any work on WonderPath:

1. Read this document.
2. Inspect the actual repository.
3. Trust the repository over assumptions in this document if they conflict.
4. Preserve working functionality.
5. Run tests after changes.
6. Keep the architecture ready for future Atlas intelligence.
7. Do not prematurely build future AI/ML features.
8. Do not turn Atlas into an LLM wrapper.
9. Remember:

> **AI generates. Atlas learns, decides, adapts, and explains.**

---

# 48. Service Architecture — Now vs. Later

## Now — keep Atlas inside the main backend

```text
WonderPath
├── apps/
│   ├── api/          ← NestJS
│   │   ├── attempts
│   │   ├── questions
│   │   ├── sessions
│   │   └── atlas/    ← Atlas logic for now
│   └── web/
│
└── packages/
    └── atlas/        ← keep empty / minimal for now
```

Atlas logic is just another module inside `apps/api` (e.g. `apps/api/src/atlas/`), a sibling to `attempts`, `questions`, `sessions` — not special, not separate. `packages/atlas` stays empty/minimal; do not build it out or wire it into `apps/api` yet.

This is the right shape while building the MVP because it gives: simpler deployment, easier database transactions, easier debugging, less infrastructure, and Atlas can directly access `StudentMastery`, `QuestionAttempt`, etc. without a network hop or package boundary.

## Later — only if Atlas becomes huge (a goal, not a plan)

```text
WonderPath
│
├── API
│   └── NestJS
│
├── Atlas Brain
│   └── Atlas service
│
├── AI Content Service
│
├── Question Bank
│
└── PostgreSQL / Analytics DB
```

This could eventually go as far as separate repositories: `wonderpath-api`, `wonderpath-web`, `wonderpath-atlas`, `wonderpath-ai`.

**This "Later" diagram is aspirational only — it describes a possible future, not a target to build toward right now.** Do not scaffold services, packages, message queues, or multi-repo tooling in anticipation of it. The only thing it should influence today is keeping Atlas's module boundary reasonably clean (no tangled cross-imports into `attempts`/`questions`/`sessions` internals) so that *if* the "Later" state is ever warranted, extraction isn't a rewrite. Nothing more.
