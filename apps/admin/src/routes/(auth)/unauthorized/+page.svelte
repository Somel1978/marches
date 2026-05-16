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