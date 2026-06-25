<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/_sheets/DmDnd5eSheetSection.svelte -->
<!-- DM sheet section: canManage DMs get full edit with direct save. Others read-only. -->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import { Dnd5eCharacterSheet } from '@core/ui';

	let {
		charSheet,
		systemData,
		scoreAudit     = [],
		canManage      = false,
		canViewDescriptions = false,
		isLevelUp      = false,
		isLevelDown    = false,
		availableLevel = 0,
	}: {
		charSheet?:         any;
		systemData?:        any;
		scoreAudit?:        any[];
		canManage?:         boolean;
		canViewDescriptions?: boolean;
		isLevelUp?:         boolean;
		isLevelDown?:       boolean;
		availableLevel?:    number;
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

	async function handleToggleSkill(skill: string, next: 'NONE' | 'HALF_PROFICIENT' | 'PROFICIENT' | 'EXPERT', note?: string) {
		const entries: [string,string][] = [['skill', skill], ['proficiency', next]];
		if (note) entries.push(['note', note]);
		await post('saveSkills', entries);
	}

	async function handleToggleSave(stat: string, proficient: boolean, note?: string) {
		const entries: [string,string][] = [['stat', stat], ['proficient', String(proficient)]];
		if (note) entries.push(['note', note]);
		await post('saveSavingThrow', entries);
	}

	async function handleSaveChoicePoolGrants(opts: { skills: any[]; saves: any[] }) {
		const entries: [string,string][] = [
			...opts.skills.flatMap(g => [
				['poolSkill',         g.skill],
				['poolSkillSource',   g.sourceType],
				['poolSkillSourceId', g.sourceId],
				['poolSkillValue',    String(g.value)],
			] as [string,string][]),
			...opts.saves.flatMap(g => [
				['poolSave',         g.stat],
				['poolSaveSource',   g.sourceType],
				['poolSaveSourceId', g.sourceId],
			] as [string,string][]),
		];
		await post('saveChoicePoolGrants', entries);
	}

	async function handleSaveDetails(details: Record<string, string | number | null>) {
		await post('saveDetails', Object.entries(details).filter(([,v]) => v !== null).map(([k,v]) => [k, String(v)]));
	}
</script>

<Dnd5eCharacterSheet
	{charSheet}
	{systemData}
	{scoreAudit}
	canEdit={canManage}
	{isLevelUp}
	{isLevelDown}
	{availableLevel}
	canManage={canManage}
	{canViewDescriptions}
	onSaveAbilityScores={canManage ? handleSaveAbilityScores : undefined}
	onSubmitChanges={canManage ? handleSubmitChanges : undefined}
	onSubmitLevelUp={canManage ? handleSubmitLevelUp : undefined}
	onSaveSlot={canManage ? handleSaveSlot : undefined}
	onRemoveFeat={canManage ? handleRemoveFeat : undefined}
	onManualScoreAdjust={canManage ? handleManualScoreAdjust : undefined}
	onSaveMood={canManage ? handleSaveMood : undefined}
	onToggleSkill={canManage ? handleToggleSkill : undefined}
	onToggleSave={canManage ? handleToggleSave : undefined}
	onSaveDetails={canManage ? handleSaveDetails : undefined}
	onSaveChoicePoolGrants={canManage ? handleSaveChoicePoolGrants : undefined}
/>