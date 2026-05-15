<!-- apps/admin/src/routes/(auth)/unauthorized/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
</script>

<div class="unauth">
	<span class="unauth__icon">🛡</span>
	<h1 class="unauth__title">Access Denied</h1>
	<p class="unauth__message">
		Your account does not have permission to access the admin panel.
		Contact a system administrator to request access.
	</p>
	<div class="unauth__actions">
		<a href="http://localhost:5173" class="btn btn-ghost">Back to site</a>
		<!-- Sign out via the (app) root page action — avoids direct better-auth endpoint -->
		<form method="post" action="/?/signOut" use:enhance>
			<button type="submit" class="btn btn-primary">Sign out</button>
		</form>
	</div>
</div>

<style>
	.unauth {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		text-align: center;
		padding: 2rem;
		background-color: var(--bg-surface);
		border: 1px solid var(--border-base);
		border-radius: var(--radius-lg);
	}

	.unauth__icon { font-size: 2.5rem; }
	.unauth__title { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }

	.unauth__message {
		font-size: 0.875rem;
		color: var(--text-secondary);
		max-width: 320px;
		margin: 0;
		line-height: 1.6;
	}

	.unauth__actions { display: flex; gap: 0.75rem; margin-top: 0.5rem; }
</style>