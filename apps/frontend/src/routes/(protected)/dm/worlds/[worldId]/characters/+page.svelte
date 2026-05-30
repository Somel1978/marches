<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/+page.svelte -->
<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const statusColors: Record<string, string> = {
		PENDING:   'badge-warning',
		ACTIVE:    'badge-success',
		RESTING:   'badge-accent',
		SUSPENDED: 'badge-danger',
		RETIRED:   'badge-muted',
		DECEASED:  'badge-muted',
	};

	const statusReasonLabels: Record<string, string> = {
		EDIT_PENDING:       'Edit pending',
		LEVEL_UP_PENDING:   'Level-up pending',
		LEVEL_DOWN_PENDING: 'Level-down pending',
		QUEST_REST:         'Resting',
		ADMIN:              'Admin',
		SYSTEM:             'System',
	};

	const STATUSES = ['PENDING', 'ACTIVE', 'RESTING', 'SUSPENDED', 'RETIRED', 'DECEASED'];
	const currentStatus = $derived((data as any).status ?? null);

	function totalLevel(item: any) {
		return item.classes?.reduce((s: number, c: any) => s + c.allocatedLevel, 0) ?? 0;
	}

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}
</script>

<div style="margin-bottom:1rem;">
	<p class="page__subtitle">{data.total} character{data.total !== 1 ? 's' : ''}</p>
</div>

{#if (form as any)?.message}<div class="form-error">{(form as any).message}</div>{/if}
{#if (form as any)?.approveSuccess}<div class="form-success">Character approved.</div>{/if}
{#if (form as any)?.rejectSuccess}<div class="form-success">Character rejected.</div>{/if}

<!-- Status filter -->
<div class="card" style="margin-bottom:1.5rem; display:flex; gap:0.375rem; flex-wrap:wrap; align-items:center;">
	<span class="label" style="margin-right:0.25rem;">Status</span>
	{#each STATUSES as s}
		<a href="?status={s}" class="btn btn-sm {currentStatus === s ? 'btn-primary' : 'btn-ghost'}">{s}</a>
	{/each}
	<a href="?" class="btn btn-sm {!currentStatus ? 'btn-primary' : 'btn-ghost'}">All</a>
</div>

<div class="card">
	<table class="table">
		<thead>
			<tr>
				<th>Character</th>
				<th>Player</th>
				<th>Status</th>
				<th class="col-hide-mobile">Level</th>
				<th class="col-hide-mobile">Created</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each data.items as char}
				<tr>
					<td>
						<div style="display:flex; align-items:center; gap:0.625rem;">
							{#if char.avatarUrl}
								<img src={char.avatarUrl} alt="" style="width:32px; height:32px; border-radius:50%; object-fit:cover; flex-shrink:0;" />
							{/if}
							<div>
								<div style="font-weight:600;">{char.name}</div>
								{#if (char as any).statusReason}
									<div class="table__muted" style="font-size:0.75rem;">{statusReasonLabels[(char as any).statusReason] ?? (char as any).statusReason}</div>
								{/if}
							</div>
						</div>
					</td>
					<td class="table__muted">{(char as any).user?.name ?? char.userId}</td>
					<td><span class="badge {statusColors[char.status] ?? 'badge-muted'}">{char.status}</span></td>
					<td class="table__muted col-hide-mobile">{totalLevel(char)}</td>
					<td class="table__muted col-hide-mobile">{formatDate(char.createdAt)}</td>
					<td class="table__action">
						{#if char.status === 'PENDING' || (char as any).statusReason === 'EDIT_PENDING'}
							<a href="/dm/worlds/{(data as any).world?.id ?? ''}/characters/{char.id}" class="btn btn-primary btn-sm">Review</a>
						{:else}
							<a href="/dm/worlds/{(data as any).world?.id ?? ''}/characters/{char.id}" class="btn btn-ghost btn-sm">View</a>
						{/if}
					</td>
				</tr>
			{:else}
				<tr><td colspan="6" class="table__empty">No characters with status "{currentStatus}".</td></tr>
			{/each}
		</tbody>
	</table>
</div>