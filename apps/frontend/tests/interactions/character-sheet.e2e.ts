// apps/frontend/tests/interactions/character-sheet.e2e.ts
// Tests character sheet display and interactions for existing characters.
import { test, expect } from '@playwright/test';

test.describe('Character sheet', () => {

	test('characters list renders', async ({ page }) => {
		await page.goto('/characters');
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('character sheet opens from list', async ({ page }) => {
		await page.goto('/characters');
		const firstChar = page.locator('a[href^="/characters/"]').filter({ hasNot: page.locator('[href*="public"]') }).first();
		if (!(await firstChar.isVisible().catch(() => false))) { test.skip(); return; }
		await firstChar.click();
		await expect(page.locator('h1, h2, .section-title').first()).toBeVisible({ timeout: 5_000 });
		await expect(page).not.toHaveURL(/error/);
	});

	test('character sheet — species section visible', async ({ page }) => {
		await page.goto('/characters');
		const firstChar = page.locator('a[href^="/characters/"]').filter({ hasNot: page.locator('[href*="public"]') }).first();
		if (!(await firstChar.isVisible().catch(() => false))) { test.skip(); return; }
		await firstChar.click();
		await page.waitForLoadState('networkidle');

		// Species section or badge should be present
		const speciesBadge = page.locator('[class*="badge"], text=/Medium|Small|Large|Species/i').first();
		await expect(speciesBadge).toBeVisible({ timeout: 5_000 });
	});

	test('character sheet — skills section visible', async ({ page }) => {
		await page.goto('/characters');
		const firstChar = page.locator('a[href^="/characters/"]').filter({ hasNot: page.locator('[href*="public"]') }).first();
		if (!(await firstChar.isVisible().catch(() => false))) { test.skip(); return; }
		await firstChar.click();
		await page.waitForLoadState('networkidle');

		// Skills list or section should appear
		const skills = page.locator('text=/Acrobatics|Athletics|Perception|Stealth/').first();
		await expect(skills).toBeVisible({ timeout: 5_000 });
	});

	test('character sheet — ability scores visible', async ({ page }) => {
		await page.goto('/characters');
		const firstChar = page.locator('a[href^="/characters/"]').filter({ hasNot: page.locator('[href*="public"]') }).first();
		if (!(await firstChar.isVisible().catch(() => false))) { test.skip(); return; }
		await firstChar.click();
		await page.waitForLoadState('networkidle');

		// Ability score abbreviations
		const str = page.locator('text=/STR|Strength/').first();
		await expect(str).toBeVisible({ timeout: 5_000 });
	});

	test('character sheet — no console errors', async ({ page }) => {
		const errors: string[] = [];
		page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
		page.on('pageerror', err => errors.push(err.message));

		await page.goto('/characters');
		const firstChar = page.locator('a[href^="/characters/"]').filter({ hasNot: page.locator('[href*="public"]') }).first();
		if (!(await firstChar.isVisible().catch(() => false))) { test.skip(); return; }
		await firstChar.click();
		await page.waitForLoadState('networkidle');

		const criticalErrors = errors.filter(e => !e.includes('favicon') && !e.includes('net::ERR'));
		expect(criticalErrors).toHaveLength(0);
	});

});
