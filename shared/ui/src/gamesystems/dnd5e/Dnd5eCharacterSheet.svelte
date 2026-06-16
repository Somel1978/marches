<!-- shared/ui/src/gamesystems/dnd5e/Dnd5eCharacterSheet.svelte -->
<!-- Pure UI component — no SvelteKit imports. All actions via callbacks. -->
<script lang="ts">
	import { untrack } from 'svelte';
	import Dnd5eSpellbooks from './Dnd5eSpellbooks.svelte';
	let {
		charSheet,
		systemData,
		scoreAudit             = [],
		canEdit                = false,
		isLevelUp              = false,
		isLevelDown            = false,
		availableLevel         = 0,
		onSaveAbilityScores,
		onSubmitChanges,
		onSubmitLevelUp,
		onSaveSlot,
		onRemoveFeat,
		onManualScoreAdjust,
		canManage              = false,
		editBlockedReason,
		spellbooks             = [],
		onCreateSpellbook,
		onRenameSpellbook,
		onDeleteSpellbook,
		onAddSpellbookEntry,
		onRemoveSpellbookEntry,
		onToggleSpellPrepared,
	}: {
		charSheet?:                any;
		systemData?:               any;
		scoreAudit?:               any[];
		canEdit?:                  boolean;
		isLevelUp?:                boolean;
		isLevelDown?:              boolean;
		availableLevel?:           number;
		onSaveAbilityScores?:      (scores: Record<string,number>) => Promise<void>;
		onSubmitChanges?:          (d: { speciesId:string; backgroundId:string; classes:any[] }) => Promise<void>;
		onSubmitLevelUp?:          (classes: any[]) => Promise<void>;
		onSaveSlot?:               (opts: any) => Promise<void>;
		onRemoveFeat?:             (id: string) => Promise<void>;
		onManualScoreAdjust?:      (stat: string, delta: number, note: string) => Promise<void>;
		canManage?:                boolean;
		editBlockedReason?:        string;
		spellbooks?:               any[];
		onCreateSpellbook?:        (name: string) => Promise<void>;
		onRenameSpellbook?:        (id: string, name: string) => Promise<void>;
		onDeleteSpellbook?:        (id: string) => Promise<void>;
		onAddSpellbookEntry?:      (spellbookId: string, spellId: number, classId: string, className: string) => Promise<void>;
		onRemoveSpellbookEntry?:   (entryId: string) => Promise<void>;
		onToggleSpellPrepared?:    (entryId: string, prepared: boolean) => Promise<void>;
	} = $props();

	// ── Constants ────────────────────────────────────────────────────────────
	const STATS      = ['STRENGTH','DEXTERITY','CONSTITUTION','INTELLIGENCE','WISDOM','CHARISMA'] as const;
	const STAT_LABEL : Record<string,string> = { STRENGTH:'STR', DEXTERITY:'DEX', CONSTITUTION:'CON', INTELLIGENCE:'INT', WISDOM:'WIS', CHARISMA:'CHA' };
	const STAT_NAME  : Record<string,string> = { STRENGTH:'Strength', DEXTERITY:'Dexterity', CONSTITUTION:'Constitution', INTELLIGENCE:'Intelligence', WISDOM:'Wisdom', CHARISMA:'Charisma' };
	const FEAT_STATS = ['STRENGTH','DEXTERITY','CONSTITUTION','INTELLIGENCE','WISDOM','CHARISMA'];
	const FEAT_STAT_LABEL: Record<string,string> = {
		STRENGTH:'Strength', DEXTERITY:'Dexterity', CONSTITUTION:'Constitution',
		INTELLIGENCE:'Intelligence', WISDOM:'Wisdom', CHARISMA:'Charisma'
	};

	// ── Helpers ──────────────────────────────────────────────────────────────
	function score(stat: string) { return charSheet?.abilityScores?.find((s:any)=>s.stat===stat)?.baseScore ?? 0; }
	function mod(n: number) { const m = Math.floor((n-10)/2); return m>=0?`+${m}`:`${m}`; }

	const hasScores       = $derived((charSheet?.abilityScores?.length ?? 0) > 0);

	// Compute ASI bonuses per stat from resolved ASI slots
	const asiBonus = $derived.by(() => {
		const bonuses: Record<string,number> = {};
		for (const slot of (charSheet?.asiSlots ?? [])) {
			const r = slot.resolved;
			if (!r || r.kind !== 'asi') continue;
			// Normalise to uppercase to handle both old (title case) and new (uppercase) stored values
			if (r.asiStat1) { const k = String(r.asiStat1).toUpperCase(); bonuses[k] = (bonuses[k] ?? 0) + (r.asiAmount1 ?? 0); }
			if (r.asiStat2) { const k = String(r.asiStat2).toUpperCase(); bonuses[k] = (bonuses[k] ?? 0) + (r.asiAmount2 ?? 0); }
		}
		return bonuses;
	});
	const enrichedClasses = $derived(charSheet?.enrichedClasses ?? []);
	const chosenFeats     = $derived(charSheet?.chosenFeats ?? []);

	// ── Ability scores edit ──────────────────────────────────────────────────
	let editScores = $state(false);
	let scoreVals       = $state<Record<string,number>>({});
	let auditOpenStat   = $state<string|null>(null);  // which stat's audit panel is open
	let manualStat      = $state('');
	let manualDelta     = $state(0);
	let manualNote      = $state('');
	let savingManual    = $state(false);

	// Audit entries grouped by stat for quick lookup
	const auditByStat = $derived.by(() => {
		const map: Record<string, any[]> = {};
		for (const e of (scoreAudit ?? [])) {
			if (!map[e.stat]) map[e.stat] = [];
			map[e.stat].push(e);
		}
		return map;
	});

	const SOURCE_LABEL: Record<string,string> = {
		INITIAL: 'Base', ASI: 'ASI', FEAT: 'Feat', MANUAL: 'DM Adjustment',
	};

	async function saveManualAdjust() {
		if (!manualStat || !manualDelta || !manualNote.trim()) return;
		savingManual = true;
		try {
			await onManualScoreAdjust?.(manualStat, manualDelta, manualNote.trim());
			manualStat = ''; manualDelta = 0; manualNote = '';
		} finally { savingManual = false; }
	}
	let savingScores = $state(false);

	function openScores() {
		const v: Record<string,number> = {};
		for (const s of STATS) v[s] = score(s);
		scoreVals  = v;
		editScores = true;
	}

	async function saveScores() {
		savingScores = true;
		await onSaveAbilityScores?.(Object.fromEntries(STATS.map(s => [s, scoreVals[s] ?? 8])));
		savingScores = false;
		editScores   = false;
	}

	// ── Sheet edit (species/bg/classes) ─────────────────────────────────────
	let editSheet   = $state(false);
	let editSpecies = $state('');
	let editBg      = $state('');
	let editClasses = $state<{classId:string;subclassId:string;allocatedLevel:number}[]>([]);
	let savingSheet = $state(false);

	function openSheet() {
		editSpecies = charSheet?.sheet?.speciesId    ?? '';
		editBg      = charSheet?.sheet?.backgroundId ?? '';
		editClasses = enrichedClasses.length
			? enrichedClasses.map((cc:any) => ({ classId:cc.classId, subclassId:cc.subclassId??'', allocatedLevel:cc.allocatedLevel }))
			: [{classId:'',subclassId:'',allocatedLevel:1}];
		editSheet = true;
	}

	async function saveSheet() {
		savingSheet = true;
		await onSubmitChanges?.({
			speciesId:    editSpecies,
			backgroundId: editBg,
			classes:      editClasses.map(c => ({...c, subclassId: c.subclassId||null})),
		});
		savingSheet = false;
		editSheet   = false;
	}

	// ── Level alloc ──────────────────────────────────────────────────────────
	let levelAllocs = $state<{classId:string;subclassId:string|null;allocatedLevel:number}[]>([]);
	let levelReady  = $state(false);
	let savingLevel = $state(false);

	$effect(() => {
		if ((isLevelUp || isLevelDown) && !levelReady) {
			levelAllocs = enrichedClasses.length
				? enrichedClasses.map((cc:any) => ({classId:cc.classId,subclassId:cc.subclassId??null,allocatedLevel:cc.allocatedLevel}))
				: [{classId:'',subclassId:null,allocatedLevel:1}];
			levelReady = true;
		}
	});

	const allocTotal = $derived(levelAllocs.reduce((s,a)=>s+(a.allocatedLevel||0),0));

	async function submitLevel() {
		savingLevel = true;
		await onSubmitLevelUp?.(levelAllocs.map(a=>({...a,subclassId:a.subclassId||null})));
		savingLevel = false;
	}

	// ── ASI/Feat slots ───────────────────────────────────────────────────────
	type SlotState = { open:boolean; mode:string; asiStat:string; asi2a:string; asi2b:string; featSearch:string; featPick:string; featGrantedStat:string; saving:boolean; };

	let slots = $state<Record<string,SlotState>>({});

	function sk(slot:any, i?:number) { return `${slot.sourceClassId}_${slot.sourceLevel}_${i ?? slot.slotIndex ?? 0}`; }

	// Initialise slot state for any new slots — run once, add missing keys only
	$effect(() => {
		const asiSlots = charSheet?.asiSlots ?? [];
		const current  = untrack(() => slots);
		const newSlots = asiSlots.filter((s: any, i: number) => !(sk(s, i) in current));
		if (newSlots.length === 0) return; // nothing to add — avoid infinite loop
		const next = { ...current };
		for (const [idx, slot] of newSlots.entries()) {
			const k = sk(slot, asiSlots.indexOf(slot));
			const defaultMode = (slot.type === 'background_feat' || slot.type === 'epic_boon') ? 'feat' : 'asi';
			next[k] = {open:false,mode:defaultMode,asiStat:'',asi2a:'',asi2b:'',featSearch:'',featPick:'',featGrantedStat:'',saving:false};
		}
		slots = next;
	});

	function ss(slot:any, i?:number): SlotState {
			const fallbackMode = (slot.type === 'background_feat' || slot.type === 'epic_boon') ? 'feat' : 'asi';
		return slots[sk(slot,i)] ?? {open:false,mode:fallbackMode,asiStat:'',asi2a:'',asi2b:'',featSearch:'',featPick:'',featGrantedStat:'',saving:false};
	}
	function updateSlot(slot:any, patch: Partial<SlotState>, i?:number) {
		const k = sk(slot, i);
		slots = {...slots, [k]: {...ss(slot, i), ...patch}};
	}

	function filteredFeats(slot:any, i?:number) {
		const q = ss(slot, i).featSearch.toLowerCase();
		return (systemData?.feats ?? []).filter((f:any) => {
			if (f.name === 'Ability Score Improvement') return false;
			if (!f.isAvailable) return false;
			// Epic boon feats can only appear in epic_boon slots or level 19+ ASI slots
			if (f.isEpicBoon && slot.type !== 'epic_boon' && !slot.canEpicBoon) return false;
			if (slot.type === 'epic_boon') return true;
			if (slot.type === 'background_feat') {
				if (slot.grantsFeatId && !canManage) return f.id === slot.grantsFeatId;
				if (slot.featCategory) return (f.categories ?? '').split(',').map((s:string) => s.trim()).includes(slot.featCategory);
			}
			return true;
		}).filter((f:any) => !q ||
			f.name.toLowerCase().includes(q) ||
			(f.snippet??'').toLowerCase().includes(q)
		);
	}

	async function saveSlot(slot:any, i?:number) {
		const s = ss(slot, i);
		const asiFeat = systemData?.feats?.find((f:any)=>f.name==='Ability Score Improvement');
		let opts: any = { sourceClassId: slot.sourceClassId, sourceLevel: slot.sourceLevel };

		if (s.mode === 'feat') {
			if (!s.featPick) return;
			const featDef   = (systemData?.feats ?? []).find((f:any) => f.id === s.featPick);
			const asiAmount = featDef?.asiAmount ?? null;
			const asiFixed  = featDef?.asiStatFixed ?? null;
			const chosenStat = asiFixed || s.featGrantedStat || undefined;
			if (asiAmount && !chosenStat) return; // need stat choice first
			opts.featId = s.featPick;
			if (asiAmount && chosenStat) { opts.stat1 = chosenStat; opts.amount1 = asiAmount; }
		} else if (s.mode === 'asi') {
			if (!s.asiStat || !asiFeat) return;
			opts = {...opts, featId: asiFeat.id, stat1: s.asiStat, amount1: 2};
		} else if (s.mode === 'asi2') {
			if (!s.asi2a || !s.asi2b || !asiFeat) return;
			opts = {...opts, featId: asiFeat.id, stat1: s.asi2a, amount1: 1, stat2: s.asi2b, amount2: 1};
		} else return;

		updateSlot(slot, {saving:true}, i);
		await onSaveSlot?.(opts);
		updateSlot(slot, {saving:false, open:false, featPick:'', featGrantedStat:'', asiStat:'', asi2a:'', asi2b:'', featSearch:''}, i);
	}
