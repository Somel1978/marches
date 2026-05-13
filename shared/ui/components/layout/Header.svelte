<!-- shared/ui/components/layout/Header.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?:   string;
		actions?: Snippet;
		user?: {
			name:  string;
			email: string;
			image?: string | null;
		};
	}

	let { title, actions, user }: Props = $props();

	const initials = $derived(
		user?.name
			.split(' ')
			.map(n => n[0])
			.slice(0, 2)
			.join('')
			.toUpperCase() ?? '?'
	);
</script>

<header class="header">
	<div class="header__left">
		{#if title}
			<h1 class="header__title">{title}</h1>
		{/if}
	</div>

	<div class="header__right">
		{#if actions}
			<div class="header__actions">
				{@render actions()}
			</div>
		{/if}

		{#if user}
			<div class="header__user">
				<div class="header__avatar">
					{#if user.image}
						<img src={user.image} alt={user.name} />
					{:else}
						<span>{initials}</span>
					{/if}
				</div>
				<div class="header__user-info">
					<span class="header__user-name">{user.name}</span>
					<span class="header__user-email">{user.email}</span>
				</div>
			</div>
		{/if}
	</div>
</header>

<style>
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: var(--header-height);
		padding: 0 1.5rem;
		background-color: var(--bg-surface);
		border-bottom: 1px solid var(--border-base);
		position: sticky;
		top: 0;
		z-index: 10;
		flex-shrink: 0;
	}

	.header__left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.header__title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.header__right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

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

	.header__avatar {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background-color: var(--accent-dim);
		border: 1px solid var(--border-accent);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		flex-shrink: 0;
	}

	.header__avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.header__avatar span {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--accent-light);
	}

	.header__user-info {
		display: flex;
		flex-direction: column;
	}

	.header__user-name {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-primary);
		line-height: 1.2;
	}

	.header__user-email {
		font-size: 0.75rem;
		color: var(--text-muted);
		line-height: 1.2;
	}
</style>
