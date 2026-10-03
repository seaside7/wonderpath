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

const AVATAR_COLORS = [
  "bg-coral",
  "bg-trail-deep",
  "bg-waypoint",
  "bg-ink",
  "bg-coral-deep",
  "bg-trail",
];

export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const KID_REASON_PRIORITY: Array<{ code: string; line: string }> = [
  {
    code: "EXAM_TOMORROW",
    line: "There's an exam coming up \u2014 let's get ready together.",
  },
  {
    code: "LOW_MASTERY",
    line: "This one is still a bit tricky \u2014 let's practice it together.",
  },
  {
    code: "LONG_TIME_NO_PRACTICE",
    line: "It's been a while \u2014 let's warm this one back up.",
  },
  {
    code: "HIGH_MASTERY",
    line: "You're strong here \u2014 let's stretch a little further.",
  },
  {
    code: "NEW_OBJECTIVE",
    line: "Something brand new to explore today.",
  },
  {
    code: "LOW_CONFIDENCE",
    line: "Let's build your confidence on this one.",
  },
  {
    code: "REVIEW_RECOMMENDED",
    line: "A quick review will keep this fresh.",
  },
  {
    code: "QUICK_SESSION",
    line: "A nice quick practice for today.",
  },
  {
    code: "CONTINUE",
    line: "You're on a roll \u2014 let's keep going.",
  },
];

export function kidReasonLine(reasonCodes: string[]): string {
  const codes = new Set(reasonCodes);
  for (const entry of KID_REASON_PRIORITY) {
    if (codes.has(entry.code)) {
      return entry.line;
    }
  }
  return "Atlas picked this one for you today.";
}

const MISCONCEPTION_SENTENCES: Record<string, string> = {
  REPEATED_MISTAKE: "has made the same kind of mistake a few times in a row.",
  STORY_PROBLEM: "finds story problems trickier than plain number questions.",
  VISUAL_REPRESENTATION:
    "finds questions with pictures and diagrams trickier.",
  HIGH_LANGUAGE_COMPLEXITY:
    "finds questions with a lot of reading trickier.",
  HINTS_OVERUSED: "has been using hints a lot on this topic.",
};

export function misconceptionSentence(signalType: string): string {
  return (
    MISCONCEPTION_SENTENCES[signalType] ??
    "Atlas noticed a repeated pattern worth watching here."
  );
}

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