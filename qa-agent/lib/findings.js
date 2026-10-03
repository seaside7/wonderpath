'use strict';

const SEVERITY = {
  CRITICAL: 'critical', // security/data-integrity/violates a locked decision
  HIGH: 'high', // incorrect behavior in a core flow
  MEDIUM: 'medium', // incorrect but an edge case
  LOW: 'low', // cosmetic/copy
};

let counter = 0;

function makeFinding({
  severity,
  flow,
  specRef,
  expected,
  actual,
  errorDetail = null,
  specExcerpt = null,
  lockedDecisionsExcerpt = null,
  touchesLockedDecision = false,
}) {
  counter += 1;
  return {
    id: `f-${Date.now()}-${counter}`,
    severity,
    flow,
    specRef,
    expected,
    actual,
    errorDetail,
    specExcerpt,
    lockedDecisionsExcerpt,
    touchesLockedDecision,
  };
}

module.exports = { SEVERITY, makeFinding };
