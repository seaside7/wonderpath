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

Sprint 17
Child Mode ("Who's Learning?") — a profile picker + parent-PIN screen lock,
NOT a second login/account system — see specs/sprint-17-child-mode.md

Sprint 18
The Child's Learning Experience — kid-friendly rework of the Today card and
question flow, real encouragement on session end — see specs/sprint-18-child-learning-experience.md

Sprint 19
Parent Dashboard — links Sprint 16's orphaned recommendation/mastery view,
adds misconceptions (CONFIRMED only) and adaptive difficulty, adds a new
GET /children/:childId/learning-sessions endpoint — see specs/sprint-19-parent-dashboard.md

Sprint 20
Family Beta Release — production deploy, the Child soft-delete fix (hard
prerequisite before real data exists), real content, and feedback paths
(question-report + general feedback-to-Linear) — see specs/sprint-20-family-beta-release.md
This is the family-beta milestone: the founder's daughter and wife using it for real.
```

Sprints 12-16 are a frontend track for `apps/web`, added to reach a demoable parent-facing product on top of the Sprint 1-6 backend. They deliberately stop at Sprint 6-level backend depth (Student Model + Recommendation Engine) — they do not wait for Sprints 07-11. Sprints 17-20 (added 2026-10-03) extend that track from "demoable to a friend" to "usable daily by the founder's own family" — child mode, a real kid-facing experience, a real parent dashboard, and a hardened deploy. `apps/cms` (internal admin tooling) is a separate, not-yet-scoped track.

A "product manager agent" (judging UX quality/child experience, not just spec-conformance — distinct from the QA agent in Section 50) was discussed 2026-10-03 and intentionally deferred until after Sprints 17-20 ship, so there's a real product to form opinions about.

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

Current status (last updated 2026-09-20):

```text
Sprint 01  ✅ Complete
Sprint 02  ✅ Complete
Sprint 03  ✅ Complete
Sprint 04  ✅ Complete
Sprint 05  ✅ Complete
Sprint 06  ✅ Complete
Sprint 07  ✅ Complete
Sprint 08  ✅ Complete
Sprint 09  ✅ Complete
Sprint 10  ✅ Complete
Sprint 11  ✅ Complete
Sprint 12  ✅ Complete (Web Foundation & Auth)
Sprint 13  ✅ Complete (Web Child Profile)
Sprint 14  ✅ Complete (Web Learning Session Setup)
Sprint 15  ✅ Built (Web Question Flow — not yet independently reviewed)
Sprint 16  ✅ Built (Web Recommendation Dashboard — not yet independently reviewed)
```

All of Sprints 5-11 (backend, `apps/api/src/atlas/`) and Sprints 12-16 (frontend, `apps/web`) exist in code. Sprints 5-11 have been through a full code review pass (correctness, security, architecture-convention checks) with fixes applied and verified — see Section 33 for detail if it's added there later, otherwise trust `apps/api/test/` (79/79 passing as of this update) over this doc if they conflict. Sprints 12-14 have been through a design/scope review with fixes applied (see the sprint-12/13/14 web specs). Sprints 15-16 exist and compile/build cleanly but have not had the same dedicated review pass the earlier sprints got — treat their correctness as less certain until reviewed.

Latest full backend regression: `apps/api/test/` — 79/79 passing (13 suites), verified after every change in this session.

QA seed content (Section 51) is done. `qa-agent/` (Section 50) has its full Atlas-concept coverage built and verified as of 2026-09-20; remaining before it can run unattended are a live real fix-cycle test and Task Scheduler registration. Do not start a new numbered sprint without explicit instruction.

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

**This "Later" diagram is aspirational only — it describes a possible future, not a target to build toward right now.** Do not scaffold services, packages, message queues, or multi-repo tooling in anticipation of it. The only thing it should influence today is keeping Atlas's module boundary reasonably clean (no tangled cross-imports into `attempts`/`questions`/`sessions` internals) so that _if_ the "Later" state is ever warranted, extraction isn't a rewrite. Nothing more.

---

# 49. Node v24 / Prisma Module Format Note

`apps/api` would not boot outside of Jest on this machine (Node v24) — `nest start`/`start:dev` crashed immediately with `ReferenceError: exports is not defined` inside the generated Prisma client. Two real, separate causes, both fixed:

1. `apps/api/package.json` had no `"type"` field. Node v24's module-auto-detection heuristic was misdetecting the compiled (genuinely CommonJS) output as ESM. Fixed by adding `"type": "commonjs"` to `apps/api/package.json`.
2. That exposed a second, real issue: Prisma's `generator client { provider = "prisma-client" }` (the newer ESM/CJS-hybrid generator) unconditionally emits `import.meta.url` in `generated/prisma/client.ts` to polyfill `__dirname` — genuine ESM-only syntax, not a detection false-positive. Fixed by adding `moduleFormat = "cjs"` to the generator block in `schema.prisma` and regenerating (`npx prisma generate`).

Both are now permanent parts of the schema/config — do not remove `"type": "commonjs"` or `moduleFormat = "cjs"` without re-verifying the app actually boots on whatever Node version is in use, not just that `tsc`/Jest pass (Jest's module transform sidesteps this class of bug entirely, which is why it stayed hidden through every prior test run).

If a `ts-node`/`tsx` script needs to run standalone (e.g. a seed script), plain `ts-node` conflicts with this project's `"module": "nodenext"` tsconfig in ways that are hard to override cleanly via `TS_NODE_COMPILER_OPTIONS`. The reliable path is: compile with the project's real `tsconfig.json` (`npx tsc -p tsconfig.json`, which includes everything under `apps/api/`, not just `src/`) and run the compiled output with plain `node dist/<path>.js`, the same way the app itself boots.

---

# 50. QA/Self-Improvement Agent (Built, Coverage Verified 2026-09-20)

A local, unattended daily QA agent lives at `qa-agent/`. It drives the running app end-to-end (Playwright), checks behavior against `specs/sprint-01..16` and this document, logs findings, and attempts fixes for some findings via headless `claude -p` invocations — gated by the full `apps/api/test/` suite, on an isolated daily branch (`qa-agent/auto-fix-YYYY-MM-DD`) that is **never auto-merged or auto-pushed to `main`/`origin`**.

**Run it yourself:** `cd qa-agent && npm run check` (dry-run, no git side effects) or `npm run fix` (real fix cycle, findings-gated, daily-capped) — equivalent to `node run.js --dry-run=true` / `--dry-run=false`.

**Coverage (verified against real database rows, not just console output):** register → login → add child → start session → answer questions (3 personas × 8 questions) → end session, plus the full Atlas concept surface: recommendations (reason codes), misconceptions, adaptive difficulty ("this question is hard" / level changes), learning patterns, personality, encouragement, review-recommended recency, cross-parent isolation, no-repeat-question, attempt immutability, session status transitions, and the Living Question Bank admin view (via a dedicated `qa-agent-admin@qa-agent.test` account, `lib/db.js#ensureQaAdmin`). Confirmed by a 2026-09-20 run producing real rows in `wonderpath_qa`: 3 parents/children, 3 completed sessions, 24 attempts, 3 misconception signals, 3 adaptive-difficulty records, 9 learning-pattern records — a genuine exercise of the app, not an empty pass.

