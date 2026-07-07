<!-- apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/ChoicePoolInline.svelte -->
<!--
	Generic "choose N of [pool]" chip picker. Replaces the 6+ near-duplicate
	pool-rendering blocks (skill/save/tool/language/expertise/dmgMod) that used
	to live together on the old Skills step — now rendered inline wherever the
	pool's source (species trait / background / class feature / feat) is picked.
-->
<script lang="ts">
	let {
		label,
		count,
		pool,
		chosen,
		onToggle,
		displayFn = (v: string) => v,
		isDisabled = (_v: string) => false,
		hint = '',
	}: {
		label: string;
		count: number;
		pool: string[];
		chosen: string[];
		onToggle: (value: string) => void;
		displayFn?: (v: string) => string;
		isDisabled?: (v: string) => boolean;
		hint?: string;
	} = $props();

	const max  = $derived(Math.min(count, pool.length));
	const done = $derived(pool.length > 0 && chosen.length >= max);
</script>

<div class="wiz-pool">
	<div class="wiz-pool__header">
		<span class="wiz-pool__label">{label}</span>
		<span class="wiz-pool__count" class:wiz-pool__count--done={done}>
			{chosen.length} / {max}{#if done} ✓{/if}
		</span>
	</div>
	{#if hint}<p class="wiz-pool__hint">{hint}</p>{/if}
	<div class="wiz-chip-group">
		{#each pool as value}
			{@const isChosen = chosen.includes(value)}
			{@const full = !isChosen && chosen.length >= max}
			{@const disabled = full || isDisabled(value)}
			<button type="button" class="wiz-chip" class:wiz-chip--chosen={isChosen} disabled={disabled}
				onclick={() => onToggle(value)}>{displayFn(value)}</button>
		{/each}
	</div>
</div>
