<!-- apps/frontend/src/routes/(protected)/world/[worldSlug]/plots/+page.svelte -->
<script lang="ts">
	let { data }: { data: any } = $props();
	const world = $derived(data.world);
	const plots = $derived(data.plots ?? []);

	const STATUS_LABELS: Record<string, string> = {
		ACTIVE: 'Active', COMPLETED: 'Completed', FAILED: 'Failed',
	};
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/world/{world.slug}" class="back-link">← {world.name}</a>
			<h2 class="page__title">Plot quests</h2>
			<p class="page__subtitle">Stories in motion — open a plot to read what has been revealed.</p>
		</div>
	</div>

	{#if plots.length}
		<ul class="pqe__list" style="list-style:none; padding:0; display:flex; flex-direction:column; gap:0.65rem;">
			{#each plots as plot (plot.id)}
				<li class="card" style="padding:0.85rem 1rem;">
					<a href="/world/{world.slug}/plots/{plot.id}" style="text-decoration:none; color:inherit; display:block;">
						<div style="display:flex; flex-wrap:wrap; gap:0.4rem; align-items:center;">
							<strong>{plot.title}</strong>
							<span class="badge">{STATUS_LABELS[plot.status] ?? plot.status}</span>
						</div>
						{#if plot.summary}
							<p class="field-hint" style="margin:0.35rem 0 0;">{plot.summary}</p>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="table__empty">No active plot quests to show yet.</p>
	{/if}
</div>
