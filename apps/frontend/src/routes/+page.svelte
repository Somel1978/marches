<!-- apps/frontend/src/routes/+page.svelte -->
<!-- Placeholder landing page — content added as features are built -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<div class="landing">
	<div class="landing__hero">
		<span class="landing__icon">⚔</span>
		<h1 class="landing__title"> The Binder & Brew</h1>
		<p class="landing__tagline">A world of adventure awaits.</p>
		{#if !data.user}
			<div class="landing__actions">
				<a href="/signup" class="btn btn-primary btn-lg">Join now</a>
				<a href="/login"  class="btn btn-ghost  btn-lg">Sign in</a>
			</div>
		{:else}
			<p class="landing__welcome">Welcome back, {data.user.name}.</p>
		{/if}
	</div>

	<!-- Feature sections added here as modules are built -->
</div>