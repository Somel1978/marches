<!-- apps/frontend/src/routes/(protected)/world/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const worlds = $derived((data as any).worlds ?? []);
</script>

<div class="worlds-page">
	<header class="worlds-page__header">
		<h1 class="worlds-page__title">The Worlds</h1>
		<p class="worlds-page__subtitle">Choose your realm and begin your adventure</p>
	</header>

	{#if worlds.length}
		<div class="region-grid">
			{#each worlds as world, i}
				<a
					href="/world/{world.slug}"
					class="region-card"
					style="--card-delay:{i * 80}ms;"
				>
					{#if world.mapImageUrl}
						<img src={world.mapImageUrl} alt={world.name} class="region-card__img" />
					{:else}
						<div class="region-card__img region-card__img--fallback"
							style="background:linear-gradient(145deg,rgba(245,175,70,0.2) 0%,#0a0805 100%);">
							<svg class="region-card__fallback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
								<path d="M3 6l9-4 9 4v12l-9 4-9-4V6z"/>
								<path d="M12 2v18M3 6l9 4 9-4"/>
							</svg>
						</div>
					{/if}

					<div class="region-card__top">
						{#if (world.regions?.filter((r: any) => r.isActive).length ?? 0) > 0}
							{@const regionCount = world.regions.filter((r: any) => r.isActive).length}
							<span class="region-card__level">{regionCount} region{regionCount !== 1 ? 's' : ''}</span>
						{/if}
					</div>

					<div class="region-card__footer">
						<div class="region-card__color-bar" style="background:{world.color ?? 'rgba(245,175,70,0.8)'};"></div>
						<span class="region-card__name">{world.name}</span>
						{#if world.description}
							<span class="region-card__sub">{world.description}</span>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="worlds-empty">
			<p>No worlds available yet. Check back soon.</p>
		</div>
	{/if}
</div>