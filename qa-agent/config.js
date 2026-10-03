'use strict';

const fs = require('fs');
const path = require('path');
const { REPO_ROOT } = require('./lib/git');

function loadRootEnv() {
  const envPath = path.join(REPO_ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^"|"$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadRootEnv();

const guardrails = JSON.parse(fs.readFileSync(path.join(__dirname, 'guardrails.json'), 'utf8'));

const QA_DATABASE_URL = process.env.QA_DATABASE_URL;
if (!QA_DATABASE_URL || !QA_DATABASE_URL.includes('wonderpath_qa')) {
  throw new Error(
    'QA_DATABASE_URL must be set and must reference "wonderpath_qa" - refusing to run against an ambiguous database.',
  );
}

module.exports = {
  REPO_ROOT,
  guardrails,
  QA_DATABASE_URL,
  API_PORT: Number(process.env.QA_API_PORT || 3099),
  WEB_PORT: Number(process.env.QA_WEB_PORT || 3098),
  // Optional - Linear issue sync is skipped (not a failure) when unset.
  LINEAR_API_KEY: process.env.LINEAR_API_KEY || null,
  LINEAR_TEAM_ID: process.env.LINEAR_TEAM_ID || null,
};
