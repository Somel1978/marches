<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/_sheets/DmDnd5eSheetSection.svelte -->
<!-- DM sheet section: canManage DMs get full edit with direct save. Others read-only. -->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import { Dnd5eCharacterSheet } from '@core/ui';

	let {
		charSheet,
		systemData,
		canManage      = false,
		isLevelUp      = false,
		isLevelDown    = false,
		availableLevel = 0,
	}: {
		charSheet?:      any;
		systemData?:     any;
		canManage?:      boolean;
		isLevelUp?:      boolean;
		isLevelDown?:    boolean;
		availableLevel?: number;
	} = $props();

	async function post(name: string, entries: [string, string][]) {
		const fd = new FormData();
		for (const [k, v] of entries) fd.append(k, v);
		const res    = await fetch(`?/${name}`, { method: 'POST', body: fd, headers: { 'x-sveltekit-action': 'true' } });
		const result = deserialize(await res.text());
		if (result.type === 'success') await invalidateAll();
		else if (result.type === 'failure') alert((result as any).data?.message ?? 'Error');
		return result;
	}

	// DM direct saves — no approval needed
	async function handleSaveAbilityScores(scores: Record<string, number>) {
		await post('saveAbilityScores', Object.entries(scores).map(([k, v]) => [k, String(v)]));
	}

	async function handleSubmitChanges(d: { speciesId: string; backgroundId: string; classes: any[] }) {
		const entries: [string, string][] = [
			['speciesId',    d.speciesId],
			['backgroundId', d.backgroundId],
			...d.classes.flatMap(c => [
				['classId',        c.classId]           as [string, string],
				['subclassId',     c.subclassId ?? '']  as [string, string],
				['allocatedLevel', String(c.allocatedLevel)] as [string, string],
			]),
		];
		await post('updateSheet', entries);
	}

	async function handleSubmitLevelUp(classes: any[]) {
		// DMs can directly update level allocation
		const entries: [string, string][] = classes.flatMap(c => [
			['classId',        c.classId]           as [string, string],
			['subclassId',     c.subclassId ?? '']  as [string, string],
			['allocatedLevel', String(c.allocatedLevel)] as [string, string],
		]);
		await post('updateSheet', entries);
	}

	async function handleSaveSlot(opts: any) {
		const entries: [string, string][] = [
			['featId',        opts.featId],
			['sourceClassId', opts.sourceClassId ?? ''],
			['sourceLevel',   String(opts.sourceLevel ?? '')],
			...(opts.stat1 ? [['stat1', opts.stat1], ['amount1', String(opts.amount1)]] as [string, string][] : []),
			...(opts.stat2 ? [['stat2', opts.stat2], ['amount2', String(opts.amount2)]] as [string, string][] : []),
		];
		await post('addFeat', entries);
	}

	async function handleRemoveFeat(id: string) {
		await post('removeFeat', [['id', id]]);
	}
</script>

<Dnd5eCharacterSheet
	{charSheet}
	{systemData}
	canEdit={canManage}
	{isLevelUp}
	{isLevelDown}
	{availableLevel}
	canManage={canManage}
	onSaveAbilityScores={canManage ? handleSaveAbilityScores : undefined}
	onSubmitChanges={canManage ? handleSubmitChanges : undefined}
	onSubmitLevelUp={canManage ? handleSubmitLevelUp : undefined}
	onSaveSlot={canManage ? handleSaveSlot : undefined}
	onRemoveFeat={canManage ? handleRemoveFeat : undefined}
/>