<!-- apps/frontend/src/routes/(protected)/quests/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">Quests</h2>
			<p class="page__subtitle">{data.total} available</p>
		</div>
	</div>

	{#if data.items.length === 0}
		<div class="card" style="text-align:center; padding:3rem;">
			<p style="font-size:2rem; margin-bottom:0.5rem;">⚔</p>
			<p style="color:var(--text-secondary);">No quests available right now.</p>
		</div>
	{:else}
		<div class="sections">
			{#each data.items as quest}
				<a href="/quests/{quest.id}" class="card" style="display:block; text-decoration:none; color:inherit;">
					<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; flex-wrap:wrap;">
						<div>
							<h3 style="margin:0 0 0.25rem; font-size:1rem; font-weight:700;">{quest.title}</h3>
							<p style="font-size:0.875rem; color:var(--text-muted); margin:0;">
								DM: {(quest as any).dmName} · Lv {quest.minLevel}–{quest.maxLevel} · {quest.signups.length}/{quest.maxCapacity} players
							</p>
						</div>
						<div style="display:flex; gap:0.5rem; align-items:center; flex-shrink:0;">
							<span class="badge badge-muted">{quest.missionXp.toLocaleString()} XP</span>
							{#if quest.signups.length >= quest.maxCapacity}
								<span class="badge badge-warning">Waitlist</span>
							{:else}
								<span class="badge badge-success">Open</span>
							{/if}
						</div>
					</div>
					{#if quest.description}
						<p style="font-size:0.875rem; color:var(--text-secondary); margin:0.75rem 0 0;">{quest.description}</p>
					{/if}
				</a>
			{/each}
		</div>
	{/if}
</div>
