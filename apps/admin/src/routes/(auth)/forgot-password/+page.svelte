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