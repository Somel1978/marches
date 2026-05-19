<!-- apps/admin/src/routes/(app)/dms/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let saving = $state(false);

	const preferredIds = $derived(
		data.profile.preferredSystems.map((s: any) => s.gameSystemId)
	);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/dms" class="back-link">← DM Profiles</a>
			<h2 class="page__title">{data.profile.userId}</h2>
			<div class="page__title-row">
				<span class="badge {data.profile.isActive ? 'badge-success' : 'badge-danger'}">
					{data.profile.isActive ? 'Active' : 'Inactive'}
				</span>
				{#if !data.profile.isPublic}
					<span class="badge badge-muted">Private</span>
				{/if}
			</div>
		</div>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if form?.success}<div class="form-success">Profile saved.</div>{/if}
	{#if (form as any)?.revokeSuccess}
		<div class="form-success">DM role revoked. All quests and regions are frozen pending admin resolution.</div>
	{/if}

	<!-- Edit profile -->
	<div class="card" style="max-width:600px; margin-bottom:1.5rem;">
		<h3 class="section-title">Profile</h3>
		<form method="post" action="?/update" use:enhance={() => {
			saving = true;
			return async ({ update }) => { saving = false; await update(); await invalidateAll(); };
		}}>
			<div class="fields">
				<div class="field">
					<label class="label" for="bio">Bio <span class="optional">(optional)</span></label>
					<textarea id="bio" name="bio" class="input" rows="3"
						placeholder="DM biography...">{data.profile.bio ?? ''}</textarea>
				</div>
				<div class="field">
					<label class="label" for="specialties">Specialties <span class="optional">(optional)</span></label>
					<input id="specialties" name="specialties" type="text" class="input"
						value={data.profile.specialties ?? ''} placeholder="e.g. Horror, Political intrigue" />
				</div>
				<div class="field">
					<label class="label" for="rules">DM Rules <span class="optional">(optional)</span></label>
					<textarea id="rules" name="rules" class="input" rows="5"
						placeholder="Rules that will pre-populate when this DM creates a quest...">{data.profile.rules ?? ''}</textarea>
					<p class="field-hint">These rules auto-populate when the DM creates a quest and can be edited inline before submission.</p>
				</div>
				{#if data.systems.length}
					<div class="field">
						<span class="label" role="group">Preferred systems <span class="optional">(informational)</span></span>
						<div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.375rem;">
							{#each data.systems as system}
								<label class="role-option" style="cursor:pointer;">
									<input type="checkbox" name="preferredSystemIds" value={system.id}
										checked={preferredIds.includes(system.id)} />
									{system.name}
								</label>
							{/each}
						</div>
					</div>
				{/if}
				<div class="field field--inline">
					<label class="label" for="isPublic">Public profile</label>
					<select id="isPublic" name="isPublic" class="input input--select">
						<option value="true"  selected={data.profile.isPublic}>Yes</option>
						<option value="false" selected={!data.profile.isPublic}>No</option>
					</select>
				</div>
				<div class="field field--inline">
					<label class="label" for="isActive">Active</label>
					<select id="isActive" name="isActive" class="input input--select">
						<option value="true"  selected={data.profile.isActive}>Yes</option>
						<option value="false" selected={!data.profile.isActive}>No</option>
					</select>
				</div>
			</div>
			<div class="form-actions">
				<a href="/dms" class="btn btn-ghost">Cancel</a>
				<button type="submit" class="btn btn-primary" disabled={saving}>
					{saving ? 'Saving…' : 'Save profile'}
				</button>
			</div>
		</form>
	</div>

	<!-- Revoke DM role — separate card, separate form -->
	{#if data.profile.isActive}
		<div class="card" style="max-width:600px; border-color:var(--color-danger);">
			<h3 class="section-title" style="color:var(--color-danger);">Revoke DM role</h3>
			<p style="font-size:0.875rem; color:var(--text-muted); margin-bottom:1rem;">
				Deactivates this DM profile and removes the DM role from the user.
				All active quests and region assignments will be frozen until manually resolved.
			</p>
			<form method="post" action="?/revoke"
				use:enhance={({ cancel }) => {
					if (!confirm('Revoke DM role? This deactivates the profile and removes the DM role.')) { cancel(); return; }
					return async ({ update }) => { await update(); await invalidateAll(); };
				}}>
				<button type="submit" class="btn btn-danger btn-sm">Revoke DM role</button>
			</form>
		</div>
	{/if}
</div>