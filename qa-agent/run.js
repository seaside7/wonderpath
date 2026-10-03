'use strict';

const crypto = require('crypto');
const path = require('path');
const { chromium } = require('playwright');
const config = require('./config');
const git = require('./lib/git');
const lock = require('./lib/lock');
const db = require('./lib/db');
const { startApps } = require('./lib/app-runner');
const ledger = require('./lib/ledger');
const { attemptFix } = require('./lib/fixer');
const { writeFindingsLog, writeDailySummary } = require('./lib/report');
const { syncFindingsToLinear } = require('./lib/linear');

const { registerParent, loginParent } = require('./lib/flows/register-login');
const { addChild } = require('./lib/flows/add-child');
const { startSession } = require('./lib/flows/start-session');
const { answerQuestions, PERSONAS } = require('./lib/flows/answer-questions');
const { runKidSession } = require('./lib/flows/kid-session');

const { checkMasteryRange } = require('./lib/expectations/mastery-range');
const { checkRecommendationReasonCodes } = require('./lib/expectations/recommendation-reason-codes');
const { checkReviewRecommendedRecency } = require('./lib/expectations/review-recommended-recency');
const { checkCrossParentIsolation } = require('./lib/expectations/cross-parent-isolation');
const { checkNoRepeatQuestion } = require('./lib/expectations/no-repeat-question');
const { checkAttemptImmutability } = require('./lib/expectations/attempt-immutability');
const { checkSessionStatusTransition } = require('./lib/expectations/session-status-transitions');
const { checkMisconceptionSignals } = require('./lib/expectations/misconception-signals');
const { checkAdaptiveDifficulty } = require('./lib/expectations/adaptive-difficulty');
const { checkLearningPatternsAndPersonality } = require('./lib/expectations/learning-patterns-personality');
const { checkQuestionPerformanceAdmin } = require('./lib/expectations/question-performance-admin');
const { checkKidSessionSummary } = require('./lib/expectations/kid-session-summary');

// Evidence thresholds that gate these signals (misconception.config.ts,
// learning-pattern.config.ts, ADAPTIVE_DIFFICULTY_CONFIG.windowSize) sit
// around 6 - 5 questions/persona was too few to ever realistically trigger
// them, which is why the first coverage pass only ever saw the happy path.
const QUESTIONS_PER_PERSONA = 8;

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag, def) => {
    const found = args.find((a) => a.startsWith(`--${flag}=`));
    return found ? found.split('=')[1] : def;
  };
  return {
    dryRun: get('dry-run', 'true') !== 'false',
    maxFindings: Number(get('max-findings', String(config.guardrails.maxFindingsPerRun))),
  };
}

/**
 * Resolves any leftover "in-progress" ledger entries from earlier today
 * BEFORE touching any new finding - crash recovery per the approved plan.
 * Git state is ground truth, not the ledger.
 */
function recoverInProgress(ledgerRef) {
  const inProgress = ledger.inProgressEntries(ledgerRef);
  if (!inProgress.length) return;

  const dailyBranch = `qa-agent/auto-fix-${ledger.todayStr()}`;
  if (!git.branchExists(dailyBranch)) return;
  git.checkoutBranch(dailyBranch);

  for (const entry of inProgress) {
    const head = git.headSha();
    if (head === entry.preFixSha) {
      // crashed before the commit landed - nothing to keep, no partial state
      ledger.updateEntryStatus(ledgerRef, entry.findingId, 'crashed-before-commit');
      continue;
    }
    // A commit landed but no verdict was recorded - never trust an
    // interrupted test run, re-run the full suite fresh.
    const { runFullTestSuite } = require('./lib/test-runner');
    const result = runFullTestSuite();
    if (result.passed) {
      ledger.updateEntryStatus(ledgerRef, entry.findingId, 'kept');
    } else {
      git.discardSince(entry.preFixSha, config.guardrails.allowedRoots);
      ledger.updateEntryStatus(ledgerRef, entry.findingId, 'reverted');
    }
  }
}

