'use strict';

const { SEVERITY, makeFinding } = require('../findings');

// Raw QuestionPerformanceStatus Prisma enum values, unmapped by the admin
// endpoint (question-performance.service.ts#list returns record.status as-is).
const VALID_STATUSES = ['ACTIVE', 'LOW_PERFORMANCE', 'REVIEW', 'RETIRED'];

/**
 * Living Question Bank (Sprint 10) - admin-only, checked with a dedicated
 * QA admin account (lib/db.js ensureQaAdmin), not a parent persona.
 *
 * @param {{apiBaseUrl: string, adminToken: string}} context
 */
async function checkQuestionPerformanceAdmin({ apiBaseUrl, adminToken }) {
  const findings = [];
  const headers = { Authorization: `Bearer ${adminToken}` };

  const perfRes = await fetch(`${apiBaseUrl}/admin/question-performance`, { headers });
  if (!perfRes.ok) {
    findings.push(
      makeFinding({
        severity: SEVERITY.MEDIUM,
        flow: 'question-performance-admin',
        specRef: 'specs/sprint-10-living-question-bank.md',
        expected: 'GET /admin/question-performance succeeds for an admin token',
        actual: `HTTP ${perfRes.status}`,
      }),
    );
  } else {
    const list = await perfRes.json();
    for (const item of Array.isArray(list) ? list : list.items || []) {
      if (item.status && !VALID_STATUSES.includes(item.status)) {
        findings.push(
          makeFinding({
            severity: SEVERITY.LOW,
            flow: 'question-performance-admin',
            specRef: 'specs/sprint-10-living-question-bank.md',
            expected: `status is one of ${VALID_STATUSES.join(', ')}`,
            actual: `status="${item.status}" for question=${item.questionId}`,
          }),
        );
      }
      if (item.timesServed < 0 || item.correctCount < 0 || item.wrongCount < 0) {
        findings.push(
          makeFinding({
            severity: SEVERITY.HIGH,
            flow: 'question-performance-admin',
            specRef: 'specs/sprint-10-living-question-bank.md',
            expected: 'Performance counters (timesServed/correctCount/wrongCount) are never negative',
            actual: `timesServed=${item.timesServed} correctCount=${item.correctCount} wrongCount=${item.wrongCount} for question=${item.questionId}`,
          }),
        );
      }
      if (item.correctCount + item.wrongCount > item.timesServed) {
        findings.push(
          makeFinding({
            severity: SEVERITY.MEDIUM,
            flow: 'question-performance-admin',
            specRef: 'specs/sprint-10-living-question-bank.md',
            expected: 'correctCount + wrongCount never exceeds timesServed',
            actual: `correct=${item.correctCount} wrong=${item.wrongCount} timesServed=${item.timesServed} for question=${item.questionId}`,
          }),
        );
      }
    }
  }

  const inventoryRes = await fetch(`${apiBaseUrl}/admin/inventory`, { headers });
  if (!inventoryRes.ok) {
    findings.push(
      makeFinding({
        severity: SEVERITY.MEDIUM,
        flow: 'question-performance-admin',
        specRef: 'specs/sprint-10-living-question-bank.md',
        expected: 'GET /admin/inventory succeeds for an admin token',
        actual: `HTTP ${inventoryRes.status}`,
      }),
    );
  }

  return findings;
}

module.exports = { checkQuestionPerformanceAdmin };
