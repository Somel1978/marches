<!-- shared/ui/src/gamesystems/dnd5e/Dnd5eSpellDetail.svelte -->
<!-- Presentational spell body — matches spellbook expanded card layout. -->
<script lang="ts">
	import DescriptionText from '../../../components/ui/DescriptionText.svelte';
	import SpellDamageBadges from './SpellDamageBadges.svelte';
	import {
		spellRangeLabel,
		spellDurationLabel,
		spellComponentsShort,
		spellMaterialNote,
		spellDamageRaw,
		spellUpcastText,
	} from './spell-display.ts';

	let {
		spell,
		canViewDescriptions = true,
	}: {
		spell: any;
		canViewDescriptions?: boolean;
	} = $props();

	const dmgRaw = $derived(spellDamageRaw(spell));
	const range = $derived(spellRangeLabel(spell));
	const duration = $derived(spellDurationLabel(spell));
	const componentsShort = $derived(spellComponentsShort(spell.components));
	const material = $derived(spellMaterialNote(spell.components));
	const upcast = $derived(spellUpcastText(spell));
	const tags = $derived(
		spell.tags
			? String(spell.tags).split(',').map((t: string) => t.trim()).filter(Boolean)
			: [] as string[],
	);
	const hasScaling = $derived(
		spell.level === 0 && !!(spell.cantripDamageLvl5 || spell.cantripDamageLvl11 || spell.cantripDamageLvl17),
	);
</script>

<div class="spell-detail">
	<div class="spell-detail__props">
		{#if spell.castingTime}
			<div class="spell-detail__prop">
				<div class="spell-detail__prop-value">{spell.castingTime}</div>
				<div class="spell-detail__prop-label">Casting Time</div>
			</div>
		{/if}
		{#if range}
			<div class="spell-detail__prop">
				<div class="spell-detail__prop-value">{range}</div>
				<div class="spell-detail__prop-label">Range</div>
			</div>
		{/if}
		{#if duration}
			<div class="spell-detail__prop">
				<div class="spell-detail__prop-value">{duration}</div>
				<div class="spell-detail__prop-label">Duration</div>
			</div>
		{/if}
		{#if componentsShort}
			<div class="spell-detail__prop">
				<div class="spell-detail__prop-value">{componentsShort}</div>
				<div class="spell-detail__prop-label">Components</div>
			</div>
		{/if}
		{#if spell.aoeType && spell.aoeValue}
			<div class="spell-detail__prop">
				<div class="spell-detail__prop-value">{spell.aoeValue} ft {spell.aoeType}</div>
				<div class="spell-detail__prop-label">Area</div>
			</div>
		{/if}
		{#if spell.requiresSavingThrow}
			<div class="spell-detail__prop">
				<div class="spell-detail__prop-value">
					{spell.savingThrow ? `${String(spell.savingThrow).slice(0, 3).toUpperCase()} Save` : 'Save'}
				</div>
				<div class="spell-detail__prop-label">Saving Throw</div>
			</div>
		{/if}
		{#if spell.requiresAttackRoll}
			<div class="spell-detail__prop">
				<div class="spell-detail__prop-value">Attack</div>
				<div class="spell-detail__prop-label">Attack Roll</div>
			</div>
		{/if}
	</div>

	{#if material}
		<p class="spell-detail__note">Material: {material}</p>
	{/if}

	{#if canViewDescriptions}
		{#if spell.description}
			<DescriptionText text={spell.description} class="spell-detail__desc" />
		{/if}
	{:else}
		<p class="spell-detail__gated">Description not available — contact your DM.</p>
	{/if}

	{#if dmgRaw}
		<div class="spell-detail__damage">
			<span class="spell-detail__damage-label">Damage</span>
			<SpellDamageBadges raw={dmgRaw} />
		</div>
	{/if}

	{#if hasScaling}
		<div class="spell-detail__scaling">
			{#if spell.cantripDamageLvl5}
				<div class="spell-detail__scaling-row">
					<span class="spell-detail__scaling-lvl">Lv 5</span>
					<SpellDamageBadges raw={spell.cantripDamageLvl5} size="sm" />
				</div>
			{/if}
			{#if spell.cantripDamageLvl11}
				<div class="spell-detail__scaling-row">
					<span class="spell-detail__scaling-lvl">Lv 11</span>
					<SpellDamageBadges raw={spell.cantripDamageLvl11} size="sm" />
				</div>
			{/if}
			{#if spell.cantripDamageLvl17}
				<div class="spell-detail__scaling-row">
					<span class="spell-detail__scaling-lvl">Lv 17</span>
					<SpellDamageBadges raw={spell.cantripDamageLvl17} size="sm" />
				</div>
			{/if}
		</div>
	{/if}

	{#if upcast}
		<div class="spell-detail__upcast">
			<p class="spell-detail__upcast-title">At Higher Levels</p>
			<p class="spell-detail__upcast-body">{upcast}</p>
		</div>
	{/if}

	{#if spell.spellList || spell.sourceBook || tags.length || spell.link}
		<div class="spell-detail__meta">
			{#if spell.spellList}
				<span class="spell-detail__meta-text">Lists: {spell.spellList}</span>
			{/if}
			{#if spell.sourceBook}
				<span class="spell-detail__meta-text">{spell.sourceBook}</span>
			{/if}
			{#each tags as tag}
				<span class="badge badge-muted">{tag}</span>
			{/each}
			{#if spell.link}
				<a class="spell-detail__link" href={spell.link} target="_blank" rel="noopener noreferrer">D&D Beyond ↗</a>
			{/if}
		</div>
	{/if}
</div>

<style>
	.spell-detail {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.spell-detail__props {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 0.5rem;
	}

	.spell-detail__prop {
		padding: 0.5rem;
		background: var(--bg-surface);
		border: 1px solid var(--border-muted);
		border-radius: var(--radius-sm);
		text-align: center;
	}

	.spell-detail__prop-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
		line-height: 1.3;
	}

	.spell-detail__prop-label {
		font-size: 0.6875rem;
		color: var(--text-muted);
		margin-top: 0.125rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.spell-detail__note {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	:global(.spell-detail__desc) {
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.spell-detail__gated {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--text-muted);
		font-style: italic;
	}

	.spell-detail__damage {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.spell-detail__damage-label {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}

	.spell-detail__scaling {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.spell-detail__scaling-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.spell-detail__scaling-lvl {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--text-muted);
		min-width: 2.75rem;
	}

	.spell-detail__upcast {
		padding: 0.625rem 0.875rem;
		background: var(--accent-dim, rgba(184, 115, 74, 0.1));
		border-radius: var(--radius-sm);
		border-left: 3px solid var(--brand-accent);
	}

	.spell-detail__upcast-title {
		margin: 0 0 0.25rem;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--brand-accent);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.spell-detail__upcast-body {
		margin: 0;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.spell-detail__meta {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
		padding-top: 0.25rem;
		border-top: 1px solid var(--border-muted);
	}

	.spell-detail__meta-text {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.spell-detail__link {
		font-size: 0.8125rem;
		color: var(--accent-light);
		text-decoration: none;
	}
	.spell-detail__link:hover { text-decoration: underline; }
</style>
