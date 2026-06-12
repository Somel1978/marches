<!-- apps/frontend/src/routes/(protected)/world/[worldSlug]/factions/[factionSlug]/+page.svelte -->
<script lang="ts">
	import { renderMarkdown } from '@core/ui';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const world   = $derived((data as any).world);
	const faction = $derived((data as any).faction);

	const tierLabel: Record<string, string> = { LOCAL: 'Local', REGIONAL: 'Regional', WORLD: 'World' };
	const relLabel: Record<string, string>  = { RIVAL: 'Rival', ALLY: 'Ally' };
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/world/{world.slug}" class="back-link">← {world.name}</a>
		</div>
	</div>

	<div class="sections">
		<!-- Identity -->
		<div class="card">
			<div class="faction-header">
				{#if faction.heraldryUrl}
					<img src={faction.heraldryUrl} alt={faction.name} class="faction-header__heraldry" />
				{/if}
				<div class="faction-header__identity">
					<h2 class="page__title" style="margin:0;">🛡 {faction.name}</h2>
					{#if faction.designation}<p style="opacity:0.75; margin-top:0.15rem;">{faction.designation}</p>{/if}
					{#if faction.motto}<p class="faction-header__motto">“{faction.motto}”</p>{/if}
					{#if faction.primaryColors}<p class="faction-header__colors">Colors: {faction.primaryColors}</p>{/if}
					<div style="margin-top:0.5rem;">
						<span class="badge badge-tier--{faction.powerTier}">{tierLabel[faction.powerTier] ?? faction.powerTier} power</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Your standing -->
		{#if (data as any).myRenown?.length}
			<div class="card">
				<h3 class="section-title">Your standing</h3>
				{#each (data as any).myRenown as r}
					<div class="renown-row">
						<span class="renown-row__char">{r.name}</span>
						<div class="renown-bar" style="flex:1;">
							<div class="renown-bar__track">
								<div class="renown-bar__marker" style="left: {((r.value + 10) / 20) * 100}%;"></div>
							</div>
							<span class="renown-bar__value">{r.value}</span>
							<span class="renown-bar__label">{r.value < 0 ? 'Hostile' : r.value > 0 ? 'Favored' : 'Neutral'}</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Lore sections -->
		{#if faction.lore}
			<div class="card">
				<h3 class="section-title">Lore</h3>
				<div class="markdown-body">{@html renderMarkdown(faction.lore)}</div>
			</div>
		{/if}
		{#if faction.ideals}
			<div class="card">
				<h3 class="section-title">Ideals</h3>
				<div class="markdown-body">{@html renderMarkdown(faction.ideals)}</div>
			</div>
		{/if}
		{#if faction.taboos}
			<div class="card">
				<h3 class="section-title">Taboos</h3>
				<div class="markdown-body">{@html renderMarkdown(faction.taboos)}</div>
			</div>
		{/if}
		{#if faction.inductionHooks}
			<div class="card">
				<h3 class="section-title">Induction & hooks</h3>
				<div class="markdown-body">{@html renderMarkdown(faction.inductionHooks)}</div>
			</div>
		{/if}
		{#if faction.bounties}
			<div class="card">
				<h3 class="section-title">Bounties</h3>
				<div class="markdown-body">{@html renderMarkdown(faction.bounties)}</div>
			</div>
		{/if}

		<!-- Ranks -->
		{#if faction.ranks?.length}
			<div class="card">
				<h3 class="section-title">Ranks & progression</h3>
				{#each faction.ranks as rank}
					<div class="faction-subrow">
						<span class="badge badge-muted">Lv {rank.level}</span>
						<span class="faction-subrow__grow" style="font-weight:600;">{rank.name}</span>
						{#if rank.renownRequired !== null}<span class="badge badge-muted">Renown ≥ {rank.renownRequired}</span>{/if}
						{#if rank.description}<span style="opacity:0.75; font-size:0.85rem;">{rank.description}</span>{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Territories -->
		{#if faction.territories?.length}
			<div class="card">
				<h3 class="section-title">Territories of influence</h3>
				{#each faction.territories as t}
					<div class="faction-subrow">
						<span class="badge badge-muted">{t.entityType === 'REGION' ? '🏔 Region' : '📍 Location'}</span>
						<span class="faction-subrow__grow" style="font-weight:600;">{t.entity?.name ?? '—'}</span>
						{#if t.notes}<span style="opacity:0.75; font-size:0.85rem;">{t.notes}</span>{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Relations -->
		{#if faction.relations?.length}
			<div class="card">
				<h3 class="section-title">Rivalries & alliances</h3>
				{#each faction.relations as rel}
					<div class="faction-subrow">
						<span class="badge badge-rel--{rel.type}">{relLabel[rel.type] ?? rel.type}</span>
						<a class="faction-subrow__grow" style="font-weight:600;" href="/world/{world.slug}/factions/{rel.other.slug}">{rel.other.name}</a>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Persons of interest -->
		{#if faction.npcs?.length}
			<div class="card">
				<h3 class="section-title">Persons of interest</h3>
				<div class="npc-grid">
					{#each faction.npcs as npc}
						<a href="/npcs/{npc.id}" class="npc-card">
							{#if npc.imageUrl}
								<img src={npc.imageUrl} alt={npc.name} class="npc-card__portrait" />
							{:else}
								<div class="npc-card__portrait npc-card__portrait--placeholder">👤</div>
							{/if}
							<div class="npc-card__name">{npc.name}</div>
							{#if npc.aliases}<div class="npc-card__aliases">{npc.aliases}</div>{/if}
							<div class="npc-card__meta">
								{#if npc.rank}<span class="badge badge-muted">{npc.rank.name}</span>{/if}
								<span class="badge badge-npc--{npc.status}">{npc.status}</span>
							</div>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Linked quests -->
		{#if faction.quests?.length}
			<div class="card">
				<h3 class="section-title">Associated quests</h3>
				{#each faction.quests as link}
					<div class="faction-subrow">
						<a class="faction-subrow__grow" style="font-weight:600;" href="/quests/{link.quest.id}">{link.quest.title}</a>
						<span class="badge badge-muted">{link.quest.status}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
