'use strict';

const { SEVERITY, makeFinding } = require('../findings');

/**
 * Raw attempt history must be append-only (Section 40). We can't watch
 * every write in the app from here, but we can assert the one invariant
 * that would catch a violation: the count of QuestionAttempt rows for this
 * child increases by exactly the number of answers submitted this session -
 * never less (an overwrite/merge) and never more (a duplicate insert bug,
 * which is its own real issue worth flagging even though it doesn't
 * violate immutability itself).
 *
 * @param {{prisma: object, childId: string, countBefore: number, answeredCount: number}} context
 */
async function checkAttemptImmutability({ prisma, childId, countBefore, answeredCount }) {
  const findings = [];
  const countAfter = await prisma.questionAttempt.count({ where: { childId } });
  const delta = countAfter - countBefore;

  if (delta !== answeredCount) {
    findings.push(
      makeFinding({
        severity: SEVERITY.CRITICAL,
        flow: 'attempt-immutability',
        specRef: 'CLAUDE_CONTEXT Section 40',
        expected: `QuestionAttempt row count increases by exactly ${answeredCount} (one per submitted answer)`,
        actual: `Row count increased by ${delta} instead - ${delta < answeredCount ? 'fewer rows than answers (possible overwrite/merge)' : 'more rows than answers (possible duplicate insert)'}`,
        touchesLockedDecision: true,
        lockedDecisionsExcerpt:
          'Section 40: raw event history "should not be overwritten" - "future Atlas/ML systems may discover patterns not anticipated today."',
      }),
    );
  }

  return findings;
}

module.exports = { checkAttemptImmutability };
