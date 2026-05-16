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