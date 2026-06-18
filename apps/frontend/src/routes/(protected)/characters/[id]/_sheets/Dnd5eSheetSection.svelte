<!-- apps/frontend/src/routes/(protected)/characters/[id]/_sheets/Dnd5eSheetSection.svelte -->
<!-- Owns all SvelteKit action calls. Passes results down as props + callbacks. -->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import { Dnd5eCharacterSheet } from '@core/ui';

	let {
		charSheet,
		systemData,
		scoreAudit     = [],
		spellbooks     = [],
		character,
		canEdit        = false,
		isLevelUp      = false,
		isLevelDown    = false,
		availableLevel = 0,
	}: {
		charSheet?:      any;
		systemData?:     any;
		scoreAudit?:     any[];
		spellbooks?:     any[];
		character?:      any;
		canEdit?:        boolean;
		isLevelUp?:      boolean;
		isLevelDown?:    boolean;
		availableLevel?: number;
	} = $props();

	const editBlockedReason = $derived.by(() => {
		if (canEdit) return undefined;
		const status = character?.status;
		const reason = character?.statusReason;
		if (status === 'PENDING' && reason === 'EDIT_PENDING') return 'Character has a pending edit awaiting approval. Sheet editing is locked until it is reviewed.';
		if (status === 'PENDING') return 'Character is awaiting approval. Sheet editing is locked until approved.';
		if (status === 'SUSPENDED') return 'Character is suspended and cannot be edited.';
		if (status === 'RETIRED' || status === 'DECEASED') return 'This character is no longer active.';
		return 'Sheet editing is currently unavailable.';
	});

	async function post(name: string, entries: [string, string][]) {
		const fd = new FormData();
		for (const [k, v] of entries) fd.append(k, v);
		const res    = await fetch(`?/${name}`, { method: 'POST', body: fd, headers: { 'x-sveltekit-action': 'true' } });
		const result = deserialize(await res.text());
		if (result.type === 'success') await invalidateAll();
		else if (result.type === 'failure') alert((result as any).data?.message ?? 'Error');
		return result;
	}

	async function handleSaveAbilityScores(scores: Record<string, number>) {
		await post('saveAbilityScores', Object.entries(scores).map(([k,v]) => [k, String(v)]));
	}

	async function handleSubmitChanges(d: { speciesId: string; backgroundId: string; classes: any[] }) {
		const entries: [string,string][] = [
			['speciesId',    d.speciesId],
			['backgroundId', d.backgroundId],
			...d.classes.flatMap(c => [
				['classId',        c.classId]           as [string,string],
				['subclassId',     c.subclassId ?? '']  as [string,string],
				['allocatedLevel', String(c.allocatedLevel)] as [string,string],
			]),
		];
		await post('submitChanges', entries);
	}

	async function handleSubmitLevelUp(classes: any[]) {
		const entries: [string,string][] = classes.flatMap(c => [
			['classId',        c.classId]           as [string,string],
			['subclassId',     c.subclassId ?? '']  as [string,string],
			['allocatedLevel', String(c.allocatedLevel)] as [string,string],
		]);
		await post('submitLevelUp', entries);
	}

	async function handleSaveSlot(opts: any) {
		const entries: [string,string][] = [
			['featId',       opts.featId],
			['sourceClassId', opts.sourceClassId ?? ''],
			['sourceLevel',   String(opts.sourceLevel ?? '')],
			...(opts.stat1   ? [['stat1',   opts.stat1],   ['amount1', String(opts.amount1)]] as [string,string][] : []),
			...(opts.stat2   ? [['stat2',   opts.stat2],   ['amount2', String(opts.amount2)]] as [string,string][] : []),
		];
		await post('addFeat', entries);
	}

	async function handleRemoveFeat(id: string) {
		await post('removeFeat', [['id', id]]);
	}

	// ── Spellbook callbacks ───────────────────────────────────────────────────

	async function handleCreateSpellbook(name: string) {
		await post('createSpellbook', [['name', name]]);
	}

	async function handleRenameSpellbook(id: string, name: string) {
		await post('renameSpellbook', [['id', id], ['name', name]]);
	}

	async function handleDeleteSpellbook(id: string) {
		await post('deleteSpellbook', [['id', id]]);
	}

	async function handleAddSpellbookEntry(spellbookId: string, spellId: number, classId: string, className: string) {
		await post('addSpellbookEntry', [
			['spellbookId', spellbookId],
			['spellId',     String(spellId)],
			['classId',     classId],
			['className',   className],
		]);
	}

	async function handleRemoveSpellbookEntry(entryId: string) {
		await post('removeSpellbookEntry', [['id', entryId]]);
	}

	async function handleToggleSpellPrepared(entryId: string, prepared: boolean) {
		await post('toggleSpellPrepared', [['id', entryId], ['prepared', String(prepared)]]);
	}
</script>

<Dnd5eCharacterSheet
	{charSheet}
	{systemData}
	{scoreAudit}
	{spellbooks}
	{canEdit}
	{editBlockedReason}
	{isLevelUp}
	{isLevelDown}
	{availableLevel}
	onSaveAbilityScores={handleSaveAbilityScores}
	onSubmitChanges={handleSubmitChanges}
	onSubmitLevelUp={handleSubmitLevelUp}
	onSaveSlot={handleSaveSlot}
	onRemoveFeat={handleRemoveFeat}
	onCreateSpellbook={handleCreateSpellbook}
	onRenameSpellbook={handleRenameSpellbook}
	onDeleteSpellbook={handleDeleteSpellbook}
	onAddSpellbookEntry={handleAddSpellbookEntry}
	onRemoveSpellbookEntry={handleRemoveSpellbookEntry}
	onToggleSpellPrepared={handleToggleSpellPrepared}
/>