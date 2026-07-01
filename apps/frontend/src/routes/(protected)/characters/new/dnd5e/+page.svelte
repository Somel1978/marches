<!-- apps/frontend/src/routes/(protected)/characters/new/dnd5e/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { generateFantasyName, isAsiFeatureName, isEpicBoonFeatureName } from '@core/ui';
	import { SKILL_DISPLAY, SKILL_ABILITY, STAT_ABBR } from '@core/ui/gamesystems/dnd5e/skills.ts';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const sys = $derived((data as any).systemData);
	const canViewDescriptions = $derived((data as any).canViewDescriptions ?? false);

	// ── Steps ────────────────────────────────────────────────────────────────
	const BASE_STEPS  = [
		{ label: 'Identity'  },
		{ label: 'Species'   },
		{ label: 'Background'},
		{ label: 'Scores'    },
		{ label: 'Classes'   },
	];
	const REVIEW_STEP  = { label: 'Review' };
	const ASI_STEP     = { label: 'ASI / Feats' };
	const SKILLS_STEP  = { label: 'Skills' };

	let step = $state(0);
	// STEPS, next, back, goTo, nextLabel defined after ASI section (STEPS is derived)

	// ── Step 1: Identity ─────────────────────────────────────────────────────
	let name        = $state('');
	let avatarUrl   = $state('');
	let portraitUrl = $state('');
	let worldId     = $state('');
	function randomName() { name = generateFantasyName(selectedSpecies?.name); }

	// ── Step 2: Species ──────────────────────────────────────────────────────
	let speciesId     = $state('');
	let speciesSearch = $state('');

	const selectedSpecies   = $derived((sys?.species ?? []).find((s: any) => s.id === speciesId) ?? null);
	const filteredSpecies   = $derived(
		(sys?.species ?? []).filter((s: any) => !speciesSearch || s.name.toLowerCase().includes(speciesSearch.toLowerCase()))
	);
	function randomSpecies() {
		const pool = filteredSpecies.length ? filteredSpecies : (sys?.species ?? []);
		if (pool.length) speciesId = pool[Math.floor(Math.random() * pool.length)].id;
	}

	// ── Step 3: Background ───────────────────────────────────────────────────
	let backgroundId     = $state('');
	let backgroundSearch = $state('');
	let bgFeatPick       = $state('');
	let sheetBg          = $state<any>(null); // mobile bottom sheet

	const selectedBackground  = $derived((sys?.backgrounds ?? []).find((b: any) => b.id === backgroundId) ?? null);
	const filteredBackgrounds = $derived(
		(sys?.backgrounds ?? []).filter((b: any) => !backgroundSearch || b.name.toLowerCase().includes(backgroundSearch.toLowerCase()))
	);
	const bgFeatOptions = $derived.by(() => {
		const bg = selectedBackground as any;
		if (!bg?.grantsFeatCategory) return [];
		const cat = bg.grantsFeatCategory.toLowerCase();
		return (sys?.feats ?? []).filter((f: any) =>
			f.isAvailable !== false &&
			(f.categories ?? '').split(',').map((s: string) => s.trim().toLowerCase()).includes(cat)
		);
	});
	$effect(() => { if (backgroundId) bgFeatPick = ''; });

	function openBgSheet(bg: any)    { sheetBg = bg; }
	function closeBgSheet()          { sheetBg = null; }
	function selectBg(id: string)    { backgroundId = id; closeBgSheet(); }
	function randomBackground() {
		const pool = filteredBackgrounds.length ? filteredBackgrounds : (sys?.backgrounds ?? []);
		if (pool.length) backgroundId = pool[Math.floor(Math.random() * pool.length)].id;
	}

	const bgFeatValid = $derived.by(() => {
		const bg = selectedBackground as any;
		if (!bg) return false;
		if (bg.grantsFeatId)       return true;
		if (bg.grantsFeatCategory) return !!bgFeatPick;
		return true;
	});

	// ── Step 4: Ability scores ────────────────────────────────────────────────
	const STATS = ['STRENGTH','DEXTERITY','CONSTITUTION','INTELLIGENCE','WISDOM','CHARISMA'] as const;
	const STAT_LABEL: Record<string,string> = { STRENGTH:'STR', DEXTERITY:'DEX', CONSTITUTION:'CON', INTELLIGENCE:'INT', WISDOM:'WIS', CHARISMA:'CHA' };
	const MIN_STAT = 8, MAX_STAT = 15, BUDGET = 27;
	const POINT_COSTS: Record<number,number> = { 8:0, 9:1, 10:2, 11:3, 12:4, 13:5, 14:7, 15:9 };

	let scores = $state<Record<string,number>>({ STRENGTH:8, DEXTERITY:8, CONSTITUTION:8, INTELLIGENCE:8, WISDOM:8, CHARISMA:8 });
	let rolled        = $state(false);
	let standardArray = $state(false);
	const SA_VALUES   = [8, 10, 12, 13, 14, 15] as const;
	let bonusGranted = $state(0);
	let bonus  = $state<Record<string,number>>({ STRENGTH:0, DEXTERITY:0, CONSTITUTION:0, INTELLIGENCE:0, WISDOM:0, CHARISMA:0 });

	const total      = $derived(Object.fromEntries(STATS.map(st => [st, scores[st] + bonus[st]])) as Record<string,number>);

	// Scores after applying ASI stat bumps — used in review and submitted to server
	const finalScores = $derived.by(() => {
		const s = { ...total };
		for (const c of asiChoices) {
			if (c.mode === 'stat') {
				if (c.stat1) s[c.stat1] = (s[c.stat1] ?? 0) + (c.amount1 || 0);
				if (c.stat2) s[c.stat2] = (s[c.stat2] ?? 0) + (c.amount2 || 0);
			} else if (c.mode === 'feat' && c.featId) {
				if (c.stat1 && c.amount1) s[c.stat1] = (s[c.stat1] ?? 0) + c.amount1;
			}
		}
		return s;
	});
	const spent      = $derived(STATS.reduce((s,st) => s + (POINT_COSTS[scores[st]] ?? 0), 0));
	const remaining  = $derived(BUDGET - spent);
	const bonusSpent = $derived(STATS.reduce((s,st) => s + bonus[st], 0));
	const bonusLeft  = $derived(bonusGranted - bonusSpent);

	function mod(n: number) { const m = Math.floor((n-10)/2); return m>=0?`+${m}`:`${m}`; }
	function canInc(st: string) {
		if (rolled) return total[st] < 20;
		const nx = scores[st]+1;
		if (nx > MAX_STAT) return false;
		return remaining >= (POINT_COSTS[nx] - POINT_COSTS[scores[st]]);
	}
	function canDec(st: string)      { return scores[st] > (rolled ? 3 : MIN_STAT); }
	function canBonusInc(st: string) { return bonusLeft > 0 && total[st] < 17; }
	function canBonusDec(st: string) { return bonus[st] > 0; }
	function inc(st: string)         { if (canInc(st))      scores = {...scores, [st]: scores[st]+1}; }
	function dec(st: string)         { if (canDec(st))      scores = {...scores, [st]: scores[st]-1}; }
	function bonusInc(st: string)    { if (canBonusInc(st)) bonus  = {...bonus,  [st]: bonus[st]+1}; }
	function bonusDec(st: string)    { if (canBonusDec(st)) bonus  = {...bonus,  [st]: bonus[st]-1}; }

	function rollScores() {
		const roll = () => { const d=[0,0,0,0].map(()=>Math.ceil(Math.random()*6)); d.sort((a,b)=>a-b); return d[1]+d[2]+d[3]; };
		const nx: Record<string,number> = {};
		for (const st of STATS) nx[st] = roll();
		scores = nx;
		bonus  = { STRENGTH:0, DEXTERITY:0, CONSTITUTION:0, INTELLIGENCE:0, WISDOM:0, CHARISMA:0 };
		rolled = true;
	}
	function resetPointBuy() {
		scores = { STRENGTH:8, DEXTERITY:8, CONSTITUTION:8, INTELLIGENCE:8, WISDOM:8, CHARISMA:8 };
		bonus  = { STRENGTH:0, DEXTERITY:0, CONSTITUTION:0, INTELLIGENCE:0, WISDOM:0, CHARISMA:0 };
		rolled = false; standardArray = false;
	}
	function useStandardArray() {
		scores = { STRENGTH:0, DEXTERITY:0, CONSTITUTION:0, INTELLIGENCE:0, WISDOM:0, CHARISMA:0 };
		bonus  = { STRENGTH:0, DEXTERITY:0, CONSTITUTION:0, INTELLIGENCE:0, WISDOM:0, CHARISMA:0 };
		rolled = false; standardArray = true;
	}
	const saAssigned    = $derived(standardArray ? STATS.filter(st => scores[st] > 0) : []);
	const saAvailable   = $derived(standardArray ? SA_VALUES.filter(v => !saAssigned.map(st => scores[st]).includes(v)) : []);
	const scoresValid   = $derived(
		rolled || (standardArray && saAssigned.length === 6) || (!rolled && !standardArray && remaining === 0)
	);

	// ── Step 5: Classes ───────────────────────────────────────────────────────
	let classAllocs  = $state<{ classId:string; subclassId:string; allocatedLevel:number }[]>([]);
	let classSearch  = $state('');
	let browseClassId = $state('');
	let browseSubId   = $state('');
	let browseLevel   = $state(1);
	let openFeats     = $state<Set<string>>(new Set());
	let sheetClass    = $state<any>(null);

	const totalLevel      = $derived(classAllocs.reduce((s,c) => s+(c.allocatedLevel||0), 0));
	const browseClass     = $derived((sys?.classes ?? []).find((c: any) => c.id === browseClassId) ?? null);
	const browseSub       = $derived((browseClass as any)?.subclasses?.find((s: any) => s.id === browseSubId) ?? null);
	const filteredClasses = $derived(
		(sys?.classes ?? []).filter((c: any) => c.isAvailable && (!classSearch || c.name.toLowerCase().includes(classSearch.toLowerCase())))
	);

	const featureTimeline = $derived.by(() => {
		const rows: { id:string; level:number; name:string; description:string|null; source:string; sourceType:'class'|'subclass' }[] = [];
		const bc = browseClass as any;
		if (!bc) return rows;
		for (const f of (bc.features ?? [])) {
			rows.push({ id:`cls-${f.id}`, level:f.requiredLevel, name:f.name, description:f.description??null, source:bc.name, sourceType:'class' });
		}
		const bs = browseSub as any;
		if (bs) {
			for (const f of (bs.features ?? [])) {
				rows.push({ id:`sub-${f.id}`, level:f.requiredLevel, name:f.name, description:f.description??null, source:bs.name, sourceType:'subclass' });
			}
		}
		return rows.sort((a,b) => a.level - b.level || a.name.localeCompare(b.name));
	});

	const sheetTimeline = $derived.by(() => {
		const sc = sheetClass as any;
		if (!sc) return [];
		const rows: any[] = [];
		for (const f of (sc.features ?? [])) rows.push({ id:`cls-${f.id}`, level:f.requiredLevel, name:f.name, description:f.description??null, source:sc.name, sourceType:'class' });
		return rows.sort((a: any,b: any) => a.level - b.level);
	});

	function toggleFeat(id: string) {
		const s = new Set(openFeats);
		s.has(id) ? s.delete(id) : s.add(id);
		openFeats = s;
	}

	function subclassesFor(classId: string, level: number) {
		const cls = (sys?.classes ?? []).find((c: any) => c.id === classId);
		if (!cls) return [];
		return (cls.subclasses ?? []).filter((s: any) => level >= (cls.subclassAvailableAtLevel ?? 3));
	}

	function selectBrowseClass(id: string) {
		browseClassId = id;
		browseSubId   = '';
		browseLevel   = 1;
		openFeats     = new Set();
	}
	function openClassSheet(cls: any) { sheetClass = cls; selectBrowseClass(cls.id); openFeats = new Set(); }
	function closeClassSheet()        { sheetClass = null; }

	function addBrowseClass() {
		const existing = classAllocs.findIndex(a => a.classId === browseClassId);
		if (existing >= 0) {
			classAllocs = classAllocs.map((a,i) => i === existing ? { ...a, subclassId: browseSubId, allocatedLevel: browseLevel } : a);
		} else {
			classAllocs = [...classAllocs, { classId: browseClassId, subclassId: browseSubId, allocatedLevel: browseLevel }];
		}
		browseClassId = '';
		browseSubId   = '';
		browseLevel   = 1;
	}
	function addSheetClass(id: string) {
		if (!classAllocs.find(a => a.classId === id)) {
			classAllocs = [...classAllocs, { classId: id, subclassId:'', allocatedLevel:1 }];
		}
		closeClassSheet();
	}
	function removeClass(i: number) { classAllocs = classAllocs.filter((_,j) => j!==i); }
	function randomClass() {
		const pool = (filteredClasses.length ? filteredClasses : (sys?.classes ?? []).filter((c: any) => c.isAvailable))
			.filter((c: any) => !classAllocs.find((a: any) => a.classId === c.id));
		if (!pool.length) return;
		const cls = pool[Math.floor(Math.random() * pool.length)];
		classAllocs = [...classAllocs, { classId: cls.id, subclassId:'', allocatedLevel:1 }];
	}
	const classesValid = $derived(totalLevel >= 1 && classAllocs.every(c => c.classId));

	// ── Step 6: ASI / Feats ──────────────────────────────────────────────────
	type AsiChoice = {
		sourceClassId:   string;
		sourceLevel:     number;
		type:            'asi' | 'epic_boon';
		canEpicBoon:     boolean;
		mode:            'stat' | 'feat' | null;
		stat1:           string;
		amount1:         number;
		stat2:           string;
		amount2:         number;
		featId:          string;
		sourceName:      string;
		featGrantedStat?: string;
		featAsiAmount?:  number;
		featAsiFixed?:   string;
	};

	const asiSlots = $derived.by(() => {
		const slots: Omit<AsiChoice, 'mode'|'stat1'|'amount1'|'stat2'|'amount2'|'featId'>[] = [];
		const level = classAllocs.reduce((s, c) => s + (c.allocatedLevel || 0), 0);
		for (const alloc of classAllocs) {
			const classRef    = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
			const subclassRef = classRef?.subclasses?.find((s: any) => s.id === alloc.subclassId);
			const classFeats  = (classRef?.features    ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel);
			const subFeats    = (subclassRef?.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel);
			for (const feat of [...classFeats, ...subFeats]) {
				const isAsi      = isAsiFeatureName(feat.name);
				const isEpicBoon = isEpicBoonFeatureName(feat.name);
				if (!isAsi && !isEpicBoon) continue;
				slots.push({
					sourceClassId: alloc.classId,
					sourceLevel:   feat.requiredLevel,
					type:          isEpicBoon ? 'epic_boon' : 'asi',
					canEpicBoon:   level >= 19,
					sourceName:    classRef?.name ?? alloc.classId,
				});
			}
		}
		return slots;
	});

	let asiChoices = $state<AsiChoice[]>([]);

	$effect(() => {
		const slots = asiSlots;
		asiChoices = slots.map((slot, i) => {
			const existing = untrack(() => asiChoices).find(
				(c: AsiChoice) => c.sourceClassId === slot.sourceClassId && c.sourceLevel === slot.sourceLevel && (c as any).slotIndex === i
			) ?? untrack(() => asiChoices).find(
				(c: AsiChoice) => c.sourceClassId === slot.sourceClassId && c.sourceLevel === slot.sourceLevel
			);
			return existing ?? {
				...slot,
				mode: null as null, stat1: '', amount1: 2, stat2: '', amount2: 0, featId: '', featGrantedStat: '',
			};
		});
	});

	const hasAsiStep = $derived(asiSlots.length > 0);
	let asiFeatSearch   = $state<string[]>([]);
	let asiFeatPreview  = $state<string[]>([]);   // feat being previewed (not yet committed)
	let bgFeatSearch    = $state('');
	$effect(() => { asiFeatSearch  = asiSlots.map(() => ''); });
	$effect(() => { asiFeatPreview = asiSlots.map((_, i) => untrack(() => asiFeatPreview)[i] ?? ''); });

	const STEPS = $derived(hasAsiStep
		? [...BASE_STEPS, ASI_STEP, SKILLS_STEP, REVIEW_STEP]
		: [...BASE_STEPS, SKILLS_STEP, REVIEW_STEP]
	);

	function next()            { if (canAdvance && step < STEPS.length - 1) step++; }
	function back()            { if (step > 0) step--; }
	function goTo(i: number)   { if (i <= step) step = i; }
	const nextLabel = $derived(step < STEPS.length - 1 ? STEPS[step + 1].label : '');

	const ASI_STEP_IDX    = $derived(hasAsiStep ? 5 : -1);
	const SKILLS_STEP_IDX = $derived(hasAsiStep ? 6 : 5);
	const REVIEW_STEP_IDX = $derived(hasAsiStep ? 7 : 6);

	// ── Step 4: Skills ──────────────────────────────────────────────────────
	let chosenClassSkills     = $state<string[]>([]);
	// skillChoicePool choices keyed by sourceId (featureId, backgroundId, traitId, featId)
	let chosenPoolSkills      = $state<Record<string, string[]>>({});
	let chosenSavePools = $state<Record<string, string[]>>({});

	const selectedClass0 = $derived((sys?.classes ?? []).find((c: any) => classAllocs[0]?.classId === c.id) ?? null);

	// Fixed always-granted skills from background grantsSkills string
	const backgroundFixedSkills = $derived(
		((selectedBackground as any)?.grantsSkills ?? '').split(',').map((s: string) => s.trim()).filter(Boolean) as string[]
	);
	// Background skill choice if any
	const backgroundChoiceCount = $derived((selectedBackground as any)?.skillChoiceCount ?? 0);
	const backgroundChoicePool  = $derived(
		((selectedBackground as any)?.skillChoicePool ?? '').split(',').map((s: string) => s.trim()).filter(Boolean) as string[]
	);

	// Fixed skills from species traits
	const speciesFixedSkills = $derived(
		(selectedSpecies?.traits ?? []).flatMap((t: any) =>
			((t.grantsSkills ?? '').split(',').map((s: string) => s.trim()).filter(Boolean))
		) as string[]
	);
	// Species trait choice pools (only traits with skillChoicePool and requiredLevel <= 1 for creation)
	const speciesTraitChoices = $derived(
		(selectedSpecies?.traits ?? []).filter((t: any) =>
			t.skillChoiceCount && t.skillChoicePool && (t.requiredLevel ?? 1) <= 1
		) as any[]
	);

	// All auto-granted (fixed) skills across all sources
	const autoGrantedSkills = $derived([...backgroundFixedSkills, ...speciesFixedSkills]);

	// Expertise (value 2.0) auto-granted from species traits
	const speciesAutoExpertise = $derived(
		(selectedSpecies?.traits ?? []).flatMap((t: any) =>
			((t.grantsExpertise ?? '').split(',').map((s: string) => s.trim()).filter(Boolean))
				.map((skill: string) => ({ skill, sourceName: `${selectedSpecies?.name}: ${t.name}` }))
		)
	);

	// Half-proficiency (value 0.5) auto-granted from species traits
	const speciesAutoHalfSkills = $derived(
		(selectedSpecies?.traits ?? []).flatMap((t: any) =>
			((t.grantsHalfSkills ?? '').split(',').map((s: string) => s.trim()).filter(Boolean).filter((s: string) => s !== '*'))
				.map((skill: string) => ({ skill, sourceName: `${selectedSpecies?.name}: ${t.name}` }))
		)
	);

	// Expertise from class features up to allocatedLevel (informational — applied at approval)
	const featureAutoExpertise = $derived(
		classAllocs.flatMap(alloc => {
			const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
			if (!cls) return [];
			return [
				...(cls.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel && f.grantsExpertise)
					.flatMap((f: any) => f.grantsExpertise.split(',').map((s: string) => s.trim()).filter(Boolean).filter((s: string) => s !== '*')
						.map((skill: string) => ({ skill, sourceName: `${cls.name}: ${f.name}` }))),
				...(cls.subclasses ?? []).filter((s: any) => s.id === alloc.subclassId)
					.flatMap((s: any) => (s.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel && f.grantsExpertise)
						.flatMap((f: any) => f.grantsExpertise.split(',').map((sk: string) => sk.trim()).filter(Boolean).filter((sk: string) => sk !== '*')
							.map((skill: string) => ({ skill, sourceName: `${s.name}: ${f.name}` }))))
			];
		})
	);

	// Half-prof from class features up to allocatedLevel (informational — applied at approval)
	const featureAutoHalfSkills = $derived(
		classAllocs.flatMap(alloc => {
			const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
			if (!cls) return [];
			return [
				...(cls.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel && f.grantsHalfSkills)
					.flatMap((f: any) => f.grantsHalfSkills === '*'
						? [{ skill: '*', sourceName: `${cls.name}: ${f.name}` }]
						: f.grantsHalfSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
							.map((skill: string) => ({ skill, sourceName: `${cls.name}: ${f.name}` }))),
				...(cls.subclasses ?? []).filter((s: any) => s.id === alloc.subclassId)
					.flatMap((s: any) => (s.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel && f.grantsHalfSkills)
						.flatMap((f: any) => f.grantsHalfSkills === '*'
							? [{ skill: '*', sourceName: `${s.name}: ${f.name}` }]
							: f.grantsHalfSkills.split(',').map((sk: string) => sk.trim()).filter(Boolean)
								.map((skill: string) => ({ skill, sourceName: `${s.name}: ${f.name}` }))))
			];
		})
	);

	// Class skill pool from skillOptions junction
	const classSkillPool      = $derived(((selectedClass0 as any)?.skillOptions ?? []).map((o: any) => o.skill) as string[]);
	const classSkillCount     = $derived((selectedClass0 as any)?.skillChoiceCount ?? 2);
	const classSavingThrows   = $derived(((selectedClass0 as any)?.savingThrows ?? []).map((s: any) => s.stat) as string[]);
	// Class skill pool — exclude auto-granted AND feat auto-granted skills
	const availableClassSkills = $derived(classSkillPool.filter((s: string) =>
		!autoGrantedSkills.includes(s) && !featAutoSkills.some((x: any) => x.skill === s)
	));

	// Class features with skill choices at startingLevel (from all allocated classes)
	const featureChoices = $derived(() => {
		const result: { sourceId: string; label: string; count: number; pool: string[]; sourceType: string }[] = [];
		for (const alloc of classAllocs) {
			const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
			if (!cls) continue;
			const allFeatures = [
				...(cls.features ?? []).map((f: any) => ({ ...f, sourceType: 'ClassFeature' })),
				...(cls.subclasses ?? []).filter((s: any) => s.id === alloc.subclassId)
					.flatMap((s: any) => (s.features ?? []).map((f: any) => ({ ...f, sourceType: 'SubclassFeature' }))),
			];
			for (const f of allFeatures) {
				if (f.requiredLevel <= alloc.allocatedLevel && f.skillChoiceCount && f.skillChoicePool) {
					const pool = f.skillChoicePool.split(',').map((s: string) => s.trim()).filter(Boolean);
					result.push({ sourceId: f.id, label: `${cls.name}: ${f.name} (level ${f.requiredLevel})`, count: f.skillChoiceCount, pool, sourceType: f.sourceType });
				}
			}
		}
		return result;
	});

	// All feat IDs granted — ASI feats + background feat (fixed or chosen)
	const allGrantedFeatIds = $derived.by(() => {
		const ids: { featId: string; sourceKey: string }[] = [];
		// Background fixed feat
		const bg = selectedBackground as any;
		if (bg?.grantsFeatId) ids.push({ featId: bg.grantsFeatId, sourceKey: 'bg-feat' });
		else if (bgFeatPick)  ids.push({ featId: bgFeatPick,      sourceKey: 'bg-feat' });
		// ASI step feats
		asiChoices.forEach((c, i) => { if (c.featId) ids.push({ featId: c.featId, sourceKey: `asi-feat-${i}` }); });
		return ids;
	});

	// Skills auto-granted by feats chosen in ASI step or background
	const featAutoSkills = $derived(
		allGrantedFeatIds.flatMap(({ featId }) => {
			const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
			if (!feat?.grantsSkills) return [];
			return feat.grantsSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
				.map((skill: string) => ({ skill, featName: feat.name }));
		})
	);

	// Skill choice pools from feats (ASI + background), keyed by sourceKey
	const featSkillChoices = $derived(
		allGrantedFeatIds.flatMap(({ featId, sourceKey }) => {
			const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
			if (!feat?.skillChoiceCount || !feat?.skillChoicePool) return [];
			const pool = feat.skillChoicePool.split(',').map((s: string) => s.trim()).filter(Boolean);
			return [{ sourceId: sourceKey, label: feat.name, count: feat.skillChoiceCount, pool }];
		})
	);

	// Saving throws auto-granted by feats (background feat + ASI feats)
	const featAutoSaves = $derived(
		allGrantedFeatIds.flatMap(({ featId }) => {
			const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
			if (!feat?.grantsSavingThrows) return [];
			return feat.grantsSavingThrows.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean)
				.map((stat: string) => ({ stat, sourceName: feat.name, sourceType: 'Feat', sourceId: feat.id }));
		})
	);

	// Saving throws auto-granted by class features up to allocatedLevel
	const featureAutoSaves = $derived(
		classAllocs.flatMap(alloc => {
			const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
			if (!cls) return [];
			// Exclude stats this class already grants via its base savingThrows junction —
			// prevents feature data duplicating what the class junction already covers.
			const thisClassBaseSaves = new Set((cls.savingThrows ?? []).map((s: any) => s.stat as string));
			const allFeatures = [
				...(cls.features ?? []).map((f: any) => ({ ...f, sourceName: cls.name, sourceType: 'ClassFeature' })),
				...(cls.subclasses ?? []).filter((s: any) => s.id === alloc.subclassId)
					.flatMap((s: any) => (s.features ?? []).map((f: any) => ({ ...f, sourceName: s.name, sourceType: 'SubclassFeature' }))),
			];
			return allFeatures
				.filter((f: any) => f.requiredLevel <= alloc.allocatedLevel && f.grantsSavingThrows)
				.flatMap((f: any) =>
					f.grantsSavingThrows.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean)
						.filter((stat: string) => !thisClassBaseSaves.has(stat)) // skip if already in class junction
						.map((stat: string) => ({ stat, sourceName: `${f.sourceName}: ${f.name}`, sourceType: f.sourceType, sourceId: f.id }))
				);
		})
	);

	// All extra saving throw grants (feats + features) — deduplicated, excluding class saves
	const extraSavingThrows = $derived(
		[...featAutoSaves, ...featureAutoSaves]
			.filter(({ stat }, i, arr) =>
				arr.findIndex(x => x.stat === stat) === i &&
				!classSavingThrows.includes(stat)
			)
	);

	// Flat set of ALL currently granted skills (auto + chosen) for deduplication
	const allGrantedSkillsSet = $derived(new Set([
		...autoGrantedSkills,
		...featAutoSkills.map((x: any) => x.skill),
		...chosenClassSkills,
		...Object.values(chosenPoolSkills).flat(),
	]));

	// Returns true if a skill is already granted from any source OTHER than the given sourceId
	function isTakenElsewhere(skill: string, excludeSourceId: string): boolean {
		if (autoGrantedSkills.includes(skill)) return true;
		if (featAutoSkills.some((x: any) => x.skill === skill)) return true;
		// For non-class pickers: also exclude class chosen
		if (excludeSourceId !== '__class__' && chosenClassSkills.includes(skill)) return true;
		// Check all OTHER pools
		for (const [k, v] of Object.entries(chosenPoolSkills)) {
			if (k !== excludeSourceId && v.includes(skill)) return true;
		}
		return false;
	}

	// Saving throw choice pools from all grant sources
	const featSaveChoices = $derived(
		allGrantedFeatIds.flatMap(({ featId, sourceKey }) => {
			const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
			if (!feat?.savingThrowChoiceCount || !feat?.savingThrowChoicePool) return [];
			const pool = feat.savingThrowChoicePool.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
			// poolKey is used for chosenSavePools state; sourceId is the feat UUID written to the DB
			return [{ sourceId: `${sourceKey}-saves`, sourceDbId: feat.id, sourceType: 'Feat', label: feat.name, count: feat.savingThrowChoiceCount, pool }];
		})
	);

	const featureSaveChoices = $derived(
		classAllocs.flatMap(alloc => {
			const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
			if (!cls) return [];
			const allFeatures = [
				...(cls.features ?? []).map((f: any) => ({ ...f, sourceName: cls.name, sourceType: 'ClassFeature' })),
				...(cls.subclasses ?? []).filter((s: any) => s.id === alloc.subclassId)
					.flatMap((s: any) => (s.features ?? []).map((f: any) => ({ ...f, sourceName: s.name, sourceType: 'SubclassFeature' }))),
			];
			return allFeatures
				.filter((f: any) => f.requiredLevel <= alloc.allocatedLevel && f.savingThrowChoiceCount && f.savingThrowChoicePool)
				.map((f: any) => ({
					sourceId:   `${f.id}-saves`,  // pool tracking key
					sourceDbId: f.id,             // actual feature UUID written to DB
					label: `${f.sourceName}: ${f.name} (level ${f.requiredLevel})`,
					count: f.savingThrowChoiceCount,
					pool: f.savingThrowChoicePool.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean),
					sourceType: f.sourceType,
				}));
		})
	);

	const bgSaveChoices = $derived.by(() => {
		const bg = selectedBackground as any;
		if (!bg?.savingThrowChoiceCount || !bg?.savingThrowChoicePool) return [];
		const pool = bg.savingThrowChoicePool.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
		return [{ sourceId: 'bg-saves', sourceDbId: (selectedBackground as any)?.id ?? null, sourceType: 'Background', label: selectedBackground?.name ?? 'Background', count: bg.savingThrowChoiceCount, pool }];
	});

	const speciesSaveChoices = $derived(
		(selectedSpecies?.traits ?? []).filter((t: any) =>
			t.savingThrowChoiceCount && t.savingThrowChoicePool && (t.requiredLevel ?? 1) <= 1
		).map((t: any) => ({
			sourceId:   `${t.id}-saves`,
			sourceDbId: t.id,
			sourceType: 'SpeciesTrait',
			label: `${selectedSpecies?.name}: ${t.name}`,
			count: t.savingThrowChoiceCount,
			pool: t.savingThrowChoicePool.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean),
		}))
	);

	// All saving throw choice pools combined
	const allSaveChoices = $derived([...bgSaveChoices, ...speciesSaveChoices, ...featureSaveChoices, ...featSaveChoices]);

	// ── Tool grants ───────────────────────────────────────────────────────────
	const autoGrantedTools = $derived(() => {
		const tools: { tool: string; sourceType: string; sourceId: string | null }[] = [];
		const bg = selectedBackground as any;
		// Background fixed tools
		if (bg?.grantsTools) {
			for (const t of bg.grantsTools.split(',').map((s: string) => s.trim()).filter(Boolean))
				tools.push({ tool: t, sourceType: 'Background', sourceId: bg.id ?? null });
		}
		// Species trait fixed tools
		for (const t of (selectedSpecies?.traits ?? [])) {
			if ((t as any).grantsTools) {
				for (const tool of (t as any).grantsTools.split(',').map((s: string) => s.trim()).filter(Boolean))
					tools.push({ tool, sourceType: 'SpeciesTrait', sourceId: t.id });
			}
		}
		// Feat fixed tools
		for (const { featId } of allGrantedFeatIds) {
			const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
			if (feat?.grantsTools) {
				for (const tool of feat.grantsTools.split(',').map((s: string) => s.trim()).filter(Boolean))
					tools.push({ tool, sourceType: 'Feat', sourceId: feat.id });
			}
		}
		// Feature fixed tools (all classes)
		for (const alloc of classAllocs) {
			const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
			if (!cls) continue;
			const allFeatures = [
				...(cls.features ?? []).map((f: any) => ({ ...f, sourceType: 'ClassFeature' })),
				...(cls.subclasses ?? []).filter((s: any) => s.id === alloc.subclassId)
					.flatMap((s: any) => (s.features ?? []).map((f: any) => ({ ...f, sourceType: 'SubclassFeature' }))),
			];
			for (const f of allFeatures.filter((f: any) => f.requiredLevel <= alloc.allocatedLevel && f.grantsTools)) {
				for (const tool of f.grantsTools.split(',').map((s: string) => s.trim()).filter(Boolean))
					tools.push({ tool, sourceType: f.sourceType, sourceId: f.id });
			}
		}
		return tools;
	});

	// Tool choice pools (background + species traits + feats + features)
	const allToolChoices = $derived((() => {
		const pools: { sourceId: string; sourceDbId: string | null; sourceType: string; label: string; count: number; pool: string[] }[] = [];
		const bg = selectedBackground as any;
		if (bg?.toolChoiceCount && bg?.toolChoicePool) {
			pools.push({ sourceId: 'bg-tools', sourceDbId: bg.id, sourceType: 'Background', label: bg.name ?? 'Background', count: bg.toolChoiceCount, pool: bg.toolChoicePool.split(',').map((s: string) => s.trim()).filter(Boolean) });
		}
		for (const t of (selectedSpecies?.traits ?? [])) {
			if ((t as any).toolChoiceCount && (t as any).toolChoicePool)
				pools.push({ sourceId: `${t.id}-tools`, sourceDbId: t.id, sourceType: 'SpeciesTrait', label: t.name, count: (t as any).toolChoiceCount, pool: (t as any).toolChoicePool.split(',').map((s: string) => s.trim()).filter(Boolean) });
		}
		for (const { featId } of allGrantedFeatIds) {
			const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
			if (feat?.toolChoiceCount && feat?.toolChoicePool)
				pools.push({ sourceId: `${featId}-tools`, sourceDbId: feat.id, sourceType: 'Feat', label: `Feat: ${feat.name}`, count: feat.toolChoiceCount, pool: feat.toolChoicePool.split(',').map((s: string) => s.trim()).filter(Boolean) });
		}
		return pools;
	})());

	// ── Language grants ────────────────────────────────────────────────────────
	const autoGrantedLanguages = $derived(() => {
		const langs: { language: string; sourceType: string; sourceId: string | null }[] = [];
		const bg = selectedBackground as any;
		if (bg?.grantsLanguages) {
			for (const l of bg.grantsLanguages.split(',').map((s: string) => s.trim()).filter(Boolean))
				langs.push({ language: l, sourceType: 'Background', sourceId: bg.id ?? null });
		}
		for (const t of (selectedSpecies?.traits ?? [])) {
			if ((t as any).grantsLanguages) {
				for (const l of (t as any).grantsLanguages.split(',').map((s: string) => s.trim()).filter(Boolean))
					langs.push({ language: l, sourceType: 'SpeciesTrait', sourceId: t.id });
			}
		}
		for (const { featId } of allGrantedFeatIds) {
			const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
			if (feat?.grantsLanguages) {
				for (const l of feat.grantsLanguages.split(',').map((s: string) => s.trim()).filter(Boolean))
					langs.push({ language: l, sourceType: 'Feat', sourceId: feat.id });
			}
		}
		return langs;
	});

	const allLanguageChoices = $derived((() => {
		const pools: { sourceId: string; sourceDbId: string | null; sourceType: string; label: string; count: number; pool: string[] }[] = [];
		const bg = selectedBackground as any;
		if (bg?.languageChoiceCount && bg?.languageChoicePool)
			pools.push({ sourceId: 'bg-langs', sourceDbId: bg.id, sourceType: 'Background', label: bg.name ?? 'Background', count: bg.languageChoiceCount, pool: bg.languageChoicePool.split(',').map((s: string) => s.trim()).filter(Boolean) });
		for (const t of (selectedSpecies?.traits ?? [])) {
			if ((t as any).languageChoiceCount && (t as any).languageChoicePool)
				pools.push({ sourceId: `${t.id}-langs`, sourceDbId: t.id, sourceType: 'SpeciesTrait', label: t.name, count: (t as any).languageChoiceCount, pool: (t as any).languageChoicePool.split(',').map((s: string) => s.trim()).filter(Boolean) });
		}
		for (const { featId } of allGrantedFeatIds) {
			const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
			if (feat?.languageChoiceCount && feat?.languageChoicePool)
				pools.push({ sourceId: `${featId}-langs`, sourceDbId: feat.id, sourceType: 'Feat', label: `Feat: ${feat.name}`, count: feat.languageChoiceCount, pool: feat.languageChoicePool.split(',').map((s: string) => s.trim()).filter(Boolean) });
		}
		return pools;
	})());

	// ── Size choice — from species traits ────────────────────────────────────
	const sizeChoiceOptions = $derived(() => {
		const pool: string[] = [];
		for (const t of (selectedSpecies?.traits ?? [])) {
			if ((t as any).sizeChoices) {
				for (const s of (t as any).sizeChoices.split(',').map((x: string) => x.trim()).filter(Boolean))
					if (!pool.includes(s)) pool.push(s);
			}
		}
		return pool;
	});
	const traitFixedSize = $derived(
		(selectedSpecies?.traits ?? []).map((t: any) => t.size).find((s: any) => s) ?? null
	);
	let chosenSize: string = $state('');

	// ── Damage modifiers (auto-granted only — no choice pools for these) ───────
	const autoGrantedDamageModifiers = $derived(() => {
		const mods: { modifierType: string; damageType: string; sourceType: string; sourceId: string | null }[] = [];
		const addMods = (source: any, sourceType: string, sourceId: string | null) => {
			for (const t of (source?.grantsResistances ?? '').split(',').map((s: string) => s.trim()).filter(Boolean))
				mods.push({ modifierType: 'RESISTANCE', damageType: t, sourceType, sourceId });
			for (const t of (source?.grantsImmunities ?? '').split(',').map((s: string) => s.trim()).filter(Boolean))
				mods.push({ modifierType: 'IMMUNITY', damageType: t, sourceType, sourceId });
			for (const t of (source?.grantsVulnerabilities ?? '').split(',').map((s: string) => s.trim()).filter(Boolean))
				mods.push({ modifierType: 'VULNERABILITY', damageType: t, sourceType, sourceId });
		};
		addMods(selectedBackground, 'Background', (selectedBackground as any)?.id ?? null);
		for (const t of (selectedSpecies?.traits ?? [])) addMods(t, 'SpeciesTrait', t.id);
		for (const { featId } of allGrantedFeatIds) {
			const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
			if (feat) addMods(feat, 'Feat', feat.id);
		}
		for (const alloc of classAllocs) {
			const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
			if (!cls) continue;
			const allFeatures = [
				...(cls.features ?? []).map((f: any) => ({ ...f, sourceType: 'ClassFeature' })),
				...(cls.subclasses ?? []).filter((s: any) => s.id === alloc.subclassId)
					.flatMap((s: any) => (s.features ?? []).map((f: any) => ({ ...f, sourceType: 'SubclassFeature' }))),
			];
			for (const f of allFeatures.filter((f: any) => f.requiredLevel <= alloc.allocatedLevel))
				addMods(f, f.sourceType, f.id);
		}
		return mods;
	});

	// ── Speed bonuses from features/background/feats ─────────────────────────
	const autoGrantedSpeeds = $derived(() => {
		const speedMap = new Map<string, number>();
		const parse = (raw: string | null | undefined) => {
			if (!raw) return;
			for (const entry of raw.split(',').map((s: string) => s.trim()).filter(Boolean)) {
				const [mt, val] = entry.split(':').map((s: string) => s.trim());
				const speed = parseInt(val ?? '0', 10);
				if (mt && speed > 0) speedMap.set(mt.toUpperCase(), (speedMap.get(mt.toUpperCase()) ?? 0) + speed);
			}
		};
		const bg = selectedBackground as any;
		parse(bg?.grantsSpeed);
		for (const { featId } of allGrantedFeatIds) {
			const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
			if (feat) parse((feat as any).grantsSpeed);
		}
		for (const alloc of classAllocs) {
			const classRef = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
			const features = [
				...((classRef?.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel)),
				...((classRef?.subclasses?.find((s: any) => s.id === alloc.subclassId)?.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel)),
			];
			for (const f of features) parse((f as any).grantsSpeed);
		}
		return [...speedMap.entries()].map(([movementType, speed]) => ({ movementType, speed }));
	});

	const autoGrantedSenses = $derived(() => {
		const senses: string[] = [];
		const add = (raw: string | null | undefined) => { if (raw?.trim()) senses.push(raw.trim()); };
		const bg = selectedBackground as any;
		add(bg?.grantsSenses);
		for (const { featId } of allGrantedFeatIds) {
			const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
			if (feat) add((feat as any).grantsSenses);
		}
		for (const alloc of classAllocs) {
			const classRef = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
			const features = [
				...((classRef?.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel)),
				...((classRef?.subclasses?.find((s: any) => s.id === alloc.subclassId)?.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel)),
			];
			for (const f of features) add((f as any).grantsSenses);
		}
		return senses;
	});

	// ── Innate spells ────────────────────────────────────────────────────────
	// Groups by source — raw string submitted to server which parses, looks up
	// spellIds, and filters by character level.
	const autoGrantedInnateSpellSources = $derived(() => {
		const sources: { raw: string; sourceType: string; sourceId: string }[] = [];
		const bg = selectedBackground as any;
		if (bg?.grantsInnateSpells) sources.push({ raw: bg.grantsInnateSpells, sourceType: 'Background', sourceId: bg.id ?? '' });
		for (const t of (selectedSpecies?.traits ?? [])) {
			if ((t as any).grantsInnateSpells) sources.push({ raw: (t as any).grantsInnateSpells, sourceType: 'SpeciesTrait', sourceId: t.id });
		}
		for (const { featId } of allGrantedFeatIds) {
			const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
			if (feat?.grantsInnateSpells) sources.push({ raw: feat.grantsInnateSpells, sourceType: 'Feat', sourceId: feat.id });
		}
		return sources;
	});

	// Expanded for display in summary/review — format: SpellName:minCharLevel:usesPerDay[:canUseSlots]
	const autoGrantedInnateSpells = $derived(() => {
		const spells: { name: string; minCharLevel: number; usesPerDay: number | null; sourceType: string; sourceId: string }[] = [];
		for (const src of autoGrantedInnateSpellSources()) {
			for (const entry of src.raw.split(',').map((s: string) => s.trim()).filter(Boolean)) {
				const parts        = entry.split(':').map((s: string) => s.trim());
				const name         = parts[0];
				const minCharLevel = parseInt(parts[1] ?? '1', 10) || 1;
				const usesRaw      = parseInt(parts[2] ?? '0', 10);
				const usesPerDay   = usesRaw === 0 ? null : usesRaw;
				spells.push({ name, minCharLevel, usesPerDay, sourceType: src.sourceType, sourceId: src.sourceId });
			}
		}
		return spells;
	});

	// Tool/language pool choices state (keyed by sourceId)
	let chosenToolPools:     Record<string, string[]> = $state({});
	let chosenLanguagePools: Record<string, string[]> = $state({});

	// Already-granted saving throws (class + auto) to exclude from choice pools
	const allGrantedSavesSet = $derived(new Set([
		...classSavingThrows,
		...extraSavingThrows.map((x: any) => x.stat),
		...Object.values(chosenPoolSkills).flat().filter(s => s.startsWith('SAVE:')),  // keyed save choices
	]));

	// Track chosen save pools separately (keyed by sourceId like skill pools)
	// Using chosenPoolSkills won't work since we need to distinguish saves from skills
	// Use a separate state for save pool choices
	const allPoolsSatisfied = $derived(
		featureChoices().every(fc => (chosenPoolSkills[fc.sourceId] ?? []).length >= Math.min(fc.count, fc.pool.length)) &&
		(backgroundChoiceCount === 0 || (chosenPoolSkills[backgroundId ?? ''] ?? []).length >= Math.min(backgroundChoiceCount, backgroundChoicePool.length)) &&
		speciesTraitChoices.every((t: any) => (chosenPoolSkills[t.id] ?? []).length >= Math.min(t.skillChoiceCount, t.skillChoicePool.split(',').filter(Boolean).length)) &&
		featSkillChoices.every(fc => (chosenPoolSkills[fc.sourceId] ?? []).length >= Math.min(fc.count, fc.pool.length)) &&
		allSaveChoices.every(sc => (chosenSavePools[sc.sourceId] ?? []).length >= Math.min(sc.count, sc.pool.length)) &&
		allToolChoices.every(tc => (chosenToolPools[tc.sourceId] ?? []).length >= Math.min(tc.count, tc.pool.length)) &&
		allLanguageChoices.every(lc => (chosenLanguagePools[lc.sourceId] ?? []).length >= Math.min(lc.count, lc.pool.length)) &&
		(sizeChoiceOptions().length === 0 || !!chosenSize || !!traitFixedSize)
	);

	$effect(() => {
		const available = availableClassSkills;
		untrack(() => {
			chosenClassSkills = chosenClassSkills.filter((s: string) => available.includes(s));
		});
	});

	function togglePoolSkill(sourceId: string, skill: string, maxCount: number) {
		const current = chosenPoolSkills[sourceId] ?? [];
		if (current.includes(skill)) {
			chosenPoolSkills = { ...chosenPoolSkills, [sourceId]: current.filter(s => s !== skill) };
		} else if (current.length < maxCount) {
			chosenPoolSkills = { ...chosenPoolSkills, [sourceId]: [...current, skill] };
		}
	}

	// Regular feats — excludes epic boon feats (restricted to epic boon slots)
	const availableFeats = $derived((sys?.feats ?? []).filter((f: any) => f.isAvailable !== false && !f.isEpicBoon));

	// Epic Boon feats — only for epic_boon slots or canEpicBoon ASI slots
	const epicBoonFeats = $derived((sys?.feats ?? []).filter((f: any) => f.isAvailable !== false && f.isEpicBoon));

	// Feats for a given choice — epic boon slots and level 19+ ASI slots show all feats
	function featsForChoice(choice: AsiChoice) {
		if (choice.type === 'epic_boon') return epicBoonFeats;
		if (choice.canEpicBoon) return (sys?.feats ?? []).filter((f: any) => f.isAvailable !== false && !isAsiFeatureName(f.name));
		return availableFeats;
	}

	const asiFeatId = $derived(
		(sys?.feats ?? []).find((f: any) => isAsiFeatureName(f.name))?.id ?? ''
	);

	const asiValid = $derived(
		asiChoices.every(c => {
			if (c.type === 'epic_boon') return !!c.featId;
			if (c.mode === 'feat') {
				if (!c.featId) return false;
				const featDef = (sys?.feats ?? []).find((f: any) => f.id === c.featId);
				if (featDef?.asiAmount && !featDef.asiStatFixed && !c.featGrantedStat) return false;
				return true;
			}
			if (c.mode === 'stat') return !!c.stat1 && c.amount1 > 0;
			return false;
		})
	);

	// ── sessionStorage persistence ───────────────────────────────────────────
	const STORAGE_KEY = 'wizard_dnd5e';

	function saveState() {
		if (!browser) return;
		try {
			sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
				step, name, avatarUrl, portraitUrl, worldId,
				speciesId, backgroundId, bgFeatPick,
				scores, rolled, standardArray, bonusGranted, bonus,
				classAllocs, asiChoices,
				chosenClassSkills, chosenPoolSkills, chosenSavePools,
			}));
		} catch (_) {}
	}

	function restoreState() {
		if (!browser) return;
		try {
			const raw = sessionStorage.getItem(STORAGE_KEY);
			if (!raw) return;
			const s = JSON.parse(raw);
			if (s.step         !== undefined) step          = s.step;
			if (s.name         !== undefined) name          = s.name;
			if (s.avatarUrl    !== undefined) avatarUrl     = s.avatarUrl;
			if (s.portraitUrl  !== undefined) portraitUrl   = s.portraitUrl;
			if (s.worldId      !== undefined) worldId       = s.worldId;
			if (s.speciesId    !== undefined) speciesId     = s.speciesId;
			if (s.backgroundId !== undefined) backgroundId  = s.backgroundId;
			if (s.bgFeatPick   !== undefined) bgFeatPick    = s.bgFeatPick;
			if (s.scores       !== undefined) scores        = s.scores;
			if (s.rolled       !== undefined) rolled        = s.rolled;
			if (s.standardArray!== undefined) standardArray = s.standardArray;
			if (s.bonusGranted !== undefined) bonusGranted  = s.bonusGranted;
			if (s.bonus        !== undefined) bonus         = s.bonus;
			if (s.classAllocs  !== undefined) classAllocs   = s.classAllocs;
			if (s.chosenClassSkills !== undefined) chosenClassSkills = s.chosenClassSkills;
			if (s.chosenPoolSkills  !== undefined) chosenPoolSkills  = s.chosenPoolSkills;
			if (s.chosenSavePools   !== undefined) chosenSavePools   = s.chosenSavePools;
			if (s.asiChoices   !== undefined) {
				asiChoices = s.asiChoices;
				// Backfill stat1/amount1 for feat-mode choices restored from old sessions
				for (const c of asiChoices) {
					if (c.mode === 'feat' && c.featId && !c.stat1) {
						const stat = c.featAsiFixed || c.featGrantedStat || '';
						const amt  = c.featAsiAmount ?? 0;
						if (stat && amt) { c.stat1 = stat; c.amount1 = amt; }
					}
				}
			}
		} catch (_) {}
	}

	function clearState() {
		if (!browser) return;
		try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
	}

	$effect(() => {
		// Run once on mount. untrack() ensures the state writes don't
		// re-trigger this or any other effect.
		untrack(() => { restoreState(); });
	});
	// After sys.feats loads, backfill stat1/amount1 for restored feat-mode choices.
	// untrack() prevents the write to c.stat1 from re-triggering this effect.
	$effect(() => {
		const feats = sys?.feats;
		if (!feats?.length) return;
		untrack(() => {
			for (const c of asiChoices) {
				if (c.mode === 'feat' && c.featId && !c.stat1) {
					const featRef = feats.find((f: any) => f.id === c.featId);
					if (!featRef?.asiAmount) continue;
					const stat = featRef.asiStatFixed || c.featGrantedStat || c.featAsiFixed || '';
					if (stat) { c.stat1 = stat; c.amount1 = featRef.asiAmount; }
				}
			}
		});
	});
	$effect(() => {
		// Track top-level state signals only. untrack() for the actual save
		// prevents deep property reads on asiChoices items from creating loops.
		void [step, name, avatarUrl, portraitUrl, worldId, speciesId, backgroundId,
			bgFeatPick, scores, rolled, bonusGranted, bonus, classAllocs, asiChoices,
			chosenClassSkills, chosenPoolSkills, chosenSavePools];
		untrack(() => saveState());
	});

	// ── Validation ───────────────────────────────────────────────────────────
	const canAdvance = $derived.by(() => {
		switch (step) {
			case 0: return name.trim().length > 0;
			case 1: return !!speciesId;
			case 2: return !!backgroundId && bgFeatValid;
			case 3: return scoresValid;
			case 4: return classesValid;
			case 5: return hasAsiStep ? asiValid : (chosenClassSkills.length === Math.min(classSkillCount, availableClassSkills.length) && allPoolsSatisfied);
			case 6: return !hasAsiStep || (chosenClassSkills.length === Math.min(classSkillCount, availableClassSkills.length) && allPoolsSatisfied);
			default: return true;
		}
	});
	const canSubmit = $derived(
		name.trim().length > 0 && !!speciesId && !!backgroundId && bgFeatValid &&
		scoresValid && classesValid && (!hasAsiStep || asiValid) &&
		chosenClassSkills.length === Math.min(classSkillCount, availableClassSkills.length) && allPoolsSatisfied
	);
