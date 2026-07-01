// apps/admin/tests/interactions/feats-backgrounds.e2e.ts
// Tests feat and background CRUD in the admin UI.
import { test, expect } from '@playwright/test';

async function getFirstGameSystemUrl(page: any, subpath: string): Promise<string | null> {
	await page.goto('/game-systems');
	const link = page.locator('a[href^="/game-systems/"]:not([href$="/new"])').first();
	if (!(await link.isVisible().catch(() => false))) return null;
	const href = await link.getAttribute('href');
	const sysId = href?.split('/game-systems/')[1]?.split('/')[0];
	return sysId ? `/game-systems/${sysId}/${subpath}` : null;
}

test.describe('Admin — Feats', () => {

	test('feats page loads', async ({ page }) => {
		const url = await getFirstGameSystemUrl(page, 'dnd5e/feats');
		if (!url) { test.skip(); return; }
		await page.goto(url);
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('feat create form — all grant fields present', async ({ page }) => {
		const url = await getFirstGameSystemUrl(page, 'dnd5e/feats');
		if (!url) { test.skip(); return; }
		await page.goto(url);

		const fields = [
			'input[name="grantsSkills"]',
			'input[name="grantsTools"]',
			'input[name="toolChoiceCount"]',
			'input[name="toolChoicePool"]',
			'input[name="grantsLanguages"]',
			'input[name="languageChoiceCount"]',
			'input[name="languageChoicePool"]',
			'input[name="grantsResistances"]',
			'input[name="grantsImmunities"]',
			'input[name="grantsVulnerabilities"]',
			'input[name="grantsSpeed"]',
			'input[name="grantsSenses"]',
			'input[name="grantsInnateSpells"]',
		];

		for (const selector of fields) {
			await expect(page.locator(selector).first()).toBeVisible({ timeout: 3_000 });
		}
	});

	test('feat create form — ASI fields present', async ({ page }) => {
		const url = await getFirstGameSystemUrl(page, 'dnd5e/feats');
		if (!url) { test.skip(); return; }
		await page.goto(url);

		await expect(page.locator('input[name="asiAmount"]').first()).toBeVisible();
	});

	test('feat create — fills name and submits', async ({ page }) => {
		const url = await getFirstGameSystemUrl(page, 'dnd5e/feats');
		if (!url) { test.skip(); return; }
		await page.goto(url);

		await page.locator('form input[name="name"]').first().fill('E2E Alert Feat');
		await page.locator('button[type="submit"]').first().click();
		await page.waitForTimeout(1_000);
		await expect(page.locator('text=E2E Alert Feat')).toBeVisible({ timeout: 5_000 });
	});

	test('feat innate spells — format legend visible', async ({ page }) => {
		const url = await getFirstGameSystemUrl(page, 'dnd5e/feats');
		if (!url) { test.skip(); return; }
		await page.goto(url);
		await expect(page.locator('text=/minLvl/').first()).toBeVisible();
	});

	test('feat speed bonus — format legend visible', async ({ page }) => {
		const url = await getFirstGameSystemUrl(page, 'dnd5e/feats');
		if (!url) { test.skip(); return; }
		await page.goto(url);
		await expect(page.locator('text=/WALK.*FLY/').first()).toBeVisible();
	});

});

test.describe('Admin — Backgrounds', () => {

	test('backgrounds page loads', async ({ page }) => {
		const url = await getFirstGameSystemUrl(page, 'dnd5e/backgrounds');
		if (!url) { test.skip(); return; }
		await page.goto(url);
		await expect(page.locator('body')).toBeVisible();
		await expect(page).not.toHaveURL(/error/);
	});

	test('background create form — grant fields present', async ({ page }) => {
		const url = await getFirstGameSystemUrl(page, 'dnd5e/backgrounds');
		if (!url) { test.skip(); return; }
		await page.goto(url);

		const fields = [
			'input[name="grantsSkills"]',
			'input[name="grantsTools"]',
			'input[name="toolChoiceCount"]',
			'input[name="toolChoicePool"]',
			'input[name="grantsLanguages"]',
			'input[name="languageChoiceCount"]',
			'input[name="languageChoicePool"]',
			'input[name="grantsResistances"]',
			'input[name="grantsImmunities"]',
			'input[name="grantsVulnerabilities"]',
			'input[name="grantsSpeed"]',
			'input[name="grantsSenses"]',
			'input[name="grantsInnateSpells"]',
		];

		for (const selector of fields) {
			await expect(page.locator(selector).first()).toBeVisible({ timeout: 3_000 });
		}
	});

	test('background create — fills name and submits', async ({ page }) => {
		const url = await getFirstGameSystemUrl(page, 'dnd5e/backgrounds');
		if (!url) { test.skip(); return; }
		await page.goto(url);

		await page.locator('form input[name="name"]').first().fill('E2E Hermit Background');
		await page.locator('button[type="submit"]').first().click();
		await page.waitForTimeout(1_000);
		await expect(page.locator('text=E2E Hermit Background')).toBeVisible({ timeout: 5_000 });
	});

});
