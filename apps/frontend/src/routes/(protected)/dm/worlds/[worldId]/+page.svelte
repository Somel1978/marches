<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const world      = $derived((data as any).world);
	const canManage  = $derived((data as any).canManage === true);
</script>

<!-- Stats summary -->
<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
	<div class="card" style="text-align:center;">
		<div style="font-size:1.75rem; font-weight:700; color:var(--color-accent);">{(data as any).regionCount}</div>
		<div class="label" style="margin-top:0.25rem;">Regions</div>
	</div>
	<div class="card" style="text-align:center;">
		<div style="font-size:1.75rem; font-weight:700; color:var(--color-accent);">{(data as any).questStats.total}</div>
		<div class="label" style="margin-top:0.25rem;">Quests</div>
	</div>
	{#if (data as any).questStats.inProgress > 0}
		<div class="card" style="text-align:center; border-color:var(--color-success);">
			<div style="font-size:1.75rem; font-weight:700; color:var(--color-success);">{(data as any).questStats.inProgress}</div>
			<div class="label" style="margin-top:0.25rem;">In Progress</div>
		</div>
	{/if}
	{#if (data as any).questStats.pending > 0}
		<a href="/dm/worlds/{world.id}/quests" class="card" style="text-align:center; border-color:var(--color-warning); text-decoration:none;">
			<div style="font-size:1.75rem; font-weight:700; color:var(--color-warning);">{(data as any).questStats.pending}</div>
			<div class="label" style="margin-top:0.25rem;">Quests awaiting approval</div>
		</a>
	{/if}
	{#if canManage && (data as any).pendingTransactions > 0}
		<a href="/dm/worlds/{world.id}/transactions" class="card" style="text-align:center; border-color:var(--color-warning); text-decoration:none;">
			<div style="font-size:1.75rem; font-weight:700; color:var(--color-warning);">{(data as any).pendingTransactions}</div>
			<div class="label" style="margin-top:0.25rem;">Pending transactions</div>
		</a>
	{/if}
	{#if canManage && (data as any).pendingCharacters > 0}
		<a href="/dm/worlds/{world.id}/characters" class="card" style="text-align:center; border-color:var(--color-warning); text-decoration:none;">
			<div style="font-size:1.75rem; font-weight:700; color:var(--color-warning);">{(data as any).pendingCharacters}</div>
			<div class="label" style="margin-top:0.25rem;">Pending characters</div>
		</a>
	{/if}
</div>

<!-- World description -->
{#if world.description}
	<div class="card" style="margin-bottom:1.5rem;">
		<p style="margin:0; color:var(--text-secondary);">{world.description}</p>
	</div>
{/if}

<!-- Regions quick list -->
{#if world.regions?.length}
	<div class="card">
		<h3 class="section-title">Regions ({world.regions.length})</h3>
		<div style="display:flex; flex-direction:column; gap:0.375rem;">
			{#each world.regions as region}
				<a href="/dm/worlds/{world.id}/regions/{region.id}"
					style="display:flex; align-items:center; gap:0.75rem; padding:0.5rem; border-radius:var(--radius-sm); background:var(--bg-elevated); text-decoration:none; flex-wrap:wrap">
					<div style="width:10px; height:10px; border-radius:50%; background:{region.color}; flex-shrink:0;"></div>
					<span style="font-weight:600; color:var(--text-primary);">{region.name}</span>
					<span class="badge badge-muted" style="margin-left:auto;">{region.dangerRating}</span>
					{#if !region.isActive}<span class="badge badge-muted">Inactive</span>{/if}
				</a>
			{/each}
		</div>
	</div>
{/if}