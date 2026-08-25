// apps/admin/tests/smoke/admin.e2e.ts
// Smoke tests for all admin pages.
import { test, expect } from '@playwright/test';

test.describe('Admin pages — smoke', () => {

	// ── Dashboard ────────────────────────────────────────────────────────────
	test('dashboard', async ({ page }) => {
		await page.goto('/');
		await expect(page).not.toHaveURL(/\/login/);
		await expect(page.locator('body')).toBeVisible();
	});

	// ── Users & Roles ────────────────────────────────────────────────────────
	test('users list', async ({ page }) => {
		await page.goto('/users');
		await expect(page.locator('h1, h2, .page__title').first()).toBeVisible();
	});

	test('roles list', async ({ page }) => {
		await page.goto('/roles');
		await expect(page.locator('h1, h2, .page__title').first()).toBeVisible();
	});

	test('roles new', async ({ page }) => {
		await page.goto('/roles/new');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('role requests', async ({ page }) => {
		await page.goto('/role-requests');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	// ── Characters ───────────────────────────────────────────────────────────
	test('characters list', async ({ page }) => {
		await page.goto('/characters');
		await expect(page.locator('h1, h2, .page__title').first()).toBeVisible();
	});

	test('character slots', async ({ page }) => {
		await page.goto('/characters/slots');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('character settings', async ({ page }) => {
		await page.goto('/characters/settings');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	// ── Game Systems ─────────────────────────────────────────────────────────
	test('game systems list', async ({ page }) => {
		await page.goto('/game-systems');
		await expect(page.locator('h1, h2, .page__title').first()).toBeVisible();
	});

	test('game system new', async ({ page }) => {
		await page.goto('/game-systems/new');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	// Game system sub-pages — navigate to first available system
	async function withFirstGameSystem(page: any, path: string) {
		await page.goto('/game-systems');
		const link = page.locator('a[href^="/game-systems/"]').filter({ hasText: /edit|manage|open|view/i }).first();
		const directLink = page.locator('a[href^="/game-systems/"]:not([href$="/new"])').first();
		const target = (await link.isVisible().catch(() => false)) ? link : directLink;
		if (!(await target.isVisible().catch(() => false))) return null;
		const href = await target.getAttribute('href');
		const sysId = href?.split('/game-systems/')[1]?.split('/')[0];
		return sysId ? `/game-systems/${sysId}/${path}` : null;
	}

	test('D&D 5e species page', async ({ page }) => {
		const url = await withFirstGameSystem(page, 'dnd5e/species');
		if (!url) { test.skip(); return; }
		await page.goto(url);
		await expect(page.locator('h1, h2, .page__title, .section-title').first()).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('D&D 5e classes page', async ({ page }) => {
		const url = await withFirstGameSystem(page, 'dnd5e/classes');
		if (!url) { test.skip(); return; }
		await page.goto(url);
		await expect(page.locator('h1, h2, .page__title, .section-title').first()).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('D&D 5e backgrounds page', async ({ page }) => {
		const url = await withFirstGameSystem(page, 'dnd5e/backgrounds');
		if (!url) { test.skip(); return; }
		await page.goto(url);
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('D&D 5e feats page', async ({ page }) => {
		const url = await withFirstGameSystem(page, 'dnd5e/feats');
		if (!url) { test.skip(); return; }
		await page.goto(url);
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('D&D 5e spells page', async ({ page }) => {
		const url = await withFirstGameSystem(page, 'dnd5e/spells');
		if (!url) { test.skip(); return; }
		await page.goto(url);
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('D&D 5e spells known', async ({ page }) => {
		const url = await withFirstGameSystem(page, 'dnd5e/spells/known');
		if (!url) { test.skip(); return; }
		await page.goto(url);
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('D&D 5e spell slots', async ({ page }) => {
		const url = await withFirstGameSystem(page, 'dnd5e/spells/slots');
		if (!url) { test.skip(); return; }
		await page.goto(url);
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('D&D 5e import page', async ({ page }) => {
		const url = await withFirstGameSystem(page, 'data/import/dnd5e');
		if (!url) { test.skip(); return; }
		await page.goto(url);
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	// ── Quests ───────────────────────────────────────────────────────────────
	test('quests list', async ({ page }) => {
		await page.goto('/quests');
		await expect(page.locator('h1, h2, .page__title').first()).toBeVisible();
	});

	test('quests settings', async ({ page }) => {
		await page.goto('/quests/settings');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	// ── Marketplace ──────────────────────────────────────────────────────────
	test('marketplace items', async ({ page }) => {
		await page.goto('/marketplace/items');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('marketplace settings', async ({ page }) => {
		await page.goto('/marketplace/settings');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('marketplace transactions', async ({ page }) => {
		await page.goto('/marketplace/transactions');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	// ── Token Store ───────────────────────────────────────────────────────────
	test('token store', async ({ page }) => {
		await page.goto('/token-store');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('token store transactions', async ({ page }) => {
		await page.goto('/token-store/transactions');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	// ── Rewards ───────────────────────────────────────────────────────────────
	test('rewards', async ({ page }) => {
		await page.goto('/rewards');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('rewards achievements', async ({ page }) => {
		await page.goto('/rewards/achievements');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('rewards grant', async ({ page }) => {
		await page.goto('/rewards/grant');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	// ── DMs ───────────────────────────────────────────────────────────────────
	test('DMs list', async ({ page }) => {
		await page.goto('/dms');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('DMs settings', async ({ page }) => {
		await page.goto('/dms/settings');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	// ── Misc ──────────────────────────────────────────────────────────────────
	test('audit log', async ({ page }) => {
		await page.goto('/audit');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('availability', async ({ page }) => {
		await page.goto('/availability');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('news', async ({ page }) => {
		await page.goto('/news');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('notifications', async ({ page }) => {
		await page.goto('/notifications');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('discord', async ({ page }) => {
		await page.goto('/discord');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('settings', async ({ page }) => {
		await page.goto('/settings');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

});
