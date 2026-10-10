# Sprint 22 — Points, Goals & Rewards

## Goal

Give children a visible reason to come back every day. A child earns points (⭐) for learning, the parent sets a points target (daily, weekly, or monthly) and creates a list of real-world rewards with point prices, and the child can ask to redeem a reward once they've saved enough. The parent approves and hands over the reward in real life.

WonderPath never handles money or physical rewards — it only keeps score and routes the request to the parent.

## Depends On

- Sprint 17 (child mode + parent PIN gate — approvals must live behind it)
- Sprint 18 (kid question flow)
- Sprint 19 (parent dashboard)
- Sprint 21 (`levelup-pop` animation and the attempt-response pattern for surfacing side effects)

## Product Principles (do not violate)

1. **Reward effort and consistency, not just correctness.** If only correct answers pay, children avoid hard topics. Genuine attempts earn points even when wrong.
2. **Points are never taken away for mistakes.** A wrong answer earns less, never negative. The only thing that lowers a balance is the child choosing to redeem.
3. **No comparison between children.** No leaderboards, no sibling rankings.
4. **The parent controls rewards.** WonderPath suggests, the parent decides.
5. **Soften the overjustification risk.** Material rewards can crowd out a child's own interest in learning. Parent-facing copy should nudge toward experiences ("park trip", "pick the movie") over things, and the default suggestions should be experiences.

## Scope

### 1. Data Model (Prisma)

Add to `apps/api/prisma/schema.prisma`:

```prisma
enum PointReason {
  CORRECT_ANSWER
  EFFORT
  SESSION_COMPLETE
  MASTERY
  GRADE_AHEAD_BONUS
  REDEMPTION
  REDEMPTION_REFUND
}

enum GoalPeriod {
  DAILY
  WEEKLY
  MONTHLY
}

enum RedemptionStatus {
  PENDING
  APPROVED
  DECLINED
}

model PointTransaction {
  id                  String       @id @default(cuid())
  childId             String
  child               Child        @relation(fields: [childId], references: [id], onDelete: Cascade)
  amount              Int          // positive = earned, negative = spent
  reason              PointReason
  questionAttemptId   String?
  learningSessionId   String?
  learningObjectiveId String?
  redemptionId        String?
  createdAt           DateTime     @default(now())

  @@unique([reason, questionAttemptId])
  @@unique([reason, learningSessionId])
  @@unique([childId, reason, learningObjectiveId])
  @@unique([reason, redemptionId])
  @@index([childId, createdAt])
}

model PointGoal {
  id           String     @id @default(cuid())
  childId      String
  child        Child      @relation(fields: [childId], references: [id], onDelete: Cascade)
  period       GoalPeriod
  targetPoints Int
  active       Boolean    @default(true)
  createdAt    DateTime   @default(now())

  @@index([childId, active])
}

model Reward {
  id          String             @id @default(cuid())
  childId     String
  child       Child              @relation(fields: [childId], references: [id], onDelete: Cascade)
  name        String
  emoji       String
  cost        Int
  archived    Boolean            @default(false)
  createdAt   DateTime           @default(now())
  redemptions RewardRedemption[]

  @@index([childId, archived])
}

model RewardRedemption {
  id          String           @id @default(cuid())
  childId     String
  child       Child            @relation(fields: [childId], references: [id], onDelete: Cascade)
  rewardId    String
  reward      Reward           @relation(fields: [rewardId], references: [id], onDelete: Restrict)
  cost        Int              // snapshot of reward.cost at request time
  status      RedemptionStatus @default(PENDING)
  requestedAt DateTime         @default(now())
  resolvedAt  DateTime?

  @@index([childId, status])
}
```

Notes:
- **`PointTransaction` is append-only**, the same rule as `QuestionAttempt`. Never `update()` or `delete()` a row. Balance = `SUM(amount)` for the child. Corrections are new rows (see refunds below).
- The `@@unique` constraints make awarding **idempotent**: the same attempt, session, mastery crossing, or redemption can never pay twice, even on retries. Postgres treats NULLs as distinct, so the constraints only bite when the relevant id is present — that's intended.
- Only **one active `PointGoal` per child**. Setting a new goal deactivates the previous one in the same transaction (enforce in the service, not the schema).
- `Reward` is archived, never hard-deleted, because past redemptions reference it.
- **Apply the migration to both local databases** (`wonderpath` and `wonderpath_qa`) and to the VPS. A migration that only reached one database has already caused two crashes this month (`audioUrl`, `practiceGrade`).