**Two real bugs found and fixed while building this out (both in the agent itself, not the app):**
1. Boot-timeout races on a cold start: `nest start`'s build and Next's first Turbopack compile of a page can each take well over the original 30s window on this machine's disk, and a timeout mid-build meant the cleanup swept the port before the slow process had bound to it, leaving an orphan that also hung the whole `qa-agent` process (its piped stdout/stderr listeners kept Node's event loop alive). Fixed in `qa-agent/lib/app-runner.js`: the web dev server is checked at the TCP level (fast, doesn't trigger a page compile as a side effect), each route is explicitly warmed with a generous timeout before Playwright ever touches it, and `stop()` now kills the process handles directly (not just by port) plus does a delayed re-sweep.
2. Several of the new Atlas-concept checks assumed Title-Case display strings (`"Confirmed"`, `"Increase"`) where the real API returns raw, unmapped Prisma enum values or service-literal lowercase strings (`"CONFIRMED"`, `"increase"`) — always read the actual controller/service/DTO before writing an expectation check's valid-value list; the first run "found" 7 findings that were entirely this mistake, not app bugs.

Hard guardrails (do not weaken these without the founder's explicit sign-off):
- Never touches `schema.prisma`, `apps/api/src/auth/**`, or any payment/billing code (none exists yet, denylisted defensively anyway).
- Never changes anything in Section 44 or the "Now vs. Later" section (48) — a finding that suggests one of these is wrong gets logged as a flagged recommendation, never auto-applied.
- Runs against `wonderpath_qa` only (Section 51) — never the real dev database.
- Fix commits land only on the daily branch; merging to `main` is always a separate, human-gated step.
- Capped at 5 kept fixes/day; any regression in the full test suite reverts that specific commit immediately via `git reset --hard` (safe here specifically because the daily branch is never pushed/shared).

**Not yet done:** a live real fix-cycle run (branch/commit/test/keep-or-revert mechanics untested against an actual finding), Windows Task Scheduler registration (`qa-agent/scheduler/install-task.ps1`), and `POST /admin/inventory/replenish` isn't exercised by any check yet (read-only admin checks only).

**Linear sync (2026-10-03):** every finding (regardless of `--dry-run`) is opened as a Linear issue via `qa-agent/lib/linear.js`, so the founder and his wife can monitor findings from Linear directly instead of reading `qa-agent/daily-summary/`. Best-effort and silently skipped (not a run failure) if `LINEAR_API_KEY`/`LINEAR_TEAM_ID` aren't set. Dedup is tracked in a local state file outside the repo (same `STATE_DIR` convention as the run lock/ledger) keyed by a stable hash of `flow + expected` — deliberately not by Linear's own filter/search API, since its exact field names for filtering by description content aren't documented without live-introspecting the schema. This is a QA-agent feature only; a separate "product manager agent" that triages/prioritizes across both QA findings and human-reported feedback has been discussed but not scoped or built. The founder is leaning toward having his existing OpenCode (also running on the VPS) consume these Linear issues and attempt fixes, instead of qa-agent's own never-tested `fixer.js`/`claude -p` cycle — not yet decided or built, but the direction this is headed.

**Kid-mode coverage + a real bug it found (2026-10-03):** `qa-agent/lib/flows/kid-session.js` + `lib/expectations/kid-session-summary.js` drive the actual Sprint 17-19 kid-facing path (picker → Today card → question flow → end of session) and read real rendered page content — every other check in this agent only verifies API/DB state. This gap is exactly how a real bug shipped to staging with zero findings: `kid-question-flow.tsx`'s error-screen guard checked `!question` unconditionally, before the "summary" status was ever checked, so every child who finished a session saw "Something went wrong" instead of the encouragement screen (fixed; see the git history for `apps/web/components/kid/kid-question-flow.tsx` around 2026-10-03).

**Subtle, worth remembering if this class of bug resurfaces:** that bug only reproduces when a session's *very first* question fetch returns none — `question` component state is never reset once a real question has loaded, so finishing a session after answering at least one question does *not* trigger it, only a session that never got a question at all (e.g. zero seeded content for that subject, which is exactly what exposed it on staging before content was loaded). A first version of the automated check for this produced a confusing, inconclusive result purely from its own bug: `locator.isVisible({ timeout })` in Playwright does not actually wait/retry despite the option existing on its signature — it checks once and returns immediately. Fixed by switching to `locator.waitFor({ state: 'visible' })` throughout, plus per-step confirmation and optional screenshot capture, so a future failure is diagnosable instead of a black box.

---

# 51. QA Test Database & Seed Data Convention

A separate Postgres database, `wonderpath_qa`, exists on the same local container as the real `wonderpath` dev database (same `docker-compose.yml` service, different database name) — used for QA-agent runs and seed/test content only. **Never point `apps/api`'s own `DATABASE_URL` at it, and never run QA/seed scripts against the real `wonderpath` database.**

Root-level `.env` (repo root, not `apps/api/.env`) holds QA-specific config, gitignored:
```text
OPENAI_API_KEY / DEEPSEEK_API_KEY   — for QA/seed content generation only
QA_OPENAI_MODEL / QA_DEEPSEEK_MODEL / QA_OPENAI_REASONING_EFFORT
QA_DATABASE_URL                      — must contain "wonderpath_qa"; scripts refuse to run otherwise
```
These are distinct from `apps/api/.env`'s `ATLAS_*` keys, which are the running app's own Sprint 07 content-generation config — different purpose, different database, never conflate the two.

Seed/QA question generation lives at `apps/api/prisma/seed-qa-test-questions.ts` + `apps/api/prisma/qa-seed/` (`config.ts`, `llmGateway.ts`, `generate.ts`). All LLM calls go through one gateway module (`llmGateway.generate(provider, prompt)`) — nothing else calls OpenAI/DeepSeek directly. Every seeded question is tagged in `Question.metadata`: `{ isSeedData: true, seedProvider, seedModel, seedBatch }` — this is how seed data gets found and removed later once real content replaces it; there is no separate schema column for this (deliberately — no schema change was needed).

**Confirmed decision (2026-09-20):** `Topic`/`Subtopic`/`LearningObjective` are not grade-scoped in the schema and stay that way for QA seed content — Grade 5 and Grade 6 share the same LearningObjective (e.g. one "Place Value" objective holds both grades' questions, differentiated only by `Question.grade` and question complexity). This matches the schema's actual design (mastery tracks per `(child, learningObjective)`, not per grade) and was an explicit founder decision, not an assumption.

**Open concern flagged by the founder, not yet acted on:** because mastery aggregates across grades under this shared-objective model, Sprint 06's recommendation logic needs to eventually account for grade-appropriate difficulty exposure, not just aggregate mastery — otherwise a child who has mastered a topic at an easier grade's question difficulty could get skipped past harder, grade-appropriate practice at the same nominal mastery score. This is a real future consideration for the recommendation engine, not a bug in what exists today — do not "fix" this without it being explicitly scoped as its own piece of work.

---

# 52. Staging Deployment (VPS, 2026-10-03) — Not Production

A working deployment exists at **https://wonderpath.itsmesaid.id**, on the founder's existing shared VPS (`43.157.241.209`, see Section 50's qa-agent deployment for the same box). **This is explicitly a dev/staging environment, not the family-beta production release described in Sprint 20** — the founder said a dedicated domain for WonderPath will be used for the real production launch later. Do not treat this URL or setup as the final Sprint 20 target; it's a convenience environment to look at and test work in progress on a real, shareable URL instead of localhost.

Setup:
- `~/projects/wonderpath` on the VPS, `main` branch, pulled from `git@github.com:seaside7/wonderpath.git`.
- Real `wonderpath` Postgres database (not `wonderpath_qa`) — migrated with all 12 migrations including `20261003092745_add_parent_pin`. This was the first time any migration was ever applied to this database; it had zero tables before.
- `apps/api` built (`nest build`, serves from `dist/src/main.js`) and run via `pm2` as `wonderpath-api` on port **4001**. `apps/api/.env` on the VPS holds its own freshly-generated (not copied) `JWT_SECRET`/`ADMIN_JWT_SECRET`, `ATLAS_CONTENT_PROVIDER=mock` (no real OpenAI/DeepSeek key wired for live generation here), and `CORS_ORIGIN=https://wonderpath.itsmesaid.id`.
- `apps/web` built (`next build`, reads `apps/web/.env.production` for `NEXT_PUBLIC_API_URL=https://wonderpath.itsmesaid.id/api`, baked in at build time) and run via `pm2` as `wonderpath-web` on port **4000**.
- These ports are deliberately distinct from the qa-agent's 3098/3099 and local dev's 3000/3001, so all three can run on this VPS/machine without colliding.
- nginx (`/etc/nginx/sites-available/wonderpath`) reverse-proxies `/` to port 4000 and `/api/` to port 4001 (trailing slash on `proxy_pass` strips the `/api/` prefix — the Nest app itself has no `/api` prefix). HTTPS via certbot/Let's Encrypt, same pattern as the existing `second-brain` subdomain on this box (both behind Cloudflare's proxy).
- `pm2 save` + `pm2 startup systemd` registered, so both processes survive a VPS reboot.

**Known limitations of this staging environment, by design (not bugs to silently fix):**
- No content is seeded — a fresh session will hit "no questions available" until Sprint 20's actual content-seeding step happens (reusing `apps/api/prisma/seed-qa-test-questions.ts` against this database).
- The `Child` hard-delete issue (Section 44/the DB audit) is **not fixed here** — this environment is fine for throwaway test data, but per Sprint 20's own spec, real/precious data should wait for the soft-delete fix regardless of which environment it's in.
- No rate-limiting on `/auth/*` — acceptable for a not-publicly-announced staging URL, would need revisiting before any real production/public launch.
