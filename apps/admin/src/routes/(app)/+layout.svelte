<!-- apps/admin/src/routes/(app)/+layout.svelte -->
<script lang="ts">
	import { AppShell, NavItem, ConfirmModal } from '@core/ui';
	import type { LayoutData } from './$types';
	import type { ResolvedNavItem } from '$lib/nav';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// ── Group nav items by section ─────────────────────────────────────────
	type NavGroup = {
		sectionKey:   string | null;  // null = no section (Dashboard)
		sectionLabel: string | null;
		items:        (ResolvedNavItem & { type: 'item' })[];
	};

	const navGroups = $derived((): NavGroup[] => {
		const groups: NavGroup[] = [];
		let current: NavGroup = { sectionKey: null, sectionLabel: null, items: [] };
		for (const item of data.nav) {
			if (item.type === 'section') {
				if (current.items.length) groups.push(current);
				current = { sectionKey: item.label.toLowerCase(), sectionLabel: item.label, items: [] };
			} else {
				current.items.push(item as NavGroup['items'][0]);
			}
		}
		if (current.items.length) groups.push(current);
		return groups;
	});

	// ── Per-section collapsed state ────────────────────────────────────────
	// Persisted in localStorage. Sections with an active child are always expanded.
	const STORAGE_KEY = 'admin-nav-collapsed-sections';
	let collapsedSections = $state<Record<string, boolean>>({});

	$effect(() => {
		// Load from localStorage on mount
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) collapsedSections = JSON.parse(saved);
		} catch { /* ignore */ }
	});

	function isSectionCollapsed(key: string, items: NavGroup['items']): boolean {
		// Always expand if any item in the section is active
		if (items.some(i => i.active)) return false;
		return collapsedSections[key] ?? false;
	}

	function toggleSection(key: string) {
		collapsedSections[key] = !collapsedSections[key];
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsedSections));
		} catch { /* ignore */ }
	}
</script>

<AppShell
	title={data.siteName ?? 'Admin'}
	siteLogo={data.siteLogo ?? ''}
	siteLogoIcon={data.siteLogoIcon ?? '⚔'}
	user={data.user}
	notifCount={(data as any).notifCount ?? 0}
	notifications={(data as any).notifications ?? []}
>
	{#snippet nav({ collapsed }: { collapsed: boolean })}
		{#each navGroups() as group}
			{#if group.sectionKey === null}
				<!-- Ungrouped items (Dashboard) — render directly -->
				{#each group.items as item}
					<NavItem href={item.href} label={item.label} icon={item.icon} active={item.active} {collapsed} children={item.children} />
				{/each}
			{:else}
				<!-- Section with collapse toggle -->
				{#if collapsed}
					<!-- Collapsed sidebar: show a thin divider instead of the label -->
					<div class="nav-section-divider"></div>
				{:else}
					<button
						type="button"
						class="nav-section-label"
						class:nav-section-label--collapsed={isSectionCollapsed(group.sectionKey, group.items)}
						onclick={() => toggleSection(group.sectionKey!)}
						aria-expanded={!isSectionCollapsed(group.sectionKey, group.items)}
					>
						<span>{group.sectionLabel}</span>
						<svg class="nav-section-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<polyline points="6 9 12 15 18 9"/>
						</svg>
					</button>
				{/if}

				<!-- Section items — hidden when collapsed and sidebar is expanded -->
				{#if collapsed || !isSectionCollapsed(group.sectionKey, group.items)}
					{#each group.items as item}
						<NavItem href={item.href} label={item.label} icon={item.icon} active={item.active} {collapsed} children={item.children} />
					{/each}
				{/if}
			{/if}
		{/each}
	{/snippet}

	{#snippet footer({ collapsed }: { collapsed: boolean })}
		{#each data.footer as item}
			{#if item.type !== 'section'}
				<NavItem href={item.href} label={item.label} icon={item.icon} active={item.active} {collapsed} />
			{/if}
		{/each}
		<form method="post" action="/signout" style="display:contents">
			<button type="submit" class="nav-signout" class:nav-signout--collapsed={collapsed} title={collapsed ? 'Sign out' : undefined}>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
					<polyline points="16 17 21 12 16 7"/>
					<line x1="21" y1="12" x2="9" y2="12"/>
				</svg>
				{#if !collapsed}<span>Sign out</span>{/if}
			</button>
		</form>
	{/snippet}

	{@render children()}
</AppShell>

<!-- Global imperative confirm modal -->
<ConfirmModal />