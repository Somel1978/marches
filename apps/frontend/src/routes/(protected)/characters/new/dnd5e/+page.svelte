<!-- apps/frontend/src/routes/(protected)/characters/new/dnd5e/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import { untrack } from 'svelte';
	import { generateFantasyName, isAsiFeatureName, isEpicBoonFeatureName } from '@core/ui';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const sys = $derived((data as any).systemData);

	// ── Steps ────────────────────────────────────────────────────────────────
	const BASE_STEPS  = [
		{ label: 'Identity'  },
		{ label: 'Species'   },
		{ label: 'Background'},
		{ label: 'Scores'    },
		{ label: 'Classes'   },
	];
	const REVIEW_STEP = { label: 'Review' };
	const ASI_STEP    = { label: 'ASI / Feats' };

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
	let sheetSpecies  = $state<any>(null); // mobile bottom sheet

	const selectedSpecies   = $derived((sys?.species ?? []).find((s: any) => s.id === speciesId) ?? null);
	const filteredSpecies   = $derived(
		(sys?.species ?? []).filter((s: any) => !speciesSearch || s.name.toLowerCase().includes(speciesSearch.toLowerCase()))
	);
	function openSpeciesSheet(sp: any) { sheetSpecies = sp; }
	function closeSpeciesSheet()       { sheetSpecies = null; }
	function selectSpecies(id: string) { speciesId = id; closeSpeciesSheet(); }
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
	let rolled       = $state(false);
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
		rolled = false;
	}
	const scoresValid = $derived(rolled || remaining === 0);

	// ── Step 5: Classes ───────────────────────────────────────────────────────
	let classAllocs  = $state<{ classId:string; subclassId:string; allocatedLevel:number }[]>([]);
	let classSearch  = $state('');
	let browseClassId = $state('');  // selected in browser
	let browseSubId   = $state('');  // subclass selected in browser
	let browseLevel   = $state(1);   // level for browsed class
	let openFeats     = $state<Set<string>>(new Set()); // expanded feature rows
	let sheetClass    = $state<any>(null); // mobile bottom sheet

	const totalLevel      = $derived(classAllocs.reduce((s,c) => s+(c.allocatedLevel||0), 0));
	const browseClass     = $derived((sys?.classes ?? []).find((c: any) => c.id === browseClassId) ?? null);
	const browseSub       = $derived((browseClass as any)?.subclasses?.find((s: any) => s.id === browseSubId) ?? null);
	const filteredClasses = $derived(
		(sys?.classes ?? []).filter((c: any) => c.isAvailable && (!classSearch || c.name.toLowerCase().includes(classSearch.toLowerCase())))
	);

	// Merged feature timeline for browseClass + browseSub
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

	// Same timeline for mobile sheet
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
		const pool = filteredClasses.length ? filteredClasses : (sys?.classes ?? []).filter((c: any) => c.isAvailable);
		if (!pool.length) return;
		const cls = pool[Math.floor(Math.random() * pool.length)];
		classAllocs = [{ classId: cls.id, subclassId:'', allocatedLevel:1 }];
	}
	const classesValid = $derived(totalLevel >= 1 && classAllocs.every(c => c.classId));

	// ── Step 6: ASI / Feats ──────────────────────────────────────────────────
	type AsiChoice = {
		sourceClassId: string;
		sourceLevel:   number;
		type:          'asi' | 'epic_boon';
		canEpicBoon:   boolean;
		mode:          'stat' | 'feat' | null;
		stat1:         string;
		amount1:       number;
		stat2:         string;
		amount2:       number;
		featId:        string;
		sourceName:    string;
		featGrantedStat?: string; // stat chosen for feat-granted ASI
	};

	// Compute ASI slots client-side — same logic as getCharacterSheet
	// Both class AND subclass features grant ASI/Epic Boon slots
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

	// asiChoices: one entry per slot, persisted
	let asiChoices = $state<AsiChoice[]>([]);

	// Sync asiChoices when slots change.
	// untrack() reads asiChoices without subscribing to it, preventing a circular dependency.
	$effect(() => {
		const slots = asiSlots; // reactive dependency
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
	let asiFeatSearch = $state<string[]>([]);
	$effect(() => { asiFeatSearch = asiSlots.map(() => ''); });

	// Dynamic steps — insert ASI step only when there are slots
	const STEPS = $derived(hasAsiStep
		? [...BASE_STEPS, ASI_STEP, REVIEW_STEP]
		: [...BASE_STEPS, REVIEW_STEP]
	);

	// Navigation — defined here because STEPS is derived above
	function next()            { if (canAdvance && step < STEPS.length - 1) step++; }
	function back()            { if (step > 0) step--; }
	function goTo(i: number)   { if (i <= step) step = i; }
	const nextLabel = $derived(step < STEPS.length - 1 ? STEPS[step + 1].label : '');

	// Step indices
	const ASI_STEP_IDX    = $derived(hasAsiStep ? 5 : -1);
	const REVIEW_STEP_IDX = $derived(hasAsiStep ? 6 : 5);

	// Available feats for ASI feat pick (all available feats)
	const availableFeats = $derived((sys?.feats ?? []).filter((f: any) => f.isAvailable !== false));

	// Epic Boon feats filtered by category
	const epicBoonFeats = $derived(
		(sys?.feats ?? []).filter((f: any) => f.isAvailable !== false &&
			(f.categories ?? '').split(',').map((s: string) => s.trim().toLowerCase()).includes('epic boon')
		)
	);

	// ASI feat ID — the "Ability Score Improvement" feat from systemData
	const asiFeatId = $derived(
		(sys?.feats ?? []).find((f: any) => isAsiFeatureName(f.name))?.id ?? ''
	);

	const asiValid = $derived(
		asiChoices.every(c => {
			if (c.type === 'epic_boon') return !!c.featId;
			if (c.mode === 'feat') {
				if (!c.featId) return false;
				const featDef = (sys?.feats ?? []).find((f: any) => f.id === c.featId);
				// If feat grants ASI and no fixed stat, player must choose one
				if (featDef?.asiAmount && !featDef.asiStatFixed && !c.featGrantedStat) return false;
				return true;
			}
			if (c.mode === 'stat')      return !!c.stat1 && c.amount1 > 0;
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
				scores, rolled, bonusGranted, bonus,
				classAllocs, asiChoices,
			}));
		} catch (_) {}
	}

	function restoreState() {
		if (!browser) return;
		try {
			const raw = sessionStorage.getItem(STORAGE_KEY);
			if (!raw) return;
			const s = JSON.parse(raw);
			if (s.step        !== undefined) step         = s.step;
			if (s.name        !== undefined) name         = s.name;
			if (s.avatarUrl   !== undefined) avatarUrl    = s.avatarUrl;
			if (s.portraitUrl !== undefined) portraitUrl  = s.portraitUrl;
			if (s.worldId     !== undefined) worldId      = s.worldId;
			if (s.speciesId   !== undefined) speciesId    = s.speciesId;
			if (s.backgroundId!== undefined) backgroundId = s.backgroundId;
			if (s.bgFeatPick  !== undefined) bgFeatPick   = s.bgFeatPick;
			if (s.scores      !== undefined) scores       = s.scores;
			if (s.rolled      !== undefined) rolled       = s.rolled;
			if (s.bonusGranted!== undefined) bonusGranted = s.bonusGranted;
			if (s.bonus       !== undefined) bonus        = s.bonus;
			if (s.classAllocs  !== undefined) classAllocs  = s.classAllocs;
		if (s.asiChoices   !== undefined) asiChoices   = s.asiChoices;
		} catch (_) {}
	}

	function clearState() {
		if (!browser) return;
		try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
	}

	// Restore on mount, save on every state change
	$effect(() => { restoreState(); });
	$effect(() => {
		// Track all state — any change triggers save
		void [step, name, avatarUrl, portraitUrl, worldId, speciesId, backgroundId,
			bgFeatPick, scores, rolled, bonusGranted, bonus, classAllocs, asiChoices];
		saveState();
	});

	// ── Validation ───────────────────────────────────────────────────────────
	const canAdvance = $derived.by(() => {
		switch (step) {
			case 0: return name.trim().length > 0;
			case 1: return !!speciesId;
			case 2: return !!backgroundId && bgFeatValid;
			case 3: return scoresValid;
			case 4: return classesValid;
			case 5: return !hasAsiStep || asiValid;
			default: return true;
		}
	});
	const canSubmit = $derived(
		name.trim().length > 0 && !!speciesId && !!backgroundId && bgFeatValid &&
		scoresValid && classesValid && (!hasAsiStep || asiValid)
	);
