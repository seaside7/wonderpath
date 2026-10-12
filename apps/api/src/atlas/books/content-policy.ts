/**
 * Story Trail's single content-policy source. Keep this list plain so the
 * founder can review and edit it without having to understand the pipeline.
 */
export const CONTENT_POLICY_RULES = [
  'No LGBTQ+ themes, characters, or relationships.',
  'No romance, dating, or crushes.',
  'No pork, alcohol, or gambling.',
  'No depictions of prophets or religious figures.',
  'Respectful toward all religions; no mocking of beliefs.',
  'No violence, horror, or frightening content.',
  'No unsafe behavior a child might copy, such as playing with fire or treating talking to strangers as positive.',
  'No brand names or real commercial products.',
  'Use age-appropriate vocabulary and themes for the target grade.',
] as const;

/** Fast deterministic checks used before spending money on an audit call. */
export const CONTENT_POLICY_BANNED_WORDS = [
  'pork',
  'alcohol',
  'gambling',
  'romance',
  'dating',
  'crush',
  'horror',
  'murder',
  'kill',
  'prophet',
  'religious figure',
] as const;

export function contentPolicyPrompt(): string {
  return CONTENT_POLICY_RULES.map(
    (rule, index) => `${index + 1}. ${rule}`,
  ).join('\n');
}

/**
 * Story craft rules from the founder (2026-10-12). They shape how stories are
 * written, separate from the policy above (what must never appear).
 */
export const STORY_CRAFT_RULES = [
  'Reader: children aged 7-9, beginner Indonesian readers. Keep sentences short and words familiar.',
  'Tone: warm adventure and gentle curiosity.',
  'World rules: magic is allowed, but events must make sense within the story.',
  'Detail selection: every unusual detail must develop the character, setting, or plot. No random details.',
  'Humor: light situational humor that comes from the story; avoid unrelated absurd jokes.',
  'Structure: clear goal, then an obstacle, then the character acts, then a resolution.',
  // WonderPath_Content_Guide.md section 6
  'Before writing pages, define reading level, language, genre, tone, characters, setting and learning purpose, then outline: goal, obstacle, action, consequence, resolution.',
  'Keep names, appearance, abilities, locations, objects, chronology and illustration descriptions consistent across pages.',
  'Match vocabulary and sentence length to the reading level; a reading level is not a school grade.',
  'Biographies and factual stories: only verified facts; never invent historical quotations or events, and keep any imagined scene clearly ordinary and plausible.',
  'Every comprehension question must be answerable from the story itself.',
  'Write natural Bahasa Indonesia; review the whole story for coherence, repetition and age fit before illustrations or narration are made.',
] as const;

export function storyCraftPrompt(): string {
  return STORY_CRAFT_RULES.map((rule, index) => `${index + 1}. ${rule}`).join('\n');
}
