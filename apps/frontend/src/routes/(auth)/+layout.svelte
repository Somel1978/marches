<!-- apps/frontend/src/routes/(auth)/+layout.svelte -->
<script lang="ts">
	let { children }: { children: any } = $props();
</script>

<div class="auth-layout">
	{@render children()}
</div>