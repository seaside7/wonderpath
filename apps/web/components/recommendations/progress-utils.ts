import type { MasteryRecord, SessionHistoryItem } from "@/lib/api";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

export interface WeekDay {
  time: number;
  questions: number;
  correct: number;
  isToday: boolean;
}

/** Last 7 days (oldest first, ending today), in the viewer's local time. */
export function buildWeek(sessions: SessionHistoryItem[]): WeekDay[] {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, index) => {
    const time = today - (6 - index) * DAY_MS;
    return { time, questions: 0, correct: 0, isToday: time === today };
  });
  const byTime = new Map(days.map((day) => [day.time, day]));

  for (const session of sessions) {
    if (session.questionsAnswered === 0) continue;
    const day = byTime.get(startOfDay(new Date(session.startedAt)));
    if (!day) continue;
    day.questions += session.questionsAnswered;
    day.correct += session.correctCount;
  }
  return days;
}

export function summarizeWeek(week: WeekDay[]) {
  const activeDays = week.filter((day) => day.questions > 0).length;
  const questions = week.reduce((sum, day) => sum + day.questions, 0);
  const correct = week.reduce((sum, day) => sum + day.correct, 0);
  const accuracy =
    questions > 0 ? Math.round((correct / questions) * 100) : null;
  return { activeDays, questions, correct, accuracy };
}

// Mirrors apps/api/src/atlas/student-model/mastery.config.ts.
export const MASTERED_THRESHOLD = 80;
export const LEARNING_THRESHOLD = 60;

export type MasteryBucket = "mastered" | "learning" | "practice";

export function masteryBucket(score: number): MasteryBucket {
  if (score >= MASTERED_THRESHOLD) return "mastered";
  if (score >= LEARNING_THRESHOLD) return "learning";
  return "practice";
}

export const BUCKET_STYLES: Record<
  MasteryBucket,
  { label: string; bar: string; chip: string; dot: string }
> = {
  mastered: {
    label: "Mastered",
    bar: "bg-trail",
    chip: "bg-trail/15 text-emerald-800",
    dot: "bg-trail",
  },
  learning: {
    label: "Getting there",
    bar: "bg-waypoint",
    chip: "bg-waypoint/25 text-ink",
    dot: "bg-waypoint",
  },
  practice: {
    label: "Needs practice",
    bar: "bg-coral",
    chip: "bg-coral/10 text-orange-800",
    dot: "bg-coral",
  },
};

export function needsAttention(record: MasteryRecord): boolean {
  return (
    record.reviewRecommended ||
    masteryBucket(record.masteryScore) === "practice"
  );
}

export function firstNameOf(
  child: { nickname?: string | null; fullName: string } | null,
): string {
  if (!child) return "Your child";
  return (
    child.nickname?.trim() || child.fullName.split(" ")[0] || child.fullName
  );
}
