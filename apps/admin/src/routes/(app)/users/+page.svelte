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

	<div class="table-wrap card">
		<table class="table">
			<thead>
				<tr>
					<th>Name</th>
					<th class="col-hide-mobile">Email</th>
					<th>Roles</th>
					<th class="col-hide-tablet">Verified</th>
					<th class="col-hide-tablet">Created</th>
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
						<td class="table__muted col-hide-mobile">{user.email}</td>
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
						<td class="table__muted col-hide-tablet">{formatDate(user.createdAt)}</td>
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