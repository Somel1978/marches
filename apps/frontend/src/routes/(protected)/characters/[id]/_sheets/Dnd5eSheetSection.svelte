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
		canViewDescriptions = false,
		isLevelUp      = false,
		isLevelDown    = false,
		availableLevel = 0,
	}: {
		charSheet?:         any;
		systemData?:        any;
		scoreAudit?:        any[];
		spellbooks?:        any[];
		character?:         any;
		canEdit?:           boolean;
		canViewDescriptions?: boolean;
		isLevelUp?:         boolean;
		isLevelDown?:       boolean;
		availableLevel?:    number;
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
			['featId',        opts.featId],
			['sourceClassId', opts.sourceClassId ?? ''],
			['sourceLevel',   String(opts.sourceLevel ?? '')],
			...(opts.stat1   ? [['stat1',   opts.stat1],   ['amount1', String(opts.amount1)]] as [string,string][] : []),
			...(opts.stat2   ? [['stat2',   opts.stat2],   ['amount2', String(opts.amount2)]] as [string,string][] : []),
			...(opts.chosenSkills?.length ? (opts.chosenSkills as string[]).map((s: string) => ['chosenSkill', s] as [string,string]) : []),
			...(opts.chosenSaves?.length  ? (opts.chosenSaves  as string[]).map((s: string) => ['chosenSave',  s] as [string,string]) : []),
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


	async function handleToggleTool(tool: string, active: boolean, note?: string) {
		const entries: [string,string][] = [['tool', tool], ['action', active ? 'set' : 'clear']];
		if (note) entries.push(['note', note]);
		await post('saveTool', entries);
	}

	async function handleToggleLanguage(language: string, active: boolean, note?: string) {
		const entries: [string,string][] = [['language', language], ['action', active ? 'set' : 'clear']];
		if (note) entries.push(['note', note]);
		await post('saveLanguage', entries);
	}

	async function handleToggleDamageModifier(modifierType: string, damageType: string, active: boolean, note?: string) {
		const entries: [string,string][] = [['modifierType', modifierType], ['damageType', damageType], ['action', active ? 'set' : 'clear']];
		if (note) entries.push(['note', note]);
		await post('saveDamageModifier', entries);
	}

	async function handleSaveSize(size: string) {
		await post('saveSize', [['size', size]]);
	}
	async function handleSaveDetails(details: Record<string, string | number | null>) {
		await post('saveDetails', Object.entries(details).filter(([,v]) => v !== null).map(([k,v]) => [k, String(v)]));
	}

	async function handleSaveChoicePoolGrants(opts: { skills: {skill:string;value:number;sourceType:string;sourceId:string}[]; saves: {stat:string;sourceType:string;sourceId:string}[]; dmgMods: {modifierType:string;damageType:string;sourceType:string;sourceId:string}[]; tools: {tool:string;sourceType:string;sourceId:string}[]; languages: {language:string;sourceType:string;sourceId:string}[] }) {
		const entries: [string,string][] = [
			...opts.skills.flatMap(g => [
				['poolSkill',         g.skill],
				['poolSkillSource',   g.sourceType],
				['poolSkillSourceId', g.sourceId],
				['poolSkillValue',    String(g.value)],
			] as [string,string][]),
			...opts.tools.flatMap(g => [
				['poolTool',         g.tool],
				['poolToolSource',   g.sourceType],
				['poolToolSourceId', g.sourceId],
			] as [string,string][]),
			...opts.languages.flatMap(g => [
				['poolLanguage',         g.language],
				['poolLanguageSource',   g.sourceType],
				['poolLanguageSourceId', g.sourceId],
			] as [string,string][]),
			...opts.dmgMods.flatMap((g: any) => [
				['poolDmgModType',     g.modifierType],
				['poolDmgModDamage',   g.damageType],
				['poolDmgModSource',   g.sourceType],
				['poolDmgModSourceId', g.sourceId],
			] as [string,string][]),
			...opts.saves.flatMap(g => [
				['poolSave',         g.stat],
				['poolSaveSource',   g.sourceType],
				['poolSaveSourceId', g.sourceId],
			] as [string,string][]),
		];
		await post('saveChoicePoolGrants', entries);
	}
</script>

<Dnd5eCharacterSheet
	{charSheet}
	{systemData}
	{scoreAudit}
	{spellbooks}
	{canEdit}
	{canViewDescriptions}
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
	onSaveMood={handleSaveMood}
	onSaveSize={handleSaveSize}
	onToggleSkill={handleToggleSkill}
	onToggleSave={handleToggleSave}
	onToggleTool={handleToggleTool}
	onToggleLanguage={handleToggleLanguage}
	onToggleDamageModifier={handleToggleDamageModifier}
	onSaveDetails={handleSaveDetails}
	onSaveChoicePoolGrants={handleSaveChoicePoolGrants}
/>