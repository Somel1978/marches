<!-- apps/admin/src/routes/(app)/users/new/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading       = $state(false);
	let selectedRoles = $state(untrack(() => [] as string[]));
	let showPassword  = $state(false);
</script>

<div class="page">
	<div class="page__header">
		<a href="/users" class="back-link">← Users</a>
		<h2 class="page__title">New user</h2>
	</div>

	<div class="card" style="max-width: 560px;">
		<form
			method="post"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => { loading = false; await update(); };
			}}
		>
			{#if form?.message}
				<div class="form-error">{form.message}</div>
			{/if}

			<div class="fields">
				<div class="field">
					<label class="label" for="name">Full name</label>
					<input id="name" name="name" type="text" class="input"
						placeholder="Jane Smith" value={form?.name ?? ''} required />
				</div>

				<div class="field">
					<label class="label" for="email">Email</label>
					<input id="email" name="email" type="email" class="input"
						placeholder="jane@example.com" value={form?.email ?? ''} required />
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
					<p class="field-hint">The user should change this after first login.</p>
				</div>

				<div class="field">
					<label class="label" for="discordHandle">
						Discord handle <span class="optional">(optional)</span>
					</label>
					<input id="discordHandle" name="discordHandle" type="text" class="input"
						placeholder="username" value={form?.discordHandle ?? ''} />
				</div>

				<div class="field">
					<label class="label" for="mobile">
						Mobile <span class="optional">(optional)</span>
					</label>
					<input id="mobile" name="mobile" type="tel" class="input"
						placeholder="+351 912 345 678" value={form?.mobile ?? ''} />
				</div>

				<fieldset class="role-fieldset">
					<legend class="label">
						Roles <span class="optional">(optional)</span>
					</legend>
					<div class="role-list">
						{#each data.roles as role}
							<label class="role-option">
								<input type="checkbox" name="roleIds" value={role.id}
									bind:group={selectedRoles} />
								<div class="role-option__info">
									<span class="role-option__name">{role.name}</span>
									{#if role.description}
										<span class="role-option__desc">{role.description}</span>
									{/if}
								</div>
							</label>
						{/each}
					</div>
				</fieldset>
			</div>

			<div class="form-actions">
				<a href="/users" class="btn btn-ghost">Cancel</a>
				<button type="submit" class="btn btn-primary" disabled={loading}>
					{loading ? 'Creating…' : 'Create user'}
				</button>
			</div>
		</form>
	</div>
</div>