'use strict';

const path = require('path');
const { REPO_ROOT } = require('../git');

/**
 * The UI never reveals the correct answer before submission (correctly).
 * For persona-driven answer selection we need ground truth, so this reads
 * it directly from the QA database - safe because this is QA-only code
 * running against wonderpath_qa, never touching what a real user sees.
 */
function loadPrismaClient() {
  // apps/api's own build (triggered by app-runner.js's `nest start`) produces
  // this by the time flows run.
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const { PrismaClient } = require(
    path.join(REPO_ROOT, 'apps', 'api', 'dist', 'generated', 'prisma', 'client.js'),
  );
  return PrismaClient;
}

async function lookupCorrectAnswer(prisma, questionText) {
  const question = await prisma.question.findFirst({
    where: { questionText },
    select: { correctAnswer: true },
  });
  return question ? question.correctAnswer : null;
}

/**
 * Persona shapes:
 *   correctRate: 0-1, probability of answering correctly
 *   delayMs: [min, max] simulated thinking time before each answer
 *   difficultyLabels: which "how did that feel" labels this persona picks
 *   useHint: whether this persona would use a hint (UI doesn't have a hint
 *            feature yet per Sprint 15's spec - reserved for when it does)
 */
const PERSONAS = {
  steady: { correctRate: 0.9, delayMs: [2000, 4000], difficultyLabels: ['Just Right'] },
  struggling: { correctRate: 0.4, delayMs: [7000, 12000], difficultyLabels: ['Difficult', 'Just Right'] },
  confident: { correctRate: 0.95, delayMs: [800, 1500], difficultyLabels: ['Easy'] },
};

async function answerQuestions(page, qaDatabaseUrl, personaKey, maxQuestions = 5) {
  const persona = PERSONAS[personaKey];
  const PrismaClient = loadPrismaClient();
  const prisma = new PrismaClient({ datasourceUrl: qaDatabaseUrl });
  const answered = [];

  try {
    for (let i = 0; i < maxQuestions; i += 1) {
      const emptyState = page.getByText(/answered all the questions/i);
      if (await emptyState.isVisible({ timeout: 3000 }).catch(() => false)) {
        break;
      }

      const questionText = await page.locator('h2').last().textContent();
      if (!questionText) break;

      const correctAnswer = await lookupCorrectAnswer(prisma, questionText.trim());
      const options = await page.locator('input[name="answer"]').all();
      const optionValues = await Promise.all(options.map((o) => o.getAttribute('value')));

      const answerCorrectly = Math.random() < persona.correctRate;
      let chosenValue;
      if (answerCorrectly && correctAnswer) {
        chosenValue = correctAnswer;
      } else {
        const wrongOptions = optionValues.filter((v) => v !== correctAnswer);
        chosenValue = wrongOptions[Math.floor(Math.random() * wrongOptions.length)] || optionValues[0];
      }

      const [minDelay, maxDelay] = persona.delayMs;
      await page.waitForTimeout(minDelay + Math.random() * (maxDelay - minDelay));

      await page.locator(`input[name="answer"][value="${cssEscape(chosenValue)}"]`).check();
      await page.getByRole('button', { name: /^continue$/i }).click();

      const label = persona.difficultyLabels[Math.floor(Math.random() * persona.difficultyLabels.length)];
      await page.locator(`input[name="difficulty"][value="${cssEscape(label)}"]`).check();
      await page.getByRole('button', { name: /^submit answer$/i }).click();

      await page.waitForSelector('text=/Correct!|Not quite\\./', { timeout: 10000 });
      const wasCorrect = await page.getByText('Correct!').isVisible().catch(() => false);
      answered.push({ questionText: questionText.trim(), chosenValue, correctAnswer, wasCorrect });

      // Stay on the feedback screen after the last planned question - that's
      // where "End Session" is actually visible. Clicking "Next Question"
      // here would advance into a fresh question with no way to end the
      // session, producing a false "session never completed" finding that's
      // a bug in this flow, not in the app.
      if (i === maxQuestions - 1) break;

      const nextButton = page.getByRole('button', { name: /^next question$/i });
      if (!(await nextButton.isVisible().catch(() => false))) break;
      await nextButton.click();
    }
  } finally {
    await prisma.$disconnect();
  }

  return answered;
}

function cssEscape(value) {
  return value.replace(/["\\]/g, '\\$&');
}

module.exports = { answerQuestions, PERSONAS };
