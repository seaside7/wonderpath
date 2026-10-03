'use strict';

const { SEVERITY, makeFinding } = require('../findings');

const VALID_TRANSITIONS = {
  STARTED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * @param {{prisma: object, sessionId: string, expectedFinalStatus: string}} context
 */
async function checkSessionStatusTransition({ prisma, sessionId, expectedFinalStatus }) {
  const findings = [];
  const session = await prisma.learningSession.findUnique({ where: { id: sessionId } });

  if (!session) {
    findings.push(
      makeFinding({
        severity: SEVERITY.HIGH,
        flow: 'session-status-transitions',
        specRef: 'specs/sprint-03-learning-session.md',
        expected: `Session ${sessionId} exists after being ended`,
        actual: 'Session row not found',
      }),
    );
    return findings;
  }

  if (session.status !== expectedFinalStatus) {
    findings.push(
      makeFinding({
        severity: SEVERITY.HIGH,
        flow: 'session-status-transitions',
        specRef: 'specs/sprint-03-learning-session.md',
        expected: `Session status is "${expectedFinalStatus}" after ending it`,
        actual: `status="${session.status}" (never reached ${expectedFinalStatus}, or got stuck)`,
      }),
    );
  }

  if (!VALID_TRANSITIONS.STARTED.includes(session.status) && session.status !== 'STARTED') {
    findings.push(
      makeFinding({
        severity: SEVERITY.MEDIUM,
        flow: 'session-status-transitions',
        specRef: 'specs/sprint-03-learning-session.md',
        expected: 'Session status is one of STARTED, COMPLETED, CANCELLED',
        actual: `status="${session.status}" is not a recognized value`,
      }),
    );
  }

  return findings;
}

module.exports = { checkSessionStatusTransition, VALID_TRANSITIONS };