async function runPersonaFlow(browser, baseUrl, apiBaseUrl, personaKey, prisma) {
  const context = await browser.newContext();
  const page = await context.newPage();
  // /children/new and /children/:id/start aren't warmed at boot (they need
  // an authenticated session first) - Playwright's 30s default navigation
  // timeout isn't always enough for Turbopack's first cold compile of a
  // route on this machine's slow disk (see app-runner.js's warmWebRoutes).
  page.setDefaultNavigationTimeout(90000);

  const persona = {
    email: `${personaKey}-${Date.now()}@qa-agent.test`,
    password: 'QaAgentTest123!',
  };

  await registerParent(page, baseUrl, persona);

  const token = await page.evaluate(() => window.sessionStorage.getItem('wonderpath_token'));

  await addChild(page, baseUrl, {
    fullName: `Test Child (${personaKey})`,
    dateOfBirth: '2015-06-15',
    gender: 'Boy',
    grade: 'Grade 5',
    curricula: ['IB'],
    preferredLanguage: 'English',
  });

  // fetch the child id we just created via the API (own token, own data)
  const childrenRes = await fetch(`${apiBaseUrl}/children`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const children = await childrenRes.json();
  const childId = children[0].id;

  const attemptCountBefore = await prisma.questionAttempt.count({ where: { childId } });

  const sessionId = await startSession(page, baseUrl, childId, {
    curriculum: 'IB',
    subject: 'Mathematics',
  });

  const answered = await answerQuestions(page, config.QA_DATABASE_URL, personaKey, QUESTIONS_PER_PERSONA);

  // Recommendations are scoped to the CURRENT (status=STARTED) session by
  // design (recommendation.service.ts requires it) - must check before
  // ending the session, not after, or every call correctly 404s.
  const recommendationFindings = await checkRecommendationReasonCodes({ apiBaseUrl, childId, token });

  // Misconceptions/adaptive-difficulty/learning-patterns are child-scoped,
  // not session-scoped, so they're safe to check either side of "end
  // session" - checked here, before teardown, while the page/context are
  // still alive for consistency with the other in-flow checks.
  const atlasConceptFindings = [
    ...(await checkMisconceptionSignals({ apiBaseUrl, childId, token })),
    ...(await checkAdaptiveDifficulty({ apiBaseUrl, childId, token, subject: 'Mathematics' })),
    ...(await checkLearningPatternsAndPersonality({ apiBaseUrl, childId, token })),
  ];

  await page.getByRole('button', { name: /end session/i }).click().catch(() => {});

  // Drives the Sprint 17-19 kid-facing path (picker -> Today -> question
  // flow -> end of session) - none of the checks above ever touch this
  // surface, they only ever drove the older parent/testing session flow.
  // Reuses this same authenticated page/context (already logged in).
  let kidSessionFindings = [];
  try {
    const kidSessionResult = await runKidSession(page, baseUrl, `Test Child \\(${personaKey}\\)`, {
      onStep: ({ step, ok, detail }) =>
        console.log(`[kid-session:${personaKey}] ${ok ? 'OK' : 'FAIL'} ${step}${detail ? ` - ${detail}` : ''}`),
      screenshotDir: path.join(__dirname, 'debug-screenshots', ledger.todayStr(), personaKey),
    });
    kidSessionFindings = checkKidSessionSummary(kidSessionResult);
  } catch (err) {
    kidSessionFindings = [
      {
        id: `f-${Date.now()}-kidsession`,
        dedupeKey: crypto.createHash('sha1').update(`kid-session-flow-crashed::${err.message}`).digest('hex').slice(0, 16),
        severity: 'high',
        flow: 'kid-session-summary',
        specRef: 'specs/sprint-17-child-mode.md, specs/sprint-18-child-learning-experience.md',
        expected: 'The kid-facing flow (picker -> Today -> question -> summary) completes without crashing the driver',
        actual: `Flow threw: ${err.message}`,
        errorDetail: err.stack,
        specExcerpt: null,
        lockedDecisionsExcerpt: null,
        touchesLockedDecision: false,
      },
    ];
  }

  await context.close();

  return {
    persona,
    token,
    childId,
    sessionId,
    answered,
    attemptCountBefore,
    recommendationFindings,
    atlasConceptFindings,
    kidSessionFindings,
  };
}

async function main() {
  const { dryRun, maxFindings } = parseArgs();

  if (!lock.acquireLock()) {
    console.log('Another qa-agent run is already in progress (or lock not stale) - exiting.');
    return;
  }

  const originalBranch = git.currentBranch();
  let originUrlBackup = null;
  const errors = [];
  let appHandle = null;

  try {
    if (!dryRun) {
      if (!git.isWorkingTreeClean()) {
        console.log(`Working tree is dirty on "${originalBranch}" - refusing to run the fix cycle. (Dry-run would still work.)`);
        return;
      }
      git.fetchMain();
      if (git.hasMainDiverged()) {
        console.log('Local main has diverged from origin/main - refusing to run. Pull first.');
        return;
      }
    }

    db.migrateQaDatabase(config.QA_DATABASE_URL);
    db.resetPersonaData(config.QA_DATABASE_URL);

    appHandle = await startApps({
      apiPort: config.API_PORT,
      webPort: config.WEB_PORT,
      qaDatabaseUrl: config.QA_DATABASE_URL,
    });

    const baseUrl = `http://localhost:${config.WEB_PORT}`;
    const apiBaseUrl = `http://localhost:${config.API_PORT}`;

    const PrismaClient = require(
      path.join(git.REPO_ROOT, 'apps', 'api', 'dist', 'generated', 'prisma', 'client.js'),
    ).PrismaClient;
    const prisma = new PrismaClient({ datasourceUrl: config.QA_DATABASE_URL });

    const browser = await chromium.launch();
    const findings = [];
    const personasRun = Object.keys(PERSONAS);
    const results = [];

    for (const personaKey of personasRun) {
      try {
        const result = await runPersonaFlow(browser, baseUrl, apiBaseUrl, personaKey, prisma);
        results.push({ personaKey, ...result });
      } catch (err) {
        errors.push(`Persona "${personaKey}" flow failed: ${err.message}`);
      }
    }
    await browser.close();

    try {
      const childIds = results.map((r) => r.childId).filter(Boolean);
      findings.push(...(await checkMasteryRange({ prisma, childIds })));

      for (const r of results) {
        if (!r.childId || !r.token) continue;
        findings.push(...(r.recommendationFindings || []));
        findings.push(...(r.atlasConceptFindings || []));
        findings.push(...(r.kidSessionFindings || []));
        findings.push(...(await checkReviewRecommendedRecency({ prisma, apiBaseUrl, childId: r.childId, token: r.token })));
        findings.push(...(await checkNoRepeatQuestion({ answered: r.answered || [] })));

        if (typeof r.attemptCountBefore === 'number') {
          findings.push(
            ...(await checkAttemptImmutability({
              prisma,
              childId: r.childId,
              countBefore: r.attemptCountBefore,
              answeredCount: (r.answered || []).length,
            })),
          );
        }

        if (r.sessionId) {
          findings.push(
            ...(await checkSessionStatusTransition({
              prisma,
              sessionId: r.sessionId,
              expectedFinalStatus: 'COMPLETED',
            })),
          );
        }
      }

      if (results.length >= 2 && results[0].childId && results[1].token) {
        findings.push(
          ...(await checkCrossParentIsolation({
            apiBaseUrl,
            ownerToken: results[0].token,
            otherToken: results[1].token,
            childId: results[0].childId,
          })),
        );
      }

      // Living Question Bank (Sprint 10) is admin-only - needs its own
      // account, not a parent token.
      await db.ensureQaAdmin(config.QA_DATABASE_URL);
      const adminLoginRes = await fetch(`${apiBaseUrl}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: db.QA_ADMIN_EMAIL, password: db.QA_ADMIN_PASSWORD }),
      });
      if (adminLoginRes.ok) {
        const { accessToken } = await adminLoginRes.json();
        findings.push(...(await checkQuestionPerformanceAdmin({ apiBaseUrl, adminToken: accessToken })));
      } else {
        errors.push(`QA admin login failed: HTTP ${adminLoginRes.status} - skipped question-performance-admin check.`);
      }
    } finally {
      await prisma.$disconnect();
    }

    console.log(`Run complete: ${findings.length} findings across ${personasRun.length} personas.`);

    appHandle.stop();
    appHandle = null;

    // Best-effort, independent of --dry-run: the founder and his wife watch
    // Linear directly, so findings should show up there whether or not a
    // fix is attempted this run.
    const linearSync = await syncFindingsToLinear(findings, {
      apiKey: config.LINEAR_API_KEY,
      teamId: config.LINEAR_TEAM_ID,
    });
    if (linearSync.skipped) {
      console.log(`Linear sync skipped: ${linearSync.reason}`);
    } else {
      console.log(
        `Linear sync: ${linearSync.created.length} opened, ${linearSync.alreadyTracked.length} already tracked, ${linearSync.failed.length} failed.`,
      );
    }

    const outcomes = new Map();
    const guardrailViolations = [];
    const keptCommits = [];
    let dailyBranch = null;

    if (!dryRun && findings.length) {
      originUrlBackup = git.originUrl();
      dailyBranch = `qa-agent/auto-fix-${ledger.todayStr()}`;
      git.checkoutDailyBranch(dailyBranch);

      let dayLedger = ledger.readLedger();
      recoverInProgress(dayLedger);
      dayLedger = ledger.readLedger();

      git.removeOrigin();

      const fixable = findings.filter((f) => !f.touchesLockedDecision).slice(0, maxFindings);

      for (const finding of fixable) {
        if (ledger.keptCount(dayLedger) >= config.guardrails.dailyFixCap) {
          console.log(`Daily fix cap (${config.guardrails.dailyFixCap}) reached - stopping for today.`);
          break;
        }
        const result = attemptFix(finding, config.guardrails, dayLedger);
        outcomes.set(finding.id, result);
        if (result.outcome === 'kept') {
          keptCommits.push({ sha: result.postFixSha, summary: finding.expected });
        }
        if (result.outcome === 'guardrail-violation') {
          guardrailViolations.push(finding.id);
        }
      }

      git.restoreOrigin(originUrlBackup);
      git.checkoutBranch(originalBranch);
    }

    writeFindingsLog(findings, outcomes, __dirname);
    writeDailySummary(
      {
        personasRun,
        flowsCovered: [
          'register',
          'login',
          'add-child',
          'start-session',
          'answer-questions',
          'recommendations',
          'misconceptions',
          'adaptive-difficulty',
          'learning-patterns',
          'personality',
          'encouragement',
          'living-question-bank (admin)',
          'kid-mode (picker, Today card, question flow, end-of-session summary)',
        ],
        findings,
        outcomes,
        branchName: dailyBranch,
        keptCommits,
        guardrailViolations,
        unmergedBranches: [], // TODO: enumerate qa-agent/auto-fix-* branches without a merged PR
        errors,
        linearSync,
      },
      __dirname,
    );
  } catch (err) {
    console.error('qa-agent run failed:', err);
    errors.push(err.message);
  } finally {
    if (appHandle) appHandle.stop();
    try {
      if (git.currentBranch() !== originalBranch) git.checkoutBranch(originalBranch);
    } catch {
      // best effort
    }
    if (originUrlBackup) {
      try {
        git.restoreOrigin(originUrlBackup);
      } catch {
        // best effort
      }
    }
    lock.releaseLock();
  }
}

main();
