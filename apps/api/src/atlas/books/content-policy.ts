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