### 2. Points Rules

Put all values in one config object (e.g. `POINTS_CONFIG` in `apps/api/src/atlas/points/points.config.ts`) so they can be tuned without hunting through code:

| Event | Points | Condition |
|---|---|---|
| Correct answer | 10 | `timeSpent >= 2s` |
| Correct answer on an already-mastered objective | 5 | mastery ≥ `RECOMMENDATION_CONFIG.highMasteryThreshold` before this attempt (diminishing returns on grinding easy topics) |
| Genuine wrong answer (effort) | 2 | `timeSpent >= 3s` |
| Rapid guess | 0 | correct under 2s or wrong under 3s |
| Grade-ahead bonus | +5 | correct answer in a session with `practiceGrade` above the child's grade |
| Session complete | 20 | session completed with ≥ 5 answered questions |
| Mastery reached | 50 | first time an objective's `masteryScore` crosses `highMasteryThreshold` (once per objective, ever — enforced by the unique constraint) |
| Daily cap | 300 | earned points (positive, non-refund) per calendar day, stop awarding past this |

Calendar boundaries (day, week, month) use **Asia/Jakarta (WIB)**. Weeks start Monday.

A typical 15-minute session (~10 questions) earns roughly 100–130 points. Use that to calibrate suggested targets in the parent UI.

### 3. Backend

New module `apps/api/src/atlas/points/` (service + controller), following the existing Atlas module layout.

**Awarding:**
- In `StudentModelService.recordAttempt` (`apps/api/src/atlas/student-model/student-model.service.ts`), after the attempt and mastery update, call `PointsService.awardForAttempt(...)`. Use the same pattern Sprint 21 used for `levelUp`: read the result and add it to the response. Points must **never** fail the attempt — wrap in try/catch and log.
- Mastery crossing: compare mastery before/after this attempt; if it crossed `highMasteryThreshold` upward, award `MASTERY`.
- In `LearningSessionService.complete`, award `SESSION_COMPLETE` if the session has ≥ 5 attempts.

**Attempt response:** add to `AttemptResponseDto` and the frontend `AttemptResult` type:

```ts
points: {
  earned: number;          // total awarded for this attempt (incl. bonuses), 0 if none
  balance: number;
  goal: { period: "DAILY" | "WEEKLY" | "MONTHLY"; target: number; progress: number } | null;
  goalJustReached: boolean; // true only on the attempt that crossed the target this period
} | null
```

