<!-- shared/ui/components/ui/PermissionCell.svelte -->
<script lang="ts">
	type AccessLevel = 'NONE' | 'OWN' | 'ALL';

	interface Props {
		value:    AccessLevel;
		locked?:  boolean;
		onchange?: (value: AccessLevel) => void;
	}

	let { value, locked = false, onchange }: Props = $props();

	const CYCLE: AccessLevel[] = ['NONE', 'OWN', 'ALL'];

	function next() {
		if (locked) return;
		const idx = CYCLE.indexOf(value);
		const next = CYCLE[(idx + 1) % CYCLE.length];
		onchange?.(next);
	}

	const label = $derived(
		value === 'NONE' ? 'No access' :
		value === 'OWN'  ? 'Own only' : 'Full access'
	);
</script>

<button
	type="button"
	class="perm-cell"
	class:perm-cell--none={value === 'NONE'}
	class:perm-cell--own={value === 'OWN'}
	class:perm-cell--all={value === 'ALL'}
	class:perm-cell--locked={locked}
	aria-label={label}
	title={label}
	onclick={next}
	disabled={locked}
>
	{#if value === 'NONE'}
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
			<rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
		</svg>
	{:else if value === 'OWN'}
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
			<rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
			<circle cx="8" cy="8" r="2.5" fill="currentColor"/>
		</svg>
	{:else}
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
			<rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
			<path d="M5 8l2 2 4-4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
	{/if}
</button>

<style>
	.perm-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: var(--radius-sm);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: background-color var(--transition-fast), color var(--transition-fast);
		margin: 0 auto;
	}

	.perm-cell--none {
		color: var(--text-disabled);
	}
	.perm-cell--none:hover:not(:disabled) {
		background-color: var(--bg-overlay);
		color: var(--text-muted);
	}

	.perm-cell--own {
		color: var(--brand-accent-light);
	}
	.perm-cell--own:hover:not(:disabled) {
		background-color: var(--bg-overlay);
	}

	.perm-cell--all {
		color: var(--accent);
	}
	.perm-cell--all:hover:not(:disabled) {
		background-color: var(--bg-overlay);
	}

	.perm-cell--locked {
		cursor: not-allowed;
		opacity: 0.5;
	}
</style>
