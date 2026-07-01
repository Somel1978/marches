// apps/frontend/tests/interactions/character-wizard.e2e.ts
// Tests the D&D 5e character creation wizard end-to-end.
// Each completeStepsUpTo() call satisfies every mandatory selection
// for steps 0-N, matching the actual canAdvance logic in the wizard.
import { test, expect, type Page } from '@playwright/test';

const NEXT = 'button:has-text("Next")';
const BACK = 'button:has-text("← Back")';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function goToWizard(page: Page) {
	await page.goto('/characters/new');
	const dnd5e = page.locator('a[href*="dnd5e"]').first();
	if (await dnd5e.isVisible({ timeout: 2_000 }).catch(() => false)) {
		await dnd5e.click();
		await page.waitForURL(/dnd5e/, { timeout: 5_000 });
	}
}

async function advance(page: Page) {
	const btn = page.locator(NEXT).first();
	await expect(btn).toBeEnabled({ timeout: 8_000 });
	await btn.click();
	await page.waitForTimeout(300);
}

// Click all available (non-disabled) btn-ghost buttons in a section
// until the section label shows (X/X) i.e. pool is full.
async function fillPool(page: Page, sectionLabel: string) {
	// Find the section containing this label text
	const section = page.locator('div').filter({ hasText: sectionLabel }).last();
	const btns = section.locator('button.btn-ghost:not([disabled])');
	const count = await btns.count();
	for (let i = 0; i < count; i++) {
		const btn = btns.nth(i);
		if (await btn.isVisible().catch(() => false) && await btn.isEnabled().catch(() => false)) {
			await btn.click();
			await page.waitForTimeout(100);
			// Stop if pool is satisfied (button now disabled = full)
			if (await btns.first().isDisabled().catch(() => true)) break;
		}
	}
}

// Click ALL non-disabled btn-ghost buttons in a container (for any unknown pool sections)
async function clickAllAvailableInContainer(page: Page, container: any) {
	let safetyLimit = 50;
	while (safetyLimit-- > 0) {
		const btn = container.locator('button.btn-ghost:not([disabled])').first();
		if (!(await btn.isVisible().catch(() => false))) break;
		await btn.click();
		await page.waitForTimeout(100);
	}
}

// ── Step completers ────────────────────────────────────────────────────────────

async function doStep0(page: Page) {
	await page.fill('input[name="name"]', 'Playwright Hero');
}

async function doStep1_species(page: Page) {
	// Use random — satisfies speciesId requirement
	await page.locator('button[title="Random"], button:has-text("🎲")').first().click();
	await expect(page.locator('h3').first()).toBeVisible({ timeout: 3_000 });
	// If the selected species has sizeChoices, pick one
	const sizeBtn = page.locator('button:has-text("Small"), button:has-text("Medium"), button:has-text("Large")').first();
	if (await sizeBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
		await sizeBtn.click();
	}
}

async function doStep2_background(page: Page) {
	await page.locator('button:has-text("🎲 Random")').first().click();
	await page.waitForTimeout(500);
	// If background needs a feat category pick, select first option
	const featSelect = page.locator('select[name="bgFeatPick"]').first();
	if (await featSelect.isVisible({ timeout: 1_500 }).catch(() => false)) {
		await featSelect.selectOption({ index: 1 });
	}
	// If background shows feat choice buttons (not a select)
	const featBtn = page.locator('.feat-choice button.btn-ghost, [class*="feat"] button.btn-ghost').first();
	if (await featBtn.isVisible({ timeout: 500 }).catch(() => false)) {
		await featBtn.click();
	}
}

async function doStep3_scores(page: Page) {
	// Roll 4d6 — always produces valid scores immediately
	await page.locator('button:has-text("🎲 Roll 4d6")').click();
	await page.waitForTimeout(300);
}

async function doStep4_classes(page: Page) {
	// Random class — satisfies classesValid (level 1 allocated)
	await page.locator('button:has-text("🎲 Random")').first().click();
	await page.waitForTimeout(500);
}

