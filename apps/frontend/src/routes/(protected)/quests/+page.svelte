<!-- apps/frontend/src/routes/(protected)/quests/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const tab           = $derived((data as any).tab ?? 'open');
	const participatedIds = $derived(new Set((data as any).participatedIds ?? []));
	const ratingMap     = $derived((data as any).ratingMap ?? {});
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">Quests</h2>
			<p class="page__subtitle">{data.total} quest{data.total !== 1 ? 's' : ''}</p>
		</div>
	</div>

	<!-- Tabs -->
	<div style="display:flex; gap:0.25rem; margin-bottom:1.5rem; border-bottom:1px solid var(--border-muted); padding-bottom:0; flex-wrap:wrap">
		<a href="/quests?tab=open"
			class="btn btn-ghost btn-sm"
			style="border-radius:var(--radius-sm) var(--radius-sm) 0 0; {tab === 'open' ? 'border-bottom:2px solid var(--color-accent); color:var(--color-accent);' : ''}">
			Open quests
		</a>
		<a href="/quests?tab=completed"
			class="btn btn-ghost btn-sm"
			style="border-radius:var(--radius-sm) var(--radius-sm) 0 0; {tab === 'completed' ? 'border-bottom:2px solid var(--color-accent); color:var(--color-accent);' : ''}">
			Completed
		</a>
	</div>

	{#if data.items.length === 0}
		<div class="card" style="text-align:center; padding:3rem;">
			<p style="font-size:2rem; margin-bottom:0.5rem;">⚔</p>
			<p style="color:var(--text-secondary);">
				{tab === 'completed' ? 'No completed quests yet.' : 'No quests available right now.'}
			</p>
		</div>
	{:else}
		<div class="sections">
			{#each data.items as quest}
				<div class="card">
					<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; flex-wrap:wrap;">
						<div style="flex:1; min-width:0;">
							<a href="/quests/{quest.id}" style="text-decoration:none; color:inherit;">
								<h3 style="margin:0 0 0.25rem; font-size:1rem; font-weight:700;">{quest.title}</h3>
							</a>
							<p style="font-size:0.875rem; color:var(--text-muted); margin:0;">
								DM: {(quest as any).dmName} · Lv {quest.minLevel}–{quest.maxLevel}
								{#if tab === 'open'} · {quest.signups.length}/{quest.maxCapacity} players{/if}
							</p>
							{#if (quest as any).regionName}
								<span style="display:block; font-size:0.75rem; color:var(--text-muted); margin-top:0.125rem;">
									📍 {(quest as any).worldName ? `${(quest as any).worldName} › ` : ''}{(quest as any).regionName}{(quest as any).locationName ? ` · ${(quest as any).locationName}` : ''}
								</span>
							{/if}
						</div>

						<div style="display:flex; align-items:center; gap:0.5rem; flex-shrink:0; flex-wrap:wrap">
							{#if tab === 'completed' && participatedIds.has(quest.id) && (data as any).ratingsEnabled}
								{#if ratingMap[quest.id]}
									<span style="font-size:0.875rem; color:var(--text-muted);">
										{'★'.repeat(ratingMap[quest.id])}{'☆'.repeat(5 - ratingMap[quest.id])} Rated
									</span>
								{:else}
									<a href="/quests/{quest.id}#rate" class="btn btn-primary btn-sm">Rate DM</a>
								{/if}
							{:else if tab === 'open'}
								<a href="/quests/{quest.id}" class="btn btn-ghost btn-sm">View</a>
							{/if}
						</div>
					</div>

					{#if quest.description}
						<p style="font-size:0.875rem; color:var(--text-secondary); margin:0.5rem 0 0; white-space:pre-wrap; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
							{quest.description}
						</p>
					{/if}

					{#if tab === 'open'}
						<div style="display:flex; gap:0.375rem; flex-wrap:wrap; margin-top:0.5rem;">
							<span class="badge badge-muted">XP {quest.missionXp.toLocaleString()}</span>
							{#each quest.rewards.filter((r: any) => r.type !== 'ITEM' && r.amount > 0) as r}
								<span class="badge badge-muted">{r.type} {r.amount.toLocaleString()}</span>
							{/each}
							{#each quest.rewards.filter((r: any) => r.type === 'ITEM') as r}
								<span class="badge badge-muted">ITEM: {r.itemName ?? 'Item'}</span>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Pagination -->
		{#if data.totalPages > 1}
			<div style="display:flex; justify-content:center; gap:0.5rem; margin-top:1.5rem; flex-wrap:wrap">
				{#if data.page > 1}
					<a href="?tab={tab}&page={data.page - 1}" class="btn btn-ghost btn-sm">← Prev</a>
				{/if}
				<span style="padding:0.375rem 0.75rem; font-size:0.875rem; color:var(--text-muted);">
					{data.page} / {data.totalPages}
				</span>
				{#if data.page < data.totalPages}
					<a href="?tab={tab}&page={data.page + 1}" class="btn btn-ghost btn-sm">Next →</a>
				{/if}
			</div>
		{/if}
	{/if}
</div>