<!-- apps/admin/src/routes/(app)/users/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let search = $derived(data.search ?? '');
	let debounce: ReturnType<typeof setTimeout>;

	function onSearch() {
		clearTimeout(debounce);
		debounce = setTimeout(() => {
			const params = new URLSearchParams();
			if (search) params.set('q', search);
			goto(`/users?${params}`, { replaceState: true });
		}, 300);
	}

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">Users</h2>
			<p class="page__subtitle">{data.total} user{data.total !== 1 ? 's' : ''}</p>
		</div>
		<a href="/users/new" class="btn btn-primary">New user</a>
	</div>

	<div class="toolbar">
		<input
			type="search"
			class="input"
			placeholder="Search by name or email…"
			bind:value={search}
			oninput={onSearch}
			style="max-width: 320px;"
		/>
	</div>

	<div class="card">
		<table class="table">
			<thead>
				<tr>
					<th>Name</th>
					<th>Email</th>
					<th>Roles</th>
					<th>Verified</th>
					<th>Created</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.items as user}
					<tr>
						<td class="table__name">
							{#if user.image}
								<img src={user.image} alt={user.name} class="avatar-sm" />
							{:else}
								<div class="avatar-sm avatar-sm--initials">
									{user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
								</div>
							{/if}
							<span>{user.name}</span>
						</td>
						<td class="table__muted">{user.email}</td>
						<td>
							<div class="role-badges">
								{#each user.userRoles as { role }}
									<span class="badge badge-muted">{role.name}</span>
								{/each}
								{#if user.userRoles.length === 0}
									<span class="table__muted">—</span>
								{/if}
							</div>
						</td>
						<td>
							{#if user.emailVerified}
								<span class="badge badge-success">Verified</span>
							{:else}
								<span class="badge badge-muted">Pending</span>
							{/if}
						</td>
						<td class="table__muted">{formatDate(user.createdAt)}</td>
						<td class="table__action">
							<a href="/users/{user.id}" class="btn btn-ghost btn-sm">Edit</a>
						</td>
					</tr>
				{/each}

				{#if data.items.length === 0}
					<tr>
						<td colspan="6" class="table__empty">
							{data.search ? `No users matching "${data.search}"` : 'No users yet.'}
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	{#if data.totalPages > 1}
		<div class="pagination">
			{#each Array.from({ length: data.totalPages }, (_, i) => i + 1) as p}
				<a
					href="/users?page={p}{data.search ? `&q=${data.search}` : ''}"
					class="pagination__page"
					class:pagination__page--active={p === data.page}
				>{p}</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.page { display: flex; flex-direction: column; gap: 1.5rem; }

	.page__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.page__title { font-size: 1.25rem; font-weight: 700; }
	.page__subtitle { font-size: 0.875rem; color: var(--text-muted); margin: 0.25rem 0 0; }

	.toolbar { display: flex; gap: 0.75rem; align-items: center; }

	.table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }

	.table th {
		text-align: left;
		padding: 0.625rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-muted);
		border-bottom: 1px solid var(--border-muted);
	}

	.table td {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border-muted);
		color: var(--text-primary);
		vertical-align: middle;
	}

	.table tr:last-child td { border-bottom: none; }
	.table tr:hover td { background-color: var(--bg-overlay); }
	.table__muted { color: var(--text-secondary) !important; }
	.table__action { text-align: right; width: 80px; }

	.table__name {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.table__empty {
		text-align: center;
		padding: 2rem !important;
		color: var(--text-muted) !important;
	}

	.avatar-sm {
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
	}

	.avatar-sm--initials {
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--accent-dim);
		border: 1px solid var(--border-accent);
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--accent-light);
		flex-shrink: 0;
	}

	.role-badges { display: flex; gap: 0.375rem; flex-wrap: wrap; }

	.pagination {
		display: flex;
		gap: 0.375rem;
		justify-content: center;
	}

	.pagination__page {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		color: var(--text-secondary);
		text-decoration: none;
		transition: background-color var(--transition-fast), color var(--transition-fast);
	}

	.pagination__page:hover { background-color: var(--bg-overlay); color: var(--text-primary); }
	.pagination__page--active { background-color: var(--accent); color: #fff; }
</style>