</script>

<div class="page">

	<!-- ── Page header ──────────────────────────────────────────────── -->
	<div class="page__header">
		<div>
			<h2 class="page__title">New Character</h2>
			<p style="margin:0;font-size:0.8125rem;color:var(--text-muted);">D&D 5e · {data.slotInfo.available} slot{data.slotInfo.available===1?'':'s'} remaining</p>
		</div>
		<div style="display:flex;gap:0.5rem;align-items:center;">
			<button class="btn btn-ghost btn-sm" onclick={() => { clearState(); goto('/characters'); }}>✕ Cancel</button>
		</div>
	</div>

	<!-- ── Step ribbon ──────────────────────────────────────────────── -->
	<div class="ribbon">
		{#each STEPS as s, i}
			<button class="ribbon__step"
				class:ribbon__step--active={i === step}
				class:ribbon__step--done={i < step}
				class:ribbon__step--clickable={i < step}
				onclick={() => goTo(i)} disabled={i > step}>
				<span class="ribbon__num">{i < step ? '✓' : `Step ${i+1}`}</span>
				<span class="ribbon__label">{s.label}</span>
			</button>
		{/each}
	</div>

	{#if form?.message}<div class="form-error" style="margin-bottom:1rem;">{(form as any).message}</div>{/if}

	<!-- ══════════════════════════════════════════════════════════════
	     STEP 0: Identity
	════════════════════════════════════════════════════════════════ -->
	{#if step === 0}
		<div class="wizard-identity-grid">

			<div class="card">
				<div class="page__header" style="margin-bottom:1rem;">
					<h3 class="section-title" style="margin:0;">Your character</h3>
					<button class="btn btn-ghost btn-sm" onclick={randomName}>🎲 Name</button>
				</div>

				<div class="field">
					<label class="label" for="char-name">Name</label>
					<input id="char-name" type="text" class="input" bind:value={name} placeholder="Character name" />
				</div>

				<div class="field">
					<label class="label" for="char-world">World <span class="table__muted">(optional)</span></label>
					<select id="char-world" class="input input--select" bind:value={worldId}>
						<option value="">Global — no world</option>
						{#each data.activeWorlds as w}<option value={w.id}>{w.name}</option>{/each}
					</select>
				</div>

				<div style="border-top:1px solid var(--border-muted);margin-top:1rem;padding-top:1rem;">
					<p class="wiz-pool__label" style="margin-bottom:0.625rem;">Artwork <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-muted);">(optional)</span></p>
					<div class="field">
						<label class="label" for="char-avatar">Avatar URL</label>
						<input id="char-avatar" type="url" class="input" bind:value={avatarUrl} placeholder="https://…" />
					</div>
					<div class="field">
						<label class="label" for="char-portrait">Portrait URL</label>
						<input id="char-portrait" type="url" class="input" bind:value={portraitUrl} placeholder="https://…" />
					</div>
				</div>
			</div>

			<!-- Preview card -->
			<div class="card" style="text-align:center;">
				<p class="wiz-pool__label" style="margin-bottom:0.75rem;">Preview</p>
				{#if avatarUrl}
					<img src={avatarUrl} alt={name}
						style="width:88px;height:88px;border-radius:50%;object-fit:cover;margin:0 auto 0.75rem;display:block;border:2px solid var(--border-accent);"
						onerror={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none';}} />
				{:else}
					<div style="width:88px;height:88px;border-radius:50%;background:var(--bg-overlay);border:2px solid var(--border-muted);display:flex;align-items:center;justify-content:center;margin:0 auto 0.75rem;font-size:2rem;">🧑</div>
				{/if}
				<p style="margin:0;font-size:1rem;font-weight:700;">{name||'Unnamed'}</p>
				{#if worldId}<p style="margin:0.25rem 0 0;font-size:0.8125rem;color:var(--text-muted);">{data.activeWorlds.find((w:any)=>w.id===worldId)?.name}</p>{/if}
				<p style="margin:0.875rem 0 0;font-size:0.75rem;color:var(--text-muted);line-height:1.5;">Species, class and background will appear here as you choose them.</p>
			</div>

		</div>

	<!-- ══════════════════════════════════════════════════════════════
	     STEP 1: Species
	════════════════════════════════════════════════════════════════ -->
	{:else if step === 1}
		<div class="wiz-browser">

			<!-- List -->
			<div class="wiz-browser__list">
				<div class="wiz-browser__search">
					<input type="text" placeholder="Search species…" bind:value={speciesSearch} />
					<button class="btn btn-ghost btn-sm" title="Random species" onclick={randomSpecies}>🎲</button>
				</div>
				<div class="wiz-browser__rows">
					{#each filteredSpecies as sp}
						<button class="wiz-row" class:wiz-row--selected={speciesId===sp.id}
							onclick={() => { speciesId = sp.id; }}>
							<div class="wiz-row__av">
								{#if (sp as any).avatarUrl}<img src={(sp as any).avatarUrl} alt={sp.name} />{:else}🧝{/if}
							</div>
							<div class="wiz-row__body">
								<p class="wiz-row__name">{sp.name}</p>
								<div class="wiz-row__sub">
									{#if sp.isLegacy}<span class="badge badge-warning" style="font-size:0.625rem;">Legacy</span>{/if}
									{#if sp.isSubrace}<span class="badge badge-muted" style="font-size:0.625rem;">Subrace</span>{/if}
								</div>
							</div>
							{#if speciesId===sp.id}<span class="wiz-row__check">✓</span>{/if}
						</button>
					{:else}
						<p class="table__empty" style="padding:1rem 0.75rem;">No species match.</p>
					{/each}
				</div>
			</div>

			<!-- Detail panel -->
			<div class="wiz-browser__panel">
				{#if selectedSpecies}
					<!-- Header -->
					<div style="display:flex;align-items:flex-start;gap:0.875rem;margin-bottom:0.875rem;">
						<div class="wiz-row__av" style="width:52px;height:52px;font-size:1.5rem;flex-shrink:0;">
							{#if (selectedSpecies as any).avatarUrl}<img src={(selectedSpecies as any).avatarUrl} alt={selectedSpecies.name} />{:else}🧝{/if}
						</div>
						<div>
							<h3 class="wiz-panel__title">{selectedSpecies.name}</h3>
							<div class="panel-badges" style="display:flex;gap:4px;flex-wrap:wrap;">
								{#if selectedSpecies.isLegacy}<span class="badge badge-warning">Legacy</span>{/if}
								{#if selectedSpecies.isSubrace}<span class="badge badge-muted">Subrace</span>{/if}
								{#each (selectedSpecies.traits ?? []) as t}
									{#if (t as any).size}<span class="badge badge-muted">{(t as any).size}</span>{/if}
									{#each ((t as any).speeds ?? []) as sp}<span class="badge badge-muted">{sp.movementType.charAt(0)+sp.movementType.slice(1).toLowerCase()} {sp.speed} ft</span>{/each}
									{#if (t as any).senses}<span class="badge badge-muted">👁 {(t as any).senses}</span>{/if}
								{/each}
							</div>
						</div>
					</div>

					{#if canViewDescriptions && selectedSpecies.description}
						<p class="wiz-panel__desc">{selectedSpecies.description}</p>
					{/if}

					<!-- Size choice picker -->
					{#if sizeChoiceOptions().length > 0}
						<div class="wiz-pool" style="margin-bottom:0.75rem;">
							<div class="wiz-pool__header">
								<span class="wiz-pool__label">Choose your size</span>
								<span class="wiz-pool__count" class:wiz-pool__count--done={!!chosenSize}>{chosenSize ? '1 / 1 ✓' : '0 / 1'}</span>
							</div>
							<div class="wiz-chip-group">
								{#each sizeChoiceOptions() as opt}
									<button class="wiz-chip" class:wiz-chip--chosen={chosenSize===opt}
										onclick={() => { chosenSize = opt; }}>{opt}</button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Traits -->
					{#if selectedSpecies.traits?.length}
						<p class="wiz-panel__label">Traits</p>
						<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:0.75rem;">
							{#each selectedSpecies.traits as t}
								<div class="trait-card" style="border-left:3px solid var(--border-accent);background:var(--bg-surface);border-radius:0 var(--radius-md) var(--radius-md) 0;padding:8px 10px;">
									<p style="margin:0 0 3px;font-size:0.8125rem;font-weight:700;color:var(--accent-light);">
										{t.name}{#if (t as any).requiredLevel > 1} <span style="font-weight:400;color:var(--text-muted);">(Lv {(t as any).requiredLevel})</span>{/if}
									</p>
									{#if canViewDescriptions && t.description}
										<p style="margin:0;font-size:0.8125rem;color:var(--text-secondary);line-height:1.5;">{t.description}</p>
									{:else if !canViewDescriptions}
										<p style="margin:0;font-size:0.8125rem;color:var(--text-muted);font-style:italic;">📖 Description not available — contact your DM.</p>
									{/if}
								</div>
							{/each}
						</div>
					{/if}

				{:else}
					<div class="wiz-browser__empty">
						<span style="font-size:2rem;">🧝</span>
						<p>Select a species to view details.</p>
					</div>
				{/if}
			</div>
		</div>

	<!-- ══════════════════════════════════════════════════════════════
	     STEP 2: Background
	════════════════════════════════════════════════════════════════ -->
	{:else if step === 2}
		<div class="wiz-browser">

			<!-- List -->
			<div class="wiz-browser__list">
				<div class="wiz-browser__search">
					<input type="text" placeholder="Search backgrounds…" bind:value={backgroundSearch} />
					<button class="btn btn-ghost btn-sm" title="Random background" onclick={randomBackground}>🎲</button>
				</div>
				<div class="wiz-browser__rows">
					{#each filteredBackgrounds as bg}
						<button class="wiz-row" class:wiz-row--selected={backgroundId===bg.id}
							onclick={() => { backgroundId = bg.id; }}>
							<div class="wiz-row__body">
								<p class="wiz-row__name">{bg.name}</p>
								<div class="wiz-row__sub">
									{#if (bg as any).grantsFeat}
										<span class="badge badge-accent" style="font-size:0.625rem;">🏅 {(bg as any).grantsFeat.name}</span>
									{:else if (bg as any).grantsFeatCategory}
										<span class="badge badge-accent" style="font-size:0.625rem;">{(bg as any).grantsFeatCategory} feat</span>
									{/if}
								</div>
							</div>
							{#if backgroundId===bg.id}<span class="wiz-row__check">✓</span>{/if}
						</button>
					{:else}
						<p class="table__empty" style="padding:1rem 0.75rem;">No backgrounds match.</p>
					{/each}
				</div>
			</div>

			<!-- Detail panel -->
			<div class="wiz-browser__panel">
				{#if selectedBackground}
					{@const bg = selectedBackground as any}
					<h3 class="wiz-panel__title">{bg.name}</h3>

					{#if bg.shortDescription}
						<p class="wiz-panel__desc">{bg.shortDescription}</p>
					{/if}

					<!-- Auto grants summary -->
					{#if bg.skillGrants?.length || bg.toolProficiencies || bg.languages || bg.grantsSkills || bg.grantsTools || bg.grantsLanguages}
						<div class="wiz-panel__section" style="margin-bottom:0.75rem;">
							<p class="wiz-panel__label" style="margin-bottom:6px;">Grants</p>
							<div style="display:flex;flex-direction:column;gap:4px;font-size:0.8125rem;color:var(--text-secondary);">
								{#if bg.skillGrants?.length}<span><strong>Skills:</strong> {bg.skillGrants.map((g: any) => SKILL_DISPLAY[g.skill] ?? g.skill).join(', ')}</span>{/if}
								{#if bg.grantsSkills}<span><strong>Skills:</strong> {bg.grantsSkills}</span>{/if}
								{#if bg.grantsTools}<span><strong>Tools:</strong> {bg.grantsTools}</span>{/if}
								{#if bg.grantsLanguages}<span><strong>Languages:</strong> {bg.grantsLanguages}</span>{/if}
							</div>
						</div>
					{/if}

					<!-- Fixed feat -->
					{#if bg.grantsFeatId && bg.grantsFeat}
						<div class="wiz-panel__section">
							<p class="wiz-panel__label" style="margin-bottom:6px;">Granted feat</p>
							<div style="border-left:3px solid var(--border-accent);background:var(--bg-surface);border-radius:0 var(--radius-md) var(--radius-md) 0;padding:8px 10px;">
								<p style="margin:0 0 3px;font-size:0.875rem;font-weight:700;color:var(--accent-light);">🏅 {bg.grantsFeat.name}</p>
								{#if canViewDescriptions && bg.grantsFeat.description}
									<p style="margin:0;font-size:0.8125rem;color:var(--text-secondary);line-height:1.5;">{bg.grantsFeat.description}</p>
								{:else if !canViewDescriptions}
									<p style="margin:0;font-size:0.8125rem;color:var(--text-muted);font-style:italic;">📖 Description not available — contact your DM.</p>
								{/if}
							</div>
						</div>

					<!-- Feat category pick — wiz-browser nested inline -->
					{:else if bg.grantsFeatCategory}
						<div class="wiz-panel__section">
							<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
								<p class="wiz-panel__label" style="color:var(--accent-light);">⚠ Choose a {bg.grantsFeatCategory} feat</p>
								{#if !bgFeatPick}<span style="font-size:0.75rem;color:var(--color-warning);">Required to continue</span>{/if}
							</div>
							<div class="wiz-browser wiz-browser--compact">
								<div class="wiz-browser__list">
									<div class="wiz-browser__search">
										<input type="text" placeholder="Search feats…" bind:value={bgFeatSearch} />
									</div>
									<div class="wiz-browser__rows">
										{#each bgFeatOptions.filter((f: any) => !bgFeatSearch || f.name.toLowerCase().includes(bgFeatSearch.toLowerCase())) as feat}
											<button class="wiz-row" class:wiz-row--selected={bgFeatPick===feat.id}
												onclick={() => { bgFeatPick = feat.id; }}>
												<div class="wiz-row__body">
													<p class="wiz-row__name">{feat.name}</p>
													{#if (feat as any).categories}<div class="wiz-row__sub"><span class="wiz-tag wiz-tag--origin">{bg.grantsFeatCategory}</span></div>{/if}
												</div>
												{#if bgFeatPick===feat.id}<span class="wiz-row__check">✓</span>{/if}
											</button>
										{/each}
									</div>
								</div>
								<div class="wiz-browser__panel">
									{#if bgFeatPick}
										{@const chosenFeat = bgFeatOptions.find((f: any) => f.id === bgFeatPick)}
										{#if chosenFeat}
											<h4 class="wiz-panel__title" style="font-size:0.9375rem;">{(chosenFeat as any).name}</h4>
											{#if canViewDescriptions && (chosenFeat as any).description}
												<p class="wiz-panel__desc">{(chosenFeat as any).description}</p>
											{:else if !canViewDescriptions}
												<p class="wiz-panel__desc" style="font-style:italic;color:var(--text-muted);">📖 Description not available — contact your DM.</p>
											{/if}
											<p style="font-size:0.75rem;color:var(--color-success);font-weight:600;">✓ Selected</p>
										{/if}
									{:else}
										<div class="wiz-browser__empty" style="min-height:80px;">
											<p>Select a feat to view details.</p>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/if}

				{:else}
					<div class="wiz-browser__empty">
						<span style="font-size:2rem;">📜</span>
						<p>Select a background to view details.</p>
					</div>
				{/if}
			</div>
		</div>

	<!-- ══════════════════════════════════════════════════════════════
	     STEP 3: Ability Scores
	════════════════════════════════════════════════════════════════ -->
	{:else if step === 3}
		<div style="display:flex;gap:1rem;align-items:flex-start;flex-wrap:wrap;">

			<div class="card" style="flex:1;min-width:0;">

				<!-- Method toggle -->
				<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
					<div class="wiz-toggle">
						<button class="wiz-toggle__btn" class:wiz-toggle__btn--active={!rolled&&!standardArray}
							onclick={resetPointBuy}>Point buy</button>
						<button class="wiz-toggle__btn" class:wiz-toggle__btn--active={standardArray}
							onclick={useStandardArray}>Standard array</button>
						<button class="wiz-toggle__btn" class:wiz-toggle__btn--active={rolled}
							onclick={rollScores}>🎲 Roll 4d6</button>
					</div>
					{#if !rolled && !standardArray}
						<div style="display:flex;align-items:center;gap:0.625rem;">
							<div style="height:5px;width:100px;background:var(--bg-overlay);border-radius:99px;overflow:hidden;">
								<div style="height:100%;width:{Math.min(((BUDGET-remaining)/BUDGET)*100,100)}%;background:var(--accent);border-radius:99px;transition:width var(--transition-base);"></div>
							</div>
							<span style="font-size:0.8125rem;font-weight:600;color:{remaining===0?'var(--color-success)':'var(--accent-light)'};">{remaining} left</span>
						</div>
					{/if}
				</div>

				<!-- Standard array assignment -->
				{#if standardArray}
					<div style="margin-bottom:0.875rem;background:var(--bg-overlay);border-radius:var(--radius-md);padding:0.75rem;">
						<p class="wiz-pool__label" style="margin-bottom:0.5rem;">Assign values: {SA_VALUES.join(', ')}</p>
						<div class="wizard-scores-grid" style="display:grid;grid-template-columns:repeat(6,1fr);gap:0.5rem;text-align:center;">
							{#each STATS as st}
								<div class="wizard-stat-box">
									<p class="wizard-stat-box__label">{STAT_LABEL[st]}</p>
									<select class="input input--select" style="font-size:0.8125rem;padding:0.25rem 0.375rem;text-align:center;"
										bind:value={scores[st]}
										onchange={(e) => { scores = {...scores, [st]: parseInt((e.target as HTMLSelectElement).value)}; }}>
										<option value={0}>—</option>
										{#each SA_VALUES as v}
											<option value={v} disabled={saAssigned.includes(st) ? false : saAssigned.map(s => scores[s]).includes(v)}>{v}</option>
										{/each}
									</select>
									<p class="wizard-stat-box__mod">{scores[st]>0?mod(total[st]):'—'}</p>
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<!-- Point buy / rolled stat boxes -->
					<div class="wizard-scores-grid">
						{#each STATS as st}
							<div class="wizard-stat-box">
								<p class="wizard-stat-box__label">{STAT_LABEL[st]}</p>
								<p class="wizard-stat-box__value">{total[st]}</p>
								<p class="wizard-stat-box__mod">{mod(total[st])}</p>
								{#if !rolled}
									<p class="wizard-stat-box__cost">Cost: {POINT_COSTS[scores[st]]??0}</p>
								{/if}
								<div style="display:flex;gap:4px;justify-content:center;margin-top:0.375rem;">
									<button class="wizard-ctrl-btn" disabled={!canDec(st)} onclick={() => dec(st)}>−</button>
									<button class="wizard-ctrl-btn" disabled={!canInc(st)} onclick={() => inc(st)}>+</button>
								</div>
								{#if bonusGranted > 0}
									<div style="display:flex;gap:4px;justify-content:center;margin-top:2px;">
										<button class="wizard-ctrl-btn" style="border-color:rgba(142,68,173,0.4);" disabled={!canBonusDec(st)} onclick={() => bonusDec(st)}>−</button>
										<button class="wizard-ctrl-btn" style="border-color:rgba(142,68,173,0.4);" disabled={!canBonusInc(st)} onclick={() => bonusInc(st)}>+</button>
									</div>
									{#if bonus[st]}<p style="font-size:0.625rem;color:#BF7EE0;margin:2px 0 0;text-align:center;">+{bonus[st]} bonus</p>{/if}
								{/if}
							</div>
						{/each}
					</div>
				{/if}

				{#if rolled}
					<button class="btn btn-ghost btn-sm" onclick={resetPointBuy}>↺ Reset to point buy</button>
				{/if}
			</div>

			<!-- Score summary sidebar -->
			<div class="card" style="width:180px;flex-shrink:0;">
				<p class="wiz-pool__label" style="margin-bottom:10px;">{name||'Character'}</p>
				{#if selectedSpecies}<p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 10px;">{selectedSpecies.name}</p>{/if}
				<div style="border-top:1px solid var(--border-muted);padding-top:10px;">
					<p class="wiz-pool__label" style="margin-bottom:6px;">Final scores</p>
					<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;font-size:0.75rem;">
						{#each STATS as st}
							<span style="color:var(--text-secondary);">{STAT_LABEL[st]} <strong style="color:var(--text-primary);">{total[st]}</strong></span>
						{/each}
					</div>
				</div>
			</div>
		</div>

	<!-- ══════════════════════════════════════════════════════════════
	     STEP 4: Classes
	════════════════════════════════════════════════════════════════ -->
	{:else if step === 4}
		<div style="display:flex;flex-direction:column;gap:1rem;">

			<!-- Your classes (allocated) -->
			{#if classAllocs.length}
				<div class="card" style="padding:0.875rem;">
					<p class="wiz-pool__label" style="margin-bottom:0.625rem;">Your classes</p>
					<div style="display:flex;flex-direction:column;gap:0.375rem;">
						{#each classAllocs as a, i}
							{@const cls = (sys?.classes ?? []).find((c: any) => c.id === a.classId)}
							{@const sub = cls?.subclasses?.find((s: any) => s.id === a.subclassId)}
							{@const subs = subclassesFor(a.classId, a.allocatedLevel)}
							<div class="wizard-class-row">
								<div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
									<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
										<strong style="font-size:0.875rem;">{cls?.name ?? '?'}</strong>
										{#if sub}<span class="table__muted" style="font-size:0.8125rem;">· {sub.name}</span>{/if}
										<span class="badge badge-accent">Lv {a.allocatedLevel}</span>
									</div>
									<div style="display:flex;gap:0.25rem;align-items:center;">
										<button class="wizard-ctrl-btn" onclick={() => { a.allocatedLevel = Math.max(1, a.allocatedLevel-1); }}>−</button>
										<button class="wizard-ctrl-btn" onclick={() => { a.allocatedLevel = Math.min(20, a.allocatedLevel+1); }}>+</button>
										<button class="btn btn-danger btn-sm" onclick={() => removeClass(i)}>✕</button>
									</div>
								</div>
								{#if subs.length}
									<select class="input input--select" style="margin-top:0.375rem;font-size:0.8125rem;" bind:value={a.subclassId}>
										<option value="">No subclass</option>
										{#each subs as s}<option value={s.id}>{s.name}</option>{/each}
									</select>
								{/if}
							</div>
						{/each}
					</div>
					<div style="display:flex;align-items:center;justify-content:space-between;margin-top:0.5rem;font-size:0.8125rem;">
						<span style="color:var(--text-muted);">Total: <strong style="color:var(--accent-light);">{totalLevel}</strong></span>
						{#if classAllocs.length > 0}<span style="color:var(--text-muted);">← Browse to add another class</span>{/if}
					</div>
				</div>
			{/if}

			<!-- Class browser -->
			<div class="wiz-browser">
				<div class="wiz-browser__list">
					<div class="wiz-browser__search">
						<input type="text" placeholder="Search classes…" bind:value={classSearch} />
						<button class="btn btn-ghost btn-sm" title="Random class" onclick={randomClass}>🎲</button>
					</div>
					<div class="wiz-browser__rows">
						{#each filteredClasses as cls}
							<button class="wiz-row" class:wiz-row--selected={browseClassId===cls.id}
								onclick={() => { selectBrowseClass(cls.id); }}>
								<div class="wiz-row__body">
									<p class="wiz-row__name">{cls.name}</p>
									<div class="wiz-row__sub">
										{#if cls.hitDice}<span class="badge badge-muted" style="font-size:0.625rem;">d{cls.hitDice}</span>{/if}
										{#if cls.primaryAbilities}<span style="color:var(--text-muted);font-size:0.6875rem;">{cls.primaryAbilities}</span>{/if}
									</div>
								</div>
								{#if classAllocs.find((a: any)=>a.classId===cls.id)}
									<span class="badge badge-accent" style="font-size:0.625rem;flex-shrink:0;">✓ Added</span>
								{/if}
							</button>
						{:else}
							<p class="table__empty" style="padding:1rem 0.75rem;">No classes match.</p>
						{/each}
					</div>
				</div>

				<div class="wiz-browser__panel">
					{#if browseClass}
						{@const bc = browseClass as any}

						<!-- Header + add button -->
						<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem;margin-bottom:0.75rem;">
							<div>
								<h3 class="wiz-panel__title">{bc.name}</h3>
								<div style="display:flex;gap:5px;flex-wrap:wrap;">
									{#if bc.hitDice}<span class="badge badge-muted">d{bc.hitDice} hit die</span>{/if}
									{#if bc.primaryAbilities}<span class="badge badge-muted">{bc.primaryAbilities}</span>{/if}
								</div>
							</div>
							<button class="btn btn-primary btn-sm" style="flex-shrink:0;" onclick={addBrowseClass}>
								{classAllocs.find((a: any)=>a.classId===bc.id)?'Update':'+ Add'}
							</button>
						</div>

						{#if canViewDescriptions && bc.description}
							<p class="wiz-panel__desc">{bc.description}</p>
						{:else if !canViewDescriptions}
							<p class="wiz-panel__desc" style="font-style:italic;color:var(--text-muted);">📖 Description not available — contact your DM.</p>
						{/if}

						<!-- Level picker + progress bar -->
						<div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.75rem;">
							<label class="label" for="browse-level" style="margin:0;white-space:nowrap;font-size:0.75rem;">Level</label>
							<input id="browse-level" type="number" class="input" style="width:60px;" min="1" max="20" bind:value={browseLevel} />
							<div style="flex:1;height:4px;background:var(--bg-overlay);border-radius:99px;overflow:hidden;">
								<div style="height:100%;width:{Math.min((browseLevel/20)*100,100)}%;background:var(--accent);border-radius:99px;transition:width var(--transition-base);"></div>
							</div>
						</div>

						<!-- Subclass picker -->
						{#if bc.subclasses?.length}
							{@const availSubs = bc.subclasses.filter((s: any) => browseLevel >= (bc.subclassAvailableAtLevel ?? 3))}
							{#if availSubs.length}
								<div class="wiz-panel__section" style="margin-bottom:0.75rem;">
									<p class="wiz-panel__label" style="margin-bottom:6px;">Subclass</p>
									<div class="wiz-browser wiz-browser--compact">
										<div class="wiz-browser__list">
											<div class="wiz-browser__rows">
												<button class="wiz-row" class:wiz-row--selected={browseSubId===''}
													onclick={() => browseSubId = ''}>
													<div class="wiz-row__body"><p class="wiz-row__name" style="color:var(--text-muted);">None yet</p></div>
												</button>
												{#each availSubs as sub}
													<button class="wiz-row" class:wiz-row--selected={browseSubId===sub.id}
														onclick={() => browseSubId = sub.id}>
														<div class="wiz-row__body"><p class="wiz-row__name">{sub.name}</p></div>
														{#if browseSubId===sub.id}<span class="wiz-row__check">✓</span>{/if}
													</button>
												{/each}
											</div>
										</div>
										<div class="wiz-browser__panel" style="padding:10px;">
											{#if browseSub}
												{@const bs = browseSub as any}
												{#if canViewDescriptions && bs.description}
													<p style="font-size:0.8125rem;color:var(--text-secondary);line-height:1.5;margin:0;">{bs.description}</p>
												{:else if !canViewDescriptions}
													<p style="font-size:0.8125rem;color:var(--text-muted);font-style:italic;margin:0;">📖 Description not available — contact your DM.</p>
												{/if}
											{:else}
												<div class="wiz-browser__empty" style="min-height:60px;"><p>Select a subclass.</p></div>
											{/if}
										</div>
									</div>
								</div>
							{:else}
								<p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 0.75rem;">Subclass available at level {bc.subclassAvailableAtLevel ?? 3}.</p>
							{/if}
						{/if}

						<!-- Feature timeline -->
						{#if featureTimeline.length}
							<div class="wiz-panel__section">
								<p class="wiz-panel__label" style="margin-bottom:6px;">Feature timeline</p>
								<div class="feat-timeline">
									{#each featureTimeline as feat}
										{@const open = openFeats.has(feat.id)}
										{@const past = feat.level <= browseLevel}
										<div class="feat-row">
											<button class="feat-row__header" onclick={() => toggleFeat(feat.id)}>
												<span class="feat-row__level" style="color:{past?'var(--accent-light)':'var(--text-muted)'};">{feat.level}</span>
												<span class="feat-row__name" style="color:{past?'var(--text-primary)':'var(--text-muted)'};">{feat.name}</span>
												<span class="feat-row__source">
													<span class="badge" style="font-size:0.5625rem;background:{feat.sourceType==='subclass'?'rgba(142,68,173,0.15)':'rgba(184,115,74,0.12)'};color:{feat.sourceType==='subclass'?'#BF7EE0':'var(--accent-light)'};">{feat.source}</span>
												</span>
												<span class="feat-row__chevron" class:feat-row__chevron--open={open}>▶</span>
											</button>
											{#if open && feat.description}
												{#if canViewDescriptions}
													<div class="feat-row__body">{feat.description}</div>
												{:else}
													<div class="feat-row__body" style="font-style:italic;color:var(--text-muted);">📖 Description not available — contact your DM.</div>
												{/if}
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/if}

					{:else}
						<div class="wiz-browser__empty">
							<span style="font-size:2rem;">⚔️</span>
							<p>Select a class to view its details and features.</p>
						</div>
					{/if}
				</div>
			</div>
		</div>

	<!-- ══════════════════════════════════════════════════════════════
	     STEP 5: ASI / Feats (conditional)
	════════════════════════════════════════════════════════════════ -->
	{:else if step === ASI_STEP_IDX}
		<div style="display:flex;flex-direction:column;gap:0.875rem;">
			{#each asiChoices as c, i}
				<div class="card" style="padding:0.875rem;">
					<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.875rem;flex-wrap:wrap;gap:0.5rem;">
						<p style="margin:0;font-size:0.8125rem;font-weight:700;">
							{c.sourceName} <span style="color:var(--text-muted);font-weight:400;">· Level {c.sourceLevel}</span>
							{#if c.type === 'epic_boon'}<span class="badge badge-warning" style="margin-left:6px;">Epic Boon</span>{/if}
						</p>
						{#if c.mode}<span style="font-size:0.75rem;color:var(--color-success);">✓ {c.mode === 'feat' || c.type === 'epic_boon' ? (sys?.feats??[]).find((f:any)=>f.id===c.featId)?.name ?? 'Feat chosen' : `${STAT_LABEL[c.stat1]??'—'} +${c.amount1}${c.stat2?`, ${STAT_LABEL[c.stat2]} +${c.amount2}`:''}`}</span>{/if}
					</div>

					<!-- Mode toggle (not for epic boon) -->
					{#if c.type !== 'epic_boon'}
						<div class="wiz-toggle" style="margin-bottom:0.875rem;">
							<button class="wiz-toggle__btn" class:wiz-toggle__btn--active={c.mode==='stat'}
								onclick={() => { asiChoices[i].mode='stat'; asiChoices[i].featId=''; }}>+2 to a stat</button>
							<button class="wiz-toggle__btn" class:wiz-toggle__btn--active={c.mode==='feat'}
								onclick={() => { asiChoices[i].mode='feat'; asiChoices[i].stat1=''; asiChoices[i].stat2=''; }}>Choose a feat</button>
						</div>
					{/if}

					<!-- Stat mode -->
					{#if c.mode === 'stat'}
						<div style="display:flex;gap:0.625rem;flex-wrap:wrap;align-items:flex-end;">
							<div class="field" style="flex:0 0 110px;margin:0;">
								<label class="label" for="asi-stat1-{i}">Stat</label>
								<select id="asi-stat1-{i}" class="input input--select" bind:value={asiChoices[i].stat1}>
									<option value="">Choose…</option>
									{#each STATS as st}<option value={st}>{STAT_LABEL[st]}</option>{/each}
								</select>
							</div>
							<div class="field" style="flex:0 0 80px;margin:0;">
								<label class="label" for="asi-amt1-{i}">Amount</label>
								<select id="asi-amt1-{i}" class="input input--select" bind:value={asiChoices[i].amount1}
									onchange={(e) => { const v=parseInt((e.target as HTMLSelectElement).value); asiChoices[i].amount1=v; if(v===2){asiChoices[i].stat2='';asiChoices[i].amount2=0;} }}>
									<option value={2}>+2</option>
									<option value={1}>+1</option>
								</select>
							</div>
							{#if asiChoices[i].amount1 === 1}
								<div class="field" style="flex:0 0 110px;margin:0;">
									<label class="label" for="asi-stat2-{i}">Second stat</label>
									<select id="asi-stat2-{i}" class="input input--select" bind:value={asiChoices[i].stat2}>
										<option value="">Choose…</option>
										{#each STATS.filter(s => s !== asiChoices[i].stat1) as st}<option value={st}>{STAT_LABEL[st]}</option>{/each}
									</select>
								</div>
							{/if}
						</div>

					<!-- Feat / epic boon mode — feat browser -->
					{:else if c.mode === 'feat' || c.type === 'epic_boon'}
						{#if c.featId}
							{@const chosenFeat = (sys?.feats??[]).find((f:any)=>f.id===c.featId)}
							<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.625rem;padding:8px 10px;background:var(--bg-overlay);border-radius:var(--radius-md);">
								<span style="font-size:0.875rem;font-weight:700;flex:1;">{chosenFeat?.name ?? '—'}</span>
								<button class="btn btn-ghost btn-xs" onclick={() => { asiChoices[i].featId=''; }}>Change</button>
							</div>
							{#if chosenFeat?.asiAmount && !chosenFeat.asiStatFixed && !c.featGrantedStat}
								<div class="field" style="margin-top:0.5rem;">
									<label class="label" for="asi-feat-stat-{i}">Choose stat for +{chosenFeat.asiAmount}</label>
									<select id="asi-feat-stat-{i}" class="input input--select" bind:value={asiChoices[i].featGrantedStat}
										onchange={() => { const fs = (sys?.feats??[]).find((f:any)=>f.id===c.featId); if(fs) { asiChoices[i].stat1=asiChoices[i].featGrantedStat??''; asiChoices[i].amount1=fs.asiAmount??0; } }}>
										<option value="">Choose stat…</option>
										{#each STATS as st}<option value={st}>{STAT_LABEL[st]}</option>{/each}
									</select>
								</div>
							{/if}
						{:else}
							<!-- Feat browser for ASI — row click previews, button commits -->
							<div class="wiz-browser wiz-browser--compact">
								<div class="wiz-browser__list">
									<div class="wiz-browser__search">
										<input type="text" placeholder="Search feats…" bind:value={asiFeatSearch[i]} />
									</div>
									<div class="wiz-browser__rows">
										{#each featsForChoice(c).filter((f: any) => !asiFeatSearch[i] || f.name.toLowerCase().includes(asiFeatSearch[i].toLowerCase())) as feat}
											<button class="wiz-row"
												class:wiz-row--selected={asiFeatPreview[i]===feat.id || (c.featId===feat.id && !asiFeatPreview[i])}
												onclick={() => { asiFeatPreview[i] = feat.id; }}>
												<div class="wiz-row__body">
													<p class="wiz-row__name">{feat.name}</p>
													<div class="wiz-row__sub">
														{#if feat.isEpicBoon}<span class="wiz-tag wiz-tag--epic">Epic Boon</span>{/if}
														{#each (feat.categories??'').split(',').map((s:string)=>s.trim()).filter(Boolean) as cat}
															<span class="wiz-tag wiz-tag--general">{cat}</span>
														{/each}
													</div>
												</div>
												{#if c.featId===feat.id}<span class="wiz-row__check">✓</span>{/if}
											</button>
										{/each}
									</div>
								</div>
								<div class="wiz-browser__panel">
									{#if (asiFeatPreview[i] || c.featId)}
										{@const previewId = asiFeatPreview[i] || c.featId}
										{@const pf = (sys?.feats??[]).find((f:any)=>f.id===previewId)}
										{#if pf}
											<h4 class="wiz-panel__title" style="font-size:0.9375rem;">{pf.name}</h4>
											{#if pf.prerequisites}<p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 6px;">Prereq: {pf.prerequisites}</p>{/if}
											{#if canViewDescriptions && pf.description}
												<p class="wiz-panel__desc">{pf.description}</p>
											{:else if !canViewDescriptions}
												<p class="wiz-panel__desc" style="font-style:italic;color:var(--text-muted);">📖 Description not available.</p>
											{/if}
											<div class="wiz-panel__commit">
												{#if c.featId === previewId}
													<button class="btn btn-ghost btn-sm" style="width:100%;border-color:var(--border-accent);color:var(--accent-light);" disabled>✓ Selected</button>
												{:else}
													<button class="btn btn-primary btn-sm" style="width:100%;" onclick={() => {
														const feat = (sys?.feats??[]).find((f:any)=>f.id===previewId);
														if (!feat) return;
														asiChoices[i].featId = feat.id;
														if (feat.asiStatFixed) { asiChoices[i].stat1=feat.asiStatFixed; asiChoices[i].amount1=feat.asiAmount??1; asiChoices[i].featGrantedStat=feat.asiStatFixed; }
														else if (feat.asiAmount) { asiChoices[i].amount1=feat.asiAmount??1; }
														asiFeatPreview[i] = '';
													}}>Select {pf.name}</button>
												{/if}
											</div>
										{/if}
									{:else}
										<div class="wiz-browser__empty" style="min-height:80px;"><p>Select a feat to preview.</p></div>
									{/if}
								</div>
							</div>
						{/if}
					{/if}
				</div>
			{/each}
		</div>

	<!-- ══════════════════════════════════════════════════════════════
	     STEP 5 or 6: Skills & Proficiencies
	════════════════════════════════════════════════════════════════ -->
	{:else if step === SKILLS_STEP_IDX}
		<div class="wizard-skills-layout">

			<div style="display:flex;flex-direction:column;gap:0.625rem;">

				<!-- Class skills -->
				{#if availableClassSkills.length > 0}
					<div class="wiz-pool">
						<div class="wiz-pool__header">
							<span class="wiz-pool__label">Class skills — {(selectedClass0 as any)?.name ?? ''}</span>
							<span class="wiz-pool__count" class:wiz-pool__count--done={chosenClassSkills.length >= Math.min(classSkillCount, availableClassSkills.length)}>
								{chosenClassSkills.length} / {Math.min(classSkillCount, availableClassSkills.length)}
								{#if chosenClassSkills.length >= Math.min(classSkillCount, availableClassSkills.length)} ✓{/if}
							</span>
						</div>
						<p class="wiz-pool__hint">Choose {classSkillCount}</p>
						<div class="wiz-chip-group">
							{#each availableClassSkills as skill}
								{@const chosen = chosenClassSkills.includes(skill)}
								{@const full = !chosen && chosenClassSkills.length >= Math.min(classSkillCount, availableClassSkills.length)}
								<button class="wiz-chip" class:wiz-chip--chosen={chosen} disabled={full}
									onclick={() => {
										if (chosen) chosenClassSkills = chosenClassSkills.filter(s => s !== skill);
										else if (!full) chosenClassSkills = [...chosenClassSkills, skill];
									}}>{SKILL_DISPLAY[skill] ?? skill}</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Auto-granted skills -->
				{#if autoGrantedSkills.length}
					<div class="wiz-pool">
						<div class="wiz-pool__header">
							<span class="wiz-pool__label">Auto-granted skills</span>
							<span class="wiz-pool__count wiz-pool__count--done">Auto ✓</span>
						</div>
						<div class="wiz-chip-group">
							{#each autoGrantedSkills as skill}
								<button class="wiz-chip wiz-chip--granted">{SKILL_DISPLAY[skill] ?? skill}</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Background skill choice pool -->
				{#if backgroundChoiceCount > 0 && backgroundChoicePool.length > 0}
					<div class="wiz-pool">
						<div class="wiz-pool__header">
							<span class="wiz-pool__label">Background skills — {selectedBackground?.name}</span>
							<span class="wiz-pool__count" class:wiz-pool__count--done={(chosenPoolSkills[backgroundId ?? ''] ?? []).length >= Math.min(backgroundChoiceCount, backgroundChoicePool.length)}>
								{(chosenPoolSkills[backgroundId ?? ''] ?? []).length} / {Math.min(backgroundChoiceCount, backgroundChoicePool.length)}
							</span>
						</div>
						<p class="wiz-pool__hint">Choose {backgroundChoiceCount}</p>
						<div class="wiz-chip-group">
							{#each backgroundChoicePool as skill}
								{@const chosen = (chosenPoolSkills[backgroundId ?? ''] ?? []).includes(skill)}
								{@const taken = isTakenElsewhere(skill, backgroundId ?? '')}
								{@const full = !chosen && (chosenPoolSkills[backgroundId ?? ''] ?? []).length >= Math.min(backgroundChoiceCount, backgroundChoicePool.length)}
								<button class="wiz-chip" class:wiz-chip--chosen={chosen} disabled={full || taken}
									onclick={() => togglePoolSkill(backgroundId ?? '', skill, backgroundChoiceCount)}>
									{SKILL_DISPLAY[skill] ?? skill}</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Species trait skill choice pools -->
				{#each speciesTraitChoices as trait}
					{@const traitPool = (trait.skillChoicePool ?? '').split(',').map((s: string) => s.trim()).filter(Boolean)}
					<div class="wiz-pool">
						<div class="wiz-pool__header">
							<span class="wiz-pool__label">{selectedSpecies?.name}: {trait.name}</span>
							<span class="wiz-pool__count" class:wiz-pool__count--done={(chosenPoolSkills[trait.id]??[]).length >= Math.min(trait.skillChoiceCount, traitPool.length)}>
								{(chosenPoolSkills[trait.id]??[]).length} / {Math.min(trait.skillChoiceCount, traitPool.length)}
							</span>
						</div>
						<div class="wiz-chip-group">
							{#each traitPool as skill}
								{@const chosen = (chosenPoolSkills[trait.id]??[]).includes(skill)}
								{@const taken = isTakenElsewhere(skill, trait.id)}
								{@const full = !chosen && (chosenPoolSkills[trait.id]??[]).length >= Math.min(trait.skillChoiceCount, traitPool.length)}
								<button class="wiz-chip" class:wiz-chip--chosen={chosen} disabled={full || taken}
									onclick={() => togglePoolSkill(trait.id, skill, trait.skillChoiceCount)}>
									{SKILL_DISPLAY[skill] ?? skill}</button>
							{/each}
						</div>
					</div>
				{/each}

				<!-- Feat skill choice pools -->
				{#each featSkillChoices as fc}
					<div class="wiz-pool">
						<div class="wiz-pool__header">
							<span class="wiz-pool__label">Feat: {fc.label}</span>
							<span class="wiz-pool__count" class:wiz-pool__count--done={(chosenPoolSkills[fc.sourceId]??[]).length >= Math.min(fc.count, fc.pool.length)}>
								{(chosenPoolSkills[fc.sourceId]??[]).length} / {Math.min(fc.count, fc.pool.length)}
							</span>
						</div>
						<div class="wiz-chip-group">
							{#each fc.pool as skill}
								{@const chosen = (chosenPoolSkills[fc.sourceId]??[]).includes(skill)}
								{@const taken = isTakenElsewhere(skill, fc.sourceId)}
								{@const full = !chosen && (chosenPoolSkills[fc.sourceId]??[]).length >= Math.min(fc.count, fc.pool.length)}
								<button class="wiz-chip" class:wiz-chip--chosen={chosen} disabled={full || taken}
									onclick={() => togglePoolSkill(fc.sourceId, skill, fc.count)}>
									{SKILL_DISPLAY[skill] ?? skill}</button>
							{/each}
						</div>
					</div>
				{/each}

				<!-- Feature skill choice pools -->
				{#each featureChoices() as fc}
					<div class="wiz-pool">
						<div class="wiz-pool__header">
							<span class="wiz-pool__label">{fc.label}</span>
							<span class="wiz-pool__count" class:wiz-pool__count--done={(chosenPoolSkills[fc.sourceId]??[]).length >= Math.min(fc.count, fc.pool.length)}>
								{(chosenPoolSkills[fc.sourceId]??[]).length} / {Math.min(fc.count, fc.pool.length)}
							</span>
						</div>
						<div class="wiz-chip-group">
							{#each fc.pool as skill}
								{@const chosen = (chosenPoolSkills[fc.sourceId]??[]).includes(skill)}
								{@const taken = isTakenElsewhere(skill, fc.sourceId)}
								{@const full = !chosen && (chosenPoolSkills[fc.sourceId]??[]).length >= Math.min(fc.count, fc.pool.length)}
								<button class="wiz-chip" class:wiz-chip--chosen={chosen} disabled={full || taken}
									onclick={() => togglePoolSkill(fc.sourceId, skill, fc.count)}>
									{SKILL_DISPLAY[skill] ?? skill}</button>
							{/each}
						</div>
					</div>
				{/each}

				<!-- Saving throws -->
				{#if classSavingThrows.length}
					<div class="wiz-pool">
						<div class="wiz-pool__header">
							<span class="wiz-pool__label">Saving throws</span>
							<span class="wiz-pool__count wiz-pool__count--done">Auto ✓</span>
						</div>
						<div class="wiz-chip-group">
							{#each classSavingThrows as stat}
								<button class="wiz-chip wiz-chip--granted">{STAT_ABBR[stat] ?? stat}</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Saving throw choice pools -->
				{#each allSaveChoices as sc}
					<div class="wiz-pool">
						<div class="wiz-pool__header">
							<span class="wiz-pool__label">Save choice — {sc.label}</span>
							<span class="wiz-pool__count" class:wiz-pool__count--done={(chosenSavePools[sc.sourceId]??[]).length >= Math.min(sc.count, sc.pool.length)}>
								{(chosenSavePools[sc.sourceId]??[]).length} / {Math.min(sc.count, sc.pool.length)}
							</span>
						</div>
						<div class="wiz-chip-group">
							{#each sc.pool as stat}
								{@const chosen = (chosenSavePools[sc.sourceId]??[]).includes(stat)}
								{@const full = !chosen && (chosenSavePools[sc.sourceId]??[]).length >= Math.min(sc.count, sc.pool.length)}
								<button class="wiz-chip" class:wiz-chip--chosen={chosen} disabled={full}
									onclick={() => {
										const cur = chosenSavePools[sc.sourceId] ?? [];
										if (chosen) chosenSavePools = { ...chosenSavePools, [sc.sourceId]: cur.filter(s => s !== stat) };
										else if (!full) chosenSavePools = { ...chosenSavePools, [sc.sourceId]: [...cur, stat] };
									}}>{STAT_ABBR[stat] ?? stat}</button>
							{/each}
						</div>
					</div>
				{/each}

				<!-- Tool choice pools -->
				{#each allToolChoices as tc}
					<div class="wiz-pool">
						<div class="wiz-pool__header">
							<span class="wiz-pool__label">Tools — {tc.label}</span>
							<span class="wiz-pool__count" class:wiz-pool__count--done={(chosenToolPools[tc.sourceId]??[]).length >= Math.min(tc.count, tc.pool.length)}>
								{(chosenToolPools[tc.sourceId]??[]).length} / {Math.min(tc.count, tc.pool.length)}
							</span>
						</div>
						<div class="wiz-chip-group">
							{#each tc.pool as tool}
								{@const chosen = (chosenToolPools[tc.sourceId]??[]).includes(tool)}
								{@const full = !chosen && (chosenToolPools[tc.sourceId]??[]).length >= Math.min(tc.count, tc.pool.length)}
								<button class="wiz-chip" class:wiz-chip--chosen={chosen} disabled={full}
									onclick={() => {
										const cur = chosenToolPools[tc.sourceId] ?? [];
										if (chosen) chosenToolPools = { ...chosenToolPools, [tc.sourceId]: cur.filter(t => t !== tool) };
										else if (!full) chosenToolPools = { ...chosenToolPools, [tc.sourceId]: [...cur, tool] };
									}}>{tool}</button>
							{/each}
						</div>
					</div>
				{/each}

				<!-- Language choice pools -->
				{#each allLanguageChoices as lc}
					<div class="wiz-pool">
						<div class="wiz-pool__header">
							<span class="wiz-pool__label">Languages — {lc.label}</span>
							<span class="wiz-pool__count" class:wiz-pool__count--done={(chosenLanguagePools[lc.sourceId]??[]).length >= Math.min(lc.count, lc.pool.length)}>
								{(chosenLanguagePools[lc.sourceId]??[]).length} / {Math.min(lc.count, lc.pool.length)}
							</span>
						</div>
						<div class="wiz-chip-group">
							{#each lc.pool as lang}
								{@const chosen = (chosenLanguagePools[lc.sourceId]??[]).includes(lang)}
								{@const full = !chosen && (chosenLanguagePools[lc.sourceId]??[]).length >= Math.min(lc.count, lc.pool.length)}
								<button class="wiz-chip" class:wiz-chip--chosen={chosen} disabled={full}
									onclick={() => {
										const cur = chosenLanguagePools[lc.sourceId] ?? [];
										if (chosen) chosenLanguagePools = { ...chosenLanguagePools, [lc.sourceId]: cur.filter(l => l !== lang) };
										else if (!full) chosenLanguagePools = { ...chosenLanguagePools, [lc.sourceId]: [...cur, lang] };
									}}>{lang}</button>
							{/each}
						</div>
					</div>
				{/each}

			</div>

			<!-- Proficiency summary sidebar -->
			<div class="card" style="position:sticky;top:1rem;">
				<p class="wiz-pool__label" style="margin-bottom:10px;">All proficiencies</p>
				<div style="display:flex;flex-direction:column;gap:3px;font-size:0.75rem;">
					{#each [...allGrantedSkillsSet] as skill}
						<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border-muted);">
							<span style="color:var(--text-secondary);">{SKILL_DISPLAY[skill] ?? skill}</span>
							<span style="color:var(--accent-light);">Prof</span>
						</div>
					{/each}
					{#each classSavingThrows as stat}
						<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border-muted);">
							<span style="color:var(--text-secondary);">{STAT_ABBR[stat] ?? stat}</span>
							<span style="color:var(--text-muted);">Save</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

	<!-- ══════════════════════════════════════════════════════════════
	     STEP 6/7: Review
	════════════════════════════════════════════════════════════════ -->
	{:else if step === REVIEW_STEP_IDX}
		<div class="card">

			<!-- Character header -->
			<div style="display:flex;gap:1rem;align-items:flex-start;flex-wrap:wrap;margin-bottom:1rem;">
				{#if avatarUrl}
					<img src={avatarUrl} alt={name} style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid var(--border-accent);" />
				{/if}
				<div>
					<h3 style="margin:0;font-size:1.25rem;font-weight:700;">{name}</h3>
					<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.375rem;">
						<span class="badge badge-accent">Level {totalLevel}</span>
						<span class="badge badge-muted">{selectedSpecies?.name??'—'}</span>
						<span class="badge badge-muted">{selectedBackground?.name??'—'}</span>
						<span class="badge badge-muted">{data.activeWorlds.find((w:any)=>w.id===worldId)?.name??'Global'}</span>
					</div>
				</div>
			</div>

			<!-- Ability Scores -->
			<h4 class="section-title">Ability Scores</h4>
			<div class="wizard-review-stats" style="display:grid;grid-template-columns:repeat(6,1fr);gap:0.5rem;text-align:center;margin-bottom:1rem;">
				{#each STATS as st}
					{@const base = total[st]}
					{@const final = finalScores[st]}
					{@const asiBump = asiChoices.filter(c => c.mode==='stat'&&(c.stat1===st||c.stat2===st)).reduce((n,c) => n+(c.stat1===st?(c.amount1||0):(c.amount2||0)),0)}
					{@const featBump = asiChoices.filter(c => (c.mode==='feat'||c.type==='epic_boon')&&c.stat1===st&&c.amount1).reduce((n,c) => n+(c.amount1||0),0)}
					<div class="wizard-stat-box" style="padding:0.5rem;">
						<p class="wizard-stat-box__label">{STAT_LABEL[st]}</p>
						<p class="wizard-stat-box__value" style="font-size:1.375rem;">{final}</p>
						<div style="min-height:1rem;">
							{#if asiBump > 0}<p style="font-size:0.6875rem;color:var(--color-success);margin:0;">+{asiBump} ASI</p>{/if}
							{#if featBump > 0}<p style="font-size:0.6875rem;color:var(--accent-light);margin:0;">+{featBump} Feat</p>{/if}
							<p style="font-size:0.6875rem;color:var(--text-muted);margin:0;">base {base}</p>
						</div>
						<p class="wizard-stat-box__mod">{mod(final)}</p>
					</div>
				{/each}
			</div>

			<!-- Classes -->
			<h4 class="section-title">Classes</h4>
			<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">
				{#each classAllocs as a}
					{@const cls=(sys?.classes??[]).find((c:any)=>c.id===a.classId)}
					{@const sub=cls?.subclasses?.find((s:any)=>s.id===a.subclassId)}
					<div class="character-class-tag">
						<span>{cls?.name??'?'}</span>
						{#if sub}<span class="table__muted">· {sub.name}</span>{/if}
						<span class="badge badge-accent">Lv {a.allocatedLevel}</span>
					</div>
				{/each}
			</div>

			<!-- Background feat -->
			{#if selectedBackground}
				{@const bg=selectedBackground as any}
				{#if bg.grantsFeat || bgFeatPick}
					<h4 class="section-title">Background Feat</h4>
					<div style="margin-bottom:1rem;">
						{#if bg.grantsFeat}
							<span class="badge badge-accent">🏅 {bg.grantsFeat.name}</span>
						{:else if bgFeatPick}
							{@const feat=(sys?.feats??[]).find((f:any)=>f.id===bgFeatPick)}
							{#if feat}<span class="badge badge-accent">🏅 {feat.name}</span>{/if}
						{/if}
					</div>
				{/if}
			{/if}

			<!-- Saves & Skills -->
			{#if classSavingThrows.length || extraSavingThrows.length || allSaveChoices.some(sc=>(chosenSavePools[sc.sourceId]??[]).length>0) || autoGrantedSkills.length || chosenClassSkills.length || Object.keys(chosenPoolSkills).some(k=>(chosenPoolSkills[k]??[]).length>0)}
				<h4 class="section-title">Saving Throws &amp; Skills</h4>
				<div style="display:flex;flex-direction:column;gap:0.375rem;margin-bottom:1rem;">
					{#if classSavingThrows.length || extraSavingThrows.length || allSaveChoices.some(sc=>(chosenSavePools[sc.sourceId]??[]).length>0)}
						<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
							<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Saving Throws</span>
							<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
								{#each classSavingThrows as stat}<span class="badge badge-accent">{STAT_ABBR[stat]??stat}</span>{/each}
								{#each extraSavingThrows as {stat}}<span class="badge badge-accent">{STAT_ABBR[stat]??stat}</span>{/each}
								{#each allSaveChoices as sc}{#each (chosenSavePools[sc.sourceId]??[]) as stat}<span class="badge badge-accent">{STAT_ABBR[stat]??stat}</span>{/each}{/each}
							</div>
						</div>
					{/if}
					{#if autoGrantedSkills.length}
						<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
							<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Auto Skills</span>
							<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
								{#each autoGrantedSkills as skill}<span class="badge badge-muted">{SKILL_DISPLAY[skill]??skill}</span>{/each}
							</div>
						</div>
					{/if}
					{#if chosenClassSkills.length}
						<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
							<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Class Skills</span>
							<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
								{#each chosenClassSkills as skill}<span class="badge badge-success">{SKILL_DISPLAY[skill]??skill}</span>{/each}
							</div>
						</div>
					{/if}
					{#each Object.entries(chosenPoolSkills).filter(([,skills])=>skills.length>0) as [,skills]}
						<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
							<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Pool Picks</span>
							<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
								{#each skills as skill}<span class="badge badge-success">{SKILL_DISPLAY[skill]??skill}</span>{/each}
							</div>
						</div>
					{/each}
					{#if speciesAutoExpertise.length}
						<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
							<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Expertise</span>
							<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
								{#each speciesAutoExpertise as {skill}}<span class="badge badge-accent">{SKILL_DISPLAY[skill]??skill} ×2</span>{/each}
								{#each featureAutoExpertise as {skill}}<span class="badge badge-accent">{SKILL_DISPLAY[skill]??skill} ×2</span>{/each}
							</div>
						</div>
					{/if}
					{#if featAutoSaves.length}
						<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
							<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Feat Saves</span>
							<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
								{#each featAutoSaves as {stat}}<span class="badge badge-accent">{STAT_ABBR[stat]??stat}</span>{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Grants: size, tools, languages, modifiers, speeds, senses, innate spells -->
			{#if chosenSize || traitFixedSize}
				<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
					<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Size</span>
					<span class="badge badge-muted">{chosenSize||traitFixedSize}</span>
				</div>
			{/if}
			{#if autoGrantedTools().length || allToolChoices.some(tc=>(chosenToolPools[tc.sourceId]??[]).length>0)}
				<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
					<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Tools</span>
					<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
						{#each autoGrantedTools() as g}<span class="badge badge-muted">{g.tool}</span>{/each}
						{#each allToolChoices as tc}{#each (chosenToolPools[tc.sourceId]??[]) as t}<span class="badge badge-muted">{t}</span>{/each}{/each}
					</div>
				</div>
			{/if}
			{#if autoGrantedLanguages().length || allLanguageChoices.some(lc=>(chosenLanguagePools[lc.sourceId]??[]).length>0)}
				<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
					<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Languages</span>
					<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
						{#each autoGrantedLanguages() as g}<span class="badge badge-muted">{g.language}</span>{/each}
						{#each allLanguageChoices as lc}{#each (chosenLanguagePools[lc.sourceId]??[]) as l}<span class="badge badge-muted">{l}</span>{/each}{/each}
					</div>
				</div>
			{/if}
			{#if autoGrantedDamageModifiers().some(g=>g.modifierType==='RESISTANCE')}
				<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
					<span style="font-size:0.75rem;font-weight:700;color:var(--color-success);min-width:110px;">Resistances</span>
					<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
						{#each autoGrantedDamageModifiers().filter(g=>g.modifierType==='RESISTANCE') as g}
							<span class="badge" style="background:rgba(74,124,89,0.15);color:var(--color-success);">{g.damageType}</span>
						{/each}
					</div>
				</div>
			{/if}
			{#if autoGrantedDamageModifiers().some(g=>g.modifierType==='IMMUNITY')}
				<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
					<span style="font-size:0.75rem;font-weight:700;color:var(--accent-light);min-width:110px;">Immunities</span>
					<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
						{#each autoGrantedDamageModifiers().filter(g=>g.modifierType==='IMMUNITY') as g}
							<span class="badge badge-accent">{g.damageType}</span>
						{/each}
					</div>
				</div>
			{/if}
			{#if autoGrantedDamageModifiers().some(g=>g.modifierType==='VULNERABILITY')}
				<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
					<span style="font-size:0.75rem;font-weight:700;color:var(--color-danger);min-width:110px;">Vulnerabilities</span>
					<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
						{#each autoGrantedDamageModifiers().filter(g=>g.modifierType==='VULNERABILITY') as g}
							<span class="badge" style="background:rgba(196,74,74,0.15);color:var(--color-danger);">{g.damageType}</span>
						{/each}
					</div>
				</div>
			{/if}
			{#if autoGrantedSpeeds().length}
				<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
					<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Speed Bonuses</span>
					<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
						{#each autoGrantedSpeeds() as sp}<span class="badge badge-muted">{sp.movementType.charAt(0)+sp.movementType.slice(1).toLowerCase()} +{sp.speed} ft</span>{/each}
					</div>
				</div>
			{/if}
			{#if autoGrantedSenses().length}
				<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
					<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Senses</span>
					<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
						{#each autoGrantedSenses() as s}<span class="badge badge-muted">👁 {s}</span>{/each}
					</div>
				</div>
			{/if}
			{#if autoGrantedInnateSpells().length}
				<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
					<span style="font-size:0.75rem;font-weight:700;color:var(--accent-light);min-width:110px;">Innate Spells</span>
					<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
						{#each autoGrantedInnateSpells() as g}
							<span class="badge badge-accent">{g.name} · Lv{g.minCharLevel} · {g.usesPerDay===null?'at will':`${g.usesPerDay}/day`}</span>
						{/each}
					</div>
				</div>
			{/if}

			<!-- ASI summary -->
			{#if hasAsiStep && asiChoices.length}
				<h4 class="section-title">ASI / Feats</h4>
				<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">
					{#each asiChoices as c}
						<div style="font-size:0.8125rem;padding:0.25rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-sm);">
							<span class="table__muted">{c.sourceName} Lv {c.sourceLevel}:</span>
							{#if c.mode==='feat'||c.type==='epic_boon'}
								{(sys?.feats??[]).find((f:any)=>f.id===c.featId)?.name??'—'}
							{:else if c.mode==='stat'}
								{STAT_LABEL[c.stat1]??'—'} +{c.amount1}{c.stat2?`, ${STAT_LABEL[c.stat2]} +${c.amount2}`:''}
							{:else}
								<span style="color:var(--color-warning);">Not chosen</span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			<!-- Validation / submit -->
			{#if !canSubmit}
				<div class="form-error" style="margin-bottom:1rem;">
					{#if !scoresValid&&!rolled}Point buy not fully spent ({remaining} remaining). {/if}
					{#if totalLevel<1}At least one class required. {/if}
					{#if !classAllocs.every(c=>c.classId)}All class rows need a class. {/if}
					{#if !bgFeatValid}Background feat selection required. {/if}
					{#if !(chosenClassSkills.length===Math.min(classSkillCount,availableClassSkills.length)&&allPoolsSatisfied)}Skill selections incomplete. {/if}
					{#if hasAsiStep&&!asiValid}All ASI/Feat slots must be completed. {/if}
				</div>
			{:else}
				<p style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:1rem;">Submitting creates your character pending DM approval.</p>
			{/if}

			<form method="post" action="?/create" use:enhance={() => { return async ({ update }) => { clearState(); await update(); }; }}>
				<input type="hidden" name="gameSystemId"  value={data.gameSystem.id} />
				<input type="hidden" name="name"          value={name} />
				<input type="hidden" name="avatarUrl"     value={avatarUrl} />
				<input type="hidden" name="portraitUrl"   value={portraitUrl} />
				<input type="hidden" name="worldId"       value={worldId} />
				<input type="hidden" name="speciesId"     value={speciesId} />
				<input type="hidden" name="backgroundId"  value={backgroundId} />
				{#if bgFeatPick}<input type="hidden" name="bgFeatPick" value={bgFeatPick} />{/if}
				{#if (selectedBackground as any)?.grantsFeatId}<input type="hidden" name="bgGrantedFeatId" value={(selectedBackground as any).grantsFeatId} />{/if}
				{#each chosenClassSkills as skill}<input type="hidden" name="chosenClassSkill" value={skill} />{/each}
				{#each backgroundFixedSkills as skill}
					<input type="hidden" name="autoSkill" value={skill} />
					<input type="hidden" name="autoSkillSource" value="Background" />
					<input type="hidden" name="autoSkillValue" value="1" />
				{/each}
				{#each speciesFixedSkills as skill}
					<input type="hidden" name="autoSkill" value={skill} />
					<input type="hidden" name="autoSkillSource" value="Species" />
					<input type="hidden" name="autoSkillValue" value="1" />
				{/each}
				{#each speciesAutoExpertise as {skill}}
					<input type="hidden" name="autoSkill" value={skill} />
					<input type="hidden" name="autoSkillSource" value="Species" />
					<input type="hidden" name="autoSkillValue" value="2" />
				{/each}
				{#each speciesAutoHalfSkills as {skill}}
					<input type="hidden" name="autoSkill" value={skill} />
					<input type="hidden" name="autoSkillSource" value="Species" />
					<input type="hidden" name="autoSkillValue" value="0.5" />
				{/each}
				{#each classSavingThrows as stat}
					<input type="hidden" name="classSave" value={stat} />
					<input type="hidden" name="classSaveSourceType" value="Class" />
					<input type="hidden" name="classSaveSourceId" value="" />
				{/each}
				{#each extraSavingThrows as sv}
					<input type="hidden" name="classSave" value={sv.stat} />
					<input type="hidden" name="classSaveSourceType" value={sv.sourceType??'Feat'} />
					<input type="hidden" name="classSaveSourceId" value={sv.sourceId??''} />
				{/each}
				{#each allSaveChoices as sc}
					{#each (chosenSavePools[sc.sourceId]??[]) as stat}
						<input type="hidden" name="classSave" value={stat} />
						<input type="hidden" name="classSaveSourceType" value={sc.sourceType??'PlayerChoice'} />
						<input type="hidden" name="classSaveSourceId" value={sc.sourceDbId??sc.sourceId??''} />
					{/each}
				{/each}
				{#if backgroundChoiceCount>0}
					{#each (chosenPoolSkills[backgroundId??'']??[]) as skill}
						<input type="hidden" name="poolSkill" value={skill} />
						<input type="hidden" name="poolSkillSource" value="Background" />
						<input type="hidden" name="poolSkillSourceId" value={backgroundId??''} />
					{/each}
				{/if}
				{#each speciesTraitChoices as trait}
					{#each (chosenPoolSkills[trait.id]??[]) as skill}
						<input type="hidden" name="poolSkill" value={skill} />
						<input type="hidden" name="poolSkillSource" value="SpeciesTrait" />
						<input type="hidden" name="poolSkillSourceId" value={trait.id} />
					{/each}
				{/each}
				{#each featSkillChoices as fc}
					{#each (chosenPoolSkills[fc.sourceId]??[]) as skill}
						<input type="hidden" name="poolSkill" value={skill} />
						<input type="hidden" name="poolSkillSource" value="Feat" />
						<input type="hidden" name="poolSkillSourceId" value={fc.sourceId} />
					{/each}
				{/each}
				{#each featureChoices() as fc}
					{#each (chosenPoolSkills[fc.sourceId]??[]) as skill}
						<input type="hidden" name="poolSkill" value={skill} />
						<input type="hidden" name="poolSkillSource" value={fc.sourceType} />
						<input type="hidden" name="poolSkillSourceId" value={fc.sourceId} />
					{/each}
				{/each}
				{#if chosenSize}<input type="hidden" name="chosenSize" value={chosenSize} />{/if}
				{#each autoGrantedTools() as g}
					<input type="hidden" name="autoTool" value={g.tool} />
					<input type="hidden" name="autoToolSourceType" value={g.sourceType} />
					<input type="hidden" name="autoToolSourceId" value={g.sourceId??''} />
				{/each}
				{#each allToolChoices as tc}
					{#each (chosenToolPools[tc.sourceId]??[]) as tool}
						<input type="hidden" name="autoTool" value={tool} />
						<input type="hidden" name="autoToolSourceType" value={tc.sourceType} />
						<input type="hidden" name="autoToolSourceId" value={tc.sourceDbId??tc.sourceId??''} />
					{/each}
				{/each}
				{#each autoGrantedLanguages() as g}
					<input type="hidden" name="autoLanguage" value={g.language} />
					<input type="hidden" name="autoLanguageSourceType" value={g.sourceType} />
					<input type="hidden" name="autoLanguageSourceId" value={g.sourceId??''} />
				{/each}
				{#each allLanguageChoices as lc}
					{#each (chosenLanguagePools[lc.sourceId]??[]) as language}
						<input type="hidden" name="autoLanguage" value={language} />
						<input type="hidden" name="autoLanguageSourceType" value={lc.sourceType} />
						<input type="hidden" name="autoLanguageSourceId" value={lc.sourceDbId??lc.sourceId??''} />
					{/each}
				{/each}
				{#each autoGrantedInnateSpellSources() as src}
					<input type="hidden" name="innateSpellRaw" value={src.raw} />
					<input type="hidden" name="innateSpellSourceType" value={src.sourceType} />
					<input type="hidden" name="innateSpellSourceId" value={src.sourceId} />
				{/each}
				{#each autoGrantedDamageModifiers() as g}
					<input type="hidden" name="dmgModType" value={g.modifierType} />
					<input type="hidden" name="dmgModDamageType" value={g.damageType} />
					<input type="hidden" name="dmgModSourceType" value={g.sourceType} />
					<input type="hidden" name="dmgModSourceId" value={g.sourceId??''} />
				{/each}
				{#each asiChoices as c}
					<input type="hidden" name="asi_sourceClassId" value={c.sourceClassId} />
					<input type="hidden" name="asi_sourceLevel" value={c.sourceLevel} />
					<input type="hidden" name="asi_type" value={c.type} />
					<input type="hidden" name="asi_mode" value={c.mode??''} />
					<input type="hidden" name="asi_stat1" value={c.stat1??''} />
					<input type="hidden" name="asi_amount1" value={c.amount1??''} />
					<input type="hidden" name="asi_stat2" value={c.stat2??''} />
					<input type="hidden" name="asi_amount2" value={c.amount2??''} />
					<input type="hidden" name="asi_featId" value={c.featId??''} />
				{/each}
				{#each classAllocs as a}
					<input type="hidden" name="classId" value={a.classId} />
					<input type="hidden" name="subclassId" value={a.subclassId} />
					<input type="hidden" name="allocatedLevel" value={a.allocatedLevel} />
				{/each}
				{#each STATS as st}
					<input type="hidden" name="score_{st}" value={total[st]} />
				{/each}
				<button type="submit" class="btn btn-primary" disabled={!canSubmit}>Create Character</button>
			</form>
		</div>
	{/if}

	<!-- ── Bottom navigation ─────────────────────────────────────────── -->
	<div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.25rem;">
		<div>
			{#if step > 0}
				<button class="btn btn-ghost" onclick={back}>← Back</button>
			{/if}
		</div>
		<div style="display:flex;gap:0.5rem;align-items:center;">
			{#if step < STEPS.length - 1}
				<button class="btn btn-primary" onclick={next} disabled={!canAdvance}>Next: {nextLabel} →</button>
			{/if}
		</div>
	</div>

</div>