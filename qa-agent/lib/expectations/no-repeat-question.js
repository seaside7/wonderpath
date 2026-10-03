'use strict';

const { SEVERITY, makeFinding } = require('../findings');

/**
 * @param {{answered: Array<{questionText: string}>}} context - the array
 *   returned by lib/flows/answer-questions.js for one session
 */
async function checkNoRepeatQuestion({ answered }) {
  const findings = [];
  const seen = new Set();

  for (const entry of answered) {
    if (seen.has(entry.questionText)) {
      findings.push(
        makeFinding({
          severity: SEVERITY.MEDIUM,
          flow: 'no-repeat-question',
          specRef: 'specs/sprint-15-web-question-answering-flow.md',
          expected: 'The same question is not served twice in one session without the pool being exhausted',
          actual: `Question repeated within the same session: "${entry.questionText.slice(0, 100)}"`,
        }),
      );
    }
    seen.add(entry.questionText);
  }

  return findings;
}

module.exports = { checkNoRepeatQuestion };
