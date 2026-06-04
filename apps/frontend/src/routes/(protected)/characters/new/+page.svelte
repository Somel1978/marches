<!-- apps/frontend/src/routes/(protected)/characters/new/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const WIZARD_ROUTES: Record<string, string> = {
		dnd5e: '/characters/new/dnd5e',
	};
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">New Character</h2>
			<p style="margin:0;font-size:0.875rem;color:var(--text-muted);">Choose a game system to begin.</p>
		</div>
		<a href="/characters" class="btn btn-ghost btn-sm">Cancel</a>
	</div>

	{#if data.slotInfo}
		<p style="font-size:0.875rem;color:var(--text-muted);margin-bottom:1rem;">
			{data.slotInfo.available} character slot{data.slotInfo.available === 1 ? '' : 's'} available.
		</p>
	{/if}

	<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem;">
		{#each data.systems as system}
			{@const route = WIZARD_ROUTES[system.slug]}
			{#if route}
				<a href={route} class="system-card">
					<div style="font-size:2rem;margin-bottom:0.5rem;">🎲</div>
					<h3 style="margin:0 0 0.375rem;font-size:1.0625rem;color:var(--text-primary);">{system.name}</h3>
					{#if system.description}
						<p style="margin:0;font-size:0.8125rem;color:var(--text-secondary);">{system.description}</p>
					{/if}
				</a>
			{:else}
				<div class="system-card system-card--disabled">
					<div style="font-size:2rem;margin-bottom:0.5rem;">🎲</div>
					<h3 style="margin:0 0 0.375rem;font-size:1.0625rem;color:var(--text-primary);">{system.name}</h3>
					{#if system.description}
						<p style="margin:0;font-size:0.8125rem;color:var(--text-secondary);">{system.description}</p>
					{/if}
					<span class="badge badge-muted" style="margin-top:0.5rem;">Coming soon</span>
				</div>
			{/if}
		{:else}
			<p class="table__empty">No active game systems available.</p>
		{/each}
	</div>
</div>