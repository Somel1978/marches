<!-- apps/frontend/src/routes/+layout.svelte -->
<script lang="ts">
	import '@core/ui/styles/index.css';
	import { NotificationBell } from '@core/ui';
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();
	let menuOpen = $state(false);

	let notifCount: number = $state(0);
	let notifList:  any[]  = $state([]);
	$effect.pre(() => {
		notifCount = (data as any).notifCount   ?? 0;
		notifList  = (data as any).notifications ?? [];
	});

	function closeMenu() { menuOpen = false; }

	// Group definitions
	const groups = [
		{
			label: 'Adventure',
			items: [
				{ href: '/characters',  label: 'Characters'  },
				{ href: '/quests',      label: 'Quests'      },
				{ href: '/world',       label: 'World'       },
				{ href: '/stats',       label: 'Statistics'  },
			],
		},
		{
			label: 'Campaign',
			items: [
				{ href: '/availability', label: 'Availability' },
				{ href: '/marketplace',  label: 'Marketplace'  },
			],
		},
		{
			label: 'Community',
			items: [
				{ href: '/news',               label: 'News'           },
				{ href: '/wiki',               label: 'Wiki'           },
				{ href: '/tools/dndpointbuy',  label: 'Point Buy'      },
			],
		},
	];

	// Is any item in this group the current page?
	function groupActive(items: {href:string}[]) {
		return items.some(i => $page.url.pathname.startsWith(i.href));
	}
	function itemActive(href: string) {
		return $page.url.pathname.startsWith(href);
	}
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="site" data-theme="frontend">
	<header class="site__nav">
		<nav class="nav-bar">
			<!-- Brand -->
			<a href="/" class="nav-bar__brand" onclick={closeMenu}>
				{#if (data as any).siteLogo && (data as any).siteLogo.startsWith('<')}
					<span style="display:inline-flex; align-items:center; height:28px; width:auto;">{@html (data as any).siteLogo}</span>
				{:else if (data as any).siteLogo}
					<img src={(data as any).siteLogo} alt={(data as any).siteName} style="height:28px; width:auto;" />
				{:else if (data as any).siteLogoIcon && (data as any).siteLogoIcon.startsWith('<')}
					<span style="display:inline-flex; align-items:center; height:28px; width:auto;">{@html (data as any).siteLogoIcon}</span>
					<span class="nav-bar__name">{(data as any).siteName}</span>
				{:else if (data as any).siteLogoIcon && ((data as any).siteLogoIcon.startsWith('http') || (data as any).siteLogoIcon.startsWith('/'))}
					<img src={(data as any).siteLogoIcon} alt={(data as any).siteName} style="height:28px; width:auto;" />
					<span class="nav-bar__name">{(data as any).siteName}</span>
				{:else}
					<span class="nav-bar__logo">{(data as any).siteLogoIcon || '⚔'}</span>
					<span class="nav-bar__name">{(data as any).siteName}</span>
				{/if}
			</a>

			<!-- Hamburger (mobile) -->
			<button class="nav-bar__hamburger" aria-label="Toggle menu"
				aria-expanded={menuOpen} onclick={() => menuOpen = !menuOpen}>
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

			<!-- Desktop nav — grouped dropdowns -->
			<div class="nav-bar__links nav-bar__links--desktop">
				{#if data.user}
					{#each groups as group}
						<div class="nav-group {groupActive(group.items) ? 'nav-group--active' : ''}">
							<button class="nav-group__trigger">
								{group.label}
								<svg class="nav-group__chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="2,4 6,8 10,4"/>
								</svg>
							</button>
							<div class="nav-group__menu">
								{#each group.items as item}
									<a href={item.href}
										class="nav-group__item {itemActive(item.href) ? 'nav-group__item--active' : ''}">
										{item.label}
									</a>
								{/each}
							</div>
						</div>
					{/each}

					{#if (data.user as any).hasDMProfile}
						<a href="/dm" class="nav-group__trigger {itemActive('/dm') ? 'nav-group--active' : ''}">DM Hub</a>
					{:else}
						<a href="/dm-request" class="nav-group__trigger {itemActive('/dm-request') ? 'nav-group--active' : ''}">Become a DM</a>
					{/if}
				{/if}
			</div>

			<!-- Desktop actions -->
			<div class="nav-bar__actions nav-bar__actions--desktop">
				{#if data.user}
					{@const Bell = NotificationBell as any}
					<Bell count={notifCount} notifications={notifList} />
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
					{#each groups as group}
						<p class="nav-mobile__group-title">{group.label}</p>
						{#each group.items as item}
							<a href={item.href}
								class="nav-mobile__link {itemActive(item.href) ? 'nav-link--active' : ''}"
								onclick={closeMenu}>{item.label}</a>
						{/each}
					{/each}
					<p class="nav-mobile__group-title">DM</p>
					{#if (data.user as any).hasDMProfile}
						<a href="/dm" class="nav-mobile__link" onclick={closeMenu}>DM Hub</a>
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