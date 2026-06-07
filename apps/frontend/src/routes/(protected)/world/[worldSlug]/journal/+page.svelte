<!-- apps/frontend/src/routes/(protected)/world/[worldSlug]/journal/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const world    = $derived((data as any).world);
	const journals = $derived((data as any).journals ?? []);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/world/{world.slug}" class="back-link">← {world.name}</a>
			<h2 class="page__title">📖 Journals</h2>
		</div>
	</div>

	{#if journals.length}
		<div style="display:flex; flex-direction:column; gap:0.75rem;">
			{#each journals as journal}
				<a href="/world/{world.slug}/journal/{journal.id}"
					style="display:flex; align-items:center; gap:0.75rem; text-decoration:none; flex-wrap:wrap"
					class="card">
					{#if journal.icon}
						<span style="font-size:1.5rem;">{journal.icon}</span>
					{/if}
					<div style="flex:1;">
						<div style="font-weight:600; color:var(--text-primary);">{journal.title}</div>
						{#if journal.description}
							<div class="table__muted" style="font-size:0.8125rem;">{journal.description}</div>
						{/if}
						<div class="table__muted" style="font-size:0.75rem; margin-top:0.25rem;">
							{journal.sections?.length ?? 0} section{(journal.sections?.length ?? 0) !== 1 ? 's' : ''}
						</div>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="card">
			<p class="table__empty">No journals available for this world yet.</p>
		</div>
	{/if}
</div>
