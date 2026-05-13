<!-- apps/frontend/src/routes/+layout.svelte -->
<script lang="ts">
	import '@core/ui/styles/index.css';
	import favicon from '$lib/assets/favicon.svg';
	import { NavBar, Footer } from '@core/ui';
	import { page } from '$app/state';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="site">
	<NavBar user={data.user ?? null}>
		{#snippet links()}
			<a href="/quests" class="nav-link" class:nav-link--active={page.url.pathname.startsWith('/quests')}>
				Quests
			</a>
			<a href="/map" class="nav-link" class:nav-link--active={page.url.pathname === '/map'}>
				Map
			</a>
		{/snippet}

		{#snippet actions()}
			{#if data.user}
				<a href="/character" class="btn btn-ghost btn-sm">My Character</a>
			{:else}
				<a href="/login" class="btn btn-primary btn-sm">Sign In</a>
			{/if}
		{/snippet}
	</NavBar>

	<main class="site__main">
		{@render children()}
	</main>

	<Footer />
</div>

<style>
	.site {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}

	.site__main {
		flex: 1;
		width: 100%;
		max-width: 1280px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.nav-link {
		padding: 0.375rem 0.75rem;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary);
		text-decoration: none;
		transition: color var(--transition-fast), background-color var(--transition-fast);
	}

	.nav-link:hover {
		color: var(--text-primary);
		background-color: var(--bg-overlay);
	}

	.nav-link--active {
		color: var(--accent-light);
	}
</style>