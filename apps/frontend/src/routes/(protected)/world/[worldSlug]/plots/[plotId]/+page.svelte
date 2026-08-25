<!-- apps/frontend/src/routes/(protected)/world/[worldSlug]/plots/[plotId]/+page.svelte -->
<script lang="ts">
	let { data }: { data: any } = $props();
	const world = $derived(data.world);
	const plot = $derived(data.plot);
	const beats = $derived(data.beats ?? []);

	const KIND_LABELS: Record<string, string> = {
		OBJECTIVE: 'Objective', SCENE: 'Scene', DISCOVERY: 'Discovery',
		DECISION: 'Decision', DECISION_OPTION: 'Choice', EXIT: 'Exit',
		ENDING: 'Ending', FAILURE_CONDITION: 'Failure',
	};
	const STATUS_LABELS: Record<string, string> = {
		COMPLETED: 'Completed', FAILED: 'Failed', MISSED: 'Missed',
		ACTIVE: 'Active',
	};
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/world/{world.slug}/plots" class="back-link">← Plot quests</a>
			<h2 class="page__title">{plot.title}</h2>
			{#if plot.summary}
				<p class="page__subtitle">{plot.summary}</p>
			{/if}
			<span class="badge">{STATUS_LABELS[plot.status] ?? plot.status}</span>
		</div>
	</div>

	<h3 class="section-title">What has happened</h3>
	{#if beats.length}
		<ol style="list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:0.75rem;">
			{#each beats as beat (beat.id)}
				<li class="card" style="padding:0.85rem 1rem;">
					<div style="display:flex; flex-wrap:wrap; gap:0.4rem; align-items:center; margin-bottom:0.35rem;">
						<span class="badge badge-muted">{KIND_LABELS[beat.kind] ?? beat.kind}</span>
						<strong>{beat.title}</strong>
						<span class="badge">{STATUS_LABELS[beat.status] ?? beat.status}</span>
					</div>
					{#if beat.description}
						<p class="field-hint" style="margin:0 0 0.35rem; white-space:pre-wrap;">{beat.description}</p>
					{/if}
					{#if beat.playerNote}
						<p style="margin:0; white-space:pre-wrap;">{beat.playerNote}</p>
					{/if}
				</li>
			{/each}
		</ol>
	{:else}
		<p class="table__empty">Nothing has been revealed for players yet. Check back as the story advances.</p>
	{/if}
</div>
