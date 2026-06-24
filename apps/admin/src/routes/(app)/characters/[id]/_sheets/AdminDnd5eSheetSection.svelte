<!-- apps/admin/src/routes/(app)/characters/[id]/_sheets/AdminDnd5eSheetSection.svelte -->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import { Dnd5eCharacterSheet } from '@core/ui';

	let {
		charSheet,
		systemData,
		scoreAudit = [],
	}: {
		charSheet?:   any;
		systemData?:  any;
		scoreAudit?:  any[];
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

	async function handleManualScoreAdjust(stat: string, delta: number, note: string) {
		await post('manualScoreAdjust', [['stat', stat], ['delta', String(delta)], ['note', note]]);
	}

	async function handleSaveMood(emoji: string, text: string) {
		await post('saveMood', [['emoji', emoji], ['text', text]]);
	}

	async function handleToggleSkill(skill: string, next: 'NONE' | 'HALF_PROFICIENT' | 'PROFICIENT' | 'EXPERT') {
		await post('saveSkills', [['skill', skill], ['proficiency', next]]);
	}

	async function handleToggleSave(stat: string, proficient: boolean) {
		await post('saveSavingThrow', [['stat', stat], ['proficient', String(proficient)]]);
	}

	async function handleSaveDetails(details: Record<string, string | number | null>) {
		await post('saveDetails', Object.entries(details).filter(([,v]) => v !== null).map(([k,v]) => [k, String(v)]));
	}
</script>

<Dnd5eCharacterSheet
	{charSheet}
	{systemData}
	{scoreAudit}
	canEdit={true}
	canManage={true}
	onSaveAbilityScores={handleSaveAbilityScores}
	onSubmitChanges={handleSubmitChanges}
	onSubmitLevelUp={handleSubmitLevelUp}
	onSaveSlot={handleSaveSlot}
	onRemoveFeat={handleRemoveFeat}
	onManualScoreAdjust={handleManualScoreAdjust}
	onSaveMood={handleSaveMood}
	onToggleSkill={handleToggleSkill}
	onToggleSave={handleToggleSave}
	onSaveDetails={handleSaveDetails}
/>