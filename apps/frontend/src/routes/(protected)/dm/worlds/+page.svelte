<!-- apps/frontend/src/routes/(protected)/dm/worlds/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const myWorlds = $derived((data as any).myWorlds ?? []);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">My Worlds</h2>
			<p class="page__subtitle">{myWorlds.length} world{myWorlds.length === 1 ? '' : 's'} assigned</p>
		</div>
	</div>

	{#if myWorlds.length === 0}
		<div class="card">
			<p class="table__empty">You have not been assigned to any worlds yet. Contact an admin.</p>
		</div>
	{:else}
		<div class="region-grid">
			{#each myWorlds as world}
				<a href="/dm/worlds/{world.id}" class="region-card" style="text-decoration:none;">
					{#if world.mapImageUrl}
						<img src={world.mapImageUrl} alt={world.name} class="region-card__img" />
					{:else}
						<div class="region-card__img" style="background:var(--bg-elevated); display:flex; align-items:center; justify-content:center;">
							<span style="font-size:2rem;">🌍</span>
						</div>
					{/if}
					<div class="region-card__footer">
						<div class="region-card__top">
							<span class="region-card__name">{world.name}</span>
						</div>
						<div class="region-card__sub">
							{world.regions?.length ?? 0} region{(world.regions?.length ?? 0) === 1 ? '' : 's'}
							· {world.isActive ? 'Active' : 'Inactive'}
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
