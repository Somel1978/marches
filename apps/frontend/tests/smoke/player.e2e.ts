// apps/frontend/tests/smoke/player.e2e.ts
// Smoke tests for all player-accessible pages.
// Verifies each page loads without errors and renders its primary landmark.
import { test, expect } from '@playwright/test';

test.describe('Player pages — smoke', () => {

	test('home / dashboard', async ({ page }) => {
		await page.goto('/');
		await expect(page).not.toHaveURL(/\/login/);
		await expect(page.locator('body')).toBeVisible();
	});

	test('quests list', async ({ page }) => {
		await page.goto('/quests');
		await expect(page.locator('h1, h2, .page__title, .section-title').first()).toBeVisible();
	});

	test('characters list', async ({ page }) => {
		await page.goto('/characters');
		await expect(page.locator('h1, h2, .page__title').first()).toBeVisible();
	});

	test('characters public gallery', async ({ page }) => {
		await page.goto('/characters/public');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('character creation — entry', async ({ page }) => {
		await page.goto('/characters/new');
		await expect(page.locator('body')).toBeVisible();
	});

	test('marketplace', async ({ page }) => {
		await page.goto('/marketplace');
		await expect(page.locator('h1, h2, .page__title').first()).toBeVisible();
	});

	test('token store', async ({ page }) => {
		await page.goto('/token-store');
		await expect(page.locator('h1, h2, .page__title').first()).toBeVisible();
	});

	test('availability', async ({ page }) => {
		await page.goto('/availability');
		await expect(page.locator('.avail-dash__title, h2').first()).toBeVisible();
		await expect(page.getByRole('button', { name: '+ Add availability' })).toBeVisible();
	});

	test('profile', async ({ page }) => {
		await page.goto('/profile');
		await expect(page.locator('h1, h2, .page__title, .section-title').first()).toBeVisible();
	});

	test('notifications', async ({ page }) => {
		await page.goto('/notifications');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('settings', async ({ page }) => {
		await page.goto('/settings');
		await expect(page.locator('h1, h2, .section-title').first()).toBeVisible();
	});

	test('stats', async ({ page }) => {
		await page.goto('/stats');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('tavern', async ({ page }) => {
		await page.goto('/tavern');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('wiki', async ({ page }) => {
		await page.goto('/wiki');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('NPCs', async ({ page }) => {
		await page.goto('/npcs');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('world map', async ({ page }) => {
		await page.goto('/world');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('DnD point buy tool', async ({ page }) => {
		await page.goto('/tools/dndpointbuy');
		await expect(page.locator('h1, h2, .section-title').first()).toBeVisible();
	});

	test('news index', async ({ page }) => {
		await page.goto('/news');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('DM request page', async ({ page }) => {
		await page.goto('/dm-request');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

});
