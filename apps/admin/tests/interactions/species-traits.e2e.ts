// apps/admin/tests/interactions/species-traits.e2e.ts
// Tests CRUD operations for species and traits in the admin UI.
import { test, expect } from '@playwright/test';

async function getFirstGameSystemUrl(page: any, subpath: string): Promise<string | null> {
	await page.goto('/game-systems');
	const link = page.locator('a[href^="/game-systems/"]:not([href$="/new"])').first();
	if (!(await link.isVisible().catch(() => false))) return null;
	const href = await link.getAttribute('href');
	const sysId = href?.split('/game-systems/')[1]?.split('/')[0];
	return sysId ? `/game-systems/${sysId}/${subpath}` : null;
}

test.describe('Admin — Species & Traits', () => {

	test('species page loads and shows create form', async ({ page }) => {
		const url = await getFirstGameSystemUrl(page, 'dnd5e/species');
		if (!url) { test.skip(); return; }
		await page.goto(url);

		// Create form should be present
		await expect(page.locator('input[name="name"][placeholder*="species" i], input[name="name"]').first()).toBeVisible();
	});

	test('species create form — name is required', async ({ page }) => {
		const url = await getFirstGameSystemUrl(page, 'dnd5e/species');
		if (!url) { test.skip(); return; }
		await page.goto(url);

		// Try submitting without a name
		const submitBtn = page.locator('button[type="submit"]:has-text("Add"), button:has-text("Create")').first();
		await submitBtn.click();

		// Should not navigate away
		await expect(page).toHaveURL(url);
	});

	test('species create — fills form and submits', async ({ page }) => {
		const url = await getFirstGameSystemUrl(page, 'dnd5e/species');
		if (!url) { test.skip(); return; }
		await page.goto(url);

		const nameInput = page.locator('form input[name="name"]').first();
		await nameInput.fill('E2E Test Species');

		const descInput = page.locator('form input[name="description"], form textarea[name="description"]').first();
		if (await descInput.isVisible().catch(() => false)) {
			await descInput.fill('Created by E2E test');
		}

		await page.locator('button[type="submit"]').first().click();
		await page.waitForTimeout(1_000);

		// Species should now appear in the list
		await expect(page.locator('text=E2E Test Species')).toBeVisible({ timeout: 5_000 });
	});

	test('trait create form — grant fields visible', async ({ page }) => {
		const url = await getFirstGameSystemUrl(page, 'dnd5e/species');
		if (!url) { test.skip(); return; }
		await page.goto(url);

		// Find a species that has an addTrait form — expand if needed
		const speciesRow = page.locator('text=E2E Test Species').first();
		if (await speciesRow.isVisible().catch(() => false)) {
			// Click to expand/edit
			const editBtn = page.locator('button:has-text("Edit"), button:has-text("Expand")').first();
			if (await editBtn.isVisible().catch(() => false)) await editBtn.click();
		}

		// Check grant fields are present in add trait form
		const grantsSkills = page.locator('input[name="grantsSkills"]').first();
		const grantsTools  = page.locator('input[name="grantsTools"]').first();
		const size         = page.locator('input[name="size"]').first();
		const senses       = page.locator('input[name="senses"]').first();

		// At least one should be visible in the form
		const anyVisible = await Promise.any([
			grantsSkills.isVisible(),
			grantsTools.isVisible(),
			size.isVisible(),
			senses.isVisible(),
		]).catch(() => false);

		expect(anyVisible).toBe(true);
	});

	test('trait create — size, senses, speed fields present', async ({ page }) => {
		const url = await getFirstGameSystemUrl(page, 'dnd5e/species');
		if (!url) { test.skip(); return; }
		await page.goto(url);

		await expect(page.locator('input[name="size"]').first()).toBeVisible();
		await expect(page.locator('input[name="senses"]').first()).toBeVisible();
		await expect(page.locator('input[name="speedValue"]').first()).toBeVisible();
	});

	test('trait create — innate spells field has format legend', async ({ page }) => {
		const url = await getFirstGameSystemUrl(page, 'dnd5e/species');
		if (!url) { test.skip(); return; }
		await page.goto(url);

		await expect(page.locator('input[name="grantsInnateSpells"]').first()).toBeVisible();
		// Legend should be visible
		await expect(page.locator('text=/minLvl/').first()).toBeVisible();
	});

	test('trait edit — tool choice count and pool fields visible', async ({ page }) => {
		const url = await getFirstGameSystemUrl(page, 'dnd5e/species');
		if (!url) { test.skip(); return; }
		await page.goto(url);

		// Check in the form (create or edit)
		const toolCount = page.locator('input[name="toolChoiceCount"]').first();
		const toolPool  = page.locator('input[name="toolChoicePool"]').first();
		await expect(toolCount).toBeVisible();
		await expect(toolPool).toBeVisible();
	});

	test('trait edit — language choice count and pool fields visible', async ({ page }) => {
		const url = await getFirstGameSystemUrl(page, 'dnd5e/species');
		if (!url) { test.skip(); return; }
		await page.goto(url);

		const langCount = page.locator('input[name="languageChoiceCount"]').first();
		const langPool  = page.locator('input[name="languageChoicePool"]').first();
		await expect(langCount).toBeVisible();
		await expect(langPool).toBeVisible();
	});

});
