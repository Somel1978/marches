<!-- apps/admin/src/routes/(app)/+layout.svelte -->
<script lang="ts">
	import { page } from '$app/state';
	import { AppShell, NavItem } from '@core/ui';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// ── Nav items — extend this list as features are built ──
	const navItems = [
		{
			href:  '/',
			label: 'Dashboard',
			icon:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
		},
		{
			href:  '/users',
			label: 'Users',
			icon:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
		},
		{
			href:  '/roles',
			label: 'Roles & Permissions',
			icon:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
		},
	] as const;
</script>

<AppShell title="Admin" user={data.user}>
	{#snippet nav({ collapsed })}
		{#each navItems as item}
			<NavItem
				href={item.href}
				label={item.label}
				icon={item.icon}
				active={page.url.pathname === item.href}
				{collapsed}
			/>
		{/each}
	{/snippet}

	{#snippet footer({ collapsed })}
		<NavItem
			href="/settings"
			label="Settings"
			icon={`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`}
			active={page.url.pathname === '/settings'}
			{collapsed}
		/>
		<form method="post" action="/?/signOut" style="display:contents">
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

<style>
	.nav-signout {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-md);
		background: transparent;
		border: none;
		color: var(--text-muted);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color var(--transition-fast), color var(--transition-fast);
	}
	.nav-signout:hover {
		background-color: var(--bg-overlay);
		color: var(--color-danger);
	}
	.nav-signout--collapsed {
		justify-content: center;
		padding: 0.5rem;
	}
</style>