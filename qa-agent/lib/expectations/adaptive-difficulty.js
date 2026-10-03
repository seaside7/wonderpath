'use strict';

const { SEVERITY, makeFinding } = require('../findings');

// misconception.service.ts#directionFromAnalysis returns exactly these
// lowercase literals - no "Steady" variant exists.
const VALID_DIRECTIONS = ['increase', 'decrease', 'maintain'];

/**
 * The "increase level" / "this question is hard" concept - Sprint 08.
 * currentDifficulty must stay within the product's defined 1-5 scale
 * (ADAPTIVE_DIFFICULTY_CONFIG.minDifficulty/maxDifficulty) regardless of
 * how much perceived-difficulty/wrong-answer signal accumulates.
 *
 * The list endpoint (GET .../adaptive-difficulty) returns
 * { childId, difficulty: [{subject, currentDifficulty}] } - no
 * direction/rationale (misconception.service.ts#getAdaptiveDifficultyList).
 * Those only appear on the single-subject form
 * (GET .../adaptive-difficulty?subject=X), which is queried separately
 * for the subject this persona actually practiced.
 *
 * @param {{apiBaseUrl: string, childId: string, token: string, subject?: string}} context
 */
async function checkAdaptiveDifficulty({ apiBaseUrl, childId, token, subject = 'Mathematics' }) {
  const findings = [];
  const listRes = await fetch(`${apiBaseUrl}/children/${childId}/adaptive-difficulty`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!listRes.ok) {
    findings.push(
      makeFinding({
        severity: SEVERITY.MEDIUM,
        flow: 'adaptive-difficulty',
        specRef: 'specs/sprint-08-misconception-and-adaptive-difficulty.md',
        expected: "GET /children/:id/adaptive-difficulty succeeds for the child's own parent",
        actual: `HTTP ${listRes.status}`,
      }),
    );
    return findings;
  }

  const listBody = await listRes.json();
  for (const entry of listBody.difficulty || []) {
    if (entry.currentDifficulty < 1 || entry.currentDifficulty > 5) {
      findings.push(
        makeFinding({
          severity: SEVERITY.CRITICAL,
          flow: 'adaptive-difficulty',
          specRef: 'specs/sprint-08-misconception-and-adaptive-difficulty.md',
          expected: 'currentDifficulty stays within the 1-5 scale',
          actual: `currentDifficulty=${entry.currentDifficulty} for subject=${entry.subject}`,
        }),
      );
    }
  }

  const singleRes = await fetch(
    `${apiBaseUrl}/children/${childId}/adaptive-difficulty?subject=${encodeURIComponent(subject)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!singleRes.ok) {
    findings.push(
      makeFinding({
        severity: SEVERITY.MEDIUM,
        flow: 'adaptive-difficulty',
        specRef: 'specs/sprint-08-misconception-and-adaptive-difficulty.md',
        expected: 'GET .../adaptive-difficulty?subject=X succeeds for a subject the child has practiced',
        actual: `HTTP ${singleRes.status} for subject=${subject}`,
      }),
    );
    return findings;
  }

  const entry = await singleRes.json();
  if (entry.direction && !VALID_DIRECTIONS.includes(entry.direction)) {
    findings.push(
      makeFinding({
        severity: SEVERITY.LOW,
        flow: 'adaptive-difficulty',
        specRef: 'specs/sprint-08-misconception-and-adaptive-difficulty.md',
        expected: `direction is one of ${VALID_DIRECTIONS.join(', ')}`,
        actual: `direction="${entry.direction}"`,
      }),
    );
  }
  if (!entry.rationale || !String(entry.rationale).trim()) {
    findings.push(
      makeFinding({
        severity: SEVERITY.MEDIUM,
        flow: 'adaptive-difficulty',
        specRef: 'CLAUDE_CONTEXT Principle 4 (explainability)',
        expected: 'Every difficulty adjustment has a human-readable rationale, same explainability rule as recommendations',
        actual: `rationale="${entry.rationale}" for subject=${entry.subject}`,
        touchesLockedDecision: true,
        lockedDecisionsExcerpt: 'Principle 4: "Never make Atlas feel like a mysterious black box."',
      }),
    );
  }

  return findings;
}

module.exports = { checkAdaptiveDifficulty };
