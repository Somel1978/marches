<!-- apps/frontend/src/routes/(protected)/+layout.svelte -->
<script lang="ts">
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<!--
	Protected routes inherit the root +layout.svelte (NavBar + Footer).
	This layout adds no extra chrome — it exists only for the server-side
	auth guard in +layout.server.ts. Add player-specific UI here as needed.
-->
{@render children()}
