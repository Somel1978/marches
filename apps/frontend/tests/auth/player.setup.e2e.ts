// apps/frontend/tests/auth/player.setup.e2e.ts
// Logs in as the player user and saves session for reuse across all tests.
import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, '../.auth/player.json');

setup('authenticate as player', async ({ page }) => {
	await page.goto('/login');
	await expect(page.locator('input#email')).toBeVisible();

	await page.fill('input#email', 'test1@marches.local');
	await page.fill('input#password', 'test1abc');
	await page.click('button[type="submit"]');

	await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 });
	await expect(page).not.toHaveURL(/\/login/);

	await page.context().storageState({ path: AUTH_FILE });
});