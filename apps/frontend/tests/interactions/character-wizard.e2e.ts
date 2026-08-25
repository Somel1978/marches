// apps/frontend/tests/interactions/character-wizard.e2e.ts
// Tests the D&D 5e character creation wizard end-to-end against the rebuilt
// 6-step inline flow (Identity, Species, Background, Scores, Classes, Review).
// Every skill/tool/language/save/expertise/feat/ASI choice is now resolved
// inline wherever its source is shown, so `resolveAllInline()` generically
// fills whatever chip pools, feat pickers, and ASI slots are visible on the
// current step rather than hard-coding per-source-type selectors.
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

// Generically resolves every inline choice currently visible on the page:
// chip pools (skills/tools/languages/saves/expertise/damage-mods/size/class
// skills — all rendered as `.wiz-chip`), feat pickers (`.wiz-browser--compact`,
// both immediate-select and preview+commit modes), and ASI slots (defaults to
// stat mode, picks the first stat). Loops several rounds since resolving one
// choice can reveal a nested one underneath (e.g. a granted feat with its own
// skill-choice pool).
async function resolveAllInline(page: Page) {
	for (let round = 0; round < 10; round++) {
		let progressed = false;

		// ASI/Epic Boon slots — default to stat mode, pick the first stat.
		const asiToggles = page.locator('button:has-text("ASI (+2 or +1/+1)")');
		const asiToggleCount = await asiToggles.count();
		for (let i = 0; i < asiToggleCount; i++) {
			const btn = asiToggles.nth(i);
			const isActive = (await btn.getAttribute('class'))?.includes('wiz-toggle__btn--active');
			if (!isActive && await btn.isVisible().catch(() => false)) {
				await btn.click();
				progressed = true;
				await page.waitForTimeout(80);
			}
		}
		const asiStatSelects = page.locator('select[id^="asi-stat1-"]');
		const asiSelectCount = await asiStatSelects.count();
		for (let i = 0; i < asiSelectCount; i++) {
			const sel = asiStatSelects.nth(i);
			if (!(await sel.isVisible().catch(() => false))) continue;
			const val = await sel.inputValue().catch(() => '');
			if (!val) { await sel.selectOption({ index: 1 }); progressed = true; await page.waitForTimeout(80); }
		}
		const asiFeatStatSelects = page.locator('select[id^="asi-feat-stat-"]');
		const asiFeatStatCount = await asiFeatStatSelects.count();
		for (let i = 0; i < asiFeatStatCount; i++) {
			const sel = asiFeatStatSelects.nth(i);
			if (!(await sel.isVisible().catch(() => false))) continue;
			const val = await sel.inputValue().catch(() => '');
			if (!val) { await sel.selectOption({ index: 1 }); progressed = true; await page.waitForTimeout(80); }
		}

		// Feat pickers — click the first row if nothing's selected in that browser yet.
		const browsers = page.locator('.wiz-browser--compact');
		const browserCount = await browsers.count();
		for (let i = 0; i < browserCount; i++) {
			const browser = browsers.nth(i);
			if (!(await browser.isVisible().catch(() => false))) continue;
			if (await browser.locator('.wiz-row--selected').count() > 0) continue;
			const firstRow = browser.locator('.wiz-row').first();
			if (await firstRow.isVisible().catch(() => false)) {
				await firstRow.click();
				progressed = true;
				await page.waitForTimeout(80);
			}
		}
		// Commit any preview-mode feat pick (ASI slots use preview+commit).
		const commitButtons = page.locator('.wiz-panel__commit button.btn-primary:not([disabled])');
		const commitCount = await commitButtons.count();
		for (let i = 0; i < commitCount; i++) {
			const btn = commitButtons.nth(i);
			if (await btn.isVisible().catch(() => false)) { await btn.click(); progressed = true; await page.waitForTimeout(80); }
		}

		// Generic chip pools (skills/tools/languages/saves/expertise/dmgMod/size/class skills).
		const chips = page.locator('.wiz-chip:not(.wiz-chip--chosen):not(.wiz-chip--granted)');
		const chipCount = await chips.count();
		for (let i = 0; i < chipCount; i++) {
			const chip = chips.nth(i);
			if (await chip.isVisible().catch(() => false) && await chip.isEnabled().catch(() => false)) {
				await chip.click();
				progressed = true;
				await page.waitForTimeout(60);
			}
		}

		if (!progressed) break;
	}
}

// ── Step completers ────────────────────────────────────────────────────────────

// Character names must be unique per world, so each test run gets its own
// suffix to avoid colliding with characters created by earlier runs.
const RUN_SUFFIX = Date.now().toString(36);
let nameCounter = 0;
function uniqueCharName() {
	nameCounter += 1;
	return `Playwright Hero ${RUN_SUFFIX}-${nameCounter}`;
}

async function doStep0(page: Page) {
	await page.fill('#char-name', uniqueCharName());
}

async function doStep1_species(page: Page) {
	await page.locator('button[title="Random species"]').click();
	await expect(page.locator('.wiz-panel__title').first()).toBeVisible({ timeout: 8_000 });
	await resolveAllInline(page);
}

async function doStep2_background(page: Page) {
	await page.locator('button[title="Random background"]').click();
	await page.waitForTimeout(300);
	await resolveAllInline(page);
}

async function doStep3_scores(page: Page) {
	// Roll 4d6 — always produces valid scores immediately.
	await page.locator('button:has-text("🎲 Roll 4d6")').click();
	await page.waitForTimeout(300);
}

