'use strict';

const { SEVERITY, makeFinding } = require('../findings');

/**
 * @param {{apiBaseUrl: string, childId: string, token: string}} context
 */
async function checkRecommendationReasonCodes({ apiBaseUrl, childId, token }) {
  const findings = [];
  const res = await fetch(`${apiBaseUrl}/children/${childId}/recommendations`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    findings.push(
      makeFinding({
        severity: SEVERITY.HIGH,
        flow: 'recommendation-reason-codes',
        specRef: 'specs/sprint-06-atlas-recommendation-engine.md',
        expected: 'GET /children/:id/recommendations succeeds for the child\'s own parent',
        actual: `HTTP ${res.status}`,
      }),
    );
    return findings;
  }

  const body = await res.json();
  for (const item of body.recommendations || []) {
    if (!Array.isArray(item.reasonCodes) || item.reasonCodes.length === 0) {
      findings.push(
        makeFinding({
          severity: SEVERITY.HIGH,
          flow: 'recommendation-reason-codes',
          specRef: 'specs/sprint-06-atlas-recommendation-engine.md, CLAUDE_CONTEXT Principle 4',
          expected: 'Every recommendation has at least one non-empty reason code',
          actual: `learningObjective=${item.learningObjective?.id} reasonCodes=${JSON.stringify(item.reasonCodes)}`,
          touchesLockedDecision: true,
          lockedDecisionsExcerpt:
            'CLAUDE_CONTEXT Principle 4: "Every important Atlas recommendation should have an explanation... Never make Atlas feel like a mysterious black box."',
        }),
      );
    }
    if (!item.explanation || !item.explanation.trim()) {
      findings.push(
        makeFinding({
          severity: SEVERITY.MEDIUM,
          flow: 'recommendation-reason-codes',
          specRef: 'CLAUDE_CONTEXT Principle 4',
          expected: 'Every recommendation has a human-readable explanation',
          actual: `learningObjective=${item.learningObjective?.id} explanation="${item.explanation}"`,
        }),
      );
    }
  }

  return findings;
}

module.exports = { checkRecommendationReasonCodes };
