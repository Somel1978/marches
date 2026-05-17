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
	let lightboxOpen   = $state(false);
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
						{#if data.user.image}
							<button class="avatar-preview-btn" onclick={() => lightboxOpen = true} aria-label="View full image">
								<img
									src={data.user.image}
									alt="{data.user.name} avatar"
									class="avatar-preview"
									onerror={() => { const el = event?.target as HTMLImageElement; if (el) el.closest('.avatar-preview-btn')?.remove(); }}
								/>
							</button>
						{/if}
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

{#if lightboxOpen}
	<div class="lightbox" role="dialog" aria-modal="true" aria-label="Avatar preview">
		<button class="lightbox__backdrop" onclick={() => lightboxOpen = false} aria-label="Close"></button>
		<div class="lightbox__card card">
			<button class="lightbox__close btn btn-ghost btn-sm btn-icon" onclick={() => lightboxOpen = false} aria-label="Close">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
			<img src={data.user.image} alt="{data.user.name} avatar" class="lightbox__image" />
			<p class="lightbox__name">{data.user.name}</p>
		</div>
	</div>
{/if}