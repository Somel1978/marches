<!-- apps/frontend/src/routes/(protected)/npcs/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">👤 NPCs</h2>
			<p class="page__subtitle">Notable figures of the known worlds.</p>
		</div>
	</div>

	<div class="card" style="margin-bottom:1.5rem;">
		<form method="get" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
			<input name="q" type="text" class="input" style="flex:1; min-width:180px;" placeholder="Search by name or alias…" value={(data as any).q} />
			<select name="worldId" class="input" style="min-width:180px;">
				<option value="">All worlds</option>
				{#each (data as any).worlds as w}
					<option value={w.id} selected={(data as any).worldId === w.id}>{w.name}</option>
				{/each}
			</select>
			<button type="submit" class="btn btn-primary">Search</button>
		</form>
	</div>

	{#if (data as any).npcs?.length}
		<div class="npc-grid">
			{#each (data as any).npcs as npc}
				<a href="/npcs/{npc.id}" class="npc-card">
					{#if npc.imageUrl}
						<img src={npc.imageUrl} alt={npc.name} class="npc-card__portrait" />
					{:else}
						<div class="npc-card__portrait npc-card__portrait--placeholder">👤</div>
					{/if}
					<div class="npc-card__name">{npc.name}</div>
					{#if npc.aliases}<div class="npc-card__aliases">{npc.aliases}</div>{/if}
					<div class="npc-card__meta">
						<span class="badge badge-muted">🌍 {npc.world?.name}</span>
						{#if npc.faction?.isVisible}<span class="badge badge-muted">🛡 {npc.faction.name}</span>{/if}
						<span class="badge badge-npc--{npc.status}">{npc.status}</span>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<p class="table__empty">No NPCs found.</p>
	{/if}
</div>
