'use strict';

/**
 * Registers a new synthetic parent via the real UI (not a direct API call -
 * this flow specifically exists to prove the browser-facing register path
 * works, per the task's "drive the app like a real parent" goal).
 */
async function registerParent(page, baseUrl, persona) {
  await page.goto(`${baseUrl}/register`);
  await page.locator('input[type="email"]').fill(persona.email);
  await page.locator('input[type="password"]').fill(persona.password);
  await page.getByRole('button', { name: /create account/i }).click();
  // The register flow shows a celebration overlay before redirecting -
  // wait for the actual dashboard, not just the click.
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

async function loginParent(page, baseUrl, persona) {
  await page.goto(`${baseUrl}/login`);
  await page.locator('input[type="email"]').fill(persona.email);
  await page.locator('input[type="password"]').fill(persona.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

async function logout(page) {
  await page.getByRole('button', { name: /log out/i }).click();
  await page.waitForURL(/\/login/, { timeout: 10000 });
}

module.exports = { registerParent, loginParent, logout };