async function doStep5_asi(page: Page) {
	// ASI step only appears for some classes/levels — handle if present
	const asiSection = page.locator('text=/ASI.*Feat|Ability Score/i').first();
	if (!(await asiSection.isVisible({ timeout: 1_000 }).catch(() => false))) return;

	// For each ASI slot: pick "Stat" mode and choose Strength +2
	const statModeButtons = page.locator('button:has-text("Stat +2"), button.btn-ghost:has-text("Stat")');
	const count = await statModeButtons.count();
	for (let i = 0; i < count; i++) {
		await statModeButtons.nth(i).click();
		await page.waitForTimeout(200);
	}
	// Select stat for each slot via the select dropdowns
	const statSelects = page.locator('select[id^="asi-stat1-"]');
	const selectCount = await statSelects.count();
	const stats = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
	for (let i = 0; i < selectCount; i++) {
		await statSelects.nth(i).selectOption(stats[i % stats.length]);
		await page.waitForTimeout(100);
	}
}

async function doStep6_skills(page: Page) {
	// Class skills — click available btn-ghost buttons until full
	const classSkillSection = page.locator('div').filter({ hasText: /Choose \d+ Skill/ }).last();
	if (await classSkillSection.isVisible({ timeout: 1_000 }).catch(() => false)) {
		await clickAllAvailableInContainer(page, classSkillSection);
	}

	// Feature skill choice pools
	const featurePoolSections = page.locator('div').filter({ hasText: /Choose \d+ Skill/ });
	const poolCount = await featurePoolSections.count();
	for (let i = 0; i < poolCount; i++) {
		await clickAllAvailableInContainer(page, featurePoolSections.nth(i));
	}

	// Saving throw choice pools
	const saveSections = page.locator('div').filter({ hasText: /Choose \d+ Saving Throw/ });
	const saveCount = await saveSections.count();
	for (let i = 0; i < saveCount; i++) {
		await clickAllAvailableInContainer(page, saveSections.nth(i));
	}

	// Tool choice pools
	const toolSections = page.locator('div').filter({ hasText: /Choose \d+ Tool/ });
	const toolCount = await toolSections.count();
	for (let i = 0; i < toolCount; i++) {
		await clickAllAvailableInContainer(page, toolSections.nth(i));
	}

	// Language choice pools
	const langSections = page.locator('div').filter({ hasText: /Choose \d+ Language/ });
	const langCount = await langSections.count();
	for (let i = 0; i < langCount; i++) {
		await clickAllAvailableInContainer(page, langSections.nth(i));
	}

	// Background skill pool
	const bgSkillSection = page.locator('div').filter({ hasText: /Background.*Choose|Choose.*Background/ }).last();
	if (await bgSkillSection.isVisible({ timeout: 500 }).catch(() => false)) {
		await clickAllAvailableInContainer(page, bgSkillSection);
	}
}

