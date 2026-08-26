<!-- apps/frontend/src/routes/(protected)/dm/profile/+page.svelte -->
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
			<a href="/dm" class="back-link">← DM Dashboard</a>
			<h2 class="page__title">DM Profile</h2>
		</div>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if form?.success}<div class="form-success">Profile saved.</div>{/if}

	<div class="card" style="max-width:600px;">
		<form method="post" use:enhance={() => {
			saving = true;
			return async ({ update }) => { saving = false; await update(); await invalidateAll(); };
		}}>
			<div class="fields">
				<div class="field">
					<label class="label" for="bio">Bio <span class="optional">(optional)</span></label>
					<textarea id="bio" name="bio" class="input" rows="4"
						placeholder="Tell players about yourself...">{data.profile.bio ?? ''}</textarea>
				</div>
				<div class="field">
					<label class="label" for="specialties">Specialties <span class="optional">(optional)</span></label>
					<input id="specialties" name="specialties" type="text" class="input"
						value={data.profile.specialties ?? ''} placeholder="e.g. Horror, Political intrigue, Exploration" />
				</div>
				<div class="field">
					<label class="label" for="rules">DM Rules <span class="optional">(optional)</span></label>
					<textarea id="rules" name="rules" class="input" rows="6"
						placeholder="Your table rules — these will pre-populate when you create a quest...">{data.profile.rules ?? ''}</textarea>
					<p class="field-hint">These rules appear automatically when you create a quest. You can edit them inline before submitting.</p>
				</div>
				{#if data.systems.length}
					<div class="field">
						<span class="label" role="group">Preferred game systems <span class="optional">(informational)</span></span>
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
						<option value="true"  selected={data.profile.isPublic}>Yes — visible to players</option>
						<option value="false" selected={!data.profile.isPublic}>No — hidden</option>
					</select>
				</div>
			</div>
			<div class="form-actions">
				<a href="/dm" class="btn btn-ghost">Cancel</a>
				<button type="submit" class="btn btn-primary" disabled={saving}>
					{saving ? 'Saving…' : 'Save profile'}
				</button>
			</div>
		</form>
	</div>

	<!-- Ratings received -->
	{#if (data as any).ratings?.length}
		<div class="card">
			<div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem; flex-wrap:wrap">
				<h3 class="section-title" style="margin:0;">Ratings received</h3>
				<span style="font-size:1.5rem; font-weight:700; color:var(--color-accent);">{(data as any).avgRating}</span>
				<span style="color:var(--text-muted); font-size:0.875rem;">({(data as any).ratings.length} rating{(data as any).ratings.length !== 1 ? 's' : ''})</span>
			</div>
			<div style="display:flex; flex-direction:column; gap:0.75rem;">
				{#each (data as any).ratings as r}
					<div style="padding:0.75rem; background:var(--bg-overlay); border-radius:var(--radius-sm);">
						<div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem; flex-wrap:wrap">
							<span class="star-rating" style="font-size:1rem;">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
							<span style="font-size:0.75rem; color:var(--text-muted);">{new Date(r.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</span>
						</div>
						{#if r.comment}
							<p style="font-size:0.875rem; color:var(--text-secondary); margin:0;">"{r.comment}"</p>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>