import { QuestionPerformanceStatus } from '../../generated/prisma/client';

export function mapPerformanceStatusFromPrisma(
  status: QuestionPerformanceStatus,
) {
  const map: Record<QuestionPerformanceStatus, string> = {
    [QuestionPerformanceStatus.ACTIVE]: 'Active',
    [QuestionPerformanceStatus.LOW_PERFORMANCE]: 'Low Performance',
    [QuestionPerformanceStatus.REVIEW]: 'Review',
    [QuestionPerformanceStatus.RETIRED]: 'Retired',
  };
  return map[status];
}

export function mapPerformanceStatusToPrisma(
  status: string,
): QuestionPerformanceStatus {
  const map: Record<string, QuestionPerformanceStatus> = {
    Active: QuestionPerformanceStatus.ACTIVE,
    'Low Performance': QuestionPerformanceStatus.LOW_PERFORMANCE,
    Review: QuestionPerformanceStatus.REVIEW,
    Retired: QuestionPerformanceStatus.RETIRED,
  };
  return map[status];
}
