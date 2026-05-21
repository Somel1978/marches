<!-- shared/ui/components/layout/AppShell.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Sidebar from './Sidebar.svelte';
	import Header  from './Header.svelte';

	interface Props {
		title?:      string;
		siteLogo?:   string;
		notifCount?: number;
		notifications?: any[];
		nav:      Snippet<[{ collapsed: boolean }]>;
		actions?: Snippet;
		footer?:  Snippet<[{ collapsed: boolean }]>;
		user?: {
			name:  string;
			email: string;
			image?: string | null;
		};
		children: Snippet;
	}

	let { title, siteLogo, nav, actions, footer, user, children, notifCount = 0, notifications = [] }: Props = $props();

	const displayTitle = $derived(siteLogo ? '' : (title ?? ''));

	// Desktop: sidebar collapsed state
	let collapsed    = $state(false);
	// Mobile: drawer open state
	let drawerOpen   = $state(false);

	function closDrawer() { drawerOpen = false; }
</script>

<!-- Mobile overlay backdrop -->
{#if drawerOpen}
	<button
		class="shell__backdrop"
		onclick={closDrawer}
		aria-label="Close menu"
	></button>
{/if}

<div class="shell">
	<Sidebar
		bind:collapsed
		bind:drawerOpen
		{nav}
		{footer}
		siteName={title ?? 'Marches'}
		siteLogo={siteLogo ?? ''}
	/>

	<div class="shell__body">
		<Header
			title={displayTitle}
			logoHtml={siteLogo && siteLogo.startsWith('<') ? siteLogo : ''}
			logoUrl={siteLogo && !siteLogo.startsWith('<') ? siteLogo : ''}
			logoAlt={title ?? ''}
			{actions}
			{user}
			{notifCount}
			{notifications}
			onMenuClick={() => drawerOpen = !drawerOpen}
		/>

		<main class="shell__main">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.shell {
		display: flex;
		min-height: 100dvh;
		background-color: var(--bg-base);
	}

	.shell__body {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}

	.shell__main {
		flex: 1;
		padding: 1.5rem;
		overflow-y: auto;
	}

	@media (max-width: 640px) {
		.shell__main { padding: 1rem; }
	}

	/* Mobile backdrop */
	.shell__backdrop {
		position: fixed;
		inset: 0;
		z-index: 19;
		background: rgba(0, 0, 0, 0.5);
		border: none;
		cursor: default;
	}
</style>