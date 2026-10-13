// Which curricula and grades have practice questions today. Keep in sync with
// the question bank (and the FAQ on the marketing site) as content grows.
export const AVAILABLE_CURRICULA = ["IB", "Nasional"] as const;
export const AVAILABLE_GRADES = ["Grade 5", "Grade 6"] as const;

export function hasContent(curriculum: string, grade: string): boolean {
  return (
    (AVAILABLE_CURRICULA as readonly string[]).includes(curriculum) &&
    (AVAILABLE_GRADES as readonly string[]).includes(grade)
  );
}
