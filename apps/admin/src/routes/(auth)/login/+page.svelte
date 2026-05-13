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
		class="login__form"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update();
			};
		}}
	>
		{#if form?.message}
			<div class="login__error" role="alert">
				{form.message}
			</div>
		{/if}

		<div class="login__field">
			<label class="label" for="email">Email</label>
			<input
				id="email"
				name="email"
				type="email"
				class="input"
				placeholder="admin@marches.local"
				autocomplete="email"
				required
			/>
		</div>

		<div class="login__field">
			<label class="label" for="password">Password</label>
			<input
				id="password"
				name="password"
				type="password"
				class="input"
				placeholder="••••••••"
				autocomplete="current-password"
				required
			/>
		</div>

		<button type="submit" class="btn btn-primary login__submit" disabled={loading}>
			{loading ? 'Signing in…' : 'Sign in'}
		</button>
	</form>
</div>

<style>
	.login {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.login__header {
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.login__icon {
		font-size: 2rem;
		color: var(--accent-light);
	}

	.login__title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.login__subtitle {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin: 0;
	}

	.login__form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		background-color: var(--bg-surface);
		border: 1px solid var(--border-base);
		border-radius: var(--radius-lg);
		padding: 1.75rem;
	}

	.login__field {
		display: flex;
		flex-direction: column;
	}

	.login__error {
		background-color: rgba(139, 58, 58, 0.15);
		border: 1px solid var(--color-danger);
		border-radius: var(--radius-md);
		padding: 0.625rem 0.875rem;
		font-size: 0.875rem;
		color: #e08080;
	}

	.login__submit {
		width: 100%;
		margin-top: 0.25rem;
	}
</style>
