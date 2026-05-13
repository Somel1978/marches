<!-- apps/admin/src/routes/(auth)/+layout.svelte -->
<script lang="ts">
	let { children } = $props();
</script>

<div class="auth-shell">
	<div class="auth-shell__card">
		{@render children()}
	</div>
</div>

<style>
	.auth-shell {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--bg-base);
		padding: 1.5rem;
	}

	.auth-shell__card {
		width: 100%;
		max-width: 400px;
	}
</style>