const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatRelativeTime(dateIso: string): string {
  const then = new Date(dateIso).getTime();
  const elapsedMs = Date.now() - then;

  if (elapsedMs < MINUTE_MS) return "Just now";
  if (elapsedMs < HOUR_MS) {
    const minutes = Math.floor(elapsedMs / MINUTE_MS);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (elapsedMs < DAY_MS) {
    const hours = Math.floor(elapsedMs / HOUR_MS);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(elapsedMs / DAY_MS);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function formatEstimatedSession(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourPart = `${hours} hour${hours === 1 ? "" : "s"}`;
  return rest === 0 ? hourPart : `${hourPart} ${rest} minutes`;
}

const REASON_BULLETS: Record<string, string> = {
  LOW_MASTERY: "This topic needs more practice",
  HIGH_MASTERY: "This topic is a strong area",
  LONG_TIME_NO_PRACTICE: "It has not been practiced recently",
  REVIEW_RECOMMENDED: "A short review is recommended",
  CONTINUE: "Keep building on this topic",
  NEW_OBJECTIVE: "Ready for something new",
  LOW_CONFIDENCE: "Confidence on past answers was low",
  EXAM_TOMORROW: "An exam is coming up",
  QUICK_SESSION: "Fits a quick practice session",
};

export function reasonBullets(reasonCodes: string[]): string[] {
  const bullets: string[] = [];
  for (const code of reasonCodes) {
    const bullet = REASON_BULLETS[code];
    if (bullet && !bullets.includes(bullet)) {
      bullets.push(bullet);
    }
  }
  return bullets;
}