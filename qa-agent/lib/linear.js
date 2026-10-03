'use strict';

const fs = require('fs');
const path = require('path');
const { STATE_DIR } = require('./lock');

const LINEAR_API_URL = 'https://api.linear.app/graphql';
const SYNC_STATE_PATH = path.join(STATE_DIR, 'linear-sync-state.json');

// Maps our severity scale to Linear's native priority field
// (0=No priority, 1=Urgent, 2=High, 3=Medium, 4=Low).
const PRIORITY_BY_SEVERITY = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

async function graphqlRequest(apiKey, query, variables) {
  const res = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Linear's API key goes directly in Authorization - no "Bearer " prefix.
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = await res.json();
  if (!res.ok || body.errors) {
    throw new Error(`Linear API error: HTTP ${res.status} - ${JSON.stringify(body.errors || body)}`);
  }
  return body.data;
}

/**
 * Dedup state lives OUTSIDE the repo (same STATE_DIR as the run lock/ledger),
 * keyed by finding.dedupeKey -> the Linear issue already opened for it.
 * This avoids depending on Linear's full-text filter API (its exact field
 * names for filtering by description content aren't documented without
 * introspecting the schema with a live key, which this agent doesn't hold),
 * and it's simpler: the agent is the only writer, so it can just remember
 * what it already created.
 */
function readSyncState() {
  try {
    return JSON.parse(fs.readFileSync(SYNC_STATE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeSyncState(state) {
  fs.mkdirSync(path.dirname(SYNC_STATE_PATH), { recursive: true });
  fs.writeFileSync(SYNC_STATE_PATH, JSON.stringify(state, null, 2));
}

async function createIssue(apiKey, teamId, finding) {
  const title = `[QA] ${finding.flow}: ${finding.expected}`.slice(0, 255);
  const description = [
    `**Severity:** ${finding.severity}`,
    `**Flow:** ${finding.flow}`,
    `**Spec:** ${finding.specRef}`,
    '',
    `**Expected:** ${finding.expected}`,
    `**Actual:** ${finding.actual}`,
    finding.touchesLockedDecision
      ? `\n⚠️ **Touches a locked product decision** - ${finding.lockedDecisionsExcerpt}\nThis was flagged as a recommendation, not auto-fixed.`
      : '',
    '',
    'Found by the QA agent, not auto-fixed yet.',
  ]
    .filter(Boolean)
    .join('\n');

  const data = await graphqlRequest(
    apiKey,
    `mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier url }
      }
    }`,
    {
      input: {
        teamId,
        title,
        description,
        priority: PRIORITY_BY_SEVERITY[finding.severity] ?? 3,
      },
    },
  );
  return data.issueCreate.issue;
}

/**
 * Best-effort: a Linear outage or bad token should never fail the QA run
 * itself - findings are already safely written to qa-agent/findings/ and
 * QA_NOTES.md regardless of whether this succeeds.
 */
async function syncFindingsToLinear(findings, { apiKey, teamId }) {
  if (!apiKey || !teamId) {
    return { skipped: true, reason: 'LINEAR_API_KEY or LINEAR_TEAM_ID not set' };
  }

  const state = readSyncState();
  const created = [];
  const alreadyTracked = [];
  const failed = [];

  for (const finding of findings) {
    const existing = state[finding.dedupeKey];
    if (existing) {
      alreadyTracked.push({ finding, issue: existing });
      continue;
    }
    try {
      const issue = await createIssue(apiKey, teamId, finding);
      state[finding.dedupeKey] = {
        id: issue.id,
        identifier: issue.identifier,
        url: issue.url,
        createdAt: new Date().toISOString(),
      };
      created.push({ finding, issue });
    } catch (err) {
      failed.push({ finding, error: err.message });
    }
  }

  writeSyncState(state);
  return { skipped: false, created, alreadyTracked, failed };
}

module.exports = { syncFindingsToLinear };
