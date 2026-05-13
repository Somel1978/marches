<!-- shared/ui/components/layout/NavItem.svelte -->
<script lang="ts">
	interface Props {
		href:     string;
		label:    string;
		icon:     string;    // SVG path data or inline SVG string
		active?:  boolean;
		collapsed?: boolean;
	}

	let { href, label, icon, active = false, collapsed = false }: Props = $props();
</script>

<a
	{href}
	class="nav-item"
	class:nav-item--active={active}
	class:nav-item--collapsed={collapsed}
	title={collapsed ? label : undefined}
>
	<span class="nav-item__icon">
		{@html icon}
	</span>
	{#if !collapsed}
		<span class="nav-item__label">{label}</span>
	{/if}
</a>

<style>
	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		transition: background-color var(--transition-fast), color var(--transition-fast);
		cursor: pointer;
		white-space: nowrap;
		overflow: hidden;
	}

	.nav-item:hover {
		background-color: var(--bg-overlay);
		color: var(--text-primary);
	}

	.nav-item--active {
		background-color: var(--bg-overlay);
		color: var(--accent-light);
		border-left: 2px solid var(--accent);
		padding-left: calc(0.75rem - 2px);
	}

	.nav-item--collapsed {
		justify-content: center;
		padding: 0.5rem;
	}

	.nav-item__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}

	.nav-item__label {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>