<!-- apps/frontend/src/routes/(protected)/world/[worldSlug]/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const world  = $derived((data as any).world);
	const regions = $derived(world.regions.filter((r: any) => r.isActive));

	const dangerColors: Record<string,string> = {
		Safe: 'badge-success', Low: 'badge-accent',
		Moderate: 'badge-warning', High: 'badge-danger', Extreme: 'badge-danger',
	};
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/world" class="back-link">← Worlds</a>
			<h2 class="page__title">{world.name}</h2>
			{#if world.description}<p class="page__subtitle">{world.description}</p>{/if}
		</div>
	</div>

	<!-- World map with region markers -->
	{#if world.mapImageUrl}
		<div class="world-map-wrapper card" style="margin-bottom:1.5rem; padding:0;">
			<div style="position:relative; display:inline-block; width:100%;">
				<img src={world.mapImageUrl} alt="{world.name} map"
					style="width:100%; border-radius:var(--radius-md); display:block;" />
				{#each regions.filter((r: any) => r.mapX !== null && r.mapY !== null) as region}
					<a href="/world/{world.slug}/{region.slug}"
						style="position:absolute; left:{region.mapX}%; top:{region.mapY}%; transform:translate(-50%,-50%); z-index:10; text-decoration:none;"
						title={region.name}>
						<div class="world-map-marker" style="--marker-color:{region.color};"></div>
						<span class="world-map-label">{region.name}</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Region cards -->
	<div class="world-region-grid">
		{#each regions as region}
			<a href="/world/{world.slug}/{region.slug}" class="region-card">
				{#if region.imageUrl}
					<img src={region.imageUrl} alt={region.name} class="region-card__img" />
				{:else}
					<div class="region-card__img region-card__img--fallback"
						style="background: linear-gradient(135deg, {region.color}44, {region.color}11);">
						<span class="region-card__fallback-name">{region.name}</span>
					</div>
				{/if}
				<div class="region-card__footer" style="--card-color:{region.color};">
					<span class="region-card__name">{region.name}</span>
					<div class="region-card__badges">
						{#if (data as any).showDanger && region.dangerRating}
							<span class="badge {dangerColors[region.dangerRating]??'badge-muted'}">{region.dangerRating}</span>
						{/if}
						{#if (data as any).showLevel && region.minLevel && region.maxLevel}
							<span class="badge badge-muted">Lv {region.minLevel}–{region.maxLevel}</span>
						{/if}
					</div>
				</div>
			</a>
		{:else}
			<p class="table__empty">No regions available yet.</p>
		{/each}
	</div>
</div>
