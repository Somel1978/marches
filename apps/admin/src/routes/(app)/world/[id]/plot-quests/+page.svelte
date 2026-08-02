<!-- apps/admin/src/routes/(app)/world/[id]/plot-quests/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function fmtDate(d: string | Date | null | undefined) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/world/{data.world.id}" class="back-link">← {data.world.name}</a>
			<h2 class="page__title">Plot quests</h2>
		</div>
		{#if data.canEdit}
			<form method="post" action="?/create" use:enhance>
				<button type="submit" class="btn btn-primary btn-sm">+ New plot quest</button>
			</form>
		{/if}
	</div>

	<p style="margin:0 0 1rem; color:var(--text-muted); font-size:0.875rem;">
		World lore missions (not play sessions). Link factions, NPCs, and system Quests from each plot.
	</p>

	{#if data.plotQuests.length === 0}
		<p class="table__empty">No plot quests yet.</p>
	{:else}
		<div class="table-wrap">
			<table class="table">
				<thead>
					<tr>
						<th>Title</th>
						<th>Status</th>
						<th>Deadline</th>
						<th>Quests</th>
						<th>Factions</th>
						<th>NPCs</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.plotQuests as p}
						<tr>
							<td style="font-weight:600;">
								<a href="/world/{data.world.id}/plot-quests/{p.id}">{p.title}</a>
							</td>
							<td><span class="badge badge-muted">{p.status}</span></td>
							<td>{p.deadlineDay == null ? '—' : `Day ${p.deadlineDay}`}</td>
							<td>{p.linkedQuestCount}</td>
							<td>{p.linkedFactionCount}</td>
							<td>{p.linkedNpcCount}</td>
							<td><a href="/world/{data.world.id}/plot-quests/{p.id}" class="btn btn-ghost btn-sm">Open</a></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
