<!-- shared/ui/src/gamesystems/dnd5e/SpellDamageBadges.svelte -->
<!-- Compact damage chips: neutral dice + emoji/label types; / = choose one, + = additive. -->
<script lang="ts">
	import {
		parseSpellDamage,
		spellDamageTypeIcon,
		type SpellDamagePart,
	} from './spell-display.ts';

	let {
		raw = null,
		parts = undefined,
		size = 'md',
	}: {
		/** Raw damage string — parsed if `parts` not provided. */
		raw?: string | null;
		parts?: SpellDamagePart[];
		size?: 'sm' | 'md';
	} = $props();

	const dmgParts = $derived(parts ?? parseSpellDamage(raw));
</script>

{#if dmgParts.length}
	<span class="spell-dmg" class:spell-dmg--sm={size === 'sm'}>
		{#each dmgParts as d, di}
			{#if di > 0}<span class="spell-dmg__join">+</span>{/if}
			<span class="spell-dmg__dice">{d.dice}</span>
			{#if d.choice && d.types.length > 1}
				<span class="spell-dmg__hint">choose one</span>
			{/if}
			{#each d.types as typ, ti}
				{@const icon = spellDamageTypeIcon(typ)}
				{#if ti > 0}
					<span class="spell-dmg__sep">{d.choice ? '✦' : '+'}</span>
				{/if}
				<span class="spell-dmg__type" title={typ}>
					{#if icon}<span class="spell-dmg__glyph" aria-hidden="true">{icon}</span>{/if}{typ}
				</span>
			{/each}
		{/each}
	</span>
{/if}

<style>
	.spell-dmg {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
	}

	.spell-dmg__join,
	.spell-dmg__sep {
		color: var(--text-muted);
		font-weight: 700;
		font-size: 0.75rem;
	}

	.spell-dmg__dice {
		display: inline-block;
		padding: 0.2rem 0.5rem;
		border-radius: 99px;
		font-size: 0.8125rem;
		font-weight: 700;
		line-height: 1.2;
		background: var(--bg-muted);
		color: var(--text-primary);
		border: 1px solid var(--border-base);
	}

	.spell-dmg__type {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.8125rem;
		font-weight: 600;
		line-height: 1.2;
		color: var(--text-secondary);
	}

	.spell-dmg__glyph {
		font-size: 0.95rem;
		font-weight: 400;
		line-height: 1;
	}

	.spell-dmg__hint {
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}

	.spell-dmg--sm .spell-dmg__dice {
		padding: 0.125rem 0.4rem;
		font-size: 0.75rem;
	}

	.spell-dmg--sm .spell-dmg__type {
		font-size: 0.75rem;
	}

	.spell-dmg--sm .spell-dmg__glyph {
		font-size: 0.85rem;
	}

	.spell-dmg--sm .spell-dmg__hint { font-size: 0.5625rem; }
</style>
