<!-- apps/admin/src/routes/(app)/users/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Use $derived so selectedRoles stays in sync if data changes after navigation
	let selectedRoles  = $derived(data.user.userRoles.map(ur => ur.role.id));
	let savingProfile  = $state(false);
	let savingRoles    = $state(false);
	let savingPassword = $state(false);
	let deleting       = $state(false);
	let showPassword   = $state(false);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/users" class="back-link">← Users</a>
			<div class="page__title-row">
				<h2 class="page__title">{data.user.name}</h2>
				{#if data.isSelf}
					<span class="badge badge-accent">You</span>
				{/if}
			</div>
			<p class="page__subtitle">{data.user.email}</p>
		</div>

		{#if !data.isSelf}
			<form
				method="post"
				action="?/deleteUser"
				use:enhance={() => {
					if (!confirm(`Delete ${data.user.name}? This cannot be undone.`)) return () => {};
					deleting = true;
					return async ({ update }) => { deleting = false; await update(); };
				}}
			>
				<button type="submit" class="btn btn-danger btn-sm" disabled={deleting}>
					{deleting ? 'Deleting…' : 'Delete user'}
				</button>
			</form>
		{/if}
	</div>

	{#if form?.message}
		<div class="form-error">{form.message}</div>
	{/if}

	<div class="sections">
		<!-- Profile -->
		<section class="card">
			<h3 class="section-title">Profile</h3>
			{#if form?.profileSuccess}
				<div class="form-success">Profile updated.</div>
			{/if}
			<form
				method="post"
				action="?/updateProfile"
				use:enhance={() => {
					savingProfile = true;
					return async ({ update }) => { savingProfile = false; await update(); };
				}}
			>
				<div class="fields">
					<div class="field">
						<label class="label" for="name">Full name</label>
						<input id="name" name="name" type="text" class="input"
							value={data.user.name} required />
					</div>
					<div class="field">
						<label class="label" for="email">Email</label>
						<input id="email" name="email" type="email" class="input"
							value={data.user.email} required />
					</div>
					<div class="field">
						<label class="label" for="image">Avatar URL <span class="optional">(optional)</span></label>
						<input id="image" name="image" type="url" class="input"
							value={data.user.image ?? ''} placeholder="https://..." />
					</div>
					<div class="field">
						<label class="label" for="discordHandle">Discord handle <span class="optional">(optional)</span></label>
						<input id="discordHandle" name="discordHandle" type="text" class="input"
							value={data.user.discordHandle ?? ''} placeholder="username" />
					</div>
					<div class="field">
						<label class="label" for="mobile">Mobile <span class="optional">(optional)</span></label>
						<input id="mobile" name="mobile" type="tel" class="input"
							value={data.user.mobile ?? ''} placeholder="+351 912 345 678" />
					</div>
					<div class="field field--inline">
						<label class="label" for="emailVerified">Email verified</label>
						<select id="emailVerified" name="emailVerified" class="input input--select">
							<option value="true"  selected={data.user.emailVerified}>Yes</option>
							<option value="false" selected={!data.user.emailVerified}>No</option>
						</select>
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary btn-sm" disabled={savingProfile}>
						{savingProfile ? 'Saving…' : 'Save profile'}
					</button>
				</div>
			</form>
		</section>

		<!-- Roles -->
		<section class="card">
			<h3 class="section-title">Roles</h3>
			{#if form?.rolesSuccess}
				<div class="form-success">Roles updated.</div>
			{/if}
			<form
				method="post"
				action="?/updateRoles"
				use:enhance={() => {
					savingRoles = true;
					return async ({ update }) => { savingRoles = false; await update(); };
				}}
			>
				<div class="role-list">
					{#each data.allRoles as role}
						<label class="role-option">
							<input type="checkbox" name="roleIds" value={role.id}
								checked={selectedRoles.includes(role.id)} />
							<div class="role-option__info">
								<span class="role-option__name">{role.name}</span>
								{#if role.description}
									<span class="role-option__desc">{role.description}</span>
								{/if}
							</div>
							<span class="role-option__count">{role._count.userRoles} users</span>
						</label>
					{/each}
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary btn-sm" disabled={savingRoles}>
						{savingRoles ? 'Saving…' : 'Save roles'}
					</button>
				</div>
			</form>
		</section>

		<!-- Password reset -->
		<section class="card">
			<h3 class="section-title">Reset password</h3>
			{#if form?.passwordSuccess}
				<div class="form-success">Password updated.</div>
			{/if}
			<form
				method="post"
				action="?/resetPassword"
				use:enhance={() => {
					savingPassword = true;
					return async ({ update }) => { savingPassword = false; await update(); };
				}}
			>
				<div class="field">
					<label class="label" for="new-password">New password</label>
					<div class="input-group">
						<input id="new-password" name="password"
							type={showPassword ? 'text' : 'password'}
							class="input" placeholder="Min. 8 characters"
							required minlength="8" />
						<button type="button" class="input-toggle"
							onclick={() => showPassword = !showPassword}>
							{showPassword ? 'Hide' : 'Show'}
						</button>
					</div>
					<p class="field-hint">The user should change this after next login.</p>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary btn-sm" disabled={savingPassword}>
						{savingPassword ? 'Saving…' : 'Set password'}
					</button>
				</div>
			</form>
		</section>
	</div>
</div>

<style>
	.page { display: flex; flex-direction: column; gap: 1.5rem; }
	.page__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
	.page__title-row { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.25rem; }
	.page__title { font-size: 1.25rem; font-weight: 700; }
	.page__subtitle { font-size: 0.875rem; color: var(--text-secondary); margin: 0.125rem 0 0; }
	.back-link { font-size: 0.875rem; color: var(--text-muted); text-decoration: none; }
	.back-link:hover { color: var(--text-primary); }

	.sections { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; align-items: start; }
	@media (max-width: 768px) { .sections { grid-template-columns: 1fr; } }

	.section-title { font-size: 1rem; font-weight: 600; margin: 0 0 1.25rem; }
	.fields { display: flex; flex-direction: column; gap: 1rem; }
	.field { display: flex; flex-direction: column; gap: 0.375rem; }
	.field--inline { flex-direction: row; align-items: center; justify-content: space-between; }
	.field-hint { font-size: 0.8125rem; color: var(--text-muted); margin: 0.25rem 0 0; }
	.input--select { width: auto; }

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
		transition: color var(--transition-fast);
	}
	.input-toggle:hover { color: var(--text-primary); }

	.role-list { display: flex; flex-direction: column; gap: 0.375rem; }
	.role-option {
		display: flex; align-items: center; gap: 0.75rem;
		padding: 0.625rem 0.75rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-muted);
		cursor: pointer;
		transition: border-color var(--transition-fast), background-color var(--transition-fast);
	}
	.role-option:hover { background-color: var(--bg-overlay); border-color: var(--border-accent); }
	.role-option input { accent-color: var(--accent); flex-shrink: 0; }
	.role-option__info { display: flex; flex-direction: column; flex: 1; }
	.role-option__name { font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
	.role-option__desc { font-size: 0.8125rem; color: var(--text-muted); }
	.role-option__count { font-size: 0.75rem; color: var(--text-disabled); white-space: nowrap; }

	.form-error {
		background-color: rgba(139, 58, 58, 0.15);
		border: 1px solid var(--color-danger);
		border-radius: var(--radius-md);
		padding: 0.625rem 0.875rem;
		font-size: 0.875rem;
		color: #e08080;
	}
	.form-success {
		background-color: rgba(74, 124, 89, 0.15);
		border: 1px solid var(--color-success);
		border-radius: var(--radius-md);
		padding: 0.625rem 0.875rem;
		font-size: 0.875rem;
		color: #80c090;
		margin-bottom: 1rem;
	}
	.form-actions { display: flex; justify-content: flex-end; margin-top: 1.25rem; }
</style>