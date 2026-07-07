<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/quests/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import DmAvailabilityDashboard from '$lib/dm/DmAvailabilityDashboard.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const world      = $derived((data as any).world);
	const canManage  = $derived((data as any).canManage === true);
	const currentStatus = $derived((data as any).status ?? null);
	const availability = $derived((data as any).availability);

	const statusColors: Record<string, string> = {
		DRAFT:                   'badge-muted',
		PENDING_APPROVAL:        'badge-warning',
		PUBLISHED:               'badge-success',
		IN_PROGRESS:             'badge-accent',
		PENDING_RESULT:          'badge-warning',
		PENDING_RESULT_APPROVAL: 'badge-warning',
		COMPLETED:               'badge-success',
		CANCELLED:               'badge-danger',
	};

	const STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'IN_PROGRESS', 'PENDING_RESULT', 'PENDING_RESULT_APPROVAL', 'COMPLETED', 'CANCELLED'];

	function formatDate(d: Date | string | null) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function e_reload() {
		return async ({ update }: any) => { await update(); await invalidateAll(); };
	}
</script>

<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
	<p class="page__subtitle">{data.total} quest{data.total !== 1 ? 's' : ''}</p>
	<a href="/dm/worlds/{world.id}/quests/new" class="btn btn-primary btn-sm">+ New quest</a>
</div>

{#if form?.message}<div class="form-error">{(form as any).message}</div>{/if}
{#if (form as any)?.success}<div class="form-success">Done.</div>{/if}

<!-- Player availability while scheduling quests -->
<div class="card" style="margin-bottom:1.5rem;">
	<h3 class="section-title">Player availability</h3>
	<DmAvailabilityDashboard
		weekStart={availability.weekStart}
		heatmapData={availability.heatmapData}
		dayPlayerCounts={availability.dayPlayerCounts}
		playerRows={availability.playerRows}
		totalPlayers={availability.totalPlayers}
		worldMap={availability.worldMap}
		basePath="/dm/worlds/{world.id}/quests"
		sectionHint="Players available for this world when scheduling quests. Click a block to see characters."
		embedded={true}
	/>
</div>

<!-- Status filter -->
<div class="card" style="margin-bottom:1.5rem; display:flex; gap:0.375rem; flex-wrap:wrap; align-items:center;">
	<a href="?" class="btn btn-sm {!currentStatus ? 'btn-primary' : 'btn-ghost'}">All</a>
	{#each STATUSES as s}
		<a href="?status={s}" class="btn btn-sm {currentStatus === s ? 'btn-primary' : 'btn-ghost'}">{s.replace(/_/g, ' ')}</a>
	{/each}
</div>

<div class="card">
	<div class="table-wrap">
		<table class="table">
		<thead>
			<tr>
				<th>Quest</th>
				<th class="col-hide-mobile">DM</th>
				<th class="col-hide-mobile">Region</th>
				<th>Status</th>
				<th class="col-hide-tablet">Scheduled</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each data.items as quest}
				<tr>
					<td>
						<div style="font-weight:600;">{quest.title}</div>
						<div class="table__muted" style="font-size:0.8125rem;">
							Lv {quest.minLevel}–{quest.maxLevel} · {quest.signups?.length ?? 0}/{quest.maxCapacity} players
						</div>
					</td>
					<td class="table__muted col-hide-mobile">{(quest as any).dmName ?? '—'}</td>
					<td class="table__muted col-hide-mobile">{(quest as any).regionName ?? '—'}</td>
					<td><span class="badge {statusColors[quest.status] ?? 'badge-muted'}">{quest.status.replace(/_/g, ' ')}</span></td>
					<td class="table__muted col-hide-tablet">{formatDate((quest as any).scheduledAt)}</td>
					<td class="table__action">
						{#if quest.status === 'PENDING_APPROVAL' && canManage}
							<div style="display:flex; gap:0.375rem; flex-wrap:wrap; justify-content:flex-end;">
								<form method="post" action="?/approve" use:enhance={e_reload}>
									<input type="hidden" name="id" value={quest.id} />
									<button type="submit" class="btn btn-primary btn-sm">Approve</button>
								</form>
								<form method="post" action="?/reject" use:enhance={e_reload} style="display:flex; gap:0.25rem; flex-wrap:wrap">
									<input type="hidden" name="id" value={quest.id} />
									<input name="note" type="text" class="input" placeholder="Reason" required style="width:110px;" />
									<button type="submit" class="btn btn-danger btn-sm" >Reject</button>
								</form>
							</div>
						{:else if quest.status === 'PENDING_RESULT_APPROVAL' && canManage}
							<div style="display:flex; gap:0.375rem; flex-wrap:wrap; justify-content:flex-end;">
								<form method="post" action="?/approveResult" use:enhance={e_reload}>
									<input type="hidden" name="questId" value={quest.id} />
									<button type="submit" class="btn btn-primary btn-sm">Approve result</button>
								</form>
								<form method="post" action="?/rejectResult" use:enhance={e_reload} style="display:flex; gap:0.25rem; flex-wrap:wrap">
									<input type="hidden" name="questId" value={quest.id} />
									<input name="note" type="text" class="input" placeholder="Reason" required style="width:110px;" />
									<button type="submit" class="btn btn-danger btn-sm" >Reject</button>
								</form>
							</div>
						{:else}
							<a href="/dm/quests/{quest.id}" class="btn btn-ghost btn-sm">Manage</a>
						{/if}
					</td>
				</tr>
			{:else}
				<tr><td colspan="6" class="table__empty">No quests{currentStatus ? ` with status "${currentStatus}"` : ''} in this world.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
</div>