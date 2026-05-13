<!-- apps/admin/src/routes/+layout.svelte -->
<script lang="ts">
	import '@core/ui/styles/index.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}