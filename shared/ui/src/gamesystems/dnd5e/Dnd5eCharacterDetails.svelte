<!-- shared/ui/src/gamesystems/dnd5e/Dnd5eCharacterDetails.svelte -->
<!-- Character details panel: alignment, traits, ideals, bonds, flaws, physical description -->
<script lang="ts">
	import { untrack } from 'svelte';
	import { SKILL_DISPLAY, SKILL_ABILITY, STAT_ABBR } from './skills.ts';

	let {
		charSheet,
		canEdit = false,
		onSave,
	}: {
		charSheet: any;
		canEdit?:  boolean;
		onSave?:   (details: Record<string, string | number | null>) => Promise<void>;
	} = $props();

	const sheet = $derived(charSheet?.sheet ?? {});

	// untrack() intentionally captures the initial prop value only.
	// These are editable fields that save on blur — they don't need to
	// stay reactive to prop changes after mount (page reloads after save).
	let alignment         = $state(untrack(() => (charSheet as any)?.sheet?.alignment         ?? ''));
	let personalityTraits = $state(untrack(() => (charSheet as any)?.sheet?.personalityTraits ?? ''));
	let ideals            = $state(untrack(() => (charSheet as any)?.sheet?.ideals            ?? ''));
	let bonds             = $state(untrack(() => (charSheet as any)?.sheet?.bonds             ?? ''));
	let flaws             = $state(untrack(() => (charSheet as any)?.sheet?.flaws             ?? ''));
	let appearance        = $state(untrack(() => (charSheet as any)?.sheet?.appearance        ?? ''));
	let age               = $state(untrack(() => (charSheet as any)?.sheet?.age               ?? ''));
	let height            = $state(untrack(() => (charSheet as any)?.sheet?.height            ?? ''));
	let weight            = $state(untrack(() => (charSheet as any)?.sheet?.weight            ?? ''));

	let saving = $state(false);

	async function saveField(field: string, value: string | number | null) {
		if (!canEdit || saving) return;
		saving = true;
		await onSave?.({ [field]: value || null });
		saving = false;
	}
</script>

<div class="char-details">
	<!-- Physical -->
	<div class="char-details__section">
		<h4 class="char-details__title">Physical</h4>
		<div class="char-details__row3">
			<div class="field">
				<span class="label label-accent">Age</span>
				{#if canEdit}
					<input type="number" class="input" min="1" max="9999" bind:value={age}
						onblur={() => saveField('age', age ? Number(age) : null)} />
				{:else}
					<span class="char-details__value">{sheet?.age ?? '—'}</span>
				{/if}
			</div>
			<div class="field">
				<span class="label label-accent">Height</span>
				{#if canEdit}
					<input type="text" class="input" maxlength="50" bind:value={height}
						onblur={() => saveField('height', height)} />
				{:else}
					<span class="char-details__value">{sheet?.height ?? '—'}</span>
				{/if}
			</div>
			<div class="field">
				<span class="label label-accent">Weight</span>
				{#if canEdit}
					<input type="text" class="input" maxlength="50" bind:value={weight}
						onblur={() => saveField('weight', weight)} />
				{:else}
					<span class="char-details__value">{sheet?.weight ?? '—'}</span>
				{/if}
			</div>
		</div>
		<div class="field" style="margin-top:0.75rem">
			<span class="label label-accent">Appearance</span>
			{#if canEdit}
				<textarea class="input char-details__textarea" maxlength="500" rows="3" bind:value={appearance}
					onblur={() => saveField('appearance', appearance)}></textarea>
			{:else}
				<span class="char-details__value">{sheet?.appearance ?? '—'}</span>
			{/if}
		</div>
	</div>

	<!-- Alignment -->
	<div class="char-details__section">
		<h4 class="char-details__title">Alignment</h4>
		{#if canEdit}
			<input type="text" class="input" maxlength="50" placeholder="e.g. Chaotic Good"
				bind:value={alignment} onblur={() => saveField('alignment', alignment)} />
		{:else}
			<span class="char-details__value">{sheet?.alignment ?? '—'}</span>
		{/if}
	</div>

	<!-- Traits & Backstory -->
	{#each [
		{ key: 'personalityTraits', label: 'Personality Traits', value: personalityTraits, setter: (v: string) => personalityTraits = v, max: 500 },
		{ key: 'ideals',            label: 'Ideals',             value: ideals,            setter: (v: string) => ideals = v,            max: 300 },
		{ key: 'bonds',             label: 'Bonds',              value: bonds,             setter: (v: string) => bonds = v,             max: 300 },
		{ key: 'flaws',             label: 'Flaws',              value: flaws,             setter: (v: string) => flaws = v,             max: 300 },
	] as detail}
		<div class="char-details__section">
			<h4 class="char-details__title">{detail.label}</h4>
			{#if canEdit}
				<textarea class="input char-details__textarea" rows="3" maxlength={detail.max}
					value={detail.value}
					oninput={(e) => detail.setter((e.target as HTMLTextAreaElement).value)}
					onblur={() => saveField(detail.key, detail.value)}></textarea>
			{:else}
				<span class="char-details__value">{sheet?.[detail.key] ?? '—'}</span>
			{/if}
		</div>
	{/each}

	{#if saving}<p class="table__muted" style="font-size:0.75rem;margin-top:0.5rem;">Saving…</p>{/if}
</div>

<style>
.char-details { display: flex; flex-direction: column; gap: 1rem; }
.char-details__section { display: flex; flex-direction: column; gap: 0.375rem; }
.char-details__title { font-size: 0.8125rem; font-weight: 600; color: var(--accent-light); margin: 0; }
.char-details__value { font-size: 0.875rem; color: var(--text-secondary); }
.char-details__row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; }
.char-details__textarea { resize: vertical; min-height: 4rem; }
</style>