**Endpoints** (all JWT-protected, all use `getOwnedChild` for ownership — return 404 for another parent's child, matching existing convention):

| Method | Path | Purpose |
|---|---|---|
| GET | `/children/:childId/points` | balance, active goal with current-period progress + period start/end, last 20 transactions |
| PUT | `/children/:childId/point-goal` | `{ period, targetPoints }` — creates new active goal, deactivates old |
| DELETE | `/children/:childId/point-goal` | deactivate (no goal) |
| GET | `/children/:childId/rewards` | active rewards |
| POST | `/children/:childId/rewards` | `{ name, emoji, cost }` |
| PATCH | `/rewards/:rewardId` | edit name/emoji/cost |
| DELETE | `/rewards/:rewardId` | archive |
| POST | `/rewards/:rewardId/redeem` | child requests; 400 if balance < cost |
| GET | `/children/:childId/redemptions?status=` | list requests |
| POST | `/redemptions/:id/approve` | parent approves |
| POST | `/redemptions/:id/decline` | parent declines → refund |

**Redemption flow (prevents double-spending):**
- **Request:** in one transaction, check balance ≥ cost, create `RewardRedemption` (PENDING) and a `REDEMPTION` transaction of `-cost`. Points are reserved immediately, so the child can't request two rewards with the same points.
- **Approve:** set APPROVED + `resolvedAt`. No points change.
- **Decline:** set DECLINED + `resolvedAt`, and add a `REDEMPTION_REFUND` transaction of `+cost`.
- Approve/decline on a non-PENDING redemption → 409.

**Goal progress** = sum of positive, non-refund transactions (`reason` not `REDEMPTION_REFUND`) in the current period. Redeeming does **not** reduce goal progress — the goal measures learning effort, the balance measures spendable points.

**Validation:** `targetPoints` 1–100,000; `cost` 1–100,000; `name` 1–60 chars; `emoji` a single emoji (pick from a preset list on the frontend; backend just enforces ≤ 8 chars).

**Known limitation (accepted for beta):** child mode uses the parent's JWT, so the backend can't tell child from parent. Approve/decline must only be exposed in the parent dashboard, which already sits behind the PIN gate. Document this in code next to the approve endpoint.

### 4. Kid UI (`apps/web`, child mode)

- **Header balance:** in `KidHeader` (`apps/web/app/(kid)/layout.tsx`), show `⭐ 1,240` next to the Parent button.
- **Feedback screen** (`kid-question-flow.tsx`): when `points.earned > 0`, show a small `+10 ⭐` pop near the Correct/Not quite banner (reuse `levelup-pop` or a lighter variant). On a wrong answer with effort points, show `+2 ⭐ for trying` — reinforces principle 1.
- **Goal reached:** when `goalJustReached`, show a celebration banner ("🎯 You hit your weekly goal!") above the result, same placement rules as the Sprint 21 level-up banner. If both level-up and goal-reached happen together, show both, goal first.
- **Today card** (`kid-today-card.tsx`): above the topic card, a progress bar toward the goal ("320 / 500 ⭐ this week") and, if any rewards exist, the cheapest unaffordable one: "180 more ⭐ for Ice cream 🍦".
- **Rewards page** `/learn/[childId]/rewards` (linked from the header balance): reward cards with emoji, name, cost, and an "Ask for it" button — disabled with "Need 180 more ⭐" when unaffordable, "Waiting for parent…" when a PENDING request exists for that reward. Requesting shows a confirmation first ("Use 300 ⭐ for Ice cream? Your parent will be asked.").
- All animations respect `prefers-reduced-motion`.

### 5. Parent UI (`apps/web`, parent dashboard — behind PIN)

- New page `/children/[id]/rewards` ("Goals & rewards"), linked from the child's card on `dashboard/manage`.
- **Goal section:** period selector (Daily / Weekly / Monthly, Weekly preselected) and target input with a suggested value per period (Daily 100, Weekly 500, Monthly 2,000) and helper text "A 15-minute session earns about 100–130 ⭐". Shows current progress.
- **Rewards section:** list + add/edit/archive. Emoji picked from a preset grid (~16 kid-friendly options). Pre-filled suggestions the parent can add in one tap, experiences first: "Pick the weekend movie 🎬", "Park trip 🌳", "Extra 30 min play time ⏰", "Ice cream 🍦".
- Short helper note: "Tip: experiences and time together tend to keep kids motivated longer than toys."
- **Requests section:** PENDING requests with Approve / Decline; history of resolved ones below.
- **Badge:** a pending-request count badge on the child's card in `dashboard/manage`.

## Out of Scope

- Daily streaks, badges, Atlas outfits/unlockables (phase 2)
- Push/email notifications for redemption requests (parent sees them in the dashboard)
- Leaderboards or any cross-child comparison (permanently out — principle 3)
- Real money, payments, or point purchases (permanently out)
- Retroactive points for attempts made before this sprint ships

## Acceptance Criteria

- Answering a question returns `points` in the attempt response; balance updates in the header without a page reload.
- The same attempt, session, mastery crossing, or redemption never awards twice (retry the request — balance unchanged).
- Rapid guesses earn 0; genuine wrong answers earn the effort points; no transaction is ever negative except `REDEMPTION`.
- Daily cap stops awarding at 300 for the WIB calendar day and resumes the next day.
- Goal progress resets at the WIB period boundary; redeeming does not reduce it.
- Redeeming with insufficient balance returns 400; two rapid redeem requests can't both succeed on the same points.
- Declining refunds the full cost; approve/decline on an already-resolved request returns 409.
- Another parent's child → 404 on every endpoint.
- Points failures never break answer submission.

## Testing

E2E tests in `apps/api/test/points/` covering every acceptance criterion above, especially idempotency, the cap, period boundaries (inject the clock rather than waiting), the redemption reserve/refund flow, the concurrent-redeem case, and ownership.
