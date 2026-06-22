<!-- apps/frontend/src/routes/(protected)/profile/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let savingProfile  = $state(false);
	let savingEmail    = $state(false);
	let savingPassword = $state(false);
	let lightboxOpen   = $state(false);
	let showCurrent    = $state(false);
	let showNew        = $state(false);
	let savingTheme       = $state(false);
	let selectedTheme     = $derived.by(() => (data.user as any).theme ?? 'frontend');
	let themeOverride     = $state<string | null>(null);
	const activeTheme     = $derived(themeOverride ?? selectedTheme);

	async function applyTheme(key: string) {
		themeOverride = key;
		// Apply immediately in the browser
		document.documentElement.setAttribute('data-theme', key);
		// Also set cookie directly so it persists on refresh even before server responds
		document.cookie = `userTheme=${key};path=/;max-age=31536000;samesite=lax`;
		// Save to DB via form action
		savingTheme = true;
		const fd = new FormData();
		fd.append('theme', key);
		await fetch('?/updateTheme', { method: 'POST', body: fd });
		savingTheme = false;
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">My Profile</h2>
			<p class="page__subtitle">{data.user.email}</p>
		</div>
	</div>

	{#if data.emailChanged}
		<div class="form-success">
			Your email has been updated to <strong>{data.user.email}</strong>.
		</div>
	{/if}

	<div class="sections">
		<!-- Profile details -->
		<div class="card">
			<h3 class="section-title">Profile details</h3>

			{#if form?.profileMessage}
				<div class="form-error">{form.profileMessage}</div>
			{/if}
			{#if form?.profileSuccess}
				<div class="form-success">Profile updated.</div>
			{/if}

			<form method="post" action="?/updateProfile" use:enhance={() => {
				savingProfile = true;
				return async ({ update }) => { savingProfile = false; await update(); };
			}}>
				<div class="fields">
					<div class="field">
						<label class="label" for="email">Email</label>
						<input id="email" type="email" class="input"
							value={data.user.email} disabled />
						<p class="field-hint">Use the "Change email" section to update your email.</p>
					</div>
					<div class="field">
						<label class="label" for="name">Full name</label>
						<input id="name" name="name" type="text" class="input"
							value={data.user.name} required />
					</div>
					<div class="field">
						<label class="label" for="image">
							Avatar URL <span class="optional">(optional)</span>
						</label>
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
						<label class="label" for="discordHandle">
							Discord handle <span class="optional">(optional)</span>
						</label>
						<input id="discordHandle" name="discordHandle" type="text" class="input"
							value={data.user.discordHandle ?? ''} placeholder="username" />
					</div>
					<div class="field">
						<label class="label" for="mobile">
							Mobile <span class="optional">(optional)</span>
						</label>
						<input id="mobile" name="mobile" type="tel" class="input"
							value={data.user.mobile ?? ''} placeholder="+351 912 345 678" />
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary" disabled={savingProfile}>
						{savingProfile ? 'Saving…' : 'Save profile'}
					</button>
				</div>
			</form>
		</div>

		<!-- Change password -->
		<div class="card">
			<h3 class="section-title">Change password</h3>

			{#if form?.passwordMessage}
				<div class="form-error">{form.passwordMessage}</div>
			{/if}
			{#if form?.passwordSuccess}
				<div class="form-success">Password updated successfully.</div>
			{/if}

			<form method="post" action="?/changePassword" use:enhance={() => {
				savingPassword = true;
				return async ({ update }) => { savingPassword = false; await update(); };
			}}>
				<div class="fields">
					<div class="field">
						<label class="label" for="currentPasswordPwd">Current password</label>
						<div class="input-group">
							<input id="currentPasswordPwd" name="currentPassword"
								type={showCurrent ? 'text' : 'password'}
								class="input" required />
							<button type="button" class="input-toggle"
								onclick={() => showCurrent = !showCurrent}>
								{showCurrent ? 'Hide' : 'Show'}
							</button>
						</div>
					</div>
					<div class="field">
						<label class="label" for="newPassword">New password</label>
						<div class="input-group">
							<input id="newPassword" name="newPassword"
								type={showNew ? 'text' : 'password'}
								class="input" placeholder="Min. 8 characters"
								required minlength="8" />
							<button type="button" class="input-toggle"
								onclick={() => showNew = !showNew}>
								{showNew ? 'Hide' : 'Show'}
							</button>
						</div>
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary" disabled={savingPassword}>
						{savingPassword ? 'Saving…' : 'Update password'}
					</button>
				</div>
			</form>
		</div>

		<!-- Change email -->
		<div class="card">
			<h3 class="section-title">Change email</h3>

			{#if form?.emailMessage}
				<div class="form-error">{form.emailMessage}</div>
			{/if}
			{#if form?.emailSuccess}
				<div class="form-success">
					Approval email sent to your current address.
					After approving, a verification link will be sent to <strong>{form.newEmail}</strong>.
				</div>
			{/if}

			<form method="post" action="?/changeEmail" use:enhance={() => {
				savingEmail = true;
				return async ({ update }) => { savingEmail = false; await update(); };
			}}>
				<div class="fields">
					<div class="field">
						<label class="label" for="newEmail">New email address</label>
						<input id="newEmail" name="newEmail" type="email" class="input"
							placeholder="new@example.com" required />
					</div>
					<div class="field">
						<label class="label" for="currentPassword">Current password</label>
						<input id="currentPassword" name="currentPassword" type="password" class="input"
							placeholder="Confirm with your current password" required />
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary" disabled={savingEmail}>
						{savingEmail ? 'Sending…' : 'Send verification'}
					</button>
				</div>
			</form>

			<p class="field-hint" style="margin-top: 0.75rem;">
				An approval link will be sent to your <strong>current</strong> email address.
				After approving, a verification link will be sent to the new address.
				Your email only changes after both steps are complete.
			</p>
		</div>
	</div>

	<!-- Discord -->
	{#if (data as any).discordSuccess === 'discord_linked'}
		<div class="form-success" style="margin-bottom:1rem;">Discord account linked successfully!</div>
	{:else if (data as any).discordSuccess === 'discord_unlinked'}
		<div class="form-success" style="margin-bottom:1rem;">Discord account unlinked.</div>
	{/if}
	<div class="card">
		<h3 class="section-title">Discord</h3>
		{#if (data as any).user?.discordHandle}
			<div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;">
				<div>
					<p style="font-weight:600; margin:0;">Connected as <span style="color:var(--color-accent);">@{(data as any).user.discordHandle}</span></p>
					<p class="table__muted" style="font-size:0.8125rem; margin:0.125rem 0 0;">Linked — you can receive quest invites via DM and use bot commands.</p>
				</div>
				<a href="/auth/discord/unlink" class="btn btn-danger btn-sm">Unlink</a>
			</div>
		{:else}
			<p class="table__muted" style="margin-bottom:0.75rem;">Link your Discord account to receive quest invites via DM and use slash commands.</p>
			<a href="/auth/discord" class="btn btn-primary">Connect Discord</a>
		{/if}
	</div>
</div>

<!-- ── Theme ─────────────────────────────────────────────────── -->
<div class="card" style="margin-top:1.5rem;">
	<h2 class="section-title" style="margin-bottom:0.875rem;">Appearance</h2>
	<p class="table__muted" style="margin-bottom:1rem;">Choose a colour theme for your experience.</p>
	<div style="display:flex;flex-wrap:wrap;gap:0.75rem;">
		{#each (data as any).themes as theme}
			{@const active = activeTheme === theme.key}
			<button
				type="button"
				onclick={() => applyTheme(theme.key)}
				style="
					display:flex;flex-direction:column;align-items:flex-start;gap:0;
					padding:0;border-radius:12px;overflow:hidden;
					border:2px solid {active ? theme.accent : theme.bgSurface};
					background:transparent;cursor:pointer;width:130px;
					transition:border-color 0.15s;
				"
				aria-label="Select {theme.name} theme"
				aria-pressed={active}
			>
				<!-- Swatch preview -->
				<div style="width:100%;height:64px;background:{theme.bgBase};position:relative;overflow:hidden;border-radius:10px 10px 0 0;">
					<!-- Mini sidebar strip -->
					<div style="position:absolute;top:0;left:0;bottom:0;width:28px;background:{theme.bgSurface};border-right:1px solid {theme.accent}22;"></div>
					<!-- Mini nav dots -->
					<div style="position:absolute;top:8px;left:6px;display:flex;flex-direction:column;gap:5px;">
						<div style="width:16px;height:4px;border-radius:2px;background:{theme.accent};opacity:0.9;"></div>
						<div style="width:14px;height:3px;border-radius:2px;background:{theme.bgSurface};filter:brightness(1.5);"></div>
						<div style="width:14px;height:3px;border-radius:2px;background:{theme.bgSurface};filter:brightness(1.5);"></div>
					</div>
					<!-- Mini card -->
					<div style="position:absolute;top:8px;left:36px;right:6px;background:{theme.bgSurface};border-radius:4px;padding:5px 6px;border:1px solid {theme.accent}30;">
						<div style="width:70%;height:3px;border-radius:2px;background:{theme.accent};margin-bottom:4px;"></div>
						<div style="width:50%;height:2px;border-radius:2px;background:{theme.accentLight};opacity:0.7;"></div>
					</div>
					<!-- Badge dot -->
					<div style="position:absolute;bottom:8px;right:8px;background:{theme.accent};width:16px;height:8px;border-radius:99px;"></div>
				</div>
				<!-- Label -->
				<div style="width:100%;padding:6px 10px 7px;background:{theme.bgSurface};display:flex;align-items:center;justify-content:space-between;">
					<span style="font-size:0.75rem;font-weight:500;color:{theme.accentLight};">{theme.name}</span>
					{#if active}
						<span style="width:8px;height:8px;border-radius:50%;background:{theme.accent};flex-shrink:0;"></span>
					{/if}
				</div>
			</button>
		{/each}
	</div>
	{#if savingTheme}
		<p class="table__muted" style="font-size:0.8125rem;margin-top:0.75rem;">Applying…</p>
	{/if}
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