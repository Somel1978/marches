<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/plot-quests/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function fmtDay(d: number | null | undefined) {
		if (d == null) return '—';
		return `Day ${d}`;
	}
</script>

<div class="page__header" style="margin-bottom:1rem;">
	<div>
		<h3 class="page__title" style="margin:0; font-size:1.15rem;">Plot quests</h3>
		<p style="margin:0.35rem 0 0; color:var(--text-muted); font-size:0.875rem;">
			World lore missions (not play sessions). Link factions, NPCs, and system Quests from each plot.
		</p>
	</div>
	<form method="post" action="?/create" use:enhance>
		<button type="submit" class="btn btn-primary btn-sm">+ New plot quest</button>
	</form>
</div>

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
							<a href="/dm/worlds/{data.world.id}/plot-quests/{p.id}">{p.title}</a>
							{#if p.summary}
								<div style="font-size:0.8rem; color:var(--text-muted); font-weight:400;">{p.summary}</div>
							{/if}
						</td>
						<td><span class="badge badge-muted">{p.status}</span></td>
						<td>{fmtDay(p.deadlineDay)}</td>
						<td>{p.linkedQuestCount}</td>
						<td>{p.linkedFactionCount}</td>
						<td>{p.linkedNpcCount}</td>
						<td><a href="/dm/worlds/{data.world.id}/plot-quests/{p.id}" class="btn btn-ghost btn-sm">Open</a></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
