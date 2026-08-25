// apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/wizard-state.svelte.ts
// Centralizes every piece of wizard state (previously 40+ scattered top-level
// $state/$derived declarations in +page.svelte) plus session persistence.
// Fixes a pre-existing bug where chosenSize/chosenToolPools/chosenLanguagePools/
// chosenExpertisePools/chosenDmgMods/featureFeatPicks were tracked for changes
// but never actually round-tripped through sessionStorage.
import { browser } from '$app/environment';
import { untrack } from 'svelte';
import type { AsiChoice, ClassAlloc } from './types.ts';
import { STATS } from './types.ts';

const STORAGE_KEY = 'wizard_dnd5e';

const MIN_STAT = 8, MAX_STAT = 15;
export const BUDGET = 27;
export const POINT_COSTS: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
export const SA_VALUES = [8, 10, 12, 13, 14, 15] as const;

function emptyStats(): Record<string, number> {
	return { STRENGTH: 0, DEXTERITY: 0, CONSTITUTION: 0, INTELLIGENCE: 0, WISDOM: 0, CHARISMA: 0 };
}
function baseStats(): Record<string, number> {
	return { STRENGTH: 8, DEXTERITY: 8, CONSTITUTION: 8, INTELLIGENCE: 8, WISDOM: 8, CHARISMA: 8 };
}

export function mod(n: number) {
	const m = Math.floor((n - 10) / 2);
	return m >= 0 ? `+${m}` : `${m}`;
}

// Generic "choose up to N" toggle used by every choice-pool kind (skill/tool/
// language/save/expertise/dmgMod) — extracted so ChoicePoolInline doesn't
// need per-kind mutation logic.
export function toggleChoice(chosen: string[], value: string, max: number): string[] {
	if (chosen.includes(value)) return chosen.filter(v => v !== value);
	if (chosen.length < max) return [...chosen, value];
	return chosen;
}

export class WizardState {
	// ── Step ─────────────────────────────────────────────────────────────
	step = $state(0);

	// ── Identity ─────────────────────────────────────────────────────────
	name        = $state('');
	avatarUrl   = $state('');
	portraitUrl = $state('');
	worldId     = $state('');

	// ── Species ──────────────────────────────────────────────────────────
	speciesId     = $state('');
	speciesSearch = $state('');
	chosenSize    = $state('');

	// ── Background ───────────────────────────────────────────────────────
	backgroundId     = $state('');
	backgroundSearch = $state('');
	bgFeatPick       = $state('');
	bgFeatSearch     = $state('');
	sheetBg          = $state<any>(null);

	// ── Scores ───────────────────────────────────────────────────────────
	scores        = $state<Record<string, number>>(baseStats());
	rolled        = $state(false);
	standardArray = $state(false);
	bonusGranted  = $state(0);
	bonus         = $state<Record<string, number>>(emptyStats());

	// ── Classes ──────────────────────────────────────────────────────────
	classAllocs   = $state<ClassAlloc[]>([]);
	classSearch   = $state('');
	browseClassId = $state('');
	browseSubId   = $state('');
	browseLevel   = $state(1);
	openFeats     = $state<Set<string>>(new Set());
	sheetClass    = $state<any>(null);

	// ── ASI / feats (inline now, resolved on the class feature timeline) ──
	// Per-slot search/preview UI state lives locally in AsiSlotInline instead
	// of here since it's purely transient and was never session-persisted.
	asiChoices        = $state<AsiChoice[]>([]);
	featureFeatPicks  = $state<Record<string, string>>({}); // keyed by sourceKey e.g. 'cf-{featureId}'
	featureFeatSearch = $state<Record<string, string>>({});

	// ── Skill / tool / language / save / expertise / dmgMod choice pools ──
	// All keyed by sourceId (featureId, backgroundId, traitId, featId, etc).
	chosenClassSkills   = $state<string[]>([]);
	chosenPoolSkills    = $state<Record<string, string[]>>({});
	chosenSavePools     = $state<Record<string, string[]>>({});
	chosenToolPools     = $state<Record<string, string[]>>({});
	chosenLanguagePools = $state<Record<string, string[]>>({});
	chosenExpertisePools = $state<Record<string, string[]>>({});
	chosenDmgMods       = $state<Record<string, string[]>>({});

	// ── Ability score derived values (self-contained; no `sys` needed) ────
	total = $derived(Object.fromEntries(STATS.map(st => [st, this.scores[st] + this.bonus[st]])) as Record<string, number>);

