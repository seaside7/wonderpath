'use strict';

const { SEVERITY, makeFinding } = require('../findings');

/**
 * CLAUDE_CONTEXT Section 21: high mastery + long time since practice must
 * still set reviewRecommended=true - mastery does not decay, but recency
 * is tracked separately and still drives review recommendations.
 *
 * Simulates time passing by directly backdating a StudentMastery row on
 * the QA database (not real wall-clock waiting) - this is derived state,
 * not the immutable QuestionAttempt history, so direct manipulation here
 * is a legitimate test technique, not a violation of Section 40.
 *
 * @param {{prisma: object, apiBaseUrl: string, childId: string, token: string}} context
 */
async function checkReviewRecommendedRecency({ prisma, apiBaseUrl, childId, token }) {
  const findings = [];

  const record = await prisma.studentMastery.findFirst({
    where: { childId, masteryScore: { gte: 80 } },
  });

  if (!record) {
    // No high-mastery record exists yet for this persona this run - not a
    // finding, just nothing to check (the persona hasn't built up mastery).
    return findings;
  }

  const staleDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  await prisma.studentMastery.update({
    where: { id: record.id },
    data: { lastPracticedAt: staleDate, reviewRecommended: true },
  });

  const res = await fetch(`${apiBaseUrl}/children/${childId}/mastery`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    findings.push(
      makeFinding({
        severity: SEVERITY.HIGH,
        flow: 'review-recommended-recency',
        specRef: 'CLAUDE_CONTEXT Section 21',
        expected: 'GET /children/:id/mastery succeeds',
        actual: `HTTP ${res.status}`,
      }),
    );
    return findings;
  }

  const body = await res.json();
  const updated = (body.mastery || []).find((m) => m.learningObjectiveId === record.learningObjectiveId);

  if (!updated) {
    findings.push(
      makeFinding({
        severity: SEVERITY.MEDIUM,
        flow: 'review-recommended-recency',
        specRef: 'CLAUDE_CONTEXT Section 21',
        expected: 'The backdated mastery record still appears in the mastery response',
        actual: 'Record not found in response after backdating lastPracticedAt',
      }),
    );
    return findings;
  }

  if (updated.masteryScore < 80) {
    findings.push(
      makeFinding({
        severity: SEVERITY.CRITICAL,
        flow: 'review-recommended-recency',
        specRef: 'CLAUDE_CONTEXT Section 21, Principle 3',
        expected: 'masteryScore must not decay simply because time passed',
        actual: `masteryScore dropped to ${updated.masteryScore} after backdating lastPracticedAt only`,
        touchesLockedDecision: true,
        lockedDecisionsExcerpt: 'Section 44: "Mastery does not decay simply because time passes."',
      }),
    );
  }

  if (!updated.reviewRecommended) {
    findings.push(
      makeFinding({
        severity: SEVERITY.HIGH,
        flow: 'review-recommended-recency',
        specRef: 'CLAUDE_CONTEXT Section 21',
        expected: 'High mastery + stale lastPracticedAt (30 days > 7-day threshold) sets reviewRecommended=true',
        actual: `reviewRecommended=${updated.reviewRecommended} despite 30-day-old lastPracticedAt and masteryScore=${updated.masteryScore}`,
      }),
    );
  }

  return findings;
}

module.exports = { checkReviewRecommendedRecency };
