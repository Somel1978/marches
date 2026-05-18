<!-- apps/frontend/src/routes/+layout.svelte -->
<script lang="ts">
	import '@core/ui/styles/index.css';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="site" data-theme="frontend">
	<header class="site__nav">
		<nav class="nav-bar">
			<a href="/" class="nav-bar__brand">
				<span class="nav-bar__logo">⚔</span>
				<span class="nav-bar__name">Marches</span>
			</a>

			<!-- Feature nav links added here as modules are built -->
			<div class="nav-bar__links" id="feature-nav"></div>

			<div class="nav-bar__actions">
				{#if data.user}
					<a href="/characters" class="nav-link">Characters</a>
					<a href="/profile" class="btn btn-ghost btn-sm">Profile</a>
					<form method="post" action="/signout" style="display:contents">
						<button type="submit" class="btn btn-ghost btn-sm">Sign out</button>
					</form>
				{:else}
					<a href="/login" class="btn btn-ghost btn-sm">Sign in</a>
					<a href="/signup" class="btn btn-primary btn-sm">Sign up</a>
				{/if}
			</div>
		</nav>
	</header>

	<main class="site__main">
		{@render children()}
	</main>

	<footer class="site__footer">
		<p class="site__footer-text">© {new Date().getFullYear()} Marches</p>
	</footer>
</div>