	finalScores = $derived.by(() => {
		const s = { ...this.total };
		for (const c of this.asiChoices) {
			if (c.mode === 'stat') {
				if (c.stat1) s[c.stat1] = (s[c.stat1] ?? 0) + (c.amount1 || 0);
				if (c.stat2) s[c.stat2] = (s[c.stat2] ?? 0) + (c.amount2 || 0);
			} else if (c.mode === 'feat' && c.featId) {
				if (c.stat1 && c.amount1) s[c.stat1] = (s[c.stat1] ?? 0) + c.amount1;
			}
		}
		return s;
	});

	spent     = $derived(STATS.reduce((s, st) => s + (POINT_COSTS[this.scores[st]] ?? 0), 0));
	remaining = $derived(BUDGET - this.spent);
	bonusSpent = $derived(STATS.reduce((s, st) => s + this.bonus[st], 0));
	bonusLeft  = $derived(this.bonusGranted - this.bonusSpent);

	saAssigned  = $derived(this.standardArray ? STATS.filter(st => this.scores[st] > 0) : []);
	saAvailable = $derived(this.standardArray ? SA_VALUES.filter(v => !this.saAssigned.map(st => this.scores[st]).includes(v)) : []);
	scoresValid = $derived(
		this.rolled || (this.standardArray && this.saAssigned.length === 6) || (!this.rolled && !this.standardArray && this.remaining === 0)
	);

	totalLevel   = $derived(this.classAllocs.reduce((s, c) => s + (c.allocatedLevel || 0), 0));
	classesValid = $derived(this.totalLevel >= 1 && this.classAllocs.every(c => c.classId));

	canInc(st: string) {
		if (this.rolled) return this.total[st] < 20;
		const nx = this.scores[st] + 1;
		if (nx > MAX_STAT) return false;
		return this.remaining >= (POINT_COSTS[nx] - POINT_COSTS[this.scores[st]]);
	}
	canDec(st: string)      { return this.scores[st] > (this.rolled ? 3 : MIN_STAT); }
	canBonusInc(st: string) { return this.bonusLeft > 0 && this.total[st] < 17; }
	canBonusDec(st: string) { return this.bonus[st] > 0; }
	inc(st: string)         { if (this.canInc(st))      this.scores = { ...this.scores, [st]: this.scores[st] + 1 }; }
	dec(st: string)         { if (this.canDec(st))      this.scores = { ...this.scores, [st]: this.scores[st] - 1 }; }
	bonusInc(st: string)    { if (this.canBonusInc(st)) this.bonus  = { ...this.bonus,  [st]: this.bonus[st] + 1 }; }
	bonusDec(st: string)    { if (this.canBonusDec(st)) this.bonus  = { ...this.bonus,  [st]: this.bonus[st] - 1 }; }

	rollScores() {
		const roll = () => { const d = [0, 0, 0, 0].map(() => Math.ceil(Math.random() * 6)); d.sort((a, b) => a - b); return d[1] + d[2] + d[3]; };
		const nx: Record<string, number> = {};
		for (const st of STATS) nx[st] = roll();
		this.scores = nx;
		this.bonus  = emptyStats();
		this.rolled = true;
	}
	resetPointBuy() {
		this.scores = baseStats();
		this.bonus  = emptyStats();
		this.rolled = false; this.standardArray = false;
	}
	useStandardArray() {
		this.scores = emptyStats();
		this.bonus  = emptyStats();
		this.rolled = false; this.standardArray = true;
	}

	// ── Class allocation mutators ──────────────────────────────────────
	toggleFeat(id: string) {
		const s = new Set(this.openFeats);
		s.has(id) ? s.delete(id) : s.add(id);
		this.openFeats = s;
	}
	selectBrowseClass(id: string) {
		this.browseClassId = id;
		this.browseSubId   = '';
		this.browseLevel   = 1;
		this.openFeats     = new Set();
	}
	openClassSheet(cls: any) { this.sheetClass = cls; this.selectBrowseClass(cls.id); this.openFeats = new Set(); }
	closeClassSheet()        { this.sheetClass = null; }
	addBrowseClass() {
		const existing = this.classAllocs.findIndex(a => a.classId === this.browseClassId);
		if (existing >= 0) {
			this.classAllocs = this.classAllocs.map((a, i) => i === existing ? { ...a, subclassId: this.browseSubId, allocatedLevel: this.browseLevel } : a);
		} else {
			this.classAllocs = [...this.classAllocs, { classId: this.browseClassId, subclassId: this.browseSubId, allocatedLevel: this.browseLevel }];
		}
		this.browseClassId = '';
		this.browseSubId   = '';
		this.browseLevel   = 1;
	}
	addSheetClass(id: string) {
		if (!this.classAllocs.find(a => a.classId === id)) {
			this.classAllocs = [...this.classAllocs, { classId: id, subclassId: '', allocatedLevel: 1 }];
		}
		this.closeClassSheet();
	}
	removeClass(i: number) { this.classAllocs = this.classAllocs.filter((_, j) => j !== i); }

