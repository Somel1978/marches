<!-- apps/admin/src/routes/(app)/dms/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">DM Profiles</h2>
			<p class="page__subtitle">{data.profiles.length} DM{data.profiles.length !== 1 ? 's' : ''}</p>
		</div>
	</div>

	<div class="table-wrap card">
		<table class="table">
			<thead>
				<tr>
					<th>DM</th>
					<th class="col-hide-mobile">Specialties</th>
					<th>Public</th>
					<th>Active</th>
					<th class="col-hide-tablet">Since</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.profiles as profile}
					<tr>
						<td>
							<span class="table__name">{profile.user?.name ?? profile.userId}</span>
							<span class="table__muted" style="display:block; font-size:0.8125rem;">{profile.user?.email ?? ''}</span>
						</td>
						<td class="table__muted col-hide-mobile">{profile.specialties ?? '—'}</td>
						<td><span class="badge {profile.isPublic ? 'badge-success' : 'badge-muted'}">{profile.isPublic ? 'Yes' : 'No'}</span></td>
						<td><span class="badge {profile.isActive ? 'badge-success' : 'badge-danger'}">{profile.isActive ? 'Yes' : 'No'}</span></td>
						<td class="table__muted col-hide-tablet">{formatDate(profile.createdAt)}</td>
						<td class="table__action">
							<a href="/dms/{profile.id}" class="btn btn-ghost btn-sm">Edit</a>
						</td>
					</tr>
				{:else}
					<tr><td colspan="6" class="table__empty">No DM profiles yet.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
