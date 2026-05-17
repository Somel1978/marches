<!-- apps/admin/src/routes/(auth)/+layout.svelte -->
<script lang="ts">
	let { children } = $props();
</script>

<div class="auth-shell">
	<div class="auth-shell__card">
		{@render children()}
	</div>
</div>