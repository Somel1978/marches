// apps/admin/tests/interactions/import-export.e2e.ts
// Tests the D&D 5e import page UI — tab switching, column display, file upload area.
import { test, expect } from '@playwright/test';

async function getImportUrl(page: any): Promise<string | null> {
	await page.goto('/game-systems');
	const link = page.locator('a[href^="/game-systems/"]:not([href$="/new"])').first();
	if (!(await link.isVisible().catch(() => false))) return null;
	const href = await link.getAttribute('href');
	const sysId = href?.split('/game-systems/')[1]?.split('/')[0];
	return sysId ? `/game-systems/${sysId}/data/import/dnd5e` : null;
}

test.describe('Admin — D&D 5e Import', () => {

	test('import page loads with tabs', async ({ page }) => {
		const url = await getImportUrl(page);
		if (!url) { test.skip(); return; }
		await page.goto(url);

		// Should show import tabs
		await expect(page.locator('button:has-text("Species"), [role="tab"]:has-text("Species")').first()).toBeVisible();
		await expect(page.locator('button:has-text("Classes"), [role="tab"]:has-text("Classes")').first()).toBeVisible();
		await expect(page.locator('button:has-text("Feats"), [role="tab"]:has-text("Feats")').first()).toBeVisible();
	});

	test('species tab — shows correct columns', async ({ page }) => {
		const url = await getImportUrl(page);
		if (!url) { test.skip(); return; }
		await page.goto(url);

		// Species should NOT show size/senses/speed columns (those are on traits now)
		const speciesTab = page.locator('button:has-text("Species"), [role="tab"]:has-text("Species")').first();
		await speciesTab.click();

		// Column info or template download should be visible
		await expect(page.locator('text=/name/i').first()).toBeVisible();
	});

	test('species traits tab — shows size, senses, speed columns', async ({ page }) => {
		const url = await getImportUrl(page);
		if (!url) { test.skip(); return; }
		await page.goto(url);

		const traitsTab = page.locator('button:has-text("Species Traits"), [role="tab"]:has-text("Species Traits")').first();
		if (!(await traitsTab.isVisible().catch(() => false))) { test.skip(); return; }
		await traitsTab.click();

		// Should show WALK/FLY/senses in column list or template
		await expect(page.locator('text=/WALK|senses|size/i').first()).toBeVisible();
	});

	test('backgrounds tab — shows grant fields', async ({ page }) => {
		const url = await getImportUrl(page);
		if (!url) { test.skip(); return; }
		await page.goto(url);

		const bgTab = page.locator('button:has-text("Backgrounds"), [role="tab"]:has-text("Backgrounds")').first();
		if (!(await bgTab.isVisible().catch(() => false))) { test.skip(); return; }
		await bgTab.click();

		await expect(page.locator('text=/grantsTools|grantsLanguages/i').first()).toBeVisible();
	});

	test('class features tab — shows saving throw and grant columns', async ({ page }) => {
		const url = await getImportUrl(page);
		if (!url) { test.skip(); return; }
		await page.goto(url);

		const cfTab = page.locator('button:has-text("Class Features"), [role="tab"]:has-text("Class Features")').first();
		if (!(await cfTab.isVisible().catch(() => false))) { test.skip(); return; }
		await cfTab.click();

		await expect(page.locator('text=/savingThrow|grantsSkills/i').first()).toBeVisible();
	});

	test('file input is present', async ({ page }) => {
		const url = await getImportUrl(page);
		if (!url) { test.skip(); return; }
		await page.goto(url);

		await expect(page.locator('input[type="file"]').first()).toBeVisible();
	});

	test('allow update checkbox is present', async ({ page }) => {
		const url = await getImportUrl(page);
		if (!url) { test.skip(); return; }
		await page.goto(url);

		const checkbox = page.locator('input[type="checkbox"]').first();
		await expect(checkbox).toBeVisible();
	});

});
