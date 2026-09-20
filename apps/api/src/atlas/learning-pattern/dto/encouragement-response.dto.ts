export class EncouragementResponseDto {
  message: string;
  data: {
    sessionsCompared: number;
    latestSessionCorrect: number;
    latestSessionTotal: number;
    correctRate: number;
    averageResponseTimeMs: number;
    responseTimeImprovementPct: number | null;
    correctRateImprovementPct: number | null;
  };
}
