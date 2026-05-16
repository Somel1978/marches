<!-- apps/admin/src/routes/(app)/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<div class="dashboard">
	<h2 class="dashboard__heading">Dashboard</h2>

	<div class="dashboard__stats">
		<div class="stat-card">
			<span class="stat-value">{data.metrics.totalUsers}</span>
			<span class="stat-label">Users</span>
		</div>
		<div class="stat-card">
			<span class="stat-value">{data.metrics.totalRoles}</span>
			<span class="stat-label">Roles</span>
		</div>
		<div class="stat-card">
			<span class="stat-value">{data.metrics.totalResources}</span>
			<span class="stat-label">Resources</span>
		</div>
		<div class="stat-card">
			<span class="stat-value">{data.metrics.activeSessions}</span>
			<span class="stat-label">Active Sessions</span>
		</div>
	</div>

	<div class="dashboard__links">
		<a href="/users" class="quick-link">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
				<circle cx="9" cy="7" r="4"/>
				<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
				<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
			</svg>
			Manage Users
		</a>
		<a href="/roles" class="quick-link">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
			</svg>
			Manage Roles
		</a>
	</div>
</div>