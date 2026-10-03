'use strict';

const { SEVERITY, makeFinding } = require('../findings');

/**
 * A parent must never be able to read another parent's child/mastery data.
 * The app's convention (confirmed in a prior review) is 404, not 403, to
 * avoid leaking existence - we only assert "not 200 with real data",
 * not the exact status code, to stay resilient to that implementation detail.
 *
 * @param {{apiBaseUrl: string, ownerToken: string, otherToken: string, childId: string}} context
 */
async function checkCrossParentIsolation({ apiBaseUrl, ownerToken, otherToken, childId }) {
  const findings = [];

  const routes = [
    { path: `/children/${childId}`, label: 'child profile' },
    { path: `/children/${childId}/mastery`, label: 'mastery' },
    { path: `/children/${childId}/recommendations`, label: 'recommendations' },
  ];

  for (const route of routes) {
    const res = await fetch(`${apiBaseUrl}${route.path}`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    });

    if (res.status === 200) {
      findings.push(
        makeFinding({
          severity: SEVERITY.CRITICAL,
          flow: 'cross-parent-isolation',
          specRef: 'specs/sprint-02-child-profile.md, CLAUDE_CONTEXT Section 39',
          expected: `A different parent's token must never get 200 on ${route.label}`,
          actual: `HTTP 200 returned for ${route.path} using another parent's token`,
          touchesLockedDecision: true,
          lockedDecisionsExcerpt:
            'Section 39: "Parent can only access their own children... Never trust child IDs supplied by clients without checking ownership."',
        }),
      );
    }
  }

  // Sanity check: the owner's own token must still work, so we know a 404
  // above means "isolation enforced," not "the route/child is broken."
  const ownerCheck = await fetch(`${apiBaseUrl}${routes[0].path}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  if (ownerCheck.status !== 200) {
    findings.push(
      makeFinding({
        severity: SEVERITY.HIGH,
        flow: 'cross-parent-isolation',
        specRef: 'specs/sprint-02-child-profile.md',
        expected: 'The owning parent can access their own child profile',
        actual: `HTTP ${ownerCheck.status} for the owner's own token - isolation results above may be inconclusive`,
      }),
    );
  }

  return findings;
}

module.exports = { checkCrossParentIsolation };
