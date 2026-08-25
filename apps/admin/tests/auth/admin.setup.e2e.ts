// apps/admin/tests/auth/admin.setup.e2e.ts
// Logs in as admin and saves session for reuse across all tests.
import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, '../.auth/admin.json');

setup('authenticate as admin', async ({ page }) => {
	await page.goto('/login');
	await expect(page.locator('input#email')).toBeVisible();

	await page.fill('input#email', 'admintest@marches.local');
	await page.fill('input#password', 'test3abc');
	await page.click('button[type="submit"]');

	await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 });
	await expect(page).not.toHaveURL(/\/login/);

	await page.context().storageState({ path: AUTH_FILE });
});