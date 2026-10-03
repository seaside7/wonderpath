'use strict';

const crypto = require('crypto');

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
    // Stable across runs (flow + what was expected, not the actual value or
    // a timestamp) - lets Linear sync recognize "the same underlying issue
    // showed up again" instead of opening a fresh ticket every single day.
    dedupeKey: crypto.createHash('sha1').update(`${flow}::${expected}`).digest('hex').slice(0, 16),
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
