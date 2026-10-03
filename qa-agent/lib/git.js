'use strict';

const { execFileSync } = require('child_process');

const REPO_ROOT = require('path').resolve(__dirname, '..', '..');

function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    ...options,
  }).trim();
}

function currentBranch() {
  return git(['rev-parse', '--abbrev-ref', 'HEAD']);
}

function headSha() {
  return git(['rev-parse', 'HEAD']);
}

function isWorkingTreeClean() {
  return git(['status', '--porcelain']) === '';
}

function fetchMain() {
  git(['fetch', 'origin', 'main', '--quiet']);
}

function hasMainDiverged() {
  const local = git(['rev-parse', 'main']);
  const remote = git(['rev-parse', 'origin/main']);
  return local !== remote;
}

function branchExists(name) {
  try {
    git(['rev-parse', '--verify', `refs/heads/${name}`]);
    return true;
  } catch {
    return false;
  }
}

function checkoutDailyBranch(name) {
  if (branchExists(name)) {
    git(['checkout', name]);
  } else {
    git(['checkout', '-b', name, 'origin/main']);
  }
}

function checkoutBranch(name) {
  git(['checkout', name]);
}

/**
 * Files touched in the working tree right now (modified, added, untracked) -
 * checkpoint #1 of the guardrail check, before anything is staged.
 */
function changedFilesInWorkingTree() {
  const raw = git(['status', '--porcelain', '-z']);
  if (!raw) return [];
  return raw
    .split('\0')
    .filter(Boolean)
    .map((entry) => entry.slice(3));
}

/**
 * Files actually committed between two SHAs - checkpoint #2, redundant
 * with checkpoint #1 by design (defense in depth).
 */
function changedFilesBetween(fromSha, toSha) {
  const raw = git(['diff', '--name-only', fromSha, toSha]);
  return raw ? raw.split('\n').filter(Boolean) : [];
}

function commitFix(allowedRoots, findingId, specRef, summary) {
  git(['add', '-A', '--', ...allowedRoots]);
  const message = [
    `qa-agent: fix ${findingId} — ${summary}`,
    '',
    `Finding: ${findingId}`,
    `Spec-ref: ${specRef}`,
    `QA-Agent-Status: pending-verification`,
  ].join('\n');
  git(['commit', '-m', message]);
  return headSha();
}

/**
 * Discards everything since preFixSha on the CURRENT branch. Only ever
 * call this when currentBranch() is the daily branch - never main.
 */
function discardSince(preFixSha, allowedRoots) {
  const branch = currentBranch();
  if (branch === 'main' || branch === 'master') {
    throw new Error(`Refusing to git reset --hard on "${branch}" - safety invariant violated`);
  }
  git(['reset', '--hard', preFixSha]);
  git(['clean', '-fd', '--', ...allowedRoots]);
}

function removeOrigin() {
  try {
    git(['remote', 'remove', 'origin']);
  } catch {
    // already removed, fine
  }
}

function restoreOrigin(url) {
  try {
    git(['remote', 'add', 'origin', url]);
  } catch {
    // already present, fine
  }
}

function originUrl() {
  return git(['remote', 'get-url', 'origin']);
}

module.exports = {
  REPO_ROOT,
  currentBranch,
  headSha,
  isWorkingTreeClean,
  fetchMain,
  hasMainDiverged,
  branchExists,
  checkoutDailyBranch,
  checkoutBranch,
  changedFilesInWorkingTree,
  changedFilesBetween,
  commitFix,
  discardSince,
  removeOrigin,
  restoreOrigin,
  originUrl,
};
