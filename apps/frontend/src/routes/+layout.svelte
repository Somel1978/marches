<!-- apps/frontend/src/routes/+layout.svelte -->
<script lang="ts">
	import '@core/ui/styles/index.css';
	import { NotificationBell } from '@core/ui';
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();
	let menuOpen = $state(false);
	/** Mobile accordion: which section labels are expanded (all start collapsed). */
	let mobileOpen = $state<Record<string, boolean>>({});

	// Lightweight sanitizer for admin-set branding {@html} fields.
	// Strips <script> blocks, event handler attributes, and javascript: URIs.
	function sanitizeHtml(raw: string | null | undefined): string {
		if (!raw) return '';
		return raw
			.replace(/<script[\s\S]*?<\/script>/gi, '')
			.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
			.replace(/\bon\w+\s*=\s*[^\s>]*/gi, '')
			.replace(/javascript\s*:/gi, '');
	}

	let notifCount: number = $state(0);
	let notifList:  any[]  = $state([]);
	$effect.pre(() => {
		notifCount = (data as any).notifCount   ?? 0;
		notifList  = (data as any).notifications ?? [];
	});

	function closeMenu() { menuOpen = false; }

	function toggleMobileSection(label: string) {
		mobileOpen = { ...mobileOpen, [label]: !mobileOpen[label] };
	}

	// Group definitions (Codex only when user has dnd5eDescriptions read)
	const groups = $derived([
		{
			label: 'Adventure',
			items: [
				{ href: '/characters',  label: 'Characters'  },
				{ href: '/quests',      label: 'Quests'      },
				{ href: '/world',       label: 'World'       },
				{ href: '/npcs',        label: 'NPCs'        },
				{ href: '/stats',       label: 'Statistics'  },
			],
		},
		{
			label: 'Campaign',
			items: [
				{ href: '/availability', label: 'Availability' },
				{ href: '/marketplace',  label: 'Marketplace'  },
				{ href: '/token-store',  label: 'Token Store'  },
			],
		},
		{
			label: 'Community',
			items: [
				{ href: '/news',                   label: 'News'           },
				{ href: '/wiki',                   label: 'Wiki'           },
				{ href: '/tavern',                 label: 'Tavern'         },
				{ href: '/characters/public',      label: 'Characters'     },
				{ href: '/tools/dndpointbuy',      label: 'Point Buy'      },
				{ href: '/tools/eplanner',         label: 'Encounter Planner' },
				...(data.canViewDescriptions ? [{ href: '/tools/codex', label: 'Codex' }] : []),
			],
		},
	]);

	function groupActive(items: {href:string}[]) {
		return items.some(i => $page.url.pathname.startsWith(i.href));
	}
	function itemActive(href: string) {
		return $page.url.pathname.startsWith(href);
	}

	function openMobileMenu() {
		// Expand every section that matches the current route; others stay collapsed.
		const next: Record<string, boolean> = {};
		for (const g of groups) {
			next[g.label] = groupActive(g.items);
		}
		next['DM'] = itemActive('/dm') || itemActive('/dm-request');
		next['Account'] = itemActive('/profile');
		mobileOpen = next;
		menuOpen = true;
	}
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>{(data as any).siteName ?? 'Marches'}</title>
</svelte:head>

<div class="site">
	<header class="site__nav">
		<nav class="nav-bar">
			<!-- Brand -->
			<a href="/" class="nav-bar__brand" onclick={closeMenu}>
				{#if (data as any).siteLogo && (data as any).siteLogo.startsWith('<')}
					<span style="display:inline-flex; align-items:center; height:28px; width:auto;">{@html sanitizeHtml((data as any).siteLogo)}</span>
				{:else if (data as any).siteLogo}
					<img src={(data as any).siteLogo} alt={(data as any).siteName} style="height:28px; width:auto;" />
				{:else if (data as any).siteLogoIcon && (data as any).siteLogoIcon.startsWith('<')}
					<span style="display:inline-flex; align-items:center; height:28px; width:auto;">{@html sanitizeHtml((data as any).siteLogoIcon)}</span>
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
				aria-expanded={menuOpen}
				onclick={() => { if (menuOpen) closeMenu(); else openMobileMenu(); }}>
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

		<!-- Mobile menu — each section independently collapses -->
		{#if menuOpen}
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
			<div class="nav-mobile-backdrop" onclick={closeMenu} aria-hidden="true"></div>
			<div class="nav-mobile" role="menu">
				{#if data.user}
					{#each groups as group}
						<div class="nav-mobile__section">
							<button
								type="button"
								class="nav-mobile__group-toggle"
								class:nav-mobile__group-toggle--active={groupActive(group.items)}
								class:nav-mobile__group-toggle--open={!!mobileOpen[group.label]}
								aria-expanded={!!mobileOpen[group.label]}
								onclick={() => toggleMobileSection(group.label)}
							>
								{group.label}
								<svg class="nav-mobile__chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
									<polyline points="2,4 6,8 10,4"/>
								</svg>
							</button>
							{#if mobileOpen[group.label]}
								<div class="nav-mobile__section-body">
									{#each group.items as item}
										<a href={item.href}
											class="nav-mobile__link {itemActive(item.href) ? 'nav-link--active' : ''}"
											onclick={closeMenu}>{item.label}</a>
									{/each}
								</div>
							{/if}
						</div>
					{/each}

					<div class="nav-mobile__section">
						<button
							type="button"
							class="nav-mobile__group-toggle"
							class:nav-mobile__group-toggle--active={itemActive('/dm') || itemActive('/dm-request')}
							class:nav-mobile__group-toggle--open={!!mobileOpen['DM']}
							aria-expanded={!!mobileOpen['DM']}
							onclick={() => toggleMobileSection('DM')}
						>
							DM
							<svg class="nav-mobile__chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
								<polyline points="2,4 6,8 10,4"/>
							</svg>
						</button>
						{#if mobileOpen['DM']}
							<div class="nav-mobile__section-body">
								{#if (data.user as any).hasDMProfile}
									<a href="/dm" class="nav-mobile__link {itemActive('/dm') ? 'nav-link--active' : ''}" onclick={closeMenu}>DM Hub</a>
								{:else}
									<a href="/dm-request" class="nav-mobile__link {itemActive('/dm-request') ? 'nav-link--active' : ''}" onclick={closeMenu}>Become a DM</a>
								{/if}
							</div>
						{/if}
					</div>

					<div class="nav-mobile__section">
						<button
							type="button"
							class="nav-mobile__group-toggle"
							class:nav-mobile__group-toggle--active={itemActive('/profile')}
							class:nav-mobile__group-toggle--open={!!mobileOpen['Account']}
							aria-expanded={!!mobileOpen['Account']}
							onclick={() => toggleMobileSection('Account')}
						>
							Account
							<svg class="nav-mobile__chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
								<polyline points="2,4 6,8 10,4"/>
							</svg>
						</button>
						{#if mobileOpen['Account']}
							<div class="nav-mobile__section-body">
								<a href="/profile" class="nav-mobile__link {itemActive('/profile') ? 'nav-link--active' : ''}" onclick={closeMenu}>Profile</a>
								<form method="post" action="/signout">
									<button type="submit" class="nav-mobile__link nav-mobile__link--button">Sign out</button>
								</form>
							</div>
						{/if}
					</div>
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
			{@html sanitizeHtml((data as any).siteFooter)}
		{:else}
			<p class="site__footer-text">© {new Date().getFullYear()} {(data as any).siteName}</p>
		{/if}
	</footer>
</div>