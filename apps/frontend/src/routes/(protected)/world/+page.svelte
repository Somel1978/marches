<!-- apps/frontend/src/routes/(protected)/world/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const dangerColors: Record<string, string> = {
		Safe:     'badge-success', Low: 'badge-accent',
		Moderate: 'badge-warning', High: 'badge-danger', Extreme: 'badge-danger',
	};
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">World</h2>
			<p class="page__subtitle">Explore the realms</p>
		</div>
	</div>

	{#each data.worlds.filter((w: any) => w.isActive) as world}
		<div style="margin-bottom:2rem;">
			<h3 style="font-size:1.25rem; font-weight:700; margin:0 0 1rem;">{world.name}</h3>

			{#if world.mapImageUrl}
				<div style="position:relative; display:inline-block; width:100%; margin-bottom:1.5rem;">
					<img src={world.mapImageUrl} alt="{world.name} map" style="width:100%; border-radius:var(--radius-md); display:block;" />
					{#each world.regions.filter((r: any) => r.isActive && r.mapX !== null && r.mapY !== null) as region}
						<a href="/world/{world.slug}/{region.slug}"
							style="position:absolute; left:{region.mapX}%; top:{region.mapY}%; transform:translate(-50%,-50%); z-index:10; text-decoration:none;"
							title={region.name}>
							<div class="world-map-marker" style="--marker-color:{region.color};"></div>
							<span class="world-map-label">{region.name}</span>
						</a>
					{/each}
				</div>
			{/if}

			<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px,1fr)); gap:1rem;">
				{#each world.regions.filter((r: any) => r.isActive) as region}
					<a href="/world/{world.slug}/{region.slug}" style="text-decoration:none; color:inherit;">
						<div class="card" style="border-left:4px solid {region.color};">
							{#if region.imageUrl}
								<img src={region.imageUrl} alt={region.name} style="width:100%; height:120px; object-fit:cover; border-radius:var(--radius-sm); margin-bottom:0.75rem;" />
							{/if}
							<p style="font-weight:700; font-size:0.9375rem; margin:0 0 0.375rem;">{region.name}</p>
							<div style="display:flex; gap:0.375rem; flex-wrap:wrap;">
								<span class="badge {dangerColors[region.dangerRating] ?? 'badge-muted'}">{region.dangerRating}</span>
								{#if region.minLevel && region.maxLevel}
									<span class="badge badge-muted">Lv {region.minLevel}\u2013{region.maxLevel}</span>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{:else}
		<div class="card" style="text-align:center; padding:3rem;">
			<p class="table__empty">No worlds available yet.</p>
		</div>
	{/each}
</div>
