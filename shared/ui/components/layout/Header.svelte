<!-- shared/ui/components/layout/Header.svelte -->
<script lang="ts">
	import { NotificationBell } from '@core/ui';
	import type { Snippet } from 'svelte';

	interface Props {
		title?:         string;
		logoHtml?:      string;
		logoUrl?:       string;
		logoAlt?:       string;
		notifCount?:    number;
		notifications?: any[];
		actions?:     Snippet;
		onMenuClick?: () => void;
		user?: {
			name:   string;
			email:  string;
			image?: string | null;
		};
	}

	let { title, logoHtml, logoUrl, logoAlt, notifCount = 0, notifications = [], actions, user, onMenuClick }: Props = $props();

	const initials = $derived(
		user?.name
			? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
			: '?'
	);
</script>

<header class="header">
	<!-- Mobile hamburger -->
	<button class="header__menu" onclick={onMenuClick} aria-label="Open menu">
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<line x1="3" y1="6"  x2="21" y2="6"/>
			<line x1="3" y1="12" x2="21" y2="12"/>
			<line x1="3" y1="18" x2="21" y2="18"/>
		</svg>
	</button>

	{#if logoHtml}
		<span style="display:inline-flex; align-items:center; height:28px; width:auto; flex-shrink:0;">{@html logoHtml}</span>
	{:else if logoUrl}
		<img src={logoUrl} alt={logoAlt ?? ''} style="height:28px; width:auto;" />
	{:else if title}
		<span class="header__title">{title}</span>
	{/if}

	<div class="header__spacer"></div>

	{#if actions}
		<div class="header__actions">
			{@render actions()}
		</div>
	{/if}

	{#if user}
		<NotificationBell count={notifCount} {notifications} />
		<div class="header__user">
			<span class="header__user-name">{user.name}</span>
			{#if user.image}
				<img src={user.image} alt={user.name} class="header__avatar" />
			{:else}
				<div class="header__avatar header__avatar--initials">{initials}</div>
			{/if}
		</div>
	{/if}
</header>

<style>
	.header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		height: var(--header-height, 56px);
		padding: 0 1.25rem;
		border-bottom: 1px solid var(--border-base);
		background-color: var(--bg-surface);
		flex-shrink: 0;
	}

	/* Hamburger — visible only on mobile */
	.header__menu {
		display: none;
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0.375rem;
		border-radius: var(--radius-sm);
		transition: color var(--transition-fast);
	}
	.header__menu:hover { color: var(--text-primary); }

	@media (max-width: 768px) {
		.header__menu { display: flex; align-items: center; }
	}

	.header__title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
	}

	.header__spacer { flex: 1; }

	.header__actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.header__user {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.header__user-name {
		font-size: 0.875rem;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	@media (max-width: 480px) {
		.header__user-name { display: none; }
	}

	.header__avatar {
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
		object-fit: cover;
	}

	.header__avatar--initials {
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--accent-dim);
		border: 1px solid var(--border-accent);
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--accent-light);
	}
</style>