</script>

{#if charSheet}
<div style="display:flex;flex-direction:column;gap:1rem;">

	{#if !canEdit && editBlockedReason}
		<div class="pending-banner" style="margin-bottom:0;">
			⏳ {editBlockedReason}
		</div>
	{/if}

	<!-- ── Ability Scores ────────────────────────────── -->
	<div class="card">
		<div class="page__header" style="margin-bottom:0.75rem;">
			<h3 class="section-title" style="margin:0;">Ability Scores</h3>
			{#if canEdit}
				<button class="btn btn-ghost btn-sm" onclick={() => editScores ? editScores=false : openScores()}>
					{editScores ? 'Cancel' : hasScores ? 'Edit' : 'Set'}
				</button>
			{/if}
		</div>

		{#if !editScores}
			{#if !hasScores}
				<p style="font-size:0.875rem;color:var(--text-muted);margin:0;">Not set yet.{canEdit?' Click Set.':''}</p>
			{:else}
				<!-- Score boxes — click to toggle breakdown -->
				<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:0.5rem;text-align:center;">
					{#each STATS as s}
						{@const v       = score(s)}
						{@const entries = auditByStat[s] ?? []}
						{@const isOpen  = auditOpenStat === s}
						<button
							onclick={() => auditOpenStat = isOpen ? null : s}
							style="width:100%;padding:0.75rem 0.5rem;background:var(--bg-overlay);border-radius:var(--radius-md);border:1px solid {isOpen?'var(--brand-accent)':'var(--border-muted)'};cursor:{entries.length?'pointer':'default'};text-align:center;">
							<p style="font-size:0.6875rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin:0 0 0.25rem;">{STAT_LABEL[s]}</p>
							<p style="font-size:1.75rem;font-weight:800;line-height:1;margin:0;">{v}</p>
							<p style="font-size:0.875rem;font-weight:600;color:var(--brand-accent);margin:0.125rem 0 0;">{mod(v)}</p>
							{#if entries.length}
								<p style="font-size:0.6rem;color:var(--text-muted);margin:0.25rem 0 0;">{entries.length} change{entries.length===1?'':'s'} ▾</p>
							{/if}
						</button>
					{/each}
				</div>

				<!-- Breakdown panel — shown when a stat is clicked -->
				{#if auditOpenStat}
					{@const entries = auditByStat[auditOpenStat] ?? []}
					<div style="margin-top:0.75rem;padding:0.75rem;background:var(--bg-muted);border-radius:var(--radius-md);border:1px solid var(--border-muted);">
						<p style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--brand-accent);margin:0 0 0.5rem;">{STAT_NAME[auditOpenStat]} — Score History</p>
						{#if entries.length === 0}
							<p style="font-size:0.8125rem;color:var(--text-muted);margin:0;">No history recorded yet.</p>
						{:else}
							<div style="display:flex;flex-direction:column;gap:0.25rem;">
								{#each entries as e}
									<div style="display:flex;align-items:center;justify-content:space-between;padding:0.375rem 0.5rem;background:var(--bg-overlay);border-radius:var(--radius-sm);">
										<div style="display:flex;align-items:center;gap:0.5rem;">
											<span style="font-size:0.6875rem;padding:0.0625rem 0.375rem;border-radius:99px;font-weight:600;background:{e.source==='INITIAL'?'var(--bg-overlay)':e.source==='MANUAL'?'rgba(239,68,68,0.15)':'rgba(34,197,94,0.15)'};color:{e.source==='INITIAL'?'var(--text-muted)':e.source==='MANUAL'?'var(--color-danger)':'var(--color-success)'};">
												{SOURCE_LABEL[e.source] ?? e.source}
											</span>
											<span style="font-size:0.8125rem;color:var(--text-secondary);">{e.note ?? ''}</span>
										</div>
										<div style="display:flex;align-items:center;gap:0.5rem;">
											<span style="font-size:0.875rem;font-weight:700;color:{e.delta>0?'var(--color-success)':e.delta<0?'var(--color-danger)':'var(--text-muted)'};">
												{e.delta>0?'+':''}{e.delta}
											</span>
											<span style="font-size:0.6875rem;color:var(--text-muted);">{new Date(e.createdAt).toLocaleDateString()}</span>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				<!-- DM manual adjustment form -->
				{#if canManage && onManualScoreAdjust}
					<div style="margin-top:0.75rem;padding:0.75rem;background:var(--bg-overlay);border-radius:var(--radius-md);border:1px solid var(--border-muted);">
						<p style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin:0 0 0.5rem;">DM Manual Adjustment</p>
						<div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:flex-end;">
							<div class="field" style="margin:0;flex:1;min-width:120px;">
								<label class="label" for="manual-stat">Stat</label>
								<select id="manual-stat" class="input input--select" bind:value={manualStat}>
									<option value="">Select…</option>
									{#each STATS as s}<option value={s}>{STAT_NAME[s]}</option>{/each}
								</select>
							</div>
							<div class="field" style="margin:0;flex:0 0 80px;">
								<label class="label" for="manual-delta">Delta</label>
								<input id="manual-delta" type="number" class="input" bind:value={manualDelta} placeholder="+1 or -1" />
							</div>
							<div class="field" style="margin:0;flex:2;min-width:160px;">
								<label class="label" for="manual-note">Reason</label>
								<input id="manual-note" type="text" class="input" bind:value={manualNote} placeholder="e.g. Potion of ability score" />
							</div>
							<button class="btn btn-primary btn-sm" style="flex-shrink:0;"
								disabled={!manualStat||!manualDelta||!manualNote.trim()||savingManual}
								onclick={saveManualAdjust}>
								{savingManual ? 'Saving…' : 'Apply'}
							</button>
						</div>
					</div>
				{/if}
			{/if}
		{:else}
			<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:0.75rem;">
				{#each STATS as s}
					<div class="field">
						<label class="label" for="sc-{s}">{STAT_NAME[s]}</label>
						<input id="sc-{s}" type="number" class="input" min="3" max="20" bind:value={scoreVals[s]} />
					</div>
				{/each}
			</div>
			<div class="form-actions">
				<button class="btn btn-ghost btn-sm" onclick={() => editScores=false}>Cancel</button>
				<button class="btn btn-primary btn-sm" disabled={savingScores} onclick={saveScores}>
					{savingScores ? 'Saving…' : 'Save'}
				</button>
			</div>
		{/if}
	</div>

	<!-- ── Identity & Classes ────────────────────────── -->
	<div class="card">
		<div class="page__header" style="margin-bottom:0.75rem;">
			<h3 class="section-title" style="margin:0;">
				{isLevelUp ? 'Level Up — Classes' : isLevelDown ? 'Level Down — Adjust Classes' : 'Species, Background & Classes'}
			</h3>
			{#if canEdit && !isLevelUp && !isLevelDown}
				<button class="btn btn-ghost btn-sm" onclick={() => editSheet ? editSheet=false : openSheet()}>
					{editSheet ? 'Cancel' : 'Edit'}
				</button>
			{/if}
		</div>

		{#if isLevelUp || isLevelDown}
			<p style="font-size:0.8125rem;color:{isLevelDown?'var(--color-danger)':'var(--text-muted)'};margin:0 0 0.75rem;">
				{isLevelDown ? `Reduce total to ${availableLevel} levels.` : `Allocate exactly ${availableLevel} total levels.`}
			</p>
			{#each levelAllocs as alloc, i}
				<div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:flex-end;padding:0.5rem;background:var(--bg-overlay);border-radius:var(--radius-md);margin-bottom:0.5rem;">
					<div class="field" style="flex:2 1 140px;margin:0;">
						<label class="label" for="la-c-{i}">Class</label>
						<select id="la-c-{i}" class="input" bind:value={alloc.classId} onchange={() => { alloc.subclassId = null; }}>
							<option value="">Select…</option>
							{#each (systemData?.classes??[]).filter((c:any)=>c.isAvailable) as cls}
								<option value={cls.id}>{cls.name}</option>
							{/each}
						</select>
					</div>
					<div class="field" style="flex:0 0 65px;margin:0;">
						<label class="label" for="la-l-{i}">Levels</label>
						<input id="la-l-{i}" type="number" class="input" bind:value={alloc.allocatedLevel} min={isLevelDown?0:1} max="20" />
					</div>
					{#if alloc.classId}
						{@const cls=(systemData?.classes??[]).find((c:any)=>c.id===alloc.classId)}
						{@const subs=(cls?.subclasses??[]).filter((s:any)=>s.isAvailable&&alloc.allocatedLevel>=(cls.subclassAvailableAtLevel??3))}
						{#if subs.length}
							<div class="field" style="flex:2 1 140px;margin:0;">
								<label class="label" for="la-s-{i}">Subclass</label>
								<select id="la-s-{i}" class="input" bind:value={alloc.subclassId}>
									<option value={null}>None</option>
									{#each subs as sub}<option value={sub.id}>{sub.name}</option>{/each}
								</select>
							</div>
						{/if}
					{/if}
					{#if levelAllocs.length > 1}
						<button class="btn btn-ghost btn-sm" onclick={() => levelAllocs=levelAllocs.filter((_,j)=>j!==i)}>✕</button>
					{/if}
				</div>
			{/each}
			<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-top:0.25rem;">
				<div style="display:flex;gap:0.5rem;align-items:center;">
					<button class="btn btn-ghost btn-sm" onclick={() => levelAllocs=[...levelAllocs,{classId:'',subclassId:null,allocatedLevel:1}]}>+ Add class</button>
					<span style="font-size:0.8125rem;color:var(--text-muted);">Total: <strong style="color:{allocTotal===availableLevel?'var(--color-success)':'var(--color-danger)'}">{allocTotal}</strong> / {availableLevel}</span>
				</div>
				<button class="btn btn-primary btn-sm" disabled={savingLevel||allocTotal!==availableLevel||levelAllocs.some(a=>!a.classId)} onclick={submitLevel}>
					{savingLevel ? 'Submitting…' : 'Submit for approval'}
				</button>
			</div>

		{:else if !editSheet}
			<div style="font-size:0.875rem;display:flex;flex-direction:column;gap:0.5rem;">
				{#if charSheet.speciesRef}
					<div><span class="table__muted">Species:</span> <strong>{charSheet.speciesRef.name}</strong>
						{#if charSheet.speciesRef.traits?.length}
							<span style="margin-left:0.5rem;display:inline-flex;flex-wrap:wrap;gap:0.25rem;">
								{#each charSheet.speciesRef.traits as t}<span class="badge badge-muted" title={t.description??''}>{t.name}</span>{/each}
							</span>
						{/if}
					</div>
				{/if}
				{#if charSheet.backgroundRef}
					<div><span class="table__muted">Background:</span> <strong>{charSheet.backgroundRef.name}</strong>
						{#if charSheet.backgroundRef.featureName}<span class="table__muted" style="margin-left:0.5rem;">· {charSheet.backgroundRef.featureName}</span>{/if}
					</div>
				{/if}
				{#if enrichedClasses.length}
					<div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
						{#each enrichedClasses as cc}
							<div class="character-class-tag">
								<span>{cc.classRef?.name??cc.classId}</span>
								{#if cc.subclassRef}<span class="table__muted">· {cc.subclassRef.name}</span>{/if}
								<span class="badge badge-accent">Lv {cc.allocatedLevel}</span>
							</div>
						{/each}
					</div>
					<details>
						<summary style="cursor:pointer;font-size:0.8125rem;color:var(--text-muted);user-select:none;">Class features</summary>
						<div style="margin-top:0.5rem;display:flex;flex-direction:column;gap:0.375rem;">
							{#each enrichedClasses as cc}
								{@const feats=[...(cc.classFeatures??[]),...(cc.subclassFeatures??[])]}
								{#if feats.length}
									<div>
										<p style="font-size:0.75rem;font-weight:700;color:var(--brand-accent);margin:0 0 0.25rem;">{cc.classRef?.name??cc.classId}</p>
										<div style="display:flex;flex-wrap:wrap;gap:0.25rem;">
											{#each feats as f}<span class="badge badge-muted" style="font-size:0.75rem;" title={f.description??''}>{f.name} (Lv{f.requiredLevel})</span>{/each}
										</div>
									</div>
								{/if}
							{/each}
						</div>
					</details>
				{/if}
			</div>

		{:else}
			<p class="field-hint" style="margin-bottom:0.75rem;">Changes require admin approval.</p>
			<div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.75rem;">
				<div class="field" style="flex:1 1 170px;">
					<label class="label" for="es-species">Species</label>
					<select id="es-species" class="input" bind:value={editSpecies}>
						<option value="">Select…</option>
						{#each (systemData?.species??[]).filter((s:any)=>s.isAvailable) as s}
							<option value={s.id}>{s.name}</option>
						{/each}
					</select>
				</div>
				<div class="field" style="flex:1 1 170px;">
					<label class="label" for="es-bg">Background</label>
					<select id="es-bg" class="input" bind:value={editBg}>
						<option value="">Select…</option>
						{#each (systemData?.backgrounds??[]).filter((b:any)=>b.isAvailable) as b}
							<option value={b.id}>{b.name}</option>
						{/each}
					</select>
				</div>
			</div>
			{#each editClasses as ec, i}
				<div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:flex-end;padding:0.5rem;background:var(--bg-overlay);border-radius:var(--radius-md);margin-bottom:0.5rem;">
					<div class="field" style="flex:2 1 140px;margin:0;">
						<label class="label" for="es-c-{i}">Class</label>
						<select id="es-c-{i}" class="input" bind:value={ec.classId} onchange={() => { ec.subclassId = ''; }}>
							<option value="">Select…</option>
							{#each (systemData?.classes??[]).filter((c:any)=>c.isAvailable) as cls}
								<option value={cls.id}>{cls.name}</option>
							{/each}
						</select>
					</div>
					<div class="field" style="flex:0 0 60px;margin:0;">
						<label class="label" for="es-l-{i}">Level</label>
						<input id="es-l-{i}" type="number" class="input" bind:value={ec.allocatedLevel} min="1" max="20" />
					</div>
					{#if ec.classId}
						{@const cls=(systemData?.classes??[]).find((c:any)=>c.id===ec.classId)}
						{@const subs=(cls?.subclasses??[]).filter((s:any)=>s.isAvailable&&ec.allocatedLevel>=(cls.subclassAvailableAtLevel??3))}
						{#if subs.length}
							<div class="field" style="flex:2 1 140px;margin:0;">
								<label class="label" for="es-s-{i}">Subclass</label>
								<select id="es-s-{i}" class="input" bind:value={ec.subclassId}>
									<option value="">None</option>
									{#each subs as sub}<option value={sub.id}>{sub.name}</option>{/each}
								</select>
							</div>
						{/if}
					{/if}
					{#if editClasses.length > 1}
						<button class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick={() => editClasses=editClasses.filter((_,j)=>j!==i)}>✕</button>
					{/if}
				</div>
			{/each}
			<div class="form-actions" style="justify-content:space-between;">
				<button class="btn btn-ghost btn-sm" onclick={() => editClasses=[...editClasses,{classId:'',subclassId:'',allocatedLevel:1}]}>+ Add class</button>
				<div style="display:flex;gap:0.5rem;">
					<button class="btn btn-ghost btn-sm" onclick={() => editSheet=false}>Cancel</button>
					<button class="btn btn-primary btn-sm" disabled={savingSheet} onclick={saveSheet}>{savingSheet?'Submitting…':'Submit for approval'}</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- ── ASI & Feats ───────────────────────────────── -->
	{#if charSheet.asiSlots?.length}
	<div class="card">
		<h3 class="section-title">Ability Score Improvements & Feats</h3>
		{#if charSheet.asiSlots.some((s:any) => s.canEpicBoon) && !charSheet.asiSlots.some((s:any) => s.type === 'epic_boon')}
			<div style="display:flex;align-items:center;gap:0.625rem;padding:0.625rem 0.875rem;background:rgba(184,115,74,0.12);border:1px solid var(--border-accent);border-radius:var(--radius-md);margin-bottom:0.75rem;">
				<span style="font-size:1rem;">⭐</span>
				<p style="font-size:0.8125rem;color:var(--brand-accent);font-weight:600;margin:0;">
					At level 19+ this character qualifies for an <strong>Epic Boon</strong> — select "Choose Feat / Epic Boon" on any slot to allocate it.
				</p>
			</div>
		{/if}
		{#each charSheet.asiSlots as slot, slotIdx}
			{@const r        = slot.resolved}
			{@const cf       = r ? chosenFeats.find((c:any)=>c.id===r.charFeatId) : null}
			{@const s        = ss(slot, slotIdx)}
			{@const isLocked = slot.type === 'background_feat' && !!slot.grantsFeatId && !canManage}

			<div style="padding:0.75rem;background:var(--bg-overlay);border-radius:var(--radius-md);border-left:3px solid {!r?'var(--color-warning)':'var(--color-success)'};margin-bottom:0.5rem;">
				<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
					<!-- Left: class + level badge -->
					<div style="display:flex;align-items:center;gap:0.5rem;">
						<span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--brand-accent);">{slot.sourceClass}</span>
						<span class="badge badge-muted">Lv{slot.sourceLevel}</span>
						{#if slot.type==='epic_boon'}<span class="badge badge-warning">Epic Boon</span>{/if}
					</div>
					<!-- Right: resolved summary or pending label -->
					{#if r && !s.open}
						<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
							{#if r.kind==='asi'}
								{#if r.asiStat1 && r.asiStat2}
									<span style="font-size:0.875rem;font-weight:600;color:var(--color-success);">⬆ +{r.asiAmount1} {FEAT_STAT_LABEL[r.asiStat1]??r.asiStat1} / +{r.asiAmount2} {FEAT_STAT_LABEL[r.asiStat2]??r.asiStat2}</span>
								{:else if r.asiStat1}
									<span style="font-size:0.875rem;font-weight:600;color:var(--color-success);">⬆ +{r.asiAmount1} {FEAT_STAT_LABEL[r.asiStat1]??r.asiStat1}</span>
								{:else}
									<span style="font-size:0.875rem;font-weight:600;color:var(--color-success);">⬆ ASI</span>
								{/if}
							{:else}
								<span style="font-size:0.875rem;font-weight:600;color:var(--color-success);">🏅 {cf?.feat?.name ?? r.featName ?? 'Feat'}</span>
							{/if}
							{#if canEdit}
								{#if slot.type === 'background_feat' && slot.grantsFeatId && !canManage}
									<span style="font-size:0.75rem;color:var(--text-muted);">🔒 Background grant</span>
								{:else}
									<button class="btn btn-ghost btn-sm" onclick={() => updateSlot(slot, {open:true}, slotIdx)}>Edit</button>
								{/if}
								{#if r.charFeatId}
									<button class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick={() => onRemoveFeat?.(cf?.id??r.charFeatId)}>Remove</button>
								{/if}
							{/if}
						</div>
					{:else if !r}
						<span style="font-size:0.8125rem;color:var(--color-warning);">Pending selection</span>
					{/if}
				</div>

				<!-- Feat details shown below header when resolved as feat -->
				{#if r && !s.open && r.kind === 'feat'}
					{@const featRef = cf?.feat ?? (systemData?.feats ?? []).find((f:any) => f.id === r.featId)}
					{#if featRef}
						<div style="margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid var(--border-muted);">
							{#if featRef.description}<p style="font-size:0.875rem;color:var(--text-secondary);margin:0 0 0.25rem;">{featRef.description}</p>{/if}
							{#if featRef.prerequisites}<p style="font-size:0.75rem;color:var(--text-muted);margin:0;">Requires: {featRef.prerequisites}</p>{/if}
						</div>
					{/if}
				{/if}

				<!-- Picker — open when pending or editing -->
				{#if (!r || s.open) && canEdit && !isLocked}
					<div style="margin-top:0.75rem;border-top:1px solid var(--border-muted);padding-top:0.75rem;">
						<!-- Mode tabs — ASI only; background_feat goes straight to feat picker -->
						{#if slot.type !== 'epic_boon' && slot.type !== 'background_feat'}
							<div style="display:flex;gap:0.375rem;margin-bottom:0.75rem;flex-wrap:wrap;">
								{#each [['asi','+2 One Stat'],['asi2','+1/+1 Two Stats'],['feat', slot.canEpicBoon ? 'Choose Feat / Epic Boon' : 'Choose Feat']] as [val,label]}
									<button
										style="padding:0.25rem 0.75rem;border-radius:99px;border:1px solid {s.mode===val?'var(--brand-accent)':'var(--border-base)'};background:{s.mode===val?'rgba(184,115,74,0.15)':'transparent'};color:{s.mode===val?'var(--brand-accent)':'var(--text-secondary)'};font-size:0.75rem;font-weight:600;cursor:pointer;"
										onclick={() => updateSlot(slot, {mode:val}, slotIdx)}>
										{label}
									</button>
								{/each}
							</div>
						{/if}

						{#if s.mode === 'asi'}
							<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
								<span style="font-size:0.8125rem;color:var(--text-muted);">+2 to</span>
								<select class="input input--select" style="width:160px;"
									value={s.asiStat}
									onchange={(e) => updateSlot(slot, {asiStat:(e.target as HTMLSelectElement).value}, slotIdx)}>
									<option value="">Select stat…</option>
									{#each FEAT_STATS as fs}<option value={fs}>{FEAT_STAT_LABEL[fs]}</option>{/each}
								</select>
								<button class="btn btn-primary btn-sm" disabled={!s.asiStat||s.saving} onclick={() => saveSlot(slot, slotIdx)}>
									{s.saving ? '…' : 'Confirm'}
								</button>
								{#if r}<button class="btn btn-ghost btn-sm" onclick={() => updateSlot(slot, {open:false}, slotIdx)}>Cancel</button>{/if}
							</div>

						{:else if s.mode === 'asi2'}
							<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
								<select class="input input--select" style="width:145px;"
									value={s.asi2a}
									onchange={(e) => updateSlot(slot, {asi2a:(e.target as HTMLSelectElement).value}, slotIdx)}>
									<option value="">First stat…</option>
									{#each FEAT_STATS as fs}<option value={fs} disabled={fs===s.asi2b}>{fs}</option>{/each}
								</select>
								<span style="color:var(--text-muted);">/ +1</span>
								<select class="input input--select" style="width:145px;"
									value={s.asi2b}
									onchange={(e) => updateSlot(slot, {asi2b:(e.target as HTMLSelectElement).value}, slotIdx)}>
									<option value="">Second stat…</option>
									{#each FEAT_STATS as fs}<option value={fs} disabled={fs===s.asi2a}>{fs}</option>{/each}
								</select>
								<button class="btn btn-primary btn-sm" disabled={!s.asi2a||!s.asi2b||s.saving} onclick={() => saveSlot(slot, slotIdx)}>
									{s.saving ? '…' : 'Confirm'}
								</button>
								{#if r}<button class="btn btn-ghost btn-sm" onclick={() => updateSlot(slot, {open:false}, slotIdx)}>Cancel</button>{/if}
							</div>

						{:else}
							<!-- Feat picker -->
							<input type="text" class="input" placeholder="Search feats…" style="margin-bottom:0.5rem;"
								value={s.featSearch}
								oninput={(e) => updateSlot(slot, {featSearch:(e.target as HTMLInputElement).value}, slotIdx)} />
							<div style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:0.25rem;">
								{#each filteredFeats(slot, slotIdx) as feat}
									{@const taken = !feat.repeatable && chosenFeats.some((cf2:any)=>cf2.featId===feat.id)}
									<label style="display:flex;align-items:flex-start;gap:0.5rem;padding:0.5rem;background:{s.featPick===feat.id?'rgba(184,115,74,0.12)':'var(--bg-muted)'};border-radius:var(--radius-sm);cursor:{taken?'not-allowed':'pointer'};opacity:{taken?0.5:1};border:1px solid {s.featPick===feat.id?'var(--brand-accent)':'transparent'};">
										<input type="radio" name="feat-{sk(slot)}" value={feat.id}
											checked={s.featPick===feat.id}
											onchange={() => updateSlot(slot, {featPick:feat.id, featGrantedStat: feat.asiStatFixed ?? ''}, slotIdx)}
											disabled={taken}
											style="margin-top:2px;accent-color:var(--brand-accent);" />
										<div>
											<div style="display:flex;align-items:center;gap:0.375rem;flex-wrap:wrap;">
												<span style="font-size:0.875rem;font-weight:600;">{feat.name}</span>
												{#if feat.isEpicBoon}<span class="badge badge-warning" style="font-size:0.6875rem;">Epic Boon</span>{/if}
												{#if feat.repeatable}<span class="badge badge-muted" style="font-size:0.6875rem;">Repeatable</span>{/if}
												{#if feat.asiAmount}<span style="font-size:0.6875rem;padding:0.0625rem 0.375rem;background:rgba(34,197,94,0.15);color:var(--color-success);border-radius:99px;">+{feat.asiAmount} {feat.asiStatFixed ?? 'stat'}</span>{/if}
												{#if taken}<span style="font-size:0.6875rem;color:var(--text-muted);">Already taken</span>{/if}
											</div>
											{#if feat.snippet}<p style="margin:0.125rem 0 0;font-size:0.8125rem;color:var(--text-secondary);">{feat.snippet}</p>{/if}
											{#if feat.prerequisites}<p style="margin:0.125rem 0 0;font-size:0.75rem;color:var(--text-muted);">Requires: {feat.prerequisites}</p>{/if}
										</div>
									</label>
								{:else}
									<p style="color:var(--text-muted);font-size:0.875rem;padding:0.5rem;">No feats match.</p>
								{/each}
							</div>
							{#if s.featPick}
								{@const selFeat = (systemData?.feats ?? []).find((f:any) => f.id === s.featPick)}
								{#if selFeat?.asiAmount && !selFeat?.asiStatFixed}
									{@const choices = selFeat.asiStatChoices ? selFeat.asiStatChoices.split(',').map((s2:string) => s2.trim()) : FEAT_STATS}
									<div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.5rem;padding:0.5rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-sm);border:1px solid var(--border-muted);">
										<span style="font-size:0.8125rem;color:var(--text-secondary);white-space:nowrap;">+{selFeat.asiAmount} to</span>
										<select class="input input--select" style="flex:1;"
											value={s.featGrantedStat}
											onchange={(e) => updateSlot(slot, {featGrantedStat:(e.target as HTMLSelectElement).value}, slotIdx)}>
											<option value="">— Choose stat —</option>
											{#each choices as st}<option value={st}>{FEAT_STAT_LABEL[st] ?? st}</option>{/each}
										</select>
									</div>
								{:else if selFeat?.asiAmount && selFeat?.asiStatFixed}
									<p style="font-size:0.8125rem;color:var(--color-success);margin:0.375rem 0 0;">✓ Grants +{selFeat.asiAmount} {FEAT_STAT_LABEL[selFeat.asiStatFixed] ?? selFeat.asiStatFixed} automatically</p>
								{/if}
							{/if}
							{#if true}
								{@const selFeat2 = s.featPick ? (systemData?.feats ?? []).find((f:any) => f.id === s.featPick) : null}
								{@const needsStat = selFeat2?.asiAmount && !selFeat2?.asiStatFixed && !s.featGrantedStat}
								<div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
									<button class="btn btn-primary btn-sm" disabled={!s.featPick||!!needsStat||s.saving} onclick={() => saveSlot(slot, slotIdx)}>
										{s.saving ? 'Saving…' : 'Choose Feat'}
									</button>
									{#if r}<button class="btn btn-ghost btn-sm" onclick={() => updateSlot(slot, {open:false}, slotIdx)}>Cancel</button>{/if}
								</div>
							{/if}
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	</div>
	{/if}

	<!-- ── Spellbooks ─────────────────────────────────────────────── -->
	{#if (charSheet?.characterClasses ?? []).some((cc: any) => cc.classRef?.canCastSpells)}
		<div style="margin-top:1.5rem;">
			<h3 class="section-title">Spellbooks</h3>
			<Dnd5eSpellbooks
				{charSheet}
				{systemData}
				{spellbooks}
				canEdit={canEdit}
				onCreateSpellbook={onCreateSpellbook}
				onRenameSpellbook={onRenameSpellbook}
				onDeleteSpellbook={onDeleteSpellbook}
				onAddEntry={onAddSpellbookEntry}
				onRemoveEntry={onRemoveSpellbookEntry}
				onTogglePrepared={onToggleSpellPrepared}
			/>
		</div>
	{/if}

</div>
{/if}