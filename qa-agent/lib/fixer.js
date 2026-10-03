'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const git = require('./git');
const { checkGuardrails } = require('./guardrail-check');
const { runFullTestSuite } = require('./test-runner');
const { appendEntry, updateEntryStatus } = require('./ledger');

const PROMPT_DIR = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'qa-agent', 'prompts');

function buildPrompt(finding, guardrails) {
  const deniedList = guardrails.deniedPatterns.map((p) => `  - ${p}`).join('\n');
  const allowedList = guardrails.allowedRoots.map((p) => `  - ${p}`).join('\n');

  return [
    '# QA Agent Fix Request',
    '',
    'You are fixing ONE specific finding from an automated QA run against the WonderPath app.',
    'The orchestrator handles ALL git operations (branch, commit, checkout, push) - you must',
    'NEVER run git commit, git push, git checkout, git reset, or git merge yourself.',
    '',
    '## Hard rules (do not violate, no exceptions)',
    '',
    'You may only edit files under these roots:',
    allowedList,
    '',
    'You must NEVER touch any file matching:',
    deniedList,
    '',
    'If a correct fix would require touching a denied path or changing a locked product',
    'decision below, DO NOT make the change. Instead end your response with exactly:',
    '`QA_AGENT_RESULT: {"status":"flagged","summary":"<why this can\'t be safely auto-fixed>"}`',
    '',
    '## Locked product decisions (never change these)',
    '',
    finding.lockedDecisionsExcerpt || '(none specifically relevant to this finding)',
    '',
    '## The finding',
    '',
    `- ID: ${finding.id}`,
    `- Severity: ${finding.severity}`,
    `- Flow: ${finding.flow}`,
    `- Spec reference: ${finding.specRef}`,
    `- Expected: ${finding.expected}`,
    `- Actual: ${finding.actual}`,
    finding.errorDetail ? `- Error detail:\n${finding.errorDetail}` : '',
    '',
    '## Relevant spec excerpt',
    '',
    finding.specExcerpt || '(not available - use your judgement based on the finding above)',
    '',
    '## What to do',
    '',
    '1. Investigate the root cause.',
    '2. Make the minimal correct fix within the allowed roots above.',
    '3. Do not add unrelated changes, comments, or refactors.',
    '4. End your final message with exactly one line:',
    '   `QA_AGENT_RESULT: {"status":"fixed","summary":"<one line>"}` on success, or the',
    '   `"flagged"` form above if you determine this can\'t be safely auto-fixed, or',
    '   `QA_AGENT_RESULT: {"status":"unable","summary":"<why>"}` if you tried but could not fix it.',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

function invokeClaude(promptText, guardrails) {
  fs.mkdirSync(PROMPT_DIR, { recursive: true });
  const promptFile = path.join(PROMPT_DIR, `prompt-${Date.now()}.md`);
  fs.writeFileSync(promptFile, promptText);

  const allowedTools = [
    'Read',
    'Edit',
    'Write',
    'Bash(pnpm --filter api build:*)',
    'Bash(pnpm --filter api lint:*)',
  ].join(',');
  const disallowedTools = [
    'Bash(git push:*)',
    'Bash(git checkout:*)',
    'Bash(git commit:*)',
    'Bash(git reset:*)',
    'Bash(git merge:*)',
    'Bash(git branch:*)',
    'Bash(rm:*)',
    'WebFetch',
    'WebSearch',
  ].join(',');

  const result = spawnSync(
    'claude',
    [
      '-p',
      promptText,
      '--output-format',
      'json',
      '--max-turns',
      '12',
      '--allowedTools',
      allowedTools,
      '--disallowedTools',
      disallowedTools,
    ],
    {
      cwd: git.REPO_ROOT,
      encoding: 'utf8',
      shell: true,
      timeout: guardrails.claudeTimeoutMs,
    },
  );

  try {
    fs.unlinkSync(promptFile);
  } catch {
    // best effort cleanup
  }

  if (result.error || result.status === null) {
    return { status: 'unable', summary: 'claude invocation timed out or errored', raw: result.stderr };
  }

  return parseClaudeResult(result.stdout || '');
}

function parseClaudeResult(stdout) {
  const match = stdout.match(/QA_AGENT_RESULT:\s*(\{.*\})/s);
  if (!match) {
    return { status: 'unable', summary: 'claude did not emit a QA_AGENT_RESULT line', raw: stdout.slice(-2000) };
  }
  try {
    const parsed = JSON.parse(match[1]);
    return { status: parsed.status, summary: parsed.summary, raw: stdout.slice(-2000) };
  } catch {
    return { status: 'unable', summary: 'QA_AGENT_RESULT was not valid JSON', raw: stdout.slice(-2000) };
  }
}

/**
 * Attempts a fix for one finding. Returns one of:
 * 'kept' | 'reverted' | 'guardrail-violation' | 'flagged' | 'unable'
 */
function attemptFix(finding, guardrails, ledgerRef) {
  const preFixSha = git.headSha();
  const prompt = buildPrompt(finding, guardrails);
  const claudeResult = invokeClaude(prompt, guardrails);

  // Checkpoint 1: mechanical guardrail check on the raw working-tree diff,
  // BEFORE any add/commit - regardless of what claude claims it did.
  const workingTreeFiles = git.changedFilesInWorkingTree();
  const check1 = checkGuardrails(workingTreeFiles, guardrails);
  if (!check1.ok) {
    spawnSync('git', ['checkout', '--', '.'], { cwd: git.REPO_ROOT });
    spawnSync('git', ['clean', '-fd', '--', ...guardrails.allowedRoots], { cwd: git.REPO_ROOT });
    return { outcome: 'guardrail-violation', violations: check1.violations, claudeResult };
  }

  if (claudeResult.status === 'flagged' || claudeResult.status === 'unable') {
    // discard any incidental changes even on a legitimate flagged/unable result
    spawnSync('git', ['checkout', '--', '.'], { cwd: git.REPO_ROOT });
    spawnSync('git', ['clean', '-fd', '--', ...guardrails.allowedRoots], { cwd: git.REPO_ROOT });
    return { outcome: claudeResult.status, claudeResult };
  }

  if (workingTreeFiles.length === 0) {
    return { outcome: 'unable', claudeResult: { ...claudeResult, summary: 'no files changed' } };
  }

  const postFixSha = git.commitFix(
    guardrails.allowedRoots,
    finding.id,
    finding.specRef,
    claudeResult.summary || 'automated fix',
  );

  // Checkpoint 2: redundant check on the actual commit diff.
  const committedFiles = git.changedFilesBetween(preFixSha, postFixSha);
  const check2 = checkGuardrails(committedFiles, guardrails);
  if (!check2.ok) {
    git.discardSince(preFixSha, guardrails.allowedRoots);
    return { outcome: 'guardrail-violation', violations: check2.violations, claudeResult };
  }

  appendEntry(ledgerRef, {
    findingId: finding.id,
    preFixSha,
    postFixSha,
    status: 'in-progress',
    timestamp: new Date().toISOString(),
  });

  const testResult = runFullTestSuite();

  if (testResult.passed) {
    updateEntryStatus(ledgerRef, finding.id, 'kept');
    return { outcome: 'kept', postFixSha, claudeResult };
  }

  git.discardSince(preFixSha, guardrails.allowedRoots);
  updateEntryStatus(ledgerRef, finding.id, 'reverted', {
    testOutputTail: testResult.output.slice(-3000),
  });
  return { outcome: 'reverted', claudeResult, testOutputTail: testResult.output.slice(-3000) };
}

module.exports = { attemptFix, buildPrompt, parseClaudeResult };
