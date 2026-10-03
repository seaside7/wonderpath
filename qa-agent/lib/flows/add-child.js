'use strict';

/**
 * Adds a child via the real UI, matching apps/web/components/children/child-form.tsx
 * exactly (labels, curriculum toggle buttons, grade/language selects).
 */
async function addChild(page, baseUrl, child) {
  await page.goto(`${baseUrl}/children/new`);

  await page.getByLabel('Full name').fill(child.fullName);
  await page.getByLabel('Date of birth').fill(child.dateOfBirth); // YYYY-MM-DD
  await page.getByLabel('Gender').selectOption(child.gender); // 'Boy' | 'Girl'
  await page.getByLabel('Grade').selectOption(child.grade); // 'Grade 5' | 'Grade 6'

  for (const curriculum of child.curricula) {
    await page.getByRole('button', { name: curriculum, exact: true }).click();
  }

  await page.getByLabel('Preferred language').selectOption(child.preferredLanguage);
  await page.getByRole('button', { name: /^add child$/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

module.exports = { addChild };
