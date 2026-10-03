'use strict';

const fs = require('fs');
const path = require('path');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function writeFindingsLog(findings, outcomes, qaAgentDir) {
  const date = todayStr();
  const dir = path.join(qaAgentDir, 'findings');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${date}.md`);

  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : `# Findings — ${date}\n\n`;

  const entries = findings
    .map((f) => {
      const outcome = outcomes.get(f.id);
      return [
        `## [${f.severity}] ${f.id} — ${f.flow}`,
        `- Flow: ${f.flow}`,
        `- Expected (per ${f.specRef}): ${f.expected}`,
        `- Actual: ${f.actual}`,
        `- Fix attempted: ${outcome ? 'yes' : 'no'}${outcome ? ` — ${outcome.outcome}` : ''}`,
        '',
      ].join('\n');
    })
    .join('\n');

  fs.writeFileSync(filePath, existing + entries);
  return filePath;
}

function writeDailySummary(summaryData, qaAgentDir) {
  const date = todayStr();
  const dir = path.join(qaAgentDir, 'daily-summary');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${date}.md`);

  const {
    personasRun,
    flowsCovered,
    findings,
    outcomes,
    branchName,
    keptCommits,
    guardrailViolations,
    unmergedBranches,
    errors,
    linearSync,
  } = summaryData;

  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;

  const lines = [
    `# QA Agent Daily Summary — ${date}`,
    '',
    '## What was tested',
    `- Personas run: ${personasRun.join(', ') || 'none'}`,
    `- Flows covered: ${flowsCovered.join(', ') || 'none'}`,
    '',
    '## What was found',
    `- Total findings: ${findings.length} (critical: ${bySeverity.critical}, high: ${bySeverity.high}, medium: ${bySeverity.medium}, low: ${bySeverity.low})`,
    '',
  ];

  if (findings.length) {
    lines.push('| Severity | Flow | Summary | Outcome |', '|---|---|---|---|');
    for (const f of findings) {
      const outcome = outcomes.get(f.id);
      lines.push(`| ${f.severity} | ${f.flow} | ${f.expected} | ${outcome ? outcome.outcome : 'not attempted'} |`);
    }
    lines.push('');
  }

  lines.push('## What changed', '');
  if (keptCommits.length) {
    for (const c of keptCommits) {
      lines.push(`- \`${c.sha.slice(0, 8)}\` on \`${branchName}\` — ${c.summary}`);
    }
  } else {
    lines.push('- No fixes were kept today.');
  }
  lines.push('');

  lines.push('## Needs your decision', '');
  const flaggedOrLocked = findings.filter((f) => f.touchesLockedDecision);
  if (flaggedOrLocked.length) {
    for (const f of flaggedOrLocked) {
      lines.push(`- **${f.id}** touches a locked decision: ${f.lockedDecisionsExcerpt}`);
    }
  }
  if (guardrailViolations.length >= 3) {
    lines.push(
      `- ⚠️ ${guardrailViolations.length} guardrail violations today — the fixer scope itself may need attention, not just the individual findings.`,
    );
  }
  if (unmergedBranches.length) {
    lines.push(
      `- Unmerged qa-agent branches awaiting review: ${unmergedBranches.join(', ')} — recommend a weekly review/merge habit, not daily.`,
    );
  }
  if (!flaggedOrLocked.length && guardrailViolations.length < 3 && !unmergedBranches.length) {
    lines.push('- Nothing needs a decision today.');
  }
  lines.push('');

  if (linearSync && !linearSync.skipped) {
    lines.push('## Linear', '');
    if (linearSync.created.length) {
      for (const { issue } of linearSync.created) {
        lines.push(`- Opened [${issue.identifier}](${issue.url})`);
      }
    }
    if (linearSync.alreadyTracked.length) {
      lines.push(`- ${linearSync.alreadyTracked.length} finding(s) already have an open Linear issue from a previous run.`);
    }
    if (linearSync.failed.length) {
      lines.push(`- ⚠️ ${linearSync.failed.length} finding(s) failed to sync to Linear: ${linearSync.failed.map((f) => f.error).join('; ')}`);
    }
    if (!linearSync.created.length && !linearSync.alreadyTracked.length && !linearSync.failed.length) {
      lines.push('- Nothing to sync today.');
    }
    lines.push('');
  }

  if (errors.length) {
    lines.push('## Run errors', '');
    for (const e of errors) lines.push(`- ${e}`);
    lines.push('');
  }

  fs.writeFileSync(filePath, lines.join('\n'));
  return filePath;
}

module.exports = { writeFindingsLog, writeDailySummary, todayStr };
