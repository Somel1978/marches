<!-- apps/admin/src/routes/(auth)/login/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<div class="login">
	<div class="login__header">
		<span class="login__icon">⚔</span>
		<h1 class="login__title">Marches Admin</h1>
		<p class="login__subtitle">Sign in to continue</p>
	</div>

	<form
		method="post"
		action="?/signIn"
		class="card"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => { loading = false; await update(); };
		}}
	>
		{#if form?.message}
			<div class="form-error" role="alert">{form.message}</div>
		{/if}

		<div class="field">
			<label class="label" for="email">Email</label>
			<input id="email" name="email" type="email" class="input"
				placeholder="admin@marches.local" autocomplete="email" required />
		</div>

		<div class="field" style="margin-top: 1rem;">
			<label class="label" for="password">Password</label>
			<input id="password" name="password" type="password" class="input"
				placeholder="••••••••" autocomplete="current-password" required />
		</div>

		<button type="submit" class="btn btn-primary btn-full" style="margin-top: 1.25rem;" disabled={loading}>
			{loading ? 'Signing in…' : 'Sign in'}
		</button>
	</form>

	<p class="forgot-link">
		<a href="/forgot-password">Forgot your password?</a>
	</p>
</div>