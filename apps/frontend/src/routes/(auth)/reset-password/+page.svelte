<!-- apps/frontend/src/routes/(auth)/reset-password/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	type FormResult = { message?: string; token?: string } | undefined;
	let { data, form }: { data: PageData; form: FormResult } = $props();
	let loading      = $state(false);
	let showPassword = $state(false);
</script>

<div class="auth-card card">
	<h1 class="auth-card__title">Set new password</h1>

	{#if data.invalidToken}
		<div class="form-error">
			This reset link is invalid or has expired.
		</div>
		<a href="/forgot-password" class="btn btn-primary" style="margin-top:1rem">
			Request a new link
		</a>
	{:else}
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
			<input type="hidden" name="token" value={data.token ?? form?.token ?? ''} />

			<div class="field">
				<label class="label" for="password">New password</label>
				<div class="input-group">
					<input
						id="password" name="password"
						type={showPassword ? 'text' : 'password'}
						class="input"
						placeholder="Min. 8 characters"
						required minlength="8"
					/>
					<button type="button" class="input-toggle"
						onclick={() => showPassword = !showPassword}>
						{showPassword ? 'Hide' : 'Show'}
					</button>
				</div>
			</div>

			<div class="form-actions">
				<button type="submit" class="btn btn-primary" disabled={loading}>
					{loading ? 'Saving…' : 'Set new password'}
				</button>
			</div>
		</form>
	{/if}
</div>

<style>
	.auth-card { max-width: 400px; width: 100%; display: flex; flex-direction: column; gap: 1.25rem; }
	.auth-card__title { font-size: 1.25rem; font-weight: 700; margin: 0; }
	.field { display: flex; flex-direction: column; gap: 0.375rem; }
	.input-group { display: flex; }
	.input-group .input { border-radius: var(--radius-md) 0 0 var(--radius-md); flex: 1; }
	.input-toggle {
		padding: 0 0.875rem; background-color: var(--bg-muted);
		border: 1px solid var(--border-base); border-left: none;
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		color: var(--text-secondary); font-size: 0.8125rem; cursor: pointer;
		white-space: nowrap; transition: color var(--transition-fast);
	}
	.input-toggle:hover { color: var(--text-primary); }
	.form-actions { display: flex; justify-content: flex-end; margin-top: 0.5rem; }
	.form-error {
		background-color: rgba(139,58,58,0.15); border: 1px solid var(--color-danger);
		border-radius: var(--radius-md); padding: 0.625rem 0.875rem; font-size: 0.875rem; color: #e08080;
	}
</style>