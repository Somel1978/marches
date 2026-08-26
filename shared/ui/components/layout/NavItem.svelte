<!-- shared/ui/components/layout/NavItem.svelte -->
<script lang="ts">
	interface Child {
		label:  string;
		href:   string;
		active: boolean;
	}

	interface Props {
		href:      string;
		label:     string;
		icon:      string;
		active?:   boolean;
		collapsed?: boolean;
		children?: Child[];
	}

	let { href, label, icon, active = false, collapsed = false, children }: Props = $props();

	const hasChildren = $derived(!collapsed && !!children?.length);
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

{#if hasChildren && active}
	<div class="nav-item__children">
		{#each children! as child}
			<a
				href={child.href}
				class="nav-item nav-item--child"
				class:nav-item--active={child.active}
			>
				{child.label}
			</a>
		{/each}
	</div>
{/if}

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
		background-color: var(--state-hover-bg, var(--bg-overlay));
		color: var(--text-primary);
	}

	.nav-item--active {
		background-color: var(--state-active-bg, var(--bg-overlay));
		color: var(--state-active-text, var(--accent-light));
		border-left: 2px solid var(--state-active-border, var(--accent));
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

	/* Sub-items shown when parent is active */
	.nav-item__children {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding-left: 2.25rem;
		margin-top: 0.125rem;
	}

	.nav-item--child {
		font-size: 0.8125rem;
		padding: 0.3rem 0.625rem;
	}
</style>