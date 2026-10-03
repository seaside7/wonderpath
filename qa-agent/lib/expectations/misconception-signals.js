'use strict';

const { SEVERITY, makeFinding } = require('../findings');

// Raw MisconceptionSignalStatus Prisma enum values, unmapped by the API
// (misconception.mapper.ts#mapMisconceptionHydrated passes record.status through as-is).
const VALID_STATUSES = ['POTENTIAL', 'SUGGESTED', 'CONFIRMED', 'DISMISSED'];

/**
 * CLAUDE_CONTEXT Section 5 Principle 1: Atlas accumulates evidence before
 * declaring a misconception - confidence should be a bounded, meaningful
 * number, not a raw unbounded counter.
 *
 * @param {{apiBaseUrl: string, childId: string, token: string}} context
 */
async function checkMisconceptionSignals({ apiBaseUrl, childId, token }) {
  const findings = [];
  const res = await fetch(`${apiBaseUrl}/children/${childId}/misconceptions`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    findings.push(
      makeFinding({
        severity: SEVERITY.MEDIUM,
        flow: 'misconception-signals',
        specRef: 'specs/sprint-08-misconception-and-adaptive-difficulty.md',
        expected: "GET /children/:id/misconceptions succeeds for the child's own parent",
        actual: `HTTP ${res.status}`,
      }),
    );
    return findings;
  }

  const body = await res.json();
  for (const signal of body.signals || []) {
    if (signal.confidence < 0 || signal.confidence > 100) {
      findings.push(
        makeFinding({
          severity: SEVERITY.HIGH,
          flow: 'misconception-signals',
          specRef: 'CLAUDE_CONTEXT Section 5 Principle 1',
          expected: 'Misconception confidence stays within 0-100',
          actual: `confidence=${signal.confidence} for signal type ${signal.signalType}`,
        }),
      );
    }
    if (signal.status === 'CONFIRMED' && signal.confidence < 85) {
      findings.push(
        makeFinding({
          severity: SEVERITY.CRITICAL,
          flow: 'misconception-signals',
          specRef: 'CLAUDE_CONTEXT Section 5 Principle 1',
          expected: 'A "Confirmed" misconception only happens with high accumulated confidence (>=85 per MISCONCEPTION_CONFIG.confirmedFrom)',
          actual: `status=Confirmed with confidence=${signal.confidence} - a strong claim from weak evidence`,
          touchesLockedDecision: true,
          lockedDecisionsExcerpt:
            'Section 5: "Atlas should not make strong conclusions from one answer... Only then should it become a strong student insight."',
        }),
      );
    }
    if (!VALID_STATUSES.includes(signal.status)) {
      findings.push(
        makeFinding({
          severity: SEVERITY.MEDIUM,
          flow: 'misconception-signals',
          specRef: 'specs/sprint-08-misconception-and-adaptive-difficulty.md',
          expected: `status is one of ${VALID_STATUSES.join(', ')}`,
          actual: `status="${signal.status}"`,
        }),
      );
    }
  }

  return findings;
}

module.exports = { checkMisconceptionSignals };
