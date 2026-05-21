<!-- shared/ui/components/layout/Sidebar.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		collapsed?:  boolean;
		drawerOpen?: boolean;
		oncollapse?: (collapsed: boolean) => void;
		nav:         Snippet<[{ collapsed: boolean }]>;
		footer?:     Snippet<[{ collapsed: boolean }]>;
		siteName?:   string;
		siteLogo?:   string;
	}

	let {
		collapsed   = $bindable(false),
		drawerOpen  = $bindable(false),
		oncollapse,
		nav,
		footer,
		siteName    = 'Marches',
		siteLogo    = '',
	}: Props = $props();

	function toggle() {
		collapsed = !collapsed;
		oncollapse?.(collapsed);
	}
</script>

<aside
	class="sidebar"
	class:sidebar--collapsed={collapsed}
	class:sidebar--open={drawerOpen}
>
	<!-- Brand -->
	<div class="sidebar__brand">
		{#if !collapsed}
			{#if siteLogo && siteLogo.startsWith('<')}
				<span style="display:inline-flex; align-items:center; height:28px; width:auto; flex-shrink:0;">{@html siteLogo}</span>
			{:else if siteLogo}
				<img src={siteLogo} alt={siteName} style="height:28px; width:auto;" />
			{:else}
				<span class="sidebar__brand-text">⚔ {siteName}</span>
			{/if}
		{:else}
			<span class="sidebar__brand-icon">⚔</span>
		{/if}
		<!-- Mobile close button -->
		<button class="sidebar__close" onclick={() => drawerOpen = false} aria-label="Close menu">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
			</svg>
		</button>
	</div>

	<hr class="divider" style="margin: 0;" />

	<nav class="sidebar__nav">
		{@render nav({ collapsed })}
	</nav>

	<div class="sidebar__spacer"></div>

	{#if footer}
		<hr class="divider" style="margin: 0;" />
		<div class="sidebar__footer">
			{@render footer({ collapsed })}
		</div>
	{/if}

	<!-- Desktop collapse toggle -->
	<button class="sidebar__toggle" onclick={toggle}
		aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
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
		width: var(--sidebar-width, 240px);
		min-height: 100dvh;
		background-color: var(--bg-surface);
		border-right: 1px solid var(--border-base);
		transition: width var(--transition-base), transform var(--transition-base);
		overflow: hidden;
		flex-shrink: 0;
		position: sticky;
		top: 0;
		align-self: flex-start;
		max-height: 100dvh;
	}

	.sidebar--collapsed { width: var(--sidebar-width-collapsed, 56px); }

	/* Mobile: drawer — hidden off-screen by default */
	@media (max-width: 768px) {
		.sidebar {
			position: fixed;
			top: 0;
			left: 0;
			z-index: 20;
			width: var(--sidebar-width, 240px) !important;
			transform: translateX(-100%);
			min-height: 100dvh;
		}

		.sidebar--open {
			transform: translateX(0);
		}

		/* Hide desktop collapse toggle on mobile */
		.sidebar__toggle { display: none; }
	}

	.sidebar__brand {
		display: flex;
		align-items: center;
		height: var(--header-height, 56px);
		padding: 0 1rem;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.sidebar__brand-text {
		font-size: 1rem;
		font-weight: 700;
		color: var(--accent-light);
		white-space: nowrap;
		flex: 1;
	}

	.sidebar__brand-icon {
		font-size: 1.25rem;
		color: var(--accent-light);
		margin: 0 auto;
	}

	/* Mobile close button — hidden on desktop */
	.sidebar__close {
		display: none;
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: var(--radius-sm);
	}
	.sidebar__close:hover { color: var(--text-primary); }

	@media (max-width: 768px) {
		.sidebar__close { display: flex; align-items: center; justify-content: center; }
	}

	.sidebar__nav {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.75rem 0.5rem;
		overflow-y: auto;
		flex: 1;
	}

	.sidebar__spacer { flex: 1; }

	.sidebar__footer { padding: 0.75rem 0.5rem; }

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