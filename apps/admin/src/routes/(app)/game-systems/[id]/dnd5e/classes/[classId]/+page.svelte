<!-- apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/classes/[classId]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { ConfirmModal } from '@core/ui';
	import { goto, invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const system    = $derived((data as any).system);
	const cls       = $derived((data as any).classData);

	let expandedSubclass = $state<string | null>(null);
	let editingFeature   = $state<string | null>(null);
	let editingSubFeat   = $state<string | null>(null);
	let deleteForm = $state<HTMLFormElement | undefined>();

	// ── Confirm modal ────────────────────────────────────────────────────────
	let _confirmOpen  = $state(false);
	let _confirmMsg   = $state('');
	let _confirmTitle = $state('');
	let _confirmCb    = $state<() => void>(() => {});
	function askConfirm(title: string, msg: string, cb: () => void) {
		_confirmTitle = title; _confirmMsg = msg; _confirmCb = cb; _confirmOpen = true;
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/game-systems/{system.id}/dnd5e/classes" class="back-link">← Classes</a>
			<h2 class="page__title">{cls.name}</h2>
		</div>
	</div>

	{#if (form as any)?.success && (form as any)?.action === 'class'}<div class="form-success" style="margin-bottom:1rem;">Saved.</div>{/if}

	<div class="sections">
		<!-- Class details -->
		<div class="card">
			<h3 class="section-title">Class details</h3>
			<form method="post" action="?/updateClass" use:enhance>
				<div class="fields">
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:2 1 180px;">
							<label class="label" for="name">Name</label>
							<input id="name" name="name" type="text" class="input" value={cls.name} required />
						</div>
						<div class="field" style="flex:1 1 80px;">
							<label class="label" for="hitDice">Hit dice</label>
							<input id="hitDice" name="hitDice" type="number" class="input" min="4" max="12" step="2" value={cls.hitDice ?? ''} placeholder="d8" />
						</div>
						<div class="field" style="flex:1 1 100px;">
							<label class="label" for="canCastSpells">Can cast spells</label>
							<select id="canCastSpells" name="canCastSpells" class="input input--select">
								<option value="false" selected={!cls.canCastSpells}>No</option>
								<option value="true"  selected={cls.canCastSpells}>Yes</option>
							</select>
						</div>
						<div class="field" style="flex:1 1 100px;">
							<label class="label" for="subclassAvailableAtLevel">Subclass at level</label>
							<input id="subclassAvailableAtLevel" name="subclassAvailableAtLevel" type="number" class="input" min="1" max="20" value={cls.subclassAvailableAtLevel ?? 3} />
						</div>
						<div class="field" style="flex:1 1 80px;">
							<label class="label" for="sortOrder">Sort order</label>
							<input id="sortOrder" name="sortOrder" type="number" class="input" value={cls.sortOrder} />
						</div>
						<div class="field" style="flex:1 1 100px;">
							<label class="label" for="isAvailable">Available</label>
							<select id="isAvailable" name="isAvailable" class="input input--select">
								<option value="true"  selected={cls.isAvailable}>Yes</option>
								<option value="false" selected={!cls.isAvailable}>No</option>
							</select>
						</div>
					</div>
					<div class="field">
						<label class="label" for="primaryAbilities">Primary abilities</label>
						<input id="primaryAbilities" name="primaryAbilities" type="text" class="input" value={cls.primaryAbilities ?? ''} placeholder="Strength, Constitution" />
					</div>
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:1 1 200px;">
							<label class="label" for="source">Source <span class="optional">(optional)</span></label>
							<input id="source" name="source" type="text" class="input" value={cls.source ?? ''} />
						</div>
						<div class="field" style="flex:1 1 200px;">
							<label class="label" for="link">Link <span class="optional">(optional)</span></label>
							<input id="link" name="link" type="text" class="input" value={cls.link ?? ''} />
						</div>
					</div>
					<div class="field">
						<label class="label" for="description">Description</label>
						<textarea id="description" name="description" class="input" rows="3">{cls.description ?? ''}</textarea>
					</div>
					<div class="field">
						<label class="label" for="equipmentDescription">Equipment description</label>
						<textarea id="equipmentDescription" name="equipmentDescription" class="input" rows="3">{cls.equipmentDescription ?? ''}</textarea>
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);"
						onclick={() => { askConfirm('Confirm', 'Delete this class and all its data?', () => { deleteForm?.requestSubmit(); }); }}>
						Delete class
					</button>
					<button type="submit" class="btn btn-primary">Save</button>
				</div>
			</form>
		</div>

		<form bind:this={deleteForm} method="post" action="?/deleteClass" use:enhance={() => {
			return async ({ update }) => { goto(`/game-systems/${system.id}/dnd5e/classes`); await update(); };
		}} style="display:none;"></form>

		<!-- Class Features -->
		<div class="card">
			<h3 class="section-title">Class features ({cls.features?.length ?? 0})</h3>
			{#if cls.features?.length}
				<div style="display:flex; flex-direction:column; gap:0.375rem; margin-bottom:0.75rem;">
					{#each cls.features as f}
						<div style="background:var(--bg-overlay); border-radius:var(--radius-md); overflow:hidden;">
							<div style="display:flex; align-items:center; gap:0.75rem; padding:0.5rem 0.75rem; flex-wrap:wrap">
								<span class="badge badge-muted">Lv {f.requiredLevel}</span>
								<span style="flex:1; font-weight:500;">{f.name}</span>
								{#if f.url}<a href={f.url} target="_blank" class="btn btn-ghost btn-sm" style="font-size:0.75rem;">↗</a>{/if}
								<button type="button" class="btn btn-ghost btn-sm" style="font-size:0.75rem;"
									onclick={() => editingFeature = editingFeature === f.id ? null : f.id}>
									{editingFeature === f.id ? 'Cancel' : 'Edit'}
								</button>
								<form method="post" action="?/deleteFeature" use:enhance={() => {
									return async ({ update }) => { await update(); await invalidateAll(); };
								}} style="margin:0;">
									<input type="hidden" name="id" value={f.id} />
									<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger);">✕</button>
								</form>
							</div>
							{#if editingFeature === f.id}
								<form method="post" action="?/updateFeature" use:enhance={() => {
									return async ({ update }) => { await update(); await invalidateAll(); editingFeature = null; };
								}} style="padding:0.625rem 0.75rem; border-top:1px solid var(--border-muted); background:var(--bg-muted);">
									<input type="hidden" name="id" value={f.id} />
									<div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:flex-end;">
										<div class="field" style="flex:0 0 60px; margin:0;">
											<label class="label" for="ef-lv-{f.id}">Level</label>
											<input id="ef-lv-{f.id}" name="requiredLevel" type="number" class="input" min="1" max="20" value={f.requiredLevel} required />
										</div>
										<div class="field" style="flex:1 1 160px; margin:0;">
											<label class="label" for="ef-name-{f.id}">Name</label>
											<input id="ef-name-{f.id}" name="name" type="text" class="input" value={f.name} required />
										</div>
										<div class="field" style="flex:2 1 200px; margin:0;">
											<label class="label" for="ef-desc-{f.id}">Description</label>
											<input id="ef-desc-{f.id}" name="description" type="text" class="input" value={f.description ?? ''} />
										</div>
										<div class="field" style="flex:1 1 160px; margin:0;">
											<label class="label" for="ef-url-{f.id}">URL</label>
											<input id="ef-url-{f.id}" name="url" type="url" class="input" value={f.url ?? ''} />
										</div>
										<button type="submit" class="btn btn-primary btn-sm" style="flex-shrink:0;">Save</button>
									</div>
								</form>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
			<form method="post" action="?/addFeature" use:enhance={() => {
				return async ({ update }) => { await update(); await invalidateAll(); };
			}}>
				<div style="display:flex; gap:0.5rem; align-items:flex-end; flex-wrap:wrap;">
					<div class="field" style="flex:0 0 60px; margin:0;">
						<label class="label" for="feat-level">Level</label>
						<input id="feat-level" name="requiredLevel" type="number" class="input" min="1" max="20" value="1" required />
					</div>
					<div class="field" style="flex:1 1 160px; margin:0;">
						<label class="label" for="feat-name">Feature name</label>
						<input id="feat-name" name="name" type="text" class="input" placeholder="e.g. Action Surge" required />
					</div>
					<div class="field" style="flex:2 1 200px; margin:0;">
						<label class="label" for="feat-desc">Description</label>
						<input id="feat-desc" name="description" type="text" class="input" placeholder="Short description" />
					</div>
					<button type="submit" class="btn btn-primary btn-sm" style="flex-shrink:0;">Add</button>
				</div>
			</form>
		</div>

		<!-- Subclasses -->
		<div class="card">
			<h3 class="section-title">Subclasses ({cls.subclasses?.length ?? 0})</h3>
			{#each cls.subclasses ?? [] as sub}
				<div style="margin-bottom:0.5rem; border:1px solid var(--border-muted); border-radius:var(--radius-md); overflow:hidden;">
					<div style="display:flex; align-items:center; gap:0.5rem; padding:0.625rem 0.75rem; background:var(--bg-overlay); flex-wrap:wrap">
						<button type="button" style="flex:1; text-align:left; background:none; border:none; cursor:pointer; font-weight:600; font-size:0.875rem;"
							onclick={() => expandedSubclass = expandedSubclass === sub.id ? null : sub.id}>
							{sub.name}
							<span class="badge badge-muted" style="margin-left:0.5rem;">{sub.features?.length ?? 0} features</span>
						</button>
						<form method="post" action="?/deleteSubclass" use:enhance={({ cancel }) => {
							askConfirm('Confirm', `Delete subclass "${sub.name}"?`, () => { cancel(); }); return;
							return async ({ update }) => { await update(); await invalidateAll(); };
						}} style="margin:0;">
							<input type="hidden" name="id" value={sub.id} />
							<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger); font-size:0.75rem;">✕</button>
						</form>
					</div>

					{#if expandedSubclass === sub.id}
						<div style="padding:0.75rem; border-top:1px solid var(--border-muted);">
							<!-- Subclass features -->
							{#if sub.features?.length}
								<div style="display:flex; flex-direction:column; gap:0.25rem; margin-bottom:0.5rem;">
									{#each sub.features as sf}
										<div style="background:var(--bg-surface); border-radius:var(--radius-sm); overflow:hidden;">
											<div style="display:flex; align-items:center; gap:0.5rem; padding:0.375rem 0.5rem; flex-wrap:wrap">
												<span class="badge badge-muted">Lv {sf.requiredLevel}</span>
												<span style="flex:1; font-size:0.8125rem;">{sf.name}</span>
												<button type="button" class="btn btn-ghost btn-sm" style="font-size:0.75rem;"
													onclick={() => editingSubFeat = editingSubFeat === sf.id ? null : sf.id}>
													{editingSubFeat === sf.id ? 'Cancel' : 'Edit'}
												</button>
												<form method="post" action="?/deleteSubclassFeature" use:enhance={() => {
													return async ({ update }) => { await update(); await invalidateAll(); };
												}} style="margin:0;">
													<input type="hidden" name="id" value={sf.id} />
													<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger); font-size:0.75rem;">✕</button>
												</form>
											</div>
											{#if editingSubFeat === sf.id}
												<form method="post" action="?/updateSubclassFeature" use:enhance={() => {
													return async ({ update }) => { await update(); await invalidateAll(); editingSubFeat = null; };
												}} style="padding:0.5rem 0.625rem; border-top:1px solid var(--border-muted); background:var(--bg-muted);">
													<input type="hidden" name="id" value={sf.id} />
													<div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:flex-end;">
														<div class="field" style="flex:0 0 60px; margin:0;">
															<label class="label" for="sf-lv-{sf.id}">Level</label>
															<input id="sf-lv-{sf.id}" name="requiredLevel" type="number" class="input" min="1" max="20" value={sf.requiredLevel} />
														</div>
														<div class="field" style="flex:1 1 140px; margin:0;">
															<label class="label" for="sf-name-{sf.id}">Name</label>
															<input id="sf-name-{sf.id}" name="name" type="text" class="input" value={sf.name} required />
														</div>
														<div class="field" style="flex:2 1 180px; margin:0;">
															<label class="label" for="sf-desc-{sf.id}">Description</label>
															<input id="sf-desc-{sf.id}" name="description" type="text" class="input" value={sf.description ?? ''} />
														</div>
														<button type="submit" class="btn btn-primary btn-sm">Save</button>
													</div>
												</form>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
							<form method="post" action="?/addSubclassFeature" use:enhance={() => {
								return async ({ update }) => { await update(); await invalidateAll(); };
							}}>
								<input type="hidden" name="subclassId" value={sub.id} />
								<div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:flex-end;">
									<div class="field" style="flex:0 0 55px; margin:0;">
										<label class="label" for="sf-level-{sub.id}">Level</label>
										<input id="sf-level-{sub.id}" name="requiredLevel" type="number" class="input" min="1" max="20" value="3" required />
									</div>
									<div class="field" style="flex:1 1 140px; margin:0;">
										<label class="label" for="sf-name-{sub.id}">Feature</label>
										<input id="sf-name-{sub.id}" name="name" type="text" class="input" placeholder="Feature name" required />
									</div>
									<button type="submit" class="btn btn-ghost btn-sm">Add feature</button>
								</div>
							</form>
						</div>
					{/if}
				</div>
			{/each}

			<!-- Add subclass -->
			<form method="post" action="?/addSubclass" use:enhance={() => {
				return async ({ update }) => { await update(); await invalidateAll(); };
			}} style="margin-top:0.5rem;">
				<div style="display:flex; gap:0.5rem; align-items:flex-end; flex-wrap:wrap;">
					<div class="field" style="flex:1 1 160px; margin:0;">
						<label class="label" for="sub-name">New subclass name</label>
						<input id="sub-name" name="name" type="text" class="input" placeholder="e.g. Champion" required />
					</div>
					<div class="field" style="flex:2 1 200px; margin:0;">
						<label class="label" for="sub-desc">Description <span class="optional">(optional)</span></label>
						<input id="sub-desc" name="description" type="text" class="input" />
					</div>
					<button type="submit" class="btn btn-primary btn-sm">Add subclass</button>
				</div>
			</form>
		</div>
	</div>
</div>
<ConfirmModal
	open={_confirmOpen}
	title={_confirmTitle}
	message={_confirmMsg}
	confirmLabel="Confirm"
	confirmClass="btn-danger"
	onconfirm={() => { _confirmOpen = false; _confirmCb(); }}
	oncancel={() => { _confirmOpen = false; }}
/>