async function completeStepsUpTo(page: Page, targetStep: number) {
	await goToWizard(page);

	// Step 0: Identity
	await doStep0(page);
	if (targetStep === 0) return;
	await advance(page);

	// Step 1: Species
	await doStep1_species(page);
	if (targetStep === 1) return;
	await advance(page);

	// Step 2: Background
	await doStep2_background(page);
	if (targetStep === 2) return;
	await advance(page);

	// Step 3: Scores
	await doStep3_scores(page);
	if (targetStep === 3) return;
	await advance(page);

	// Step 4: Classes
	await doStep4_classes(page);
	if (targetStep === 4) return;
	await advance(page);

	// Step 5: ASI (conditional) or Skills
	// Detect if we're on ASI step by checking the section title
	const onAsi = await page.locator('text=/ASI|Ability Score Improvement/i').first().isVisible({ timeout: 1_000 }).catch(() => false);
	if (onAsi) {
		await doStep5_asi(page);
		if (targetStep === 5) return;
		await advance(page);
		// Now on skills step
		await doStep6_skills(page);
		if (targetStep === 6) return;
		await advance(page);
	} else {
		// No ASI step — directly on skills
		await doStep6_skills(page);
		if (targetStep === 5) return;
		await advance(page);
	}
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('Character creation wizard', () => {

	// ── Step 0: Identity ────────────────────────────────────────────────────
	test('Step 0 — Next disabled without name', async ({ page }) => {
		await goToWizard(page);
		await expect(page.locator(NEXT).first()).toBeDisabled();
	});

	test('Step 0 — Next enabled after name entered', async ({ page }) => {
		await goToWizard(page);
		await page.fill('input[name="name"]', 'Thalindra');
		await expect(page.locator(NEXT).first()).toBeEnabled();
	});

	test('Step 0 — Back not shown on first step', async ({ page }) => {
		await goToWizard(page);
		await expect(page.locator(BACK).first()).not.toBeVisible();
	});

	// ── Step 1: Species ─────────────────────────────────────────────────────
	test('Step 1 — species list renders', async ({ page }) => {
		await completeStepsUpTo(page, 0);
		await advance(page);
		await expect(page.locator('input[placeholder*="Search"]').first()).toBeVisible();
	});

	test('Step 1 — Next disabled until species selected', async ({ page }) => {
		await completeStepsUpTo(page, 0);
		await advance(page);
		await expect(page.locator(NEXT).first()).toBeDisabled();
	});

	test('Step 1 — random selects species and enables Next', async ({ page }) => {
		await completeStepsUpTo(page, 0);
		await advance(page);
		await doStep1_species(page);
		await expect(page.locator(NEXT).first()).toBeEnabled({ timeout: 3_000 });
	});

	test('Step 1 — search filters list', async ({ page }) => {
		await completeStepsUpTo(page, 0);
		await advance(page);
		const search = page.locator('input[placeholder*="Search"]').first();
		await search.fill('zzz_no_match_zzz');
		await expect(page.locator('text=/No species match/i')).toBeVisible({ timeout: 3_000 });
		await search.fill('');
		await expect(page.locator('text=/No species match/i')).not.toBeVisible();
	});

	test('Step 1 — clicking species populates detail panel', async ({ page }) => {
		await completeStepsUpTo(page, 0);
		await advance(page);
		await page.locator('button[style*="border:none"], button[style*="border-left"]').first().click();
		await expect(page.locator('h3').first()).toBeVisible();
	});

	// ── Step 2: Background ──────────────────────────────────────────────────
	test('Step 2 — background list renders', async ({ page }) => {
		await completeStepsUpTo(page, 1);
		await advance(page);
		await expect(page.locator('input[placeholder*="background" i], input[placeholder*="Search"]').first()).toBeVisible();
	});

	test('Step 2 — Next disabled until background selected', async ({ page }) => {
		await completeStepsUpTo(page, 1);
		await advance(page);
		await expect(page.locator(NEXT).first()).toBeDisabled();
	});

	test('Step 2 — random background enables Next', async ({ page }) => {
		await completeStepsUpTo(page, 1);
		await advance(page);
		await doStep2_background(page);
		await expect(page.locator(NEXT).first()).toBeEnabled({ timeout: 5_000 });
	});

	// ── Step 3: Scores ──────────────────────────────────────────────────────
	test('Step 3 — score controls render', async ({ page }) => {
		await completeStepsUpTo(page, 2);
		await advance(page);
		await expect(page.locator('button:has-text("🎲 Roll 4d6")').first()).toBeVisible({ timeout: 5_000 });
	});

	test('Step 3 — Next disabled before rolling', async ({ page }) => {
		await completeStepsUpTo(page, 2);
		await advance(page);
		await expect(page.locator(NEXT).first()).toBeDisabled();
	});

	test('Step 3 — Roll 4d6 enables Next', async ({ page }) => {
		await completeStepsUpTo(page, 2);
		await advance(page);
		await doStep3_scores(page);
		await expect(page.locator(NEXT).first()).toBeEnabled({ timeout: 3_000 });
	});

	// ── Step 4: Classes ─────────────────────────────────────────────────────
	test('Step 4 — class list renders', async ({ page }) => {
		await completeStepsUpTo(page, 3);
		await advance(page);
		await expect(page.locator('.wizard-class-card').first()).toBeVisible({ timeout: 5_000 });
	});

	test('Step 4 — Next disabled until class selected', async ({ page }) => {
		await completeStepsUpTo(page, 3);
		await advance(page);
		await expect(page.locator(NEXT).first()).toBeDisabled();
	});

	test('Step 4 — random class enables Next', async ({ page }) => {
		await completeStepsUpTo(page, 3);
		await advance(page);
		await doStep4_classes(page);
		await expect(page.locator(NEXT).first()).toBeEnabled({ timeout: 5_000 });
	});

	// ── Step 5/6: Skills ────────────────────────────────────────────────────
	test('Skills step — class skill buttons render', async ({ page }) => {
		await completeStepsUpTo(page, 4);
		await advance(page);
		// Skip ASI if present
		const onAsi = await page.locator('text=/ASI|Ability Score Improvement/i').first().isVisible({ timeout: 1_000 }).catch(() => false);
		if (onAsi) {
			await doStep5_asi(page);
			await advance(page);
		}
		await expect(page.locator('text=/Choose \d+ Skill/i').first()).toBeVisible({ timeout: 5_000 });
	});

	test('Skills step — Next disabled until all pools satisfied', async ({ page }) => {
		await completeStepsUpTo(page, 4);
		await advance(page);
		const onAsi = await page.locator('text=/ASI|Ability Score Improvement/i').first().isVisible({ timeout: 1_000 }).catch(() => false);
		if (onAsi) {
			await doStep5_asi(page);
			await advance(page);
		}
		// Without picking skills, Next should be disabled
		await expect(page.locator(NEXT).first()).toBeDisabled();
	});

	test('Skills step — filling all pools enables Next', async ({ page }) => {
		await completeStepsUpTo(page, 4);
		await advance(page);
		const onAsi = await page.locator('text=/ASI|Ability Score Improvement/i').first().isVisible({ timeout: 1_000 }).catch(() => false);
		if (onAsi) {
			await doStep5_asi(page);
			await advance(page);
		}
		await doStep6_skills(page);
		await expect(page.locator(NEXT).first()).toBeEnabled({ timeout: 5_000 });
	});

	// ── Navigation ──────────────────────────────────────────────────────────
	test('Back button returns to previous step', async ({ page }) => {
		await completeStepsUpTo(page, 0);
		await advance(page);
		await expect(page.locator('input[placeholder*="Search"]').first()).toBeVisible({ timeout: 3_000 });
		await page.locator(BACK).first().click();
		await expect(page.locator('input[name="name"]').first()).toBeVisible();
	});

	// ── Review step ─────────────────────────────────────────────────────────
	test('Review step — shows character name', async ({ page }) => {
		await completeStepsUpTo(page, 5);
		// Should now be on review
		await expect(page.locator('text=Playwright Hero')).toBeVisible({ timeout: 5_000 });
	});

	test('Review step — shows species', async ({ page }) => {
		await completeStepsUpTo(page, 5);
		// Review should list species name somewhere
		await expect(page.locator('text=/Species/i').first()).toBeVisible({ timeout: 5_000 });
	});

	test('Review step — shows class', async ({ page }) => {
		await completeStepsUpTo(page, 5);
		await expect(page.locator('text=/Class|Level/i').first()).toBeVisible({ timeout: 5_000 });
	});

	test('Review step — Submit button present', async ({ page }) => {
		await completeStepsUpTo(page, 5);
		await expect(page.locator('button[type="submit"], button:has-text("Create Character"), button:has-text("Submit")').first()).toBeVisible({ timeout: 5_000 });
	});

});