<!-- shared/ui/components/layout/NavBar.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		links?:   Snippet;
		actions?: Snippet;
		user?: {
			name:  string;
			image?: string | null;
		} | null;
	}

	let { links, actions, user }: Props = $props();

	const initials = $derived(
		user?.name
			.split(' ')
			.map(n => n[0])
			.slice(0, 2)
			.join('')
			.toUpperCase() ?? '?'
	);
</script>

<nav class="navbar">
	<div class="navbar__inner">
		<!-- Brand -->
		<a href="/" class="navbar__brand">
			<span class="navbar__brand-icon">⚔</span>
			<span class="navbar__brand-text">Marches</span>
		</a>

		<!-- Nav links slot -->
		{#if links}
			<div class="navbar__links">
				{@render links()}
			</div>
		{/if}

		<!-- Right actions -->
		<div class="navbar__actions">
			{#if actions}
				{@render actions()}
			{/if}

			{#if user}
				<div class="navbar__avatar">
					{#if user.image}
						<img src={user.image} alt={user.name} />
					{:else}
						<span>{initials}</span>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</nav>

<style>
	.navbar {
		position: sticky;
		top: 0;
		z-index: 20;
		background-color: var(--bg-surface);
		border-bottom: 1px solid var(--border-base);
		backdrop-filter: blur(8px);
	}

	.navbar__inner {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		max-width: 1280px;
		margin: 0 auto;
		padding: 0 1.5rem;
		height: var(--header-height);
	}

	.navbar__brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-primary);
		text-decoration: none;
		flex-shrink: 0;
	}

	.navbar__brand-icon {
		font-size: 1.25rem;
		color: var(--accent-light);
	}

	.navbar__brand-text {
		font-size: 1rem;
		font-weight: 700;
		color: var(--accent-light);
		letter-spacing: 0.05em;
	}

	.navbar__links {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex: 1;
	}

	.navbar__actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-left: auto;
	}

	.navbar__avatar {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background-color: var(--accent-dim);
		border: 1px solid var(--border-accent);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		cursor: pointer;
		flex-shrink: 0;
	}

	.navbar__avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.navbar__avatar span {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--accent-light);
	}
</style>
