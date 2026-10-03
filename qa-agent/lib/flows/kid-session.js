'use strict';

const fs = require('fs');
const path = require('path');

/**
 * `locator.isVisible({ timeout })` does NOT wait/retry despite the timeout
 * option existing on its signature - it checks the current state once and
 * returns immediately. Using it to mean "wait up to N ms for this to
 * appear" is exactly what produced a confusing, inconclusive result the
 * first time this flow was tested: it checked for the question input
 * while the page was still showing "Loading...", got false immediately,
 * and gave up - the real question appeared a moment later. `waitFor`
 * actually polls.
 */
async function waitVisible(locator, timeout) {
  try {
    await locator.waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Drives the actual Sprint 17-19 kid-facing path (picker -> Today card ->
 * question flow -> end of session), the one surface none of the original
 * qa-agent flows ever touched - they only ever drove the older parent/
 * testing session flow at /sessions/:id. That gap is exactly why a real
 * bug (the end-of-session summary screen always showing "Something went
 * wrong") shipped to staging with zero findings and zero Linear issues.
 *
 * Reuses the same authenticated page/context as the rest of the persona
 * flow (sessionStorage token already set) - no re-login needed.
 *
 * Every step confirms the resulting state before moving on (not a blind
 * click-and-timeout chain). `onStep` (optional) is called after every
 * confirmed step with {step, ok, detail} for logging/debugging; pass
 * `screenshotDir` to also capture a PNG after each step.
 */
async function runKidSession(page, baseUrl, childNickname, options = {}) {
  const { maxQuestions = 2, onStep = () => {}, screenshotDir = null } = options;

  let stepIndex = 0;
  async function step(name, fn) {
    stepIndex += 1;
    const label = `${String(stepIndex).padStart(2, '0')}-${name}`;
    try {
      const detail = await fn();
      onStep({ step: label, ok: true, detail: detail ?? null });
      if (screenshotDir) {
        fs.mkdirSync(screenshotDir, { recursive: true });
        await page.screenshot({ path: path.join(screenshotDir, `${label}.png`) }).catch(() => {});
      }
      return detail;
    } catch (err) {
      onStep({ step: label, ok: false, detail: err.message });
      if (screenshotDir) {
        fs.mkdirSync(screenshotDir, { recursive: true });
        await page.screenshot({ path: path.join(screenshotDir, `${label}-FAILED.png`) }).catch(() => {});
      }
      throw new Error(`kid-session step "${name}" failed: ${err.message}`);
    }
  }

  await step('goto-picker', () => page.goto(`${baseUrl}/dashboard`));

  await step('select-child', async () => {
    await page.getByRole('button', { name: new RegExp(childNickname, 'i') }).click();
    await page.waitForURL(/\/learn\//, { timeout: 15000 });
    return page.url();
  });

  await step('today-card-visible', () =>
    page.waitForSelector('h1', { timeout: 15000 }).then(() => page.locator('h1').first().textContent()),
  );

  await step('pick-subject-or-start', async () => {
    const chooseBtn = page.getByRole('button', { name: /choose something else/i });
    const startBtn = page.getByRole('button', { name: /start learning/i });

    if (await waitVisible(chooseBtn, 4000)) {
      await chooseBtn.click();
    }

    const subjectBtn = page.getByText(/^Mathematics$/).first();
    if (await waitVisible(subjectBtn, 4000)) {
      await subjectBtn.click();
      const goBtn = page.getByRole('button', { name: /let's go/i });
      await goBtn.waitFor({ state: 'visible', timeout: 4000 });
      // "Let's go!" stays disabled until a subject AND curriculum (if the
      // child has more than one) are both selected - confirm it's actually
      // clickable rather than clicking a disabled button and silently
      // doing nothing.
      await page.waitForFunction(
        () => {
          const btn = Array.from(document.querySelectorAll('button')).find((b) =>
            /let's go/i.test(b.textContent || ''),
          );
          return btn && !btn.disabled;
        },
        { timeout: 4000 },
      );
      await goBtn.click();
      return 'via topic picker';
    }

    if (await waitVisible(startBtn, 4000)) {
      await startBtn.click();
      return 'via recommendation';
    }

    throw new Error('neither "Choose Something Else"/subject picker nor "Start Learning" was reachable');
  });

  await step('session-started', async () => {
    await page.waitForURL(/\/session\//, { timeout: 15000 });
    return page.url();
  });

  let questionsAnswered = 0;
  for (let i = 0; i < maxQuestions; i += 1) {
    const answerInputs = page.locator('input[name="answer"]');
    const hasQuestion = await step(`question-${i + 1}-check`, () => waitVisible(answerInputs.first(), 10000));
    if (!hasQuestion) {
      onStep({ step: `question-${i + 1}-absent`, ok: true, detail: 'pool exhausted before maxQuestions - valid end state' });
      break;
    }

    await step(`question-${i + 1}-select-answer`, () => answerInputs.first().click({ force: true }));

    await step(`question-${i + 1}-continue`, async () => {
      const continueBtn = page.getByRole('button', { name: /^continue$/i });
      await continueBtn.click();
      // Confirm the feelings step actually appeared - the real signal that
      // the click registered, not just that it didn't throw.
      await page.waitForSelector('text=/how did that feel/i', { timeout: 5000 });
    });

    await step(`question-${i + 1}-select-feeling`, () =>
      page.locator('input[name="feeling"]').first().click({ force: true }),
    );

    await step(`question-${i + 1}-send-answer`, async () => {
      await page.getByRole('button', { name: /send answer/i }).click();
      // Confirm we actually reached the feedback screen (Correct!/Not
      // quite.) before deciding what to click next.
      await page.waitForSelector('text=/Correct!|Not quite\\./', { timeout: 10000 });
    });

    questionsAnswered += 1;

    if (i === maxQuestions - 1) {
      await step('finish-for-today', async () => {
        const finishBtn = page.getByRole('button', { name: /finish for today/i });
        await finishBtn.waitFor({ state: 'visible', timeout: 5000 });
        await finishBtn.click();
      });
    } else {
      const nextBtn = page.getByRole('button', { name: /next question/i });
      const hasNext = await step(`question-${i + 1}-has-next`, () => waitVisible(nextBtn, 4000));
      if (!hasNext) break;
      await step(`question-${i + 1}-click-next`, () => nextBtn.click());
    }
  }

  const bodyText = await step('read-final-state', async () => {
    // Give the post-finish navigation/fetch (loadSummary's own API calls)
    // a moment to actually settle before reading - the same class of
    // "checked before it was ready" mistake as the isVisible() issue above.
    await page
      .waitForSelector('text=/Awesome work|Something went wrong|questions correctly|no questions were available/i', {
        timeout: 10000,
      })
      .catch(() => {});
    return page.locator('body').innerText();
  });

  return {
    bodyText,
    questionsAnswered,
    hasErrorState: /something went wrong/i.test(bodyText),
    hasSummary: /awesome work|questions correctly|no questions were available/i.test(bodyText),
  };
}

module.exports = { runKidSession };
