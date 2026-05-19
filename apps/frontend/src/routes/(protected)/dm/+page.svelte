<!-- apps/frontend/src/routes/(protected)/dm/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">DM Dashboard</h2>
			<p class="page__subtitle">Welcome back, {data.profile.userId}</p>
		</div>
		<a href="/dm/profile" class="btn btn-ghost btn-sm">Edit profile</a>
	</div>

	<div class="sections">
		<div class="card">
			<h3 class="section-title">Active quests</h3>
			<p class="table__empty">Quest system coming soon.</p>
		</div>
		<div class="card">
			<h3 class="section-title">Assigned regions</h3>
			<p class="table__empty">World system coming soon.</p>
		</div>
	</div>
</div>
