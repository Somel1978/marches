<!-- apps/frontend/src/routes/(protected)/notifications/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	// This page is never navigated to directly — it only hosts actions.
	// Redirect home on direct access.
	goto('/');
</script>
