<!-- apps/frontend/src/routes/(protected)/dm/+layout.svelte -->
<script lang="ts">
	import type { LayoutData } from './$types';
	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

{@render children()}
