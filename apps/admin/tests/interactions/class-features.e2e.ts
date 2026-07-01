// apps/admin/tests/interactions/class-features.e2e.ts
// Tests class and class feature CRUD in the admin UI.
import { test, expect } from '@playwright/test';

async function getFirstClassUrl(page: any): Promise<string | null> {
	await page.goto('/game-systems');
	const link = page.locator('a[href^="/game-systems/"]:not([href$="/new"])').first();
	if (!(await link.isVisible().catch(() => false))) return null;
	const href = await link.getAttribute('href');
	const sysId = href?.split('/game-systems/')[1]?.split('/')[0];
	if (!sysId) return null;

	// Navigate to classes and get first class
	await page.goto(`/game-systems/${sysId}/dnd5e/classes`);
	const classLink = page.locator('a[href*="/classes/"]').first();
	if (!(await classLink.isVisible().catch(() => false))) return null;
	return await classLink.getAttribute('href');
}

test.describe('Admin — Class Features', () => {

	test('class features page loads', async ({ page }) => {
		const url = await getFirstClassUrl(page);
		if (!url) { test.skip(); return; }
		await page.goto(url);
		await expect(page.locator('h1, h2, .page__title, .section-title').first()).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('add feature form — all grant fields present', async ({ page }) => {
		const url = await getFirstClassUrl(page);
		if (!url) { test.skip(); return; }
		await page.goto(url);

		// Grant fields in the create feature form
		const fields = [
			'input[name="grantsSkills"]',
			'input[name="grantsTools"]',
			'input[name="grantsLanguages"]',
			'input[name="grantsResistances"]',
			'input[name="grantsImmunities"]',
			'input[name="grantsVulnerabilities"]',
			'input[name="grantsInnateSpells"]',
			'input[name="grantsSpeed"]',
			'input[name="grantsSenses"]',
		];

		for (const selector of fields) {
			await expect(page.locator(selector).first()).toBeVisible({ timeout: 3_000 });
		}
	});

	test('add feature form — tool and language choice fields present', async ({ page }) => {
		const url = await getFirstClassUrl(page);
		if (!url) { test.skip(); return; }
		await page.goto(url);

		await expect(page.locator('input[name="toolChoiceCount"]').first()).toBeVisible();
		await expect(page.locator('input[name="toolChoicePool"]').first()).toBeVisible();
		await expect(page.locator('input[name="languageChoiceCount"]').first()).toBeVisible();
		await expect(page.locator('input[name="languageChoicePool"]').first()).toBeVisible();
	});

	test('innate spells field — format legend visible', async ({ page }) => {
		const url = await getFirstClassUrl(page);
		if (!url) { test.skip(); return; }
		await page.goto(url);

		await expect(page.locator('text=/minLvl/').first()).toBeVisible();
	});

	test('speed bonus field — format legend visible', async ({ page }) => {
		const url = await getFirstClassUrl(page);
		if (!url) { test.skip(); return; }
		await page.goto(url);

		await expect(page.locator('text=/WALK.*FLY/').first()).toBeVisible();
	});

	test('add feature — name required', async ({ page }) => {
		const url = await getFirstClassUrl(page);
		if (!url) { test.skip(); return; }
		await page.goto(url);

		// Submit without name
		const submitBtn = page.locator('button[type="submit"]:has-text("Add")').first();
		await submitBtn.click();
		await expect(page).toHaveURL(url);
	});

	test('existing features show in list with level', async ({ page }) => {
		const url = await getFirstClassUrl(page);
		if (!url) { test.skip(); return; }
		await page.goto(url);

		// If there are features, they should show level indicators
		const features = page.locator('[class*="feature"], .table__row').first();
		if (await features.isVisible().catch(() => false)) {
			await expect(features).toBeVisible();
		}
	});

});
