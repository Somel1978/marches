<!-- apps/admin/src/routes/+error.svelte -->
<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="error-page">
	<div class="error-page__card card-elevated">
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
		<div class="error-page__actions">
			<a href="/" class="btn btn-primary">Back to Dashboard</a>
		</div>
	</div>
</div>

<style>
	.error-page {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--bg-base);
		padding: 2rem;
	}

	.error-page__card {
		width: 100%;
		max-width: 480px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		text-align: center;
	}

	.error-page__code {
		font-size: 4rem;
		font-weight: 800;
		color: var(--accent-dim);
		line-height: 1;
	}

	.error-page__title {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.error-page__hint {
		font-size: 0.9375rem;
		color: var(--text-secondary);
		margin: 0;
		line-height: 1.6;
	}

	.error-page__actions {
		margin-top: 0.5rem;
	}
</style>
