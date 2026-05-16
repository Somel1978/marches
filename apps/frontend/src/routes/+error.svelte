<!-- apps/frontend/src/routes/+error.svelte -->
<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="error-page">
	<span class="error-page__code">{page.status}</span>
	<h1 class="error-page__title">{page.error?.message ?? 'Something went wrong'}</h1>
	<p class="error-page__hint">
		{#if page.status === 404}
			The page you were looking for does not exist.
		{:else if page.status === 403}
			You do not have permission to access this resource.
		{:else}
			An unexpected error occurred. Try refreshing the page.
		{/if}
	</p>
	<a href="/" class="btn btn-primary">Back to Home</a>
</div>
