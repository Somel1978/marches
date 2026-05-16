<!-- apps/frontend/src/routes/(auth)/signup/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading      = $state(false);
	let showPassword = $state(false);
</script>

<div class="auth-card card">
	<h1 class="auth-card__title">Create account</h1>
	<p class="auth-card__subtitle">Join Marches and start your adventure.</p>

	{#if form?.message}
		<div class="form-error" role="alert">{form.message}</div>
	{/if}

	<form method="post" use:enhance={() => {
		loading = true;
		return async ({ update }) => { loading = false; await update(); };
	}}>
		<div class="fields">
			<div class="field">
				<label class="label" for="name">Full name</label>
				<input id="name" name="name" type="text" class="input"
					value={form?.name ?? ''} autocomplete="name" required />
			</div>
			<div class="field">
				<label class="label" for="email">Email</label>
				<input id="email" name="email" type="email" class="input"
					value={form?.email ?? ''} autocomplete="email" required />
			</div>
			<div class="field">
				<label class="label" for="password">Password</label>
				<div class="input-group">
					<input id="password" name="password"
						type={showPassword ? 'text' : 'password'}
						class="input" placeholder="Min. 8 characters"
						required minlength="8" />
					<button type="button" class="input-toggle"
						onclick={() => showPassword = !showPassword}>
						{showPassword ? 'Hide' : 'Show'}
					</button>
				</div>
			</div>
		</div>
		<div class="form-actions">
			<button type="submit" class="btn btn-primary btn-full" disabled={loading}>
				{loading ? 'Creating account…' : 'Create account'}
			</button>
		</div>
	</form>

	<p class="forgot-link">Already have an account? <a href="/login">Sign in</a></p>
</div>
