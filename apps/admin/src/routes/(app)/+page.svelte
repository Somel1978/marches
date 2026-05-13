<!-- apps/admin/src/routes/(app)/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<div class="dashboard">
	<h2 class="dashboard__heading">Dashboard</h2>
	<p class="dashboard__welcome">Welcome back, {data.user.name}.</p>

	<!-- Stat placeholders — replace with real data as features are built -->
	<div class="dashboard__stats">
		<div class="stat-card">
			<span class="stat-value">—</span>
			<span class="stat-label">Users</span>
		</div>
		<div class="stat-card">
			<span class="stat-value">—</span>
			<span class="stat-label">Roles</span>
		</div>
		<div class="stat-card">
			<span class="stat-value">—</span>
			<span class="stat-label">Quests</span>
		</div>
		<div class="stat-card">
			<span class="stat-value">—</span>
			<span class="stat-label">Active Sessions</span>
		</div>
	</div>
</div>

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.dashboard__heading {
		font-size: 1.25rem;
		font-weight: 700;
	}

	.dashboard__welcome {
		color: var(--text-secondary);
		font-size: 0.9375rem;
		margin: 0;
	}

	.dashboard__stats {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 1rem;
	}
</style>