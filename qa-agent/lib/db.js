'use strict';

const { execFileSync, spawnSync } = require('child_process');
const path = require('path');
const { REPO_ROOT } = require('./git');

/**
 * Applies pending migrations to the QA database (idempotent - no-op if
 * already current). Never touches the real dev DATABASE_URL.
 */
function migrateQaDatabase(qaDatabaseUrl) {
  const apiDir = path.join(REPO_ROOT, 'apps', 'api');
  const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: apiDir,
    encoding: 'utf8',
    shell: true,
    env: { ...process.env, DATABASE_URL: qaDatabaseUrl },
  });
  if (result.status !== 0) {
    throw new Error(`QA database migration failed:\n${result.stdout}\n${result.stderr}`);
  }
}

/**
 * Deletes only rows created by prior QA-agent persona runs (parents whose
 * email ends in the QA test domain), leaving seeded question-bank content
 * (isSeedData=true rows from prisma/seed-qa-test-questions.ts) untouched.
 */
function resetPersonaData(qaDatabaseUrl) {
  const sql = `DELETE FROM "Parent" WHERE email LIKE '%@qa-agent.test';`;
  execFileSync(
    'npx',
    ['prisma', 'db', 'execute', '--stdin', '--schema', 'prisma/schema.prisma'],
    {
      cwd: path.join(REPO_ROOT, 'apps', 'api'),
      input: sql,
      encoding: 'utf8',
      shell: true,
      env: { ...process.env, DATABASE_URL: qaDatabaseUrl },
    },
  );
}

const QA_ADMIN_EMAIL = 'qa-agent-admin@qa-agent.test';
const QA_ADMIN_PASSWORD = 'QaAgentAdmin123!';

/**
 * Ensures a fixed QA-only admin account exists (upsert), so admin-scoped
 * checks (Living Question Bank / inventory) can authenticate. Password is
 * fixed and test-only - never used for anything real.
 */
async function ensureQaAdmin(qaDatabaseUrl) {
  const argon2 = require('argon2');
  const path2 = path.join(REPO_ROOT, 'apps', 'api', 'dist', 'generated', 'prisma', 'client.js');
  const { PrismaClient } = require(path2);
  const prisma = new PrismaClient({ datasourceUrl: qaDatabaseUrl });

  try {
    const passwordHash = await argon2.hash(QA_ADMIN_PASSWORD);
    await prisma.admin.upsert({
      where: { email: QA_ADMIN_EMAIL },
      create: { email: QA_ADMIN_EMAIL, password: passwordHash },
      update: {},
    });
  } finally {
    await prisma.$disconnect();
  }

  return { email: QA_ADMIN_EMAIL, password: QA_ADMIN_PASSWORD };
}

module.exports = { migrateQaDatabase, resetPersonaData, ensureQaAdmin, QA_ADMIN_EMAIL, QA_ADMIN_PASSWORD };
