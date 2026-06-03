<!-- apps/admin/src/routes/(app)/characters/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const STATUSES = ['PENDING', 'ACTIVE', 'RESTING', 'SUSPENDED', 'RETIRED', 'DECEASED'];

	const statusColors: Record<string, string> = {
		PENDING:   'badge-warning',
		ACTIVE:    'badge-success',
		RESTING:   'badge-accent',
		SUSPENDED: 'badge-danger',
		RETIRED:   'badge-muted',
		DECEASED:  'badge-muted',
	};

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}

	function totalLevel(item: any) {
		return (item as any).level ?? item.classes?.reduce((s: number, c: any) => s + c.allocatedLevel, 0) ?? 0;
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">Characters</h2>
			<p class="page__subtitle">{data.total} character{data.total !== 1 ? 's' : ''}</p>
		</div>
		<form method="post" action="?/clearRest" use:enhance={()=>{return async({update})=>{await update();await invalidateAll();};}}
>
			<button type="submit" class="btn btn-ghost btn-sm" title="Clear expired rest for all RESTING characters">⏰ Clear rested</button>
		</form>
	</div>

	{#if (form as any)?.clearRestSuccess}<div class="form-success">{(form as any).count} character{(form as any).count !== 1 ? 's' : ''} cleared from rest.</div>{/if}

	<!-- Filters -->
	<div class="toolbar">
		<a href="/characters" class="btn btn-sm {!data.items || true ? 'btn-ghost' : 'btn-ghost'}">All</a>
		{#each STATUSES as s}
			<a href="/characters?status={s}" class="btn btn-sm btn-ghost">{s}</a>
		{/each}
	</div>

	<div class="table-wrap card">
		<div class="table-wrap">
			<table class="table">
			<thead>
				<tr>
					<th>Character</th>
					<th class="col-hide-mobile">Player</th>
					<th>Status</th>
					<th class="col-hide-tablet">Level</th>
					<th class="col-hide-tablet">Created</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.items as char}
					<tr>
						<td>
							<div class="table__name">
								{#if char.avatarUrl}
									<img src={char.avatarUrl} alt={char.name} class="avatar-sm avatar-sm--initials" style="border-radius:50%; object-fit:cover;" />
								{/if}
								<strong>{char.name}</strong>
							</div>
						</td>
						<td class="table__muted col-hide-mobile">{(char as any).user?.name ?? char.userId}</td>
						<td>
							<span class="badge {statusColors[char.status] ?? 'badge-muted'}">{char.status}</span>
						</td>
						<td class="table__muted col-hide-tablet">{totalLevel(char)}</td>
						<td class="table__muted col-hide-tablet">{formatDate(char.createdAt)}</td>
						<td class="table__action">
							<a href="/characters/{char.id}" class="btn btn-ghost btn-sm">View</a>
						</td>
					</tr>
				{:else}
					<tr><td colspan="6" class="table__empty">No characters found.</td></tr>
				{/each}
			</tbody>
		</table>
</div>
	</div>

	{#if data.totalPages > 1}
		<div class="pagination">
			{#each Array.from({ length: data.totalPages }, (_, i) => i + 1) as p}
				<a href="/characters?page={p}" class="pagination__page"
					class:pagination__page--active={p === data.page}>{p}</a>
			{/each}
		</div>
	{/if}
</div>