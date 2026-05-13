<!-- shared/ui/components/layout/AppShell.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Sidebar from './Sidebar.svelte';
	import Header  from './Header.svelte';

	interface Props {
		title?:   string;
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

	let { title, nav, actions, footer, user, children }: Props = $props();

	let collapsed = $state(false);
</script>

<div class="shell">
	<Sidebar bind:collapsed {nav} {footer} />

	<div class="shell__body">
		<Header {title} {actions} {user} />

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
		min-width: 0; /* prevent flex blowout */
		overflow: hidden;
	}

	.shell__main {
		flex: 1;
		padding: 1.5rem;
		overflow-y: auto;
	}
</style>