	updateClassAlloc(i: number, patch: Partial<ClassAlloc>) {
		this.classAllocs = this.classAllocs.map((a, j) => j === i ? { ...a, ...patch } : a);
	}
	bumpClassLevel(i: number, delta: number) {
		const cur = this.classAllocs[i]?.allocatedLevel ?? 1;
		this.updateClassAlloc(i, { allocatedLevel: Math.max(1, Math.min(20, cur + delta)) });
	}

	// Reassign so step validation ($derived.by) sees ASI field updates made inline.
	refreshAsiChoices() {
		this.asiChoices = this.asiChoices.map(c => ({ ...c }));
	}
	updateAsiChoice(sourceClassId: string, sourceLevel: number, patch: Partial<AsiChoice>) {
		this.asiChoices = this.asiChoices.map(c =>
			c.sourceClassId === sourceClassId && c.sourceLevel === sourceLevel ? { ...c, ...patch } : c
		);
	}

	// ── Background sheet (mobile) ───────────────────────────────────────
	openBgSheet(bg: any) { this.sheetBg = bg; }
	closeBgSheet()       { this.sheetBg = null; }
	selectBg(id: string) { this.backgroundId = id; this.closeBgSheet(); }

	// ── Generic pool toggles ────────────────────────────────────────────
	togglePoolSkill(sourceId: string, skill: string, maxCount: number) {
		this.chosenPoolSkills = { ...this.chosenPoolSkills, [sourceId]: toggleChoice(this.chosenPoolSkills[sourceId] ?? [], skill, maxCount) };
	}
	toggleSavePool(sourceId: string, stat: string, maxCount: number) {
		this.chosenSavePools = { ...this.chosenSavePools, [sourceId]: toggleChoice(this.chosenSavePools[sourceId] ?? [], stat, maxCount) };
	}
	toggleToolPool(sourceId: string, tool: string, maxCount: number) {
		this.chosenToolPools = { ...this.chosenToolPools, [sourceId]: toggleChoice(this.chosenToolPools[sourceId] ?? [], tool, maxCount) };
	}
	toggleLanguagePool(sourceId: string, lang: string, maxCount: number) {
		this.chosenLanguagePools = { ...this.chosenLanguagePools, [sourceId]: toggleChoice(this.chosenLanguagePools[sourceId] ?? [], lang, maxCount) };
	}
	toggleExpertisePool(sourceId: string, skill: string, maxCount: number) {
		this.chosenExpertisePools = { ...this.chosenExpertisePools, [sourceId]: toggleChoice(this.chosenExpertisePools[sourceId] ?? [], skill, maxCount) };
	}
	toggleDmgModPool(sourceId: string, dmgType: string, maxCount: number) {
		this.chosenDmgMods = { ...this.chosenDmgMods, [sourceId]: toggleChoice(this.chosenDmgMods[sourceId] ?? [], dmgType, maxCount) };
	}

	// ── Navigation ───────────────────────────────────────────────────────
	next(canAdvance: boolean, stepCount: number) { if (canAdvance && this.step < stepCount - 1) this.step++; }
	back()                  { if (this.step > 0) this.step--; }
	goTo(i: number)         { if (i <= this.step) this.step = i; }

