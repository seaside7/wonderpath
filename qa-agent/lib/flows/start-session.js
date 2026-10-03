'use strict';

/**
 * Starts (or resumes) a learning session via the real UI, matching
 * apps/web/components/sessions/session-setup.tsx exactly - curriculum and
 * subject are toggle buttons inside fieldsets, not <select> elements.
 */
async function startSession(page, baseUrl, childId, { curriculum, subject }) {
  await page.goto(`${baseUrl}/children/${childId}/start`);

  const resumeButton = page.getByRole('button', { name: /^resume$/i });
  if (await resumeButton.isVisible().catch(() => false)) {
    await resumeButton.click();
  } else {
    await page.getByRole('button', { name: curriculum, exact: true }).click();
    await page.getByRole('button', { name: subject, exact: true }).click();
    await page.getByRole('button', { name: /^start learning$/i }).click();
  }

  await page.waitForURL(/\/sessions\/[^/]+$/, { timeout: 10000 });
  const match = page.url().match(/\/sessions\/([^/]+)$/);
  return match ? match[1] : null;
}

module.exports = { startSession };
