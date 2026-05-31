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

	<div class="table-wrap card">
		<div class="table-wrap">
			<table class="table">
			<thead>
				<tr>
					<th>Name</th>
					<th class="col-hide-mobile">Description</th>
					<th class="table__num">Users</th>
					<th class="col-hide-tablet">Created</th>
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
						<td class="table__muted col-hide-mobile">{role.description ?? '—'}</td>
						<td class="table__num">{role._count.userRoles}</td>
						<td class="table__muted col-hide-tablet">{formatDate(role.createdAt)}</td>
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
</div>