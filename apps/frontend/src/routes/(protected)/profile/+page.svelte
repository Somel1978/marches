<!-- apps/frontend/src/routes/(protected)/profile/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let savingProfile = $state(false);
	let savingEmail   = $state(false);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">My Profile</h2>
			<p class="page__subtitle">{data.user.email}</p>
		</div>
	</div>

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

		<!-- Change email -->
		<div class="card">
			<h3 class="section-title">Change email</h3>

			{#if form?.emailMessage}
				<div class="form-error">{form.emailMessage}</div>
			{/if}
			{#if form?.emailSuccess}
				<div class="form-success">
					Verification email sent to <strong>{form.newEmail}</strong>.
					Click the link to confirm your new email address.
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
				A verification link will be sent to your new email address.
				Your email will only change after you verify it.
			</p>
		</div>
	</div>
</div>