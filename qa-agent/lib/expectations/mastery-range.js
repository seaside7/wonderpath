'use strict';

const { SEVERITY, makeFinding } = require('../findings');

/**
 * @param {{prisma: object, childIds: string[]}} context
 */
async function checkMasteryRange({ prisma, childIds }) {
  const findings = [];
  const records = await prisma.studentMastery.findMany({
    where: { childId: { in: childIds } },
  });

  for (const record of records) {
    if (record.masteryScore < 0 || record.masteryScore > 100) {
      findings.push(
        makeFinding({
          severity: SEVERITY.CRITICAL,
          flow: 'mastery-range',
          specRef: 'specs/sprint-05-student-model.md',
          expected: 'masteryScore stays within 0-100',
          actual: `masteryScore=${record.masteryScore} for child=${record.childId} objective=${record.learningObjectiveId}`,
        }),
      );
    }
    if (record.confidenceScore < 0 || record.confidenceScore > 100) {
      findings.push(
        makeFinding({
          severity: SEVERITY.CRITICAL,
          flow: 'mastery-range',
          specRef: 'specs/sprint-05-student-model.md',
          expected: 'confidenceScore stays within 0-100',
          actual: `confidenceScore=${record.confidenceScore} for child=${record.childId} objective=${record.learningObjectiveId}`,
        }),
      );
    }
  }

  return findings;
}

module.exports = { checkMasteryRange };