</script>

<div class="page">
	<!-- Header with always-visible Next -->
	<div class="page__header">
		<div>
			<h2 class="page__title">New Character</h2>
			<p style="margin:0;font-size:0.875rem;color:var(--text-muted);">D&D 5e · {data.slotInfo.available} slot{data.slotInfo.available===1?'':'s'} left</p>
		</div>
		<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
			{#if step > 0}<button class="btn btn-ghost btn-sm" onclick={back}>← Back</button>{/if}
			{#if step < STEPS.length - 1}
				<button class="btn btn-primary btn-sm" onclick={next} disabled={!canAdvance}>Next: {nextLabel} →</button>
			{/if}
			<a href="/characters/new" class="btn btn-ghost btn-sm">✕</a>
		</div>
	</div>

	<!-- Ribbon -->
	<div class="ribbon">
		{#each STEPS as s, i}
			<button class="ribbon__step"
				class:ribbon__step--active={i === step}
				class:ribbon__step--done={i < step}
				class:ribbon__step--clickable={i <= step}
				onclick={() => goTo(i)} disabled={i > step}>
				<span class="ribbon__num">Step {i+1}</span>
				<span class="ribbon__label">{s.label}</span>
			</button>
		{/each}
	</div>

	{#if form?.message}<div class="form-error" style="margin-bottom:1rem;">{(form as any).message}</div>{/if}

	<!-- ════ Step 1: Identity ════ -->
	{#if step === 0}
		<div class="wizard-identity-grid" style="display:grid;grid-template-columns:1fr 280px;gap:1rem;align-items:start;">
			<div class="card">
				<div class="page__header" style="margin-bottom:1rem;">
					<h3 class="section-title" style="margin:0;">Identity</h3>
					<button class="btn btn-ghost btn-sm" onclick={randomName}>🎲 Name</button>
				</div>
				<div class="field">
					<label class="label" for="char-name">Name</label>
					<input id="char-name" type="text" class="input" bind:value={name} placeholder="Character name" />
				</div>
				<div class="field">
					<label class="label" for="char-avatar">Avatar URL <span class="table__muted">(optional)</span></label>
					<input id="char-avatar" type="url" class="input" bind:value={avatarUrl} placeholder="https://…" />
				</div>
				<div class="field">
					<label class="label" for="char-portrait">Portrait URL <span class="table__muted">(optional)</span></label>
					<input id="char-portrait" type="url" class="input" bind:value={portraitUrl} placeholder="https://…" />
				</div>
				<div class="field">
					<label class="label" for="char-world">World <span class="table__muted">(optional)</span></label>
					<select id="char-world" class="input input--select" bind:value={worldId}>
						<option value="">Global (no world)</option>
						{#each data.activeWorlds as w}<option value={w.id}>{w.name}</option>{/each}
					</select>
				</div>
			</div>
			<div class="card" style="text-align:center;">
				<h3 class="section-title">Preview</h3>
				{#if avatarUrl}
					<img src={avatarUrl} alt="Avatar" style="width:120px;height:120px;border-radius:50%;object-fit:cover;margin:0 auto;display:block;"
						onerror={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none';}} />
				{:else}
					<div style="width:120px;height:120px;border-radius:50%;background:var(--bg-overlay);display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:2.5rem;">🧑</div>
				{/if}
				<p style="margin:0.75rem 0 0;font-weight:600;">{name||'Unnamed'}</p>
				{#if worldId}<p style="margin:0.25rem 0 0;font-size:0.8125rem;color:var(--text-muted);">{data.activeWorlds.find((w:any)=>w.id===worldId)?.name}</p>{/if}
			</div>
		</div>

	<!-- ════ Step 2: Species ════ -->
	{:else if step === 1}
		<!-- Desktop two-column -->
		<div class="wizard-two-col" style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:1rem;align-items:start;">
			<div>
				<div class="page__header" style="margin-bottom:0.75rem;">
					<input type="text" class="input" style="flex:1;max-width:260px;" placeholder="Search species…" bind:value={speciesSearch} />
					<button class="btn btn-ghost btn-sm" onclick={randomSpecies}>🎲 Random</button>
				</div>
				<div class="wizard-species-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:0.75rem;">
					{#each filteredSpecies as sp}
						<!-- Desktop: clicking selects + updates drawer -->
						<!-- Mobile: clicking opens sheet -->
						<button class="tarot" class:tarot--active={speciesId===sp.id}
							onclick={() => { speciesId=sp.id; openSpeciesSheet(sp); }}>
							<div class="tarot__badges">
								{#if sp.isLegacy}<span class="wizard-pill">Legacy</span>{/if}
								{#if sp.isSubrace}<span class="wizard-pill">Subrace</span>{/if}
							</div>
							<div class="tarot__icon">🧝</div>
							<h4 class="tarot__name">{sp.name}</h4>
							{#if sp.description}<p class="tarot__desc">{sp.description}</p>{/if}
						</button>
					{:else}
						<p class="table__empty" style="grid-column:1/-1;">No species match.</p>
					{/each}
				</div>
			</div>
			<!-- Desktop drawer — scrollable independently -->
			<div class="card wizard-drawer">
				{#if selectedSpecies}
					<h3 class="section-title">{selectedSpecies.name}</h3>
					{#if selectedSpecies.description}
						<p style="font-size:0.875rem;color:var(--text-secondary);margin:0 0 0.75rem;">{selectedSpecies.description}</p>
					{/if}
					{#if selectedSpecies.traits?.length}
						<p style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin:0 0 0.5rem;">Traits</p>
						<div style="display:flex;flex-direction:column;gap:0.5rem;">
							{#each selectedSpecies.traits as t}
								<div style="padding:0.5rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-md);">
									<p style="margin:0 0 0.125rem;font-size:0.8125rem;font-weight:700;color:var(--brand-accent);">{t.name}</p>
									{#if t.description}<p style="margin:0;font-size:0.8125rem;color:var(--text-secondary);">{t.description}</p>{/if}
								</div>
							{/each}
						</div>
					{/if}
				{:else}
					<p class="table__empty">Select a species to view traits.</p>
				{/if}
			</div>
		</div>

		<!-- Mobile bottom sheet -->
		{#if sheetSpecies}
			<button class="wizard-sheet-backdrop" onclick={closeSpeciesSheet} aria-label="Close"></button>
			<div class="wizard-sheet">
				<div class="wizard-sheet__handle">
					<div class="wizard-sheet__handle-bar"></div>
					<button class="btn btn-ghost btn-sm" onclick={closeSpeciesSheet}>✕</button>
				</div>
				<div class="wizard-sheet__body">
					<h3 class="section-title">{sheetSpecies.name}</h3>
					{#if sheetSpecies.isLegacy || sheetSpecies.isSubrace}
						<div style="display:flex;gap:0.25rem;margin-bottom:0.5rem;">
							{#if sheetSpecies.isLegacy}<span class="wizard-pill">Legacy</span>{/if}
							{#if sheetSpecies.isSubrace}<span class="wizard-pill">Subrace</span>{/if}
						</div>
					{/if}
					{#if sheetSpecies.description}
						<p style="font-size:0.875rem;color:var(--text-secondary);margin:0 0 0.75rem;">{sheetSpecies.description}</p>
					{/if}
					{#if sheetSpecies.traits?.length}
						<p style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin:0 0 0.5rem;">Traits</p>
						<div style="display:flex;flex-direction:column;gap:0.5rem;">
							{#each sheetSpecies.traits as t}
								<div style="padding:0.5rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-md);">
									<p style="margin:0 0 0.125rem;font-size:0.8125rem;font-weight:700;color:var(--brand-accent);">{t.name}</p>
									{#if t.description}<p style="margin:0;font-size:0.8125rem;color:var(--text-secondary);">{t.description}</p>{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
				<div class="wizard-sheet__footer">
					<button class="btn btn-primary" style="width:100%;" onclick={() => selectSpecies(sheetSpecies.id)}>
						{speciesId === sheetSpecies.id ? '✓ Selected' : `Select ${sheetSpecies.name}`}
					</button>
				</div>
			</div>
		{/if}

	<!-- ════ Step 3: Background ════ -->
	{:else if step === 2}
		<div class="wizard-two-col" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:1rem;align-items:start;">
			<!-- List -->
			<div>
				<div class="page__header" style="margin-bottom:0.75rem;">
					<input type="text" class="input" style="flex:1;max-width:260px;" placeholder="Search backgrounds…" bind:value={backgroundSearch} />
					<button class="btn btn-ghost btn-sm" onclick={randomBackground}>🎲 Random</button>
				</div>
				<div style="display:flex;flex-direction:column;gap:0.375rem;">
					{#each filteredBackgrounds as bg}
						<button class="wizard-bg-row" class:wizard-bg-row--active={backgroundId===bg.id}
							onclick={() => { backgroundId=bg.id; openBgSheet(bg); }}>
							<span style="font-weight:600;">{bg.name}</span>
							<div style="display:flex;gap:0.375rem;align-items:center;flex-wrap:wrap;">
								{#if bg.grantsFeat}
									<span class="badge badge-accent" style="font-size:0.6875rem;">🏅 {bg.grantsFeat.name}</span>
								{:else if bg.grantsFeatCategory}
									<span class="badge badge-accent" style="font-size:0.6875rem;">Grants {bg.grantsFeatCategory} feat</span>
								{/if}
								{#if backgroundId===bg.id}<span style="font-size:0.75rem;color:var(--color-success);">✓</span>{/if}
							</div>
						</button>
					{:else}
						<p class="table__empty">No backgrounds match.</p>
					{/each}
				</div>
			</div>

			<!-- Desktop drawer -->
			<div class="card wizard-drawer">
				{#if selectedBackground}
					{@const bg = selectedBackground as any}
					<h3 class="section-title">{bg.name}</h3>
					{#if bg.shortDescription}<p style="font-size:0.875rem;color:var(--text-secondary);margin:0 0 0.75rem;">{bg.shortDescription}</p>{/if}
					{#if bg.featureName}<p style="font-size:0.8125rem;font-weight:700;color:var(--brand-accent);margin:0 0 0.5rem;">{bg.featureName}</p>{/if}
					<div style="display:flex;flex-direction:column;gap:0.25rem;font-size:0.8125rem;color:var(--text-muted);margin-bottom:0.75rem;">
						{#if bg.skillProficiencies}<span><strong>Skills:</strong> {bg.skillProficiencies}</span>{/if}
						{#if bg.toolProficiencies}<span><strong>Tools:</strong> {bg.toolProficiencies}</span>{/if}
						{#if bg.languages}<span><strong>Languages:</strong> {bg.languages}</span>{/if}
					</div>
					{#if bg.grantsFeatId && bg.grantsFeat}
						<div style="padding:0.5rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-md);border:1px solid var(--border-accent);">
							<p style="margin:0 0 0.25rem;font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Granted Feat</p>
							<p style="margin:0;font-size:0.875rem;font-weight:700;color:var(--brand-accent);">🏅 {bg.grantsFeat.name}</p>
							{#if bg.grantsFeat.description}<p style="margin:0.25rem 0 0;font-size:0.8125rem;color:var(--text-secondary);">{bg.grantsFeat.description}</p>{/if}
						</div>
					{:else if bg.grantsFeatCategory}
						<div style="padding:0.5rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-md);border:1px solid var(--border-accent);">
							<p style="margin:0 0 0.5rem;font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Choose a {bg.grantsFeatCategory} Feat</p>
							<div style="display:flex;flex-direction:column;gap:0.25rem;max-height:200px;overflow-y:auto;">
								{#each bgFeatOptions as feat}
									<label style="display:flex;gap:0.5rem;align-items:flex-start;padding:0.375rem;border-radius:var(--radius-sm);background:{bgFeatPick===feat.id?'rgba(184,115,74,0.12)':'transparent'};cursor:pointer;">
										<input type="radio" name="bg-feat" value={feat.id} checked={bgFeatPick===feat.id} onchange={() => bgFeatPick=feat.id} style="margin-top:2px;accent-color:var(--brand-accent);" />
										<div>
											<p style="margin:0;font-size:0.875rem;font-weight:600;">{feat.name}</p>
											{#if feat.description}<p style="margin:0.125rem 0 0;font-size:0.75rem;color:var(--text-secondary);">{feat.description}</p>{/if}
										</div>
									</label>
								{/each}
							</div>
							{#if !bgFeatPick}<p style="margin:0.5rem 0 0;font-size:0.75rem;color:var(--color-warning);">⚠ Must choose a feat to continue.</p>{/if}
						</div>
					{/if}
				{:else}
					<p class="table__empty">Select a background to view details.</p>
				{/if}
			</div>
		</div>

		<!-- Mobile bottom sheet -->
		{#if sheetBg}
			{@const bg = sheetBg as any}
			<button class="wizard-sheet-backdrop" onclick={closeBgSheet} aria-label="Close"></button>
			<div class="wizard-sheet">
				<div class="wizard-sheet__handle">
					<div class="wizard-sheet__handle-bar"></div>
					<button class="btn btn-ghost btn-sm" onclick={closeBgSheet}>✕</button>
				</div>
				<div class="wizard-sheet__body">
					<h3 class="section-title">{bg.name}</h3>
					{#if bg.shortDescription}<p style="font-size:0.875rem;color:var(--text-secondary);margin:0 0 0.75rem;">{bg.shortDescription}</p>{/if}
					<div style="display:flex;flex-direction:column;gap:0.25rem;font-size:0.8125rem;color:var(--text-muted);margin-bottom:0.75rem;">
						{#if bg.skillProficiencies}<span><strong>Skills:</strong> {bg.skillProficiencies}</span>{/if}
						{#if bg.toolProficiencies}<span><strong>Tools:</strong> {bg.toolProficiencies}</span>{/if}
						{#if bg.languages}<span><strong>Languages:</strong> {bg.languages}</span>{/if}
					</div>
					{#if bg.grantsFeatId && bg.grantsFeat}
						<div style="padding:0.5rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-md);border:1px solid var(--border-accent);margin-bottom:0.75rem;">
							<p style="margin:0;font-size:0.875rem;font-weight:700;color:var(--brand-accent);">🏅 {bg.grantsFeat.name} (auto-granted)</p>
						</div>
					{:else if bg.grantsFeatCategory}
						<div style="padding:0.5rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-md);border:1px solid var(--border-accent);margin-bottom:0.75rem;">
							<p style="margin:0 0 0.5rem;font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Choose a {bg.grantsFeatCategory} Feat</p>
							<div style="display:flex;flex-direction:column;gap:0.25rem;">
								{#each bgFeatOptions as feat}
									<label style="display:flex;gap:0.5rem;align-items:flex-start;padding:0.375rem;border-radius:var(--radius-sm);background:{bgFeatPick===feat.id?'rgba(184,115,74,0.12)':'transparent'};cursor:pointer;">
										<input type="radio" name="bg-feat-mobile" value={feat.id} checked={bgFeatPick===feat.id} onchange={() => bgFeatPick=feat.id} style="margin-top:2px;accent-color:var(--brand-accent);" />
										<div>
											<p style="margin:0;font-size:0.875rem;font-weight:600;">{feat.name}</p>
											{#if feat.description}<p style="margin:0.125rem 0 0;font-size:0.75rem;color:var(--text-secondary);">{feat.description}</p>{/if}
										</div>
									</label>
								{/each}
							</div>
						</div>
					{/if}
				</div>
				<div class="wizard-sheet__footer">
					<button class="btn btn-primary" style="width:100%;"
						disabled={!!(bg.grantsFeatCategory && !bgFeatPick)}
						onclick={() => selectBg(bg.id)}>
						{backgroundId===bg.id ? '✓ Selected' : `Select ${bg.name}`}
					</button>
				</div>
			</div>
		{/if}

	<!-- ════ Step 4: Ability Scores ════ -->
	{:else if step === 3}
		<div class="card" style="max-width:640px;width:100%;box-sizing:border-box;overflow:hidden;">
			<div class="page__header" style="margin-bottom:0.75rem;">
				<h3 class="section-title" style="margin:0;">{rolled?'Rolled Stats':'Point-Buy Stats'}</h3>
				<div style="display:flex;gap:0.375rem;flex-wrap:wrap;">
					<button class="btn btn-ghost btn-sm" onclick={rollScores}>🎲 Roll 4d6</button>
					{#if rolled}<button class="btn btn-ghost btn-sm" onclick={resetPointBuy}>Point Buy</button>{/if}
				</div>
			</div>

			{#if !rolled}
				<div style="margin-bottom:0.75rem;">
					<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.25rem;">
						<span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-secondary);">Standard Points</span>
						<span style="font-size:1.125rem;font-weight:700;color:{remaining===0?'var(--color-success)':remaining<4?'var(--color-warning)':'var(--brand-accent)'};">{remaining} <span style="font-size:0.8125rem;font-weight:400;color:var(--text-muted);">/ {BUDGET}</span></span>
					</div>
					<div style="height:6px;background:var(--bg-overlay);border-radius:99px;overflow:hidden;">
						<div style="height:100%;width:{Math.min((spent/BUDGET)*100,100)}%;background:{remaining===0?'var(--color-success)':remaining<4?'var(--color-warning)':'var(--brand-accent)'};border-radius:99px;transition:width var(--transition-base);"></div>
					</div>
				</div>
			{:else}
				<p style="font-size:0.8125rem;color:var(--text-muted);margin:0 0 0.75rem;">Rolled 4d6 drop-lowest. Adjust with +/−.</p>
			{/if}

			<!-- Bonus pool -->
			<div style="margin-bottom:0.75rem;padding:0.5rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-md);">
				<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
					<div style="display:flex;align-items:center;gap:0.5rem;">
						<span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-secondary);">Bonus Points (DM granted)</span>
						<div style="display:flex;align-items:center;gap:0.25rem;">
							<button class="wizard-ctrl-btn" style="width:22px;height:22px;font-size:0.875rem;" onclick={() => {if(bonusGranted>0)bonusGranted--;}}>−</button>
							<span style="min-width:20px;text-align:center;font-size:0.875rem;font-weight:700;color:#8E44AD;">{bonusGranted}</span>
							<button class="wizard-ctrl-btn" style="width:22px;height:22px;font-size:0.875rem;" onclick={() => bonusGranted++}>+</button>
						</div>
					</div>
					{#if bonusGranted>0}
						<span style="font-size:1.125rem;font-weight:700;color:{bonusLeft===0?'var(--color-success)':'#8E44AD'};">{bonusLeft} <span style="font-size:0.8125rem;font-weight:400;color:var(--text-muted);">/ {bonusGranted}</span></span>
					{/if}
				</div>
			</div>

			<div class="wizard-scores-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.625rem;width:100%;">
				{#each STATS as st}
					{@const bon = bonus[st]}
					<div class="wizard-stat-box">
						<p class="wizard-stat-box__label">{STAT_LABEL[st]}</p>
						<div style="display:flex;align-items:baseline;justify-content:center;gap:0.375rem;">
							<span class="wizard-stat-box__value">{total[st]}</span>
							<span class="wizard-stat-box__mod">{mod(total[st])}</span>
							{#if bon>0}<span style="font-size:0.6875rem;padding:0.0625rem 0.3rem;background:#8E44AD22;color:#8E44AD;border-radius:99px;">+{bon}</span>{/if}
						</div>
						<div style="display:flex;gap:0.375rem;justify-content:center;margin-top:0.5rem;">
							<button class="wizard-ctrl-btn" disabled={!canDec(st)} onclick={() => dec(st)}>−</button>
							<button class="wizard-ctrl-btn" disabled={!canInc(st)} onclick={() => inc(st)}>+</button>
						</div>
						{#if !rolled}<p class="wizard-stat-box__cost">{POINT_COSTS[scores[st]]??0} pts</p>{/if}
						{#if bonusGranted>0}
							<div style="display:flex;gap:0.25rem;justify-content:center;margin-top:0.375rem;padding-top:0.375rem;border-top:1px solid var(--border-muted);">
								<button class="wizard-ctrl-btn" style="border-color:#8E44AD44;" disabled={!canBonusDec(st)} onclick={() => bonusDec(st)}>−</button>
								<span style="min-width:20px;text-align:center;font-size:0.75rem;color:#8E44AD;font-weight:700;display:flex;align-items:center;justify-content:center;">{bon>0?`+${bon}`:'·'}</span>
								<button class="wizard-ctrl-btn" style="border-color:#8E44AD44;" disabled={!canBonusInc(st)} onclick={() => bonusInc(st)}>+</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

	<!-- ════ Step 5: Classes ════ -->
	{:else if step === 4}
		<div class="wizard-two-col" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.5fr);gap:1rem;align-items:start;">

			<!-- Left: class list -->
			<div>
				<div class="page__header" style="margin-bottom:0.75rem;">
					<input type="text" class="input" style="flex:1;" placeholder="Search classes…" bind:value={classSearch} />
					<button class="btn btn-ghost btn-sm" onclick={randomClass}>🎲 Random</button>
				</div>
				<div style="display:flex;flex-direction:column;gap:0.375rem;">
					{#each filteredClasses as cls}
						<button class="wizard-class-card" class:wizard-class-card--active={browseClassId===cls.id}
							onclick={() => { selectBrowseClass(cls.id); openClassSheet(cls); }}>
							<div style="display:flex;align-items:center;justify-content:space-between;width:100%;gap:0.5rem;">
								<span style="font-weight:700;font-size:0.9375rem;">{cls.name}</span>
								<div style="display:flex;gap:0.375rem;align-items:center;flex-shrink:0;">
									{#if cls.hitDice}<span class="badge badge-muted" style="font-size:0.6875rem;">d{cls.hitDice}</span>{/if}
									{#if classAllocs.find((a: any)=>a.classId===cls.id)}<span class="badge badge-accent" style="font-size:0.6875rem;">✓</span>{/if}
								</div>
							</div>
							{#if cls.primaryAbilities}<p style="margin:0.125rem 0 0;font-size:0.75rem;color:var(--text-muted);">{cls.primaryAbilities}</p>{/if}
						</button>
					{:else}
						<p class="table__empty">No classes match.</p>
					{/each}
				</div>
			</div>

			<!-- Right: class detail + allocations (hidden on mobile, use sheet) -->
			<div class="wizard-drawer wizard-class-detail" style="display:flex;flex-direction:column;gap:0.75rem;">
				{#if browseClass}
					{@const bc = browseClass as any}
					<div class="card" style="padding:0.875rem;">
						<!-- Header + Add button -->
						<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem;margin-bottom:0.625rem;">
							<div>
								<h3 style="margin:0;font-size:1.0625rem;font-weight:700;">{bc.name}</h3>
								<div style="display:flex;gap:0.375rem;margin-top:0.25rem;flex-wrap:wrap;">
									{#if bc.hitDice}<span class="badge badge-muted">d{bc.hitDice} Hit Die</span>{/if}
									{#if bc.primaryAbilities}<span class="badge badge-muted">{bc.primaryAbilities}</span>{/if}
								</div>
							</div>
							<button class="btn btn-primary btn-sm" onclick={addBrowseClass}>
								{classAllocs.find((a: any)=>a.classId===bc.id)?'Update':'+ Add'}
							</button>
						</div>
						{#if bc.description}<p style="font-size:0.8125rem;color:var(--text-secondary);margin:0 0 0.75rem;">{bc.description}</p>{/if}

						<!-- Level + subclass -->
						<div style="display:flex;gap:0.5rem;align-items:flex-end;flex-wrap:wrap;margin-bottom:0.625rem;">
							<div class="field" style="flex:0 0 80px;margin:0;">
								<label class="label" for="browse-level">Level</label>
								<input id="browse-level" type="number" class="input" min="1" max="20" bind:value={browseLevel} />
							</div>
							<div style="flex:1;height:6px;background:var(--bg-overlay);border-radius:99px;overflow:hidden;align-self:center;">
								<div style="height:100%;width:{Math.min((browseLevel/20)*100,100)}%;background:var(--brand-accent);border-radius:99px;transition:width var(--transition-base);"></div>
							</div>
						</div>

						<!-- Subclass cards -->
						{#if bc.subclasses?.length}
							{@const availSubs = bc.subclasses.filter((s: any) => browseLevel >= (bc.subclassAvailableAtLevel ?? 3))}
							{#if availSubs.length}
								<p style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin:0 0 0.375rem;">Subclass</p>
								<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:0.375rem;margin-bottom:0.625rem;">
									{#each availSubs as sub}
										<button
											style="padding:0.375rem 0.5rem;background:{browseSubId===sub.id?'rgba(184,115,74,0.15)':'var(--bg-overlay)'};border:1px solid {browseSubId===sub.id?'var(--border-accent)':'var(--border-muted)'};border-radius:var(--radius-sm);cursor:pointer;font-size:0.8125rem;font-weight:600;text-align:left;color:var(--text-primary);transition:all var(--transition-fast);"
											onclick={() => browseSubId = browseSubId===sub.id?'':sub.id}>
											{sub.name}
										</button>
									{/each}
								</div>
								{#if browseSub}
									{@const bs = browseSub as any}
									{#if bs.description}<p style="font-size:0.8125rem;color:var(--text-secondary);margin:0 0 0.625rem;padding:0.5rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-md);">{bs.description}</p>{/if}
								{/if}
							{:else}
								<p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 0.625rem;">Subclass available at level {bc.subclassAvailableAtLevel ?? 3}.</p>
							{/if}
						{/if}
					</div>

					<!-- Feature timeline -->
					{#if featureTimeline.length}
						<div class="card" style="padding:0.875rem;">
							<p style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin:0 0 0.5rem;">
								Feature Timeline {browseSub?`(${(browseClass as any).name} + ${(browseSub as any).name})`:`(${(browseClass as any).name})`}
							</p>
							<div class="feat-timeline">
								{#each featureTimeline as feat}
									{@const open = openFeats.has(feat.id)}
									<div class="feat-row">
										<button class="feat-row__header" onclick={() => toggleFeat(feat.id)}>
											<span class="feat-row__level">{feat.level}</span>
											<span class="feat-row__name">{feat.name}</span>
											<span class="feat-row__source">
												<span class="badge" style="font-size:0.625rem;background:{feat.sourceType==='subclass'?'rgba(142,68,173,0.15)':'rgba(184,115,74,0.12)'};color:{feat.sourceType==='subclass'?'#8E44AD':'var(--brand-accent)'};">{feat.source}</span>
											</span>
											<span class="feat-row__chevron" class:feat-row__chevron--open={open}>▶</span>
										</button>
										{#if open && feat.description}
											<div class="feat-row__body">{feat.description}</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}
				{:else}
					<div class="card" style="padding:0.875rem;">
						<p class="table__empty">Select a class to view its details and features.</p>
					</div>
				{/if}

				<!-- Current allocations -->
				{#if classAllocs.length}
					<div class="card" style="padding:0.875rem;">
						<p style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin:0 0 0.5rem;">Your Classes</p>
						<div style="display:flex;flex-direction:column;gap:0.375rem;">
							{#each classAllocs as a, i}
								{@const cls = (sys?.classes ?? []).find((c: any) => c.id === a.classId)}
								{@const sub = cls?.subclasses?.find((s: any) => s.id === a.subclassId)}
								{@const subs = subclassesFor(a.classId, a.allocatedLevel)}
								<div class="wizard-class-row" style="margin:0;">
									<div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
										<div style="display:flex;align-items:center;gap:0.375rem;flex-wrap:wrap;">
											<strong style="font-size:0.875rem;">{cls?.name ?? '?'}</strong>
											{#if sub}<span class="table__muted" style="font-size:0.8125rem;">· {sub.name}</span>{/if}
											<span class="badge badge-accent">Lv {a.allocatedLevel}</span>
										</div>
										<div style="display:flex;gap:0.25rem;align-items:center;">
											<button class="wizard-ctrl-btn" onclick={() => { a.allocatedLevel = Math.max(1, a.allocatedLevel-1); }}>−</button>
											<button class="wizard-ctrl-btn" onclick={() => { a.allocatedLevel = Math.min(20, a.allocatedLevel+1); }}>+</button>
											<button class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick={() => removeClass(i)}>✕</button>
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
						<div style="display:flex;align-items:center;justify-content:space-between;margin-top:0.5rem;">
							<span style="font-size:0.8125rem;color:var(--text-muted);">Total: <strong style="color:var(--brand-accent);">{totalLevel}</strong></span>
							<span style="font-size:0.75rem;color:var(--text-muted);">← Select another class to multiclass</span>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Mobile bottom sheet for class -->
		{#if sheetClass}
			{@const sc = sheetClass as any}
			<button class="wizard-sheet-backdrop" onclick={closeClassSheet} aria-label="Close"></button>
			<div class="wizard-sheet">
				<div class="wizard-sheet__handle">
					<div class="wizard-sheet__handle-bar"></div>
					<button class="btn btn-ghost btn-sm" onclick={closeClassSheet}>✕</button>
				</div>
				<div class="wizard-sheet__body">
					<h3 class="section-title">{sc.name}</h3>
					<div style="display:flex;gap:0.375rem;margin-bottom:0.5rem;">
						{#if sc.hitDice}<span class="badge badge-muted">d{sc.hitDice}</span>{/if}
						{#if sc.primaryAbilities}<span class="badge badge-muted">{sc.primaryAbilities}</span>{/if}
					</div>
					{#if sc.description}<p style="font-size:0.875rem;color:var(--text-secondary);margin:0 0 0.75rem;">{sc.description}</p>{/if}
					{#if sheetTimeline.length}
						<p style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin:0 0 0.375rem;">Features</p>
						<div class="feat-timeline">
							{#each sheetTimeline as feat}
								{@const open = openFeats.has(feat.id)}
								<div class="feat-row">
									<button class="feat-row__header" onclick={() => toggleFeat(feat.id)}>
										<span class="feat-row__level">{feat.level}</span>
										<span class="feat-row__name">{feat.name}</span>
										<span class="feat-row__chevron" class:feat-row__chevron--open={open}>▶</span>
									</button>
									{#if open && feat.description}
										<div class="feat-row__body">{feat.description}</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
				<div class="wizard-sheet__footer">
					<div style="display:flex;gap:0.5rem;align-items:flex-end;margin-bottom:0.5rem;">
						<div class="field" style="flex:0 0 80px;margin:0;">
							<label class="label" for="sheet-level">Level</label>
							<input id="sheet-level" type="number" class="input" min="1" max="20" bind:value={browseLevel} />
						</div>
						{#if sc.subclasses?.filter((s: any) => browseLevel >= (sc.subclassAvailableAtLevel ?? 3)).length}
							<div class="field" style="flex:1;margin:0;">
								<label class="label" for="sheet-sub">Subclass</label>
								<select id="sheet-sub" class="input input--select" bind:value={browseSubId}>
									<option value="">None yet</option>
									{#each sc.subclasses.filter((s: any) => browseLevel >= (sc.subclassAvailableAtLevel ?? 3)) as s}
										<option value={s.id}>{s.name}</option>
									{/each}
								</select>
							</div>
						{/if}
					</div>
					<button class="btn btn-primary" style="width:100%;" onclick={() => { addBrowseClass(); closeClassSheet(); }}>
						{classAllocs.find((a: any)=>a.classId===sc.id)?'Update':'+ Add Class'}
					</button>
				</div>
			</div>
		{/if}

	<!-- ════ Step 6: ASI / Feats ════ -->
	{:else if step === ASI_STEP_IDX}
		<div style="display:flex;flex-direction:column;gap:1rem;">
			<div class="card" style="padding:0.875rem;">
				<h3 class="section-title" style="margin:0 0 0.25rem;">Ability Score Improvements & Feats</h3>
				<p style="font-size:0.8125rem;color:var(--text-muted);margin:0 0 1rem;">
					Your classes grant the following improvements. Choose for each slot.
				</p>
				<div style="display:flex;flex-direction:column;gap:1rem;">
					{#each asiChoices as choice, i}
						{@const isEpicBoon = choice.type === 'epic_boon'}
						<div style="padding:0.75rem;background:var(--bg-overlay);border-radius:var(--radius-md);border:1px solid var(--border-muted);">
							<!-- Slot header -->
							<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.625rem;flex-wrap:wrap;">
								<span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);">
									{choice.sourceName} · Lv {choice.sourceLevel}
								</span>
								{#if isEpicBoon}
									<span class="badge badge-accent" style="font-size:0.6875rem;">Epic Boon</span>
								{:else}
									<span class="badge badge-muted" style="font-size:0.6875rem;">ASI</span>
								{/if}
							</div>

							{#if isEpicBoon}
								<!-- Epic Boon — search + card picker -->
								{@const epicSearch = asiFeatSearch[i] ?? ''}
								{@const epicFiltered = epicBoonFeats.filter((f: any) => !epicSearch || f.name.toLowerCase().includes(epicSearch.toLowerCase()))}
								{@const epicPicked = epicBoonFeats.find((f: any) => f.id === asiChoices[i].featId)}
								<div style="margin:0;">
									<p style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin:0 0 0.375rem;">Choose an Epic Boon Feat</p>
									{#if epicPicked}
										<div style="padding:0.5rem 0.625rem;background:rgba(184,115,74,0.12);border:1px solid var(--border-accent);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:space-between;margin-bottom:0.375rem;">
											<span style="font-weight:700;font-size:0.875rem;">{epicPicked.name}</span>
											<button type="button" class="btn btn-ghost btn-sm" style="font-size:0.75rem;" onclick={() => { asiChoices[i].featId = ''; asiChoices[i].featGrantedStat = ''; }}>Change</button>
										</div>
									{:else}
										<input type="text" class="input" placeholder="Search epic boon feats…" style="margin-bottom:0.375rem;font-size:0.8125rem;"
											value={epicSearch} oninput={(e) => { const v = (e.target as HTMLInputElement).value; asiFeatSearch = asiFeatSearch.map((s,j) => j===i?v:s); }} />
										<div style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:0.25rem;">
											{#each epicFiltered as feat}
												<button type="button"
													style="text-align:left;padding:0.5rem 0.625rem;background:var(--bg-overlay);border:1px solid var(--border-muted);border-radius:var(--radius-sm);cursor:pointer;"
													onclick={() => { asiChoices[i].featId = feat.id; asiChoices[i].mode = 'feat'; }}>
													<p style="font-weight:700;font-size:0.8125rem;margin:0 0 0.125rem;">{feat.name}</p>
													{#if feat.description}<p style="font-size:0.75rem;color:var(--text-secondary);margin:0;">{feat.description.slice(0,120)}{feat.description.length>120?'…':''}</p>{/if}
												</button>
											{/each}
										</div>
									{/if}
								</div>
							{:else}
								<!-- ASI — choose mode first -->
								<div style="display:flex;gap:0.5rem;margin-bottom:0.625rem;flex-wrap:wrap;">
									<button
										class="btn btn-sm"
										class:btn-primary={asiChoices[i].mode === 'stat'}
										class:btn-ghost={asiChoices[i].mode !== 'stat'}
										onclick={() => { asiChoices[i].mode = 'stat'; asiChoices[i].featId = ''; }}>
										+2 / +1+1
									</button>
									<button
										class="btn btn-sm"
										class:btn-primary={asiChoices[i].mode === 'feat'}
										class:btn-ghost={asiChoices[i].mode !== 'feat'}
										onclick={() => { asiChoices[i].mode = 'feat'; asiChoices[i].stat1 = ''; asiChoices[i].stat2 = ''; }}>
										Take a Feat
									</button>
								</div>

								{#if asiChoices[i].mode === 'stat'}
									<!-- Stat bump UI -->
									<div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:flex-end;">
										<div class="field" style="margin:0;flex:1;min-width:140px;">
											<label class="label" for="asi-stat1-{i}">Stat</label>
											<select id="asi-stat1-{i}" class="input input--select" bind:value={asiChoices[i].stat1}>
												<option value="">— Choose stat —</option>
												{#each STATS as st}<option value={st}>{STAT_LABEL[st]}</option>{/each}
											</select>
										</div>
										<div class="field" style="margin:0;flex:0 0 80px;">
											<label class="label" for="asi-amount1-{i}">Amount</label>
											<select id="asi-amount1-{i}" class="input input--select" bind:value={asiChoices[i].amount1}
												onchange={() => { if (asiChoices[i].amount1 === 2) { asiChoices[i].stat2 = ''; asiChoices[i].amount2 = 0; } else { asiChoices[i].amount2 = 1; } }}>
												<option value={2}>+2</option>
												<option value={1}>+1</option>
											</select>
										</div>
										{#if asiChoices[i].amount1 === 1}
											<div class="field" style="margin:0;flex:1;min-width:140px;">
												<label class="label" for="asi-stat2-{i}">Second Stat (+1)</label>
												<select id="asi-stat2-{i}" class="input input--select" bind:value={asiChoices[i].stat2}>
													<option value="">— Choose stat —</option>
													{#each STATS as st}
														{#if st !== asiChoices[i].stat1}
															<option value={st}>{STAT_LABEL[st]}</option>
														{/if}
													{/each}
												</select>
											</div>
										{/if}
									</div>
								{:else if asiChoices[i].mode === 'feat'}
									<!-- Feat search + card picker -->
									{@const featSearch = asiFeatSearch[i] ?? ''}
									{@const featFiltered = availableFeats.filter((f: any) => !featSearch || f.name.toLowerCase().includes(featSearch.toLowerCase()))}
									{@const featPicked = availableFeats.find((f: any) => f.id === asiChoices[i].featId)}
									<div style="margin:0;">
										{#if featPicked}
											<div style="padding:0.5rem 0.625rem;background:rgba(184,115,74,0.12);border:1px solid var(--border-accent);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:space-between;margin-bottom:0.375rem;">
												<div>
													<p style="font-weight:700;font-size:0.875rem;margin:0 0 0.125rem;">{featPicked.name}</p>
													{#if featPicked.description}<p style="font-size:0.75rem;color:var(--text-secondary);margin:0;">{featPicked.description.slice(0,120)}{featPicked.description.length>120?'…':''}</p>{/if}
												</div>
												<button type="button" class="btn btn-ghost btn-sm" style="font-size:0.75rem;flex-shrink:0;" onclick={() => { asiChoices[i].featId = ''; }}>Change</button>
											</div>
										{#if featPicked && featPicked.asiAmount && !featPicked.asiStatFixed}
											{@const choices = featPicked.asiStatChoices ? featPicked.asiStatChoices.split(',').map((s: string) => s.trim()) : STATS}
											<div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.375rem;padding:0.5rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-sm);border:1px solid var(--border-muted);">
												<span style="font-size:0.8125rem;color:var(--text-secondary);white-space:nowrap;">+{featPicked.asiAmount} to</span>
												<select class="input input--select" style="flex:1;" bind:value={asiChoices[i].featGrantedStat}>
													<option value="">— Choose stat —</option>
													{#each choices as st}<option value={st}>{STAT_LABEL[st] ?? st}</option>{/each}
												</select>
											</div>
										{:else if featPicked && featPicked.asiAmount && featPicked.asiStatFixed}
											<p style="font-size:0.8125rem;color:var(--color-success);margin:0.375rem 0 0;">✓ Grants +{featPicked.asiAmount} {STAT_LABEL[featPicked.asiStatFixed] ?? featPicked.asiStatFixed} automatically</p>
										{/if}
										{:else}
											<input type="text" class="input" placeholder="Search feats…" style="margin-bottom:0.375rem;font-size:0.8125rem;"
												value={featSearch} oninput={(e) => { const v = (e.target as HTMLInputElement).value; asiFeatSearch = asiFeatSearch.map((s,j) => j===i?v:s); }} />
											<div style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:0.25rem;">
												{#each featFiltered as feat}
													<button type="button"
														style="text-align:left;padding:0.5rem 0.625rem;background:var(--bg-overlay);border:1px solid var(--border-muted);border-radius:var(--radius-sm);cursor:pointer;"
														onclick={() => { asiChoices[i].featId = feat.id; asiChoices[i].featGrantedStat = feat.asiStatFixed ?? ''; }}>
														<p style="font-weight:700;font-size:0.8125rem;margin:0 0 0.125rem;">{feat.name}</p>
														{#if feat.asiAmount}<p style="font-size:0.7rem;color:var(--color-success);margin:0 0 0.0625rem;">+{feat.asiAmount} {feat.asiStatFixed ? (STAT_LABEL[feat.asiStatFixed] ?? feat.asiStatFixed) : 'stat (your choice)'}</p>{/if}
														{#if feat.description}<p style="font-size:0.75rem;color:var(--text-secondary);margin:0;">{feat.description.slice(0,120)}{feat.description.length>120?'…':''}</p>{/if}
													</button>
												{/each}
											</div>
										{/if}
									</div>
								{/if}
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>

	<!-- ════ Step 6/7: Review ════ -->
	{:else if step === REVIEW_STEP_IDX}
		<div class="card">
			<div style="display:flex;gap:1rem;align-items:flex-start;flex-wrap:wrap;margin-bottom:1rem;">
				{#if avatarUrl}
					<img src={avatarUrl} alt={name} style="width:72px;height:72px;border-radius:50%;object-fit:cover;" />
				{/if}
				<div>
					<h3 style="margin:0;font-size:1.25rem;">{name}</h3>
					<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.25rem;">
						<span class="badge badge-accent">Level {totalLevel}</span>
						<span class="badge badge-muted">{selectedSpecies?.name??'—'}</span>
						<span class="badge badge-muted">{selectedBackground?.name??'—'}</span>
						<span class="badge badge-muted">{data.activeWorlds.find((w:any)=>w.id===worldId)?.name??'Global'}</span>
					</div>
				</div>
			</div>

			<h4 class="section-title">Ability Scores</h4>
			<div class="wizard-review-stats" style="display:grid;grid-template-columns:repeat(6,1fr);gap:0.5rem;text-align:center;margin-bottom:1rem;">
				{#each STATS as st}
					{@const base = total[st]}
					{@const final = finalScores[st]}
					{@const bump = final - base}
					<div class="wizard-stat-box" style="padding:0.5rem;">
						<p class="wizard-stat-box__label">{STAT_LABEL[st]}</p>
						<p class="wizard-stat-box__value" style="font-size:1.375rem;">{final}</p>
						{#if bump > 0}<p style="font-size:0.6875rem;color:var(--color-success);margin:0;">+{bump} ASI</p>{/if}
						<p class="wizard-stat-box__mod">{mod(final)}</p>
					</div>
				{/each}
			</div>

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

			{#if hasAsiStep && asiChoices.length}
				<h4 class="section-title">ASI / Feats</h4>
				<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">
					{#each asiChoices as c}
						<div style="font-size:0.8125rem;padding:0.25rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-sm);">
							<span class="table__muted">{c.sourceName} Lv {c.sourceLevel}:</span>
							{#if c.mode === 'feat' || c.type === 'epic_boon'}
								{(sys?.feats??[]).find((f:any)=>f.id===c.featId)?.name ?? '—'}
							{:else if c.mode === 'stat'}
								{STAT_LABEL[c.stat1] ?? '—'} +{c.amount1}{c.stat2 ? `, ${STAT_LABEL[c.stat2]} +${c.amount2}` : ''}
							{:else}
								<span style="color:var(--color-warning);">Not chosen</span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			{#if !canSubmit}
				<div class="form-error" style="margin-bottom:1rem;">
					{#if !scoresValid&&!rolled}Point buy not fully spent ({remaining} remaining). {/if}
					{#if totalLevel<1}At least one class required. {/if}
					{#if !classAllocs.every(c=>c.classId)}All class rows need a class. {/if}
					{#if !bgFeatValid}Background feat selection required. {/if}
					{#if hasAsiStep && !asiValid}All ASI/Feat slots must be completed. {/if}
				</div>
			{:else}
				<p style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:1rem;">Submitting creates your character pending approval.</p>
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
				{#each asiChoices as c, i}
					<input type="hidden" name="asi_sourceClassId" value={c.sourceClassId} />
					<input type="hidden" name="asi_sourceLevel"   value={c.sourceLevel} />
					<input type="hidden" name="asi_type"          value={c.type} />
					<input type="hidden" name="asi_mode"          value={c.mode ?? ''} />
					<input type="hidden" name="asi_stat1"         value={c.mode === 'feat' ? (c.featGrantedStat ?? '') : (c.stat1 ?? '')} />
					<input type="hidden" name="asi_amount1"       value={c.amount1 ?? ''} />
					<input type="hidden" name="asi_stat2"         value={c.stat2 ?? ''} />
					<input type="hidden" name="asi_amount2"       value={c.amount2 ?? ''} />
					<input type="hidden" name="asi_featId"        value={c.featId ?? ''} />
				{/each}
				{#each classAllocs as a}
					<input type="hidden" name="classId"        value={a.classId} />
					<input type="hidden" name="subclassId"     value={a.subclassId} />
					<input type="hidden" name="allocatedLevel" value={a.allocatedLevel} />
				{/each}
				{#each STATS as st}
					<input type="hidden" name="score_{st}" value={finalScores[st]} />
				{/each}
				<button type="submit" class="btn btn-primary" disabled={!canSubmit}>Create Character</button>
			</form>
		</div>
	{/if}

	<div style="display:flex;justify-content:flex-start;margin-top:1.5rem;">
		{#if step > 0}<button class="btn btn-ghost" onclick={back}>← Back</button>{/if}
	</div>
</div>