// apps/frontend/tests/smoke/dm.e2e.ts
// Smoke tests for DM-scoped pages (requires player with DM profile).
import { test, expect } from '@playwright/test';

test.describe('DM pages — smoke', () => {

	test('DM hub', async ({ page }) => {
		await page.goto('/dm');
		await expect(page.locator('h1, h2, .page__title, .section-title').first()).toBeVisible();
	});

	test('DM profile', async ({ page }) => {
		await page.goto('/dm/profile');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('DM worlds list', async ({ page }) => {
		await page.goto('/dm/worlds');
		await expect(page.locator('h1, h2, .page__title, .section-title').first()).toBeVisible();
	});

	test('DM new quest', async ({ page }) => {
		await page.goto('/dm/quests/new');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('DM world — navigates to first available world', async ({ page }) => {
		// Go to worlds list and click the first world if one exists
		await page.goto('/dm/worlds');
		const firstWorld = page.locator('a[href^="/dm/worlds/"]').first();
		const hasWorld = await firstWorld.isVisible().catch(() => false);
		if (!hasWorld) {
			test.skip();
			return;
		}
		await firstWorld.click();
		await expect(page.locator('h1, h2, .page__title, .section-title').first()).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

});
