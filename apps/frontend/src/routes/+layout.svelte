<!-- apps/frontend/src/routes/+layout.svelte -->
<script lang="ts">
	import '@core/ui/styles/index.css';
	import { NotificationBell } from '@core/ui';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();
	let menuOpen = $state(false);

	function closeMenu() { menuOpen = false; }
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="site" data-theme="frontend">
	<header class="site__nav">
		<nav class="nav-bar">
			<a href="/" class="nav-bar__brand" onclick={closeMenu}>
				{#if (data as any).siteLogo && (data as any).siteLogo.startsWith('<')}
					<span style="display:inline-flex; align-items:center; height:28px; width:auto;">{@html (data as any).siteLogo}</span>
				{:else if (data as any).siteLogo}
					<img src={(data as any).siteLogo} alt={(data as any).siteName} style="height:28px; width:auto;" />
				{:else}
					<span class="nav-bar__logo">⚔</span>
					<span class="nav-bar__name">{(data as any).siteName}</span>
				{/if}
			</a>

			<!-- Hamburger (mobile) -->
			<button
				class="nav-bar__hamburger"
				aria-label="Toggle menu"
				aria-expanded={menuOpen}
				onclick={() => menuOpen = !menuOpen}>
				{#if menuOpen}
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				{:else}
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="3" y1="6"  x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
					</svg>
				{/if}
			</button>

			<!-- Desktop nav -->
			<div class="nav-bar__links nav-bar__links--desktop">
				{#if data.user}
					<a href="/characters"  class="nav-link">Characters</a>
					<a href="/quests"      class="nav-link">Quests</a>
					<a href="/marketplace" class="nav-link">Marketplace</a>
					<a href="/world" class="nav-link">World</a>
					{#if data.user.hasDMProfile}
						<a href="/dm" class="nav-link">DM Hub</a>
					{:else}
						<a href="/dm-request" class="nav-link">Become a DM</a>
					{/if}
				{/if}
			</div>

			<!-- Desktop actions -->
			<div class="nav-bar__actions nav-bar__actions--desktop">
				{#if data.user}
					<NotificationBell
						count={(data as any).notifCount ?? 0}
						notifications={(data as any).notifications ?? []}
						markReadUrl="/notifications?/read"
						markAllUrl="/notifications?/readAll" />
					<a href="/profile" class="btn btn-ghost btn-sm">Profile</a>
					<form method="post" action="/signout" style="display:contents">
						<button type="submit" class="btn btn-ghost btn-sm">Sign out</button>
					</form>
				{:else}
					<a href="/login"  class="btn btn-ghost   btn-sm">Sign in</a>
					<a href="/signup" class="btn btn-primary btn-sm">Sign up</a>
				{/if}
			</div>
		</nav>

		<!-- Mobile menu -->
		{#if menuOpen}
			<div class="nav-mobile" role="menu">
				{#if data.user}
					<a href="/characters"  class="nav-mobile__link" onclick={closeMenu}>Characters</a>
					<a href="/quests"      class="nav-mobile__link" onclick={closeMenu}>Quests</a>
					<a href="/marketplace" class="nav-mobile__link" onclick={closeMenu}>Marketplace</a>
					<a href="/world" class="nav-mobile__link" onclick={closeMenu}>World</a>
					{#if data.user.hasDMProfile}
						<a href="/dm"         class="nav-mobile__link" onclick={closeMenu}>DM Hub</a>
					{:else}
						<a href="/dm-request" class="nav-mobile__link" onclick={closeMenu}>Become a DM</a>
					{/if}
					<hr style="border-color:var(--border-muted); margin:0.5rem 0;" />
					<a href="/profile" class="nav-mobile__link" onclick={closeMenu}>Profile</a>
					<form method="post" action="/signout">
						<button type="submit" class="nav-mobile__link" style="width:100%; text-align:left; background:none; border:none; cursor:pointer;">Sign out</button>
					</form>
				{:else}
					<a href="/login"  class="nav-mobile__link" onclick={closeMenu}>Sign in</a>
					<a href="/signup" class="nav-mobile__link" onclick={closeMenu}>Sign up</a>
				{/if}
			</div>
		{/if}
	</header>

	<main class="site__main">
		{@render children()}
	</main>

	<footer class="site__footer">
		{#if (data as any).siteFooter}
		{@html (data as any).siteFooter}
	{:else}
		<p class="site__footer-text">© {new Date().getFullYear()} {(data as any).siteName}</p>
	{/if}
	</footer>
</div>