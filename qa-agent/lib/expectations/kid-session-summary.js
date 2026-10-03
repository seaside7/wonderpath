'use strict';

const { SEVERITY, makeFinding } = require('../findings');

/**
 * Checks the actual rendered page content after a kid session ends -
 * every other check in this agent verifies API/DB state, which would
 * have missed this exact bug: the API correctly returned
 * {question: null}, but a frontend guard condition showed the generic
 * error screen instead of the encouragement/summary screen regardless.
 * Only driving the real UI and reading what's on screen catches this
 * class of bug.
 */
function checkKidSessionSummary({ bodyText, hasErrorState, hasSummary }) {
  const findings = [];

  if (hasErrorState) {
    findings.push(
      makeFinding({
        severity: SEVERITY.CRITICAL,
        flow: 'kid-session-summary',
        specRef: 'specs/sprint-18-child-learning-experience.md',
        expected:
          'Ending a kid session (finishing or running out of questions) shows the encouragement/summary screen',
        actual: `The error screen ("Something went wrong") rendered instead: "${bodyText.slice(0, 300)}"`,
      }),
    );
    return findings;
  }

  if (!hasSummary) {
    findings.push(
      makeFinding({
        severity: SEVERITY.HIGH,
        flow: 'kid-session-summary',
        specRef: 'specs/sprint-18-child-learning-experience.md',
        expected:
          'Ending a kid session shows recognizable encouragement/summary text',
        actual: `Neither the error screen nor expected summary text was found: "${bodyText.slice(0, 300)}"`,
      }),
    );
  }

  return findings;
}

module.exports = { checkKidSessionSummary };
