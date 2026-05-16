<!-- apps/frontend/src/routes/(protected)/+layout.svelte -->
<script lang="ts">
	let { children }: { children: any } = $props();
</script>

{@render children()}