async function doStep4_classes(page: Page) {
	await page.locator('button[title="Random class"]').click();
	await page.waitForTimeout(400);
	await resolveAllInline(page);
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

	// Step 4: Classes (+ inline skill/feat/ASI resolution)
	await doStep4_classes(page);
	if (targetStep === 4) return;
	await advance(page);

	// Step 5: Review
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
		await page.fill('#char-name', 'Thalindra');
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
		await expect(page.locator('input[placeholder*="Search species"]').first()).toBeVisible();
	});

	test('Step 1 — Next disabled until species selected', async ({ page }) => {
		await completeStepsUpTo(page, 0);
		await advance(page);
		await expect(page.locator(NEXT).first()).toBeDisabled();
	});

	test('Step 1 — random selects species and resolving pools enables Next', async ({ page }) => {
		await completeStepsUpTo(page, 0);
		await advance(page);
		await doStep1_species(page);
		await expect(page.locator(NEXT).first()).toBeEnabled({ timeout: 5_000 });
	});

	test('Step 1 — search filters list', async ({ page }) => {
		await completeStepsUpTo(page, 0);
		await advance(page);
		const search = page.locator('input[placeholder*="Search species"]').first();
		await search.fill('zzz_no_match_zzz');
		await expect(page.locator('text=/No species match/i')).toBeVisible({ timeout: 3_000 });
		await search.fill('');
		await expect(page.locator('text=/No species match/i')).not.toBeVisible();
	});

	// ── Step 2: Background ──────────────────────────────────────────────────
	test('Step 2 — background list renders', async ({ page }) => {
		await completeStepsUpTo(page, 1);
		await advance(page);
		await expect(page.locator('input[placeholder*="Search backgrounds"]').first()).toBeVisible();
	});

	test('Step 2 — Next disabled until background selected', async ({ page }) => {
		await completeStepsUpTo(page, 1);
		await advance(page);
		await expect(page.locator(NEXT).first()).toBeDisabled();
	});

	test('Step 2 — random background and resolving pools enables Next', async ({ page }) => {
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

	test('Step 3 — bonus points input assigns via the purple controls', async ({ page }) => {
		await completeStepsUpTo(page, 2);
		await advance(page);
		await doStep3_scores(page);
		await page.fill('#bonus-granted', '2');
		await expect(page.locator('text=/bonus point.*left to assign/i')).toBeVisible({ timeout: 3_000 });
	});

	// ── Step 4: Classes ─────────────────────────────────────────────────────
	test('Step 4 — class browser renders', async ({ page }) => {
		await completeStepsUpTo(page, 3);
		await advance(page);
		await expect(page.locator('input[placeholder*="Search classes"]').first()).toBeVisible({ timeout: 5_000 });
	});

	test('Step 4 — Next disabled until class selected', async ({ page }) => {
		await completeStepsUpTo(page, 3);
		await advance(page);
		await expect(page.locator(NEXT).first()).toBeDisabled();
	});

	test('Step 4 — random class shows "Your classes" section', async ({ page }) => {
		await completeStepsUpTo(page, 3);
		await advance(page);
		await page.locator('button[title="Random class"]').click();
		await expect(page.locator('text=Your classes').first()).toBeVisible({ timeout: 5_000 });
	});

	test('Step 4 — resolving class skills/feats/ASI enables Next', async ({ page }) => {
		await completeStepsUpTo(page, 3);
		await advance(page);
		await doStep4_classes(page);
		await expect(page.locator(NEXT).first()).toBeEnabled({ timeout: 5_000 });
	});

	// ── Navigation ──────────────────────────────────────────────────────────
	test('Back button returns to previous step', async ({ page }) => {
		await completeStepsUpTo(page, 0);
		await advance(page);
		await expect(page.locator('input[placeholder*="Search species"]').first()).toBeVisible({ timeout: 3_000 });
		await page.locator(BACK).first().click();
		await expect(page.locator('#char-name')).toBeVisible();
	});

	// ── Review step ─────────────────────────────────────────────────────────
	test('Review step — shows character name', async ({ page }) => {
		await completeStepsUpTo(page, 4);
		await advance(page);
		await expect(page.locator('text=Playwright Hero')).toBeVisible({ timeout: 5_000 });
	});

	test('Review step — shows ability scores and classes', async ({ page }) => {
		await completeStepsUpTo(page, 4);
		await advance(page);
		await expect(page.locator('text=Ability Scores')).toBeVisible({ timeout: 5_000 });
		await expect(page.locator('h4.section-title:has-text("Classes")')).toBeVisible({ timeout: 5_000 });
	});

	test('Review step — Submit button present and enabled', async ({ page }) => {
		await completeStepsUpTo(page, 4);
		await advance(page);
		const submit = page.locator('button[type="submit"]:has-text("Create Character")').first();
		await expect(submit).toBeVisible({ timeout: 5_000 });
		await expect(submit).toBeEnabled({ timeout: 5_000 });
	});

	test('Full flow — create a character end to end', async ({ page }) => {
		await completeStepsUpTo(page, 4);
		await advance(page);
		const submit = page.locator('button[type="submit"]:has-text("Create Character")').first();
		await expect(submit).toBeEnabled({ timeout: 5_000 });
		await submit.click();
		// Successful submission redirects away from the wizard (to the character
		// list or detail page); the form-level error banner must not appear.
		await page.waitForTimeout(1_000);
		await expect(page.locator('.form-error')).not.toBeVisible();
	});

});
