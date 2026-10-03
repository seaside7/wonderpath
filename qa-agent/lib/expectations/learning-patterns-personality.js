'use strict';

const { SEVERITY, makeFinding } = require('../findings');

const GENERIC_PRAISE = ['great job!', 'good job!', 'well done!', 'nice work!', 'awesome!'];

/**
 * Sprint 09 - "how Atlas teaches" (patterns/personality) and CLAUDE_CONTEXT
 * Section 5 Principle 5: praise must be grounded in real data, not generic.
 *
 * @param {{apiBaseUrl: string, childId: string, token: string}} context
 */
async function checkLearningPatternsAndPersonality({ apiBaseUrl, childId, token }) {
  const findings = [];
  const headers = { Authorization: `Bearer ${token}` };

  const patternsRes = await fetch(`${apiBaseUrl}/children/${childId}/learning-patterns`, { headers });
  if (!patternsRes.ok) {
    findings.push(
      makeFinding({
        severity: SEVERITY.MEDIUM,
        flow: 'learning-patterns',
        specRef: 'specs/sprint-09-atlas-learning-patterns-and-personality.md',
        expected: "GET /children/:id/learning-patterns succeeds for the child's own parent",
        actual: `HTTP ${patternsRes.status}`,
      }),
    );
  } else {
    const body = await patternsRes.json();
    for (const p of body.patterns || []) {
      if (p.strength < 0 || p.strength > 1) {
        findings.push(
          makeFinding({
            severity: SEVERITY.MEDIUM,
            flow: 'learning-patterns',
            specRef: 'specs/sprint-09-atlas-learning-patterns-and-personality.md',
            expected: 'Pattern strength is a normalized value (0-1)',
            actual: `strength=${p.strength} for pattern ${p.key}`,
          }),
        );
      }
    }
  }

  const personalityRes = await fetch(`${apiBaseUrl}/children/${childId}/personality`, { headers });
  if (!personalityRes.ok) {
    findings.push(
      makeFinding({
        severity: SEVERITY.LOW,
        flow: 'personality',
        specRef: 'specs/sprint-09-atlas-learning-patterns-and-personality.md',
        expected: "GET /children/:id/personality succeeds for the child's own parent",
        actual: `HTTP ${personalityRes.status}`,
      }),
    );
  }

  const encouragementRes = await fetch(`${apiBaseUrl}/children/${childId}/encouragement`, { headers });
  if (encouragementRes.ok) {
    const body = await encouragementRes.json();
    const messageLower = (body.message || '').trim().toLowerCase();
    const isGeneric = GENERIC_PRAISE.some((phrase) => messageLower === phrase);
    const hasRealData =
      body.data &&
      (body.data.latestSessionTotal > 0 || body.data.sessionsCompared > 0);

    if (isGeneric && !hasRealData) {
      findings.push(
        makeFinding({
          severity: SEVERITY.HIGH,
          flow: 'encouragement',
          specRef: 'CLAUDE_CONTEXT Section 5 Principle 5',
          expected: 'Praise is grounded in real session data, not a generic phrase with nothing behind it',
          actual: `message="${body.message}" with no backing data (latestSessionTotal=${body.data?.latestSessionTotal}, sessionsCompared=${body.data?.sessionsCompared})`,
          touchesLockedDecision: true,
          lockedDecisionsExcerpt:
            'Section 5 Principle 5: "avoid generic AI praise... Atlas should be a personal learning coach, not a generic chatbot."',
        }),
      );
    }
  } else {
    // getEncouragement always returns 200 (a friendly fallback message when
    // there are no sessions yet, learning-pattern.service.ts#getEncouragement)
    // - any non-2xx here is a genuine failure.
    findings.push(
      makeFinding({
        severity: SEVERITY.LOW,
        flow: 'encouragement',
        specRef: 'specs/sprint-09-atlas-learning-patterns-and-personality.md',
        expected: "GET /children/:id/encouragement succeeds or 404s (no data yet)",
        actual: `HTTP ${encouragementRes.status}`,
      }),
    );
  }

  return findings;
}

module.exports = { checkLearningPatternsAndPersonality };
