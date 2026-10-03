'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const { REPO_ROOT } = require('./git');

/**
 * Runs the full existing backend e2e suite. Returns {passed, output}.
 * This is the safety gate every fix must pass before being kept.
 */
function runFullTestSuite() {
  const apiDir = path.join(REPO_ROOT, 'apps', 'api');
  const result = spawnSync('npx', ['jest', '--config', './test/jest-e2e.json'], {
    cwd: apiDir,
    encoding: 'utf8',
    shell: true,
    timeout: 10 * 60 * 1000,
  });

  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  return { passed: result.status === 0, output };
}

module.exports = { runFullTestSuite };
