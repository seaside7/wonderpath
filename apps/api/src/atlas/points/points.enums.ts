export enum PointReason {
  CorrectAnswer = 'CORRECT_ANSWER',
  Effort = 'EFFORT',
  SessionComplete = 'SESSION_COMPLETE',
  Mastery = 'MASTERY',
  GradeAheadBonus = 'GRADE_AHEAD_BONUS',
  Redemption = 'REDEMPTION',
  RedemptionRefund = 'REDEMPTION_REFUND',
}

export enum GoalPeriod {
  Daily = 'DAILY',
  Weekly = 'WEEKLY',
  Monthly = 'MONTHLY',
}

export enum RedemptionStatus {
  Pending = 'PENDING',
  Approved = 'APPROVED',
  Declined = 'DECLINED',
}
