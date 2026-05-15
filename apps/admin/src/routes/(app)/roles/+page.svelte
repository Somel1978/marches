<!-- apps/admin/src/routes/(app)/roles/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('en-GB', {
			day:   '2-digit',
			month: 'short',
			year:  'numeric',
		});
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">Roles</h2>
			<p class="page__subtitle">{data.roles.length} role{data.roles.length !== 1 ? 's' : ''}</p>
		</div>
		<a href="/roles/new" class="btn btn-primary">New role</a>
	</div>

	<div class="card">
		<table class="table">
			<thead>
				<tr>
					<th>Name</th>
					<th>Description</th>
					<th class="table__num">Users</th>
					<th>Created</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.roles as role}
					<tr>
						<td>
							<div class="role-name">
								<span>{role.name}</span>
								{#if role.name === 'SUPERADMIN'}
									<span class="badge badge-accent">System</span>
								{/if}
							</div>
						</td>
						<td class="table__muted">{role.description ?? '—'}</td>
						<td class="table__num">{role._count.userRoles}</td>
						<td class="table__muted">{formatDate(role.createdAt)}</td>
						<td class="table__action">
							{#if role.name !== 'SUPERADMIN'}
								<a href="/roles/{role.id}" class="btn btn-ghost btn-sm">Edit</a>
							{:else}
								<a href="/roles/{role.id}" class="btn btn-ghost btn-sm">View</a>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.page__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.page__title {
		font-size: 1.25rem;
		font-weight: 700;
	}

	.page__subtitle {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin: 0.25rem 0 0;
	}

	.table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.table th {
		text-align: left;
		padding: 0.625rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-muted);
		border-bottom: 1px solid var(--border-muted);
	}

	.table td {
		padding: 0.875rem 1rem;
		border-bottom: 1px solid var(--border-muted);
		color: var(--text-primary);
		vertical-align: middle;
	}

	.table tr:last-child td {
		border-bottom: none;
	}

	.table tr:hover td {
		background-color: var(--bg-overlay);
	}

	.table__muted {
		color: var(--text-secondary) !important;
	}

	.table__num {
		text-align: right;
	}

	.table__action {
		text-align: right;
		width: 80px;
	}

	.role-name {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
