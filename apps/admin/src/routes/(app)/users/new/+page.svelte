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

<style>
	.page { display: flex; flex-direction: column; gap: 1.25rem; }
	.page__header { display: flex; flex-direction: column; gap: 0.25rem; }
	.page__title { font-size: 1.25rem; font-weight: 700; }
	.back-link { font-size: 0.875rem; color: var(--text-muted); text-decoration: none; }
	.back-link:hover { color: var(--text-primary); }
	.fields { display: flex; flex-direction: column; gap: 1.25rem; }
	.field { display: flex; flex-direction: column; gap: 0.375rem; }
	.optional { font-size: 0.75rem; color: var(--text-muted); font-weight: 400; }
	.field-hint { font-size: 0.8125rem; color: var(--text-muted); margin: 0.25rem 0 0; }

	.input-group { display: flex; }
	.input-group .input { border-radius: var(--radius-md) 0 0 var(--radius-md); flex: 1; }
	.input-toggle {
		padding: 0 0.875rem;
		background-color: var(--bg-muted);
		border: 1px solid var(--border-base);
		border-left: none;
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		color: var(--text-secondary);
		font-size: 0.8125rem;
		cursor: pointer;
		white-space: nowrap;
	}
	.input-toggle:hover { color: var(--text-primary); }

	.role-fieldset { border: none; padding: 0; margin: 0; }
	.role-list { display: flex; flex-direction: column; gap: 0.375rem; margin-top: 0.5rem; }
	.role-option {
		display: flex; align-items: center; gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-muted);
		cursor: pointer;
		transition: border-color var(--transition-fast), background-color var(--transition-fast);
	}
	.role-option:hover { background-color: var(--bg-overlay); border-color: var(--border-accent); }
	.role-option input { accent-color: var(--accent); flex-shrink: 0; }
	.role-option__info { display: flex; flex-direction: column; }
	.role-option__name { font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
	.role-option__desc { font-size: 0.8125rem; color: var(--text-muted); }

	:global(.field--fieldset) {
		border: none;
		padding: 0;
		margin: 0;
	}
	:global(.field--fieldset legend) {
		float: left;
		width: 100%;
		margin-bottom: 0.375rem;
	}

	.form-error {
		background-color: rgba(139, 58, 58, 0.15);
		border: 1px solid var(--color-danger);
		border-radius: var(--radius-md);
		padding: 0.625rem 0.875rem;
		font-size: 0.875rem;
		color: #e08080;
	}
	.form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 0.5rem; }
</style>