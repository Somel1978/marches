<!-- apps/frontend/src/routes/(auth)/login/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<div class="auth-card card">
	<h1 class="auth-card__title">Sign in</h1>

	{#if form?.message}
		<div class="form-error" role="alert">{form.message}</div>
	{/if}

	<form method="post" use:enhance={() => {
		loading = true;
		return async ({ update }) => { loading = false; await update(); };
	}}>
		<div class="fields">
			<div class="field">
				<label class="label" for="email">Email</label>
				<input id="email" name="email" type="email" class="input"
					value={form?.email ?? ''} autocomplete="email" required />
			</div>
			<div class="field">
				<label class="label" for="password">Password</label>
				<input id="password" name="password" type="password" class="input"
					autocomplete="current-password" required />
			</div>
		</div>
		<div class="form-actions">
			<button type="submit" class="btn btn-primary btn-full" disabled={loading}>
				{loading ? 'Signing in…' : 'Sign in'}
			</button>
		</div>
	</form>

	<div class="auth-card__links">
		<p class="forgot-link"><a href="/forgot-password">Forgot your password?</a></p>
		<p class="forgot-link">No account? <a href="/signup">Sign up</a></p>
	</div>
</div>
