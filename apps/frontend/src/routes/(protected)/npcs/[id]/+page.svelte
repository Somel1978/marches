<!-- apps/frontend/src/routes/(protected)/npcs/[id]/+page.svelte -->
<script lang="ts">
	import { renderMarkdown } from '@core/ui';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const npc = $derived((data as any).npc);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/npcs" class="back-link">← NPCs</a>
		</div>
	</div>

	<div class="sections">
		<div class="card">
			<div class="npc-detail">
				{#if npc.imageUrl}
					<img src={npc.imageUrl} alt={npc.name} class="npc-detail__portrait" />
				{:else}
					<div class="npc-detail__portrait npc-card__portrait--placeholder" style="display:flex; align-items:center; justify-content:center; font-size:3rem; opacity:0.5;">👤</div>
				{/if}
				<div class="npc-detail__identity">
					<h2 class="page__title" style="margin:0;">{npc.name}</h2>
					{#if npc.aliases}<p style="font-style:italic; opacity:0.75; margin-top:0.15rem;">{npc.aliases}</p>{/if}
					<div style="display:flex; flex-wrap:wrap; gap:0.4rem; margin-top:0.6rem;">
						<span class="badge badge-npc--{npc.status}">{npc.status}</span>
						<span class="badge badge-muted">🌍 {npc.world?.name}</span>
						{#if npc.location}<span class="badge badge-muted">📍 {npc.location.region?.name} › {npc.location.name}</span>{/if}
					</div>
					{#if npc.faction}
						<p style="margin-top:0.75rem;">
							🛡 <a href="/world/{npc.world.slug}/factions/{npc.faction.slug}" style="font-weight:600;">{npc.faction.name}</a>
							{#if npc.rank} — {npc.rank.name}{/if}
							{#if npc.factionRole} · {npc.factionRole}{/if}
						</p>
					{/if}
				</div>
			</div>
		</div>

		{#if npc.services}
			<div class="card">
				<h3 class="section-title">Services</h3>
				<div class="markdown-body">{@html renderMarkdown(npc.services)}</div>
			</div>
		{/if}

		{#if npc.bounties}
			<div class="card">
				<h3 class="section-title">Bounties</h3>
				<div class="markdown-body">{@html renderMarkdown(npc.bounties)}</div>
			</div>
		{/if}
	</div>
</div>
