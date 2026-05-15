<!-- apps/admin/src/routes/(app)/+layout.svelte -->
<script lang="ts">
	import { AppShell, NavItem } from '@core/ui';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<AppShell title="Admin" user={data.user}>
	{#snippet nav({ collapsed })}
		{#each data.nav as item}
			<NavItem
				href={item.href}
				label={item.label}
				icon={item.icon}
				active={item.active}
				{collapsed}
			/>
		{/each}
	{/snippet}

	{#snippet footer({ collapsed })}
		{#each data.footer as item}
			<NavItem
				href={item.href}
				label={item.label}
				icon={item.icon}
				active={item.active}
				{collapsed}
			/>
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