	// ── sessionStorage persistence ───────────────────────────────────────
	saveState() {
		if (!browser) return;
		try {
			sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
				step: this.step, name: this.name, avatarUrl: this.avatarUrl, portraitUrl: this.portraitUrl, worldId: this.worldId,
				speciesId: this.speciesId, chosenSize: this.chosenSize,
				backgroundId: this.backgroundId, bgFeatPick: this.bgFeatPick,
				scores: this.scores, rolled: this.rolled, standardArray: this.standardArray, bonusGranted: this.bonusGranted, bonus: this.bonus,
				classAllocs: this.classAllocs, asiChoices: this.asiChoices,
				featureFeatPicks: this.featureFeatPicks,
				chosenClassSkills: this.chosenClassSkills, chosenPoolSkills: this.chosenPoolSkills, chosenSavePools: this.chosenSavePools,
				chosenToolPools: this.chosenToolPools, chosenLanguagePools: this.chosenLanguagePools, chosenExpertisePools: this.chosenExpertisePools,
				chosenDmgMods: this.chosenDmgMods,
			}));
		} catch (_) {}
	}

	restoreState() {
		if (!browser) return;
		try {
			const raw = sessionStorage.getItem(STORAGE_KEY);
			if (!raw) return;
			const s = JSON.parse(raw);
			if (s.step             !== undefined) this.step             = s.step;
			if (s.name             !== undefined) this.name             = s.name;
			if (s.avatarUrl        !== undefined) this.avatarUrl        = s.avatarUrl;
			if (s.portraitUrl      !== undefined) this.portraitUrl      = s.portraitUrl;
			if (s.worldId          !== undefined) this.worldId          = s.worldId;
			if (s.speciesId        !== undefined) this.speciesId        = s.speciesId;
			if (s.chosenSize       !== undefined) this.chosenSize       = s.chosenSize;
			if (s.backgroundId     !== undefined) this.backgroundId     = s.backgroundId;
			if (s.bgFeatPick       !== undefined) this.bgFeatPick       = s.bgFeatPick;
			if (s.featureFeatPicks !== undefined) this.featureFeatPicks = s.featureFeatPicks;
			if (s.chosenDmgMods    !== undefined) this.chosenDmgMods    = s.chosenDmgMods;
			if (s.scores           !== undefined) this.scores           = s.scores;
			if (s.rolled           !== undefined) this.rolled           = s.rolled;
			if (s.standardArray    !== undefined) this.standardArray    = s.standardArray;
			if (s.bonusGranted     !== undefined) this.bonusGranted     = s.bonusGranted;
			if (s.bonus            !== undefined) this.bonus            = s.bonus;
			if (s.classAllocs      !== undefined) this.classAllocs      = s.classAllocs;
			if (s.chosenClassSkills   !== undefined) this.chosenClassSkills   = s.chosenClassSkills;
			if (s.chosenPoolSkills    !== undefined) this.chosenPoolSkills    = s.chosenPoolSkills;
			if (s.chosenSavePools     !== undefined) this.chosenSavePools     = s.chosenSavePools;
			if (s.chosenToolPools     !== undefined) this.chosenToolPools     = s.chosenToolPools;
			if (s.chosenLanguagePools !== undefined) this.chosenLanguagePools = s.chosenLanguagePools;
			if (s.chosenExpertisePools!== undefined) this.chosenExpertisePools= s.chosenExpertisePools;
			if (s.asiChoices !== undefined) {
				this.asiChoices = s.asiChoices;
				// Backfill stat1/amount1 for feat-mode choices restored from old sessions
				for (const c of this.asiChoices) {
					if (c.mode === 'feat' && c.featId && !c.stat1) {
						const stat = c.featAsiFixed || c.featGrantedStat || '';
						const amt  = c.featAsiAmount ?? 0;
						if (stat && amt) { c.stat1 = stat; c.amount1 = amt; }
					}
				}
			}
		} catch (_) {}
	}

	clearState() {
		if (!browser) return;
		try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
	}

	// Backfills stat1/amount1 for restored feat-mode ASI choices once sys.feats loads.
	backfillAsiFeatStats(feats: any[] | undefined) {
		if (!feats?.length) return;
		for (const c of this.asiChoices) {
			if (c.mode === 'feat' && c.featId && !c.stat1) {
				const featRef = feats.find((f: any) => f.id === c.featId);
				if (!featRef?.asiAmount) continue;
				const stat = featRef.asiStatFixed || c.featGrantedStat || c.featAsiFixed || '';
				if (stat) { c.stat1 = stat; c.amount1 = featRef.asiAmount; }
			}
		}
	}

	// Call once on mount inside an $effect(() => untrack(() => ws.restoreState()))
	// and register a save-on-change $effect from the orchestrator page, since
	// $effect must live in a component/rune context, not the class itself.
}
