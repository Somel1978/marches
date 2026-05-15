<!-- apps/admin/src/routes/(auth)/forgot-password/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<div class="auth-card card">
	<h1 class="auth-card__title">Reset password</h1>

	{#if form?.sent}
		<div class="form-success">
			If <strong>{form.email}</strong> exists in our system, a reset link has been sent.
			Check your inbox.
		</div>
		<a href="/login" class="btn btn-ghost" style="margin-top:1rem">Back to login</a>
	{:else}
		<p class="auth-card__subtitle">
			Enter your email address and we'll send you a reset link.
		</p>

		{#if form?.message}
			<div class="form-error">{form.message}</div>
		{/if}

		<form
			method="post"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => { loading = false; await update(); };
			}}
		>
			<div class="field">
				<label class="label" for="email">Email</label>
				<input id="email" name="email" type="email" class="input"
					value={form?.email ?? ''} required />
			</div>

			<div class="form-actions">
				<a href="/login" class="btn btn-ghost">Cancel</a>
				<button type="submit" class="btn btn-primary" disabled={loading}>
					{loading ? 'Sending…' : 'Send reset link'}
				</button>
			</div>
		</form>
	{/if}
</div>

<style>
	.auth-card { max-width: 400px; width: 100%; display: flex; flex-direction: column; gap: 1.25rem; }
	.auth-card__title { font-size: 1.25rem; font-weight: 700; margin: 0; }
	.auth-card__subtitle { font-size: 0.875rem; color: var(--text-secondary); margin: 0; }
	.field { display: flex; flex-direction: column; gap: 0.375rem; }
	.form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem; }
	.form-error {
		background-color: rgba(139,58,58,0.15); border: 1px solid var(--color-danger);
		border-radius: var(--radius-md); padding: 0.625rem 0.875rem; font-size: 0.875rem; color: #e08080;
	}
	.form-success {
		background-color: rgba(74,124,89,0.15); border: 1px solid var(--color-success);
		border-radius: var(--radius-md); padding: 0.75rem; font-size: 0.875rem; color: #80c090;
	}
</style>
