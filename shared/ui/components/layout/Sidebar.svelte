<!-- shared/ui/components/layout/Sidebar.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		collapsed?:  boolean;
		oncollapse?: (collapsed: boolean) => void;
		nav:         Snippet<[{ collapsed: boolean }]>;
		footer?:     Snippet<[{ collapsed: boolean }]>;
	}

	let {
		collapsed = $bindable(false),
		oncollapse,
		nav,
		footer,
	}: Props = $props();

	function toggle() {
		collapsed = !collapsed;
		oncollapse?.(collapsed);
	}
</script>

<aside class="sidebar" class:sidebar--collapsed={collapsed}>
	<!-- Brand -->
	<div class="sidebar__brand">
		{#if !collapsed}
			<span class="sidebar__brand-text">⚔ Marches</span>
		{:else}
			<span class="sidebar__brand-icon">⚔</span>
		{/if}
	</div>

	<hr class="divider" style="margin: 0;" />

	<!-- Navigation slot -->
	<nav class="sidebar__nav">
		{@render nav({ collapsed })}
	</nav>

	<div class="sidebar__spacer"></div>

	<!-- Optional footer slot (user info, etc.) -->
	{#if footer}
		<hr class="divider" style="margin: 0;" />
		<div class="sidebar__footer">
			{@render footer({ collapsed })}
		</div>
	{/if}

	<!-- Collapse toggle -->
	<button class="sidebar__toggle" onclick={toggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			{#if collapsed}
				<polyline points="9 18 15 12 9 6" />
			{:else}
				<polyline points="15 18 9 12 15 6" />
			{/if}
		</svg>
	</button>
</aside>

<style>
	.sidebar {
		display: flex;
		flex-direction: column;
		width: var(--sidebar-width);
		min-height: 100dvh;
		background-color: var(--bg-surface);
		border-right: 1px solid var(--border-base);
		transition: width var(--transition-base);
		overflow: hidden;
		flex-shrink: 0;
		position: sticky;
		top: 0;
		align-self: flex-start;
		max-height: 100dvh;
	}

	.sidebar--collapsed {
		width: var(--sidebar-width-collapsed);
	}

	.sidebar__brand {
		display: flex;
		align-items: center;
		height: var(--header-height);
		padding: 0 1rem;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.sidebar__brand-text {
		font-size: 1rem;
		font-weight: 700;
		color: var(--accent-light);
		white-space: nowrap;
	}

	.sidebar__brand-icon {
		font-size: 1.25rem;
		color: var(--accent-light);
		margin: 0 auto;
	}

	.sidebar__nav {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.75rem 0.5rem;
		overflow-y: auto;
		flex: 1;
	}

	.sidebar__spacer {
		flex: 1;
	}

	.sidebar__footer {
		padding: 0.75rem 0.5rem;
	}

	.sidebar__toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 0.625rem;
		background: transparent;
		border: none;
		border-top: 1px solid var(--border-muted);
		color: var(--text-muted);
		cursor: pointer;
		transition: color var(--transition-fast), background-color var(--transition-fast);
		flex-shrink: 0;
	}

	.sidebar__toggle:hover {
		color: var(--text-primary);
		background-color: var(--bg-overlay);
	}
</style>
