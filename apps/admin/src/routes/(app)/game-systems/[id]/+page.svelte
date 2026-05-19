<!-- apps/admin/src/routes/(app)/game-systems/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { goto } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let saving          = $state(false);
	let addingClass     = $state(false);
	let addingThreshold = $state(false);

	// Per-class state: edit mode and subclass add mode
	let editingClass    = $state<string | null>(null);   // classId being edited
	let addingSubclass  = $state<string | null>(null);   // classId getting a new subclass
	let editingSubclass = $state<string | null>(null);   // subclassId being edited

	// Per-threshold edit mode
	let editingThreshold = $state<string | null>(null);
	let addingSpecies    = $state(false);
	let editingSpecies   = $state<string | null>(null);

	$effect(() => {
		if (form?.deleted) goto('/game-systems');
	});

	function enhance_reload({ cancel }: any) {
		return async ({ update }: any) => {
			await update();
			await invalidateAll();
		};
	}

	function confirm_enhance(msg: string) {
		return ({ cancel }: any) => {
			if (!confirm(msg)) { cancel(); return; }
			return async ({ update }: any) => {
				await update();
				await invalidateAll();
			};
		};
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/game-systems" class="back-link">← Game Systems</a>
			<h2 class="page__title">{data.gs.name}</h2>
		</div>
	</div>

	{#if form?.message}
		<div class="form-error">{form.message}</div>
	{/if}

	<div class="sections">
		<!-- ── System details ────────────────────────────── -->
		<div class="card">
			<h3 class="section-title">Details</h3>
			{#if form?.systemSuccess}<div class="form-success">Saved.</div>{/if}

			<form method="post" action="?/updateSystem"
				use:enhance={() => { saving = true; return async ({ update }) => { saving = false; await update(); await invalidateAll(); }; }}>
				<div class="fields">
					<div class="field">
						<label class="label" for="name">Name</label>
						<input id="name" name="name" type="text" class="input" value={data.gs.name} required />
					</div>
					<div class="field">
						<label class="label" for="description">Description <span class="optional">(optional)</span></label>
						<input id="description" name="description" type="text" class="input" value={data.gs.description ?? ''} />
					</div>
					<div class="field field--inline">
						<label class="label" for="isAvailable">Available to players</label>
						<select id="isAvailable" name="isAvailable" class="input input--select">
							<option value="true"  selected={data.gs.isAvailable}>Yes</option>
							<option value="false" selected={!data.gs.isAvailable}>No</option>
						</select>
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
				</div>
			</form>

			<hr class="divider" />

			<form method="post" action="?/deleteSystem" use:enhance={confirm_enhance('Delete this game system? All classes and progression will be removed.')}>
				<button type="submit" class="btn btn-danger btn-sm"
					>
					Delete game system
				</button>
			</form>
		</div>

		<!-- ── Progression thresholds ─────────────────────── -->
		<div class="card">
			<h3 class="section-title">Progression thresholds</h3>
			{#if form?.thresholdSuccess}<div class="form-success">Saved.</div>{/if}

			{#if data.gs.progressionThresholds.length}
				<table class="table" style="margin-bottom: 1rem;">
					<thead>
						<tr>
							<th>Label</th>
							<th>XP required</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each data.gs.progressionThresholds as pt}
							{#if editingThreshold === pt.id}
								<tr>
									<td colspan="3">
										<form method="post" action="?/updateThreshold"
											use:enhance={() => { return async ({ update }) => { editingThreshold = null; await update(); await invalidateAll(); }; }}>
											<input type="hidden" name="thresholdId" value={pt.id} />
											<div class="fields" style="margin-bottom: 0.75rem;">
												<div class="field">
													<label class="label" for="edit-label-{pt.id}">Label</label>
													<input id="edit-label-{pt.id}" name="label" type="text" class="input" value={pt.label} required />
												</div>
												<div class="field">
													<label class="label" for="edit-xp-{pt.id}">XP required</label>
													<input id="edit-xp-{pt.id}" name="xpRequired" type="number" class="input" min="0" value={pt.xpRequired} required />
												</div>
												<div class="field">
													<label class="label" for="edit-tdesc-{pt.id}">Description <span class="optional">(optional)</span></label>
													<input id="edit-tdesc-{pt.id}" name="thresholdDescription" type="text" class="input" value={pt.description ?? ''} />
												</div>
											</div>
											<div class="form-actions">
												<button type="button" class="btn btn-ghost btn-sm" onclick={() => editingThreshold = null}>Cancel</button>
												<button type="submit" class="btn btn-primary btn-sm">Save</button>
											</div>
										</form>
									</td>
								</tr>
							{:else}
								<tr>
									<td>{pt.label}</td>
									<td>{pt.xpRequired.toLocaleString()}</td>
									<td class="table__action">
										<div style="display:flex; gap:0.375rem; justify-content:flex-end;">
											<button class="btn btn-ghost btn-sm" onclick={() => editingThreshold = pt.id}>Edit</button>
											<form method="post" action="?/deleteThreshold" style="display:contents" use:enhance={confirm_enhance('Remove threshold?')}>
												<input type="hidden" name="thresholdId" value={pt.id} />
												<button type="submit" class="btn btn-ghost btn-sm btn-icon"
													
													aria-label="Delete">
													<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
														<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
													</svg>
												</button>
											</form>
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			{/if}

			{#if addingThreshold}
				<form method="post" action="?/addThreshold"
					use:enhance={() => { return async ({ update }) => { addingThreshold = false; await update(); await invalidateAll(); }; }}>
					<div class="fields">
						<div class="field">
							<label class="label" for="label">Label</label>
							<input id="label" name="label" type="text" class="input" placeholder="e.g. Level 1" required />
						</div>
						<div class="field">
							<label class="label" for="xpRequired">XP required</label>
							<input id="xpRequired" name="xpRequired" type="number" class="input" min="0" required />
						</div>
						<div class="field">
							<label class="label" for="thresholdDescription">Description <span class="optional">(optional)</span></label>
							<input id="thresholdDescription" name="thresholdDescription" type="text" class="input" />
						</div>
					</div>
					<div class="form-actions">
						<button type="button" class="btn btn-ghost" onclick={() => addingThreshold = false}>Cancel</button>
						<button type="submit" class="btn btn-primary">Add threshold</button>
					</div>
				</form>
			{:else}
				<button class="btn btn-ghost btn-sm" onclick={() => addingThreshold = true}>+ Add threshold</button>
			{/if}
		</div>
	</div>

	<!-- ── Species ─────────────────────────────────────────── -->
	<div class="card">
		<div class="page__header" style="margin-bottom: 1rem;">
			<h3 class="section-title" style="margin:0">Species</h3>
			<button class="btn btn-ghost btn-sm" onclick={() => addingSpecies = !addingSpecies}>
				{addingSpecies ? 'Cancel' : '+ Add species'}
			</button>
		</div>

		{#if form?.speciesSuccess}<div class="form-success">Saved.</div>{/if}

		{#if addingSpecies}
			<form method="post" action="?/addSpecies"
				use:enhance={() => { return async ({ update }) => { addingSpecies = false; await update(); await invalidateAll(); }; }}
				style="margin-bottom: 1.5rem;">
				<div class="fields">
					<div class="field">
						<label class="label" for="speciesName">Name</label>
						<input id="speciesName" name="speciesName" type="text" class="input" placeholder="e.g. Elf" required />
					</div>
					<div class="field">
						<label class="label" for="speciesDescription">Description <span class="optional">(optional)</span></label>
						<input id="speciesDescription" name="speciesDescription" type="text" class="input" />
					</div>
					<div class="field">
						<label class="label" for="speciesSource">Source <span class="optional">(optional)</span></label>
						<input id="speciesSource" name="speciesSource" type="text" class="input" placeholder="e.g. Player's Handbook" />
					</div>
					<div class="field">
						<label class="label" for="speciesLink">Link <span class="optional">(optional)</span></label>
						<input id="speciesLink" name="speciesLink" type="url" class="input" placeholder="https://..." />
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost" onclick={() => addingSpecies = false}>Cancel</button>
					<button type="submit" class="btn btn-primary">Add species</button>
				</div>
			</form>
		{/if}

		{#if data.gs.species?.length}
			<div class="gs-subclasses" style="border-radius:var(--radius-md);">
				{#each (data.gs.species ?? []) as sp}
					{#if editingSpecies === sp.id}
						<div class="gs-subclass-edit" style="width:100%;">
							<form method="post" action="?/updateSpecies"
								use:enhance={() => { return async ({ update }) => { editingSpecies = null; await update(); await invalidateAll(); }; }}>
								<input type="hidden" name="speciesId" value={sp.id} />
								<div class="fields">
									<div class="field">
										<label class="label" for="edit-spname-{sp.id}">Name</label>
										<input id="edit-spname-{sp.id}" name="speciesName" type="text" class="input" value={sp.name} required />
									</div>
									<div class="field">
										<label class="label" for="edit-spdesc-{sp.id}">Description <span class="optional">(optional)</span></label>
										<input id="edit-spdesc-{sp.id}" name="speciesDescription" type="text" class="input" value={sp.description ?? ''} />
									</div>
									<div class="field">
										<label class="label" for="edit-spsource-{sp.id}">Source <span class="optional">(optional)</span></label>
										<input id="edit-spsource-{sp.id}" name="speciesSource" type="text" class="input" value={sp.source ?? ''} />
									</div>
									<div class="field">
										<label class="label" for="edit-splink-{sp.id}">Link <span class="optional">(optional)</span></label>
										<input id="edit-splink-{sp.id}" name="speciesLink" type="url" class="input" value={sp.link ?? ''} />
									</div>
									<div class="field field--inline">
										<label class="label" for="edit-spavail-{sp.id}">Available</label>
										<select id="edit-spavail-{sp.id}" name="isAvailable" class="input input--select">
											<option value="true"  selected={sp.isAvailable}>Yes</option>
											<option value="false" selected={!sp.isAvailable}>No</option>
										</select>
									</div>
								</div>
								<div class="form-actions">
									<button type="button" class="btn btn-ghost btn-sm" onclick={() => editingSpecies = null}>Cancel</button>
									<button type="submit" class="btn btn-primary btn-sm">Save</button>
								</div>
							</form>
						</div>
					{:else}
						<div class="gs-subclass">
							<div class="gs-subclass__body">
								<span class="gs-subclass__name {sp.isAvailable ? '' : 'gs-subclass__name--hidden'}">{sp.name}</span>
								{#if sp.source}
									<span class="gs-subclass__source">
										{#if sp.link}<a href={sp.link} target="_blank" rel="noopener">{sp.source}</a>{:else}{sp.source}{/if}
									</span>
								{/if}
							</div>
							<div style="display:flex; gap:0.25rem;">
								<button class="btn btn-ghost btn-sm btn-icon" onclick={() => editingSpecies = sp.id} aria-label="Edit">
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
										<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
									</svg>
								</button>
								<form method="post" action="?/deleteSpecies" style="display:contents" use:enhance={confirm_enhance('Delete species?')}>
									<input type="hidden" name="speciesId" value={sp.id} />
									<button type="submit" class="btn btn-ghost btn-sm btn-icon"
										
									aria-label="Delete">
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
										</svg>
									</button>
								</form>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{:else}
			{#if !addingSpecies}<p class="table__empty">No species yet.</p>{/if}
		{/if}
	</div>

	<!-- ── Classes ─────────────────────────────────────────── -->
	<div class="card">
		<div class="page__header" style="margin-bottom: 1rem;">
			<h3 class="section-title" style="margin:0">Classes</h3>
			<button class="btn btn-ghost btn-sm" onclick={() => addingClass = !addingClass}>
				{addingClass ? 'Cancel' : '+ Add class'}
			</button>
		</div>

		{#if form?.classSuccess}<div class="form-success">Saved.</div>{/if}
		{#if form?.subclassSuccess}<div class="form-success">Saved.</div>{/if}

		{#if addingClass}
			<form method="post" action="?/addClass"
				use:enhance={() => { return async ({ update }) => { addingClass = false; await update(); await invalidateAll(); }; }}
				style="margin-bottom: 1.5rem;">
				<div class="fields">
					<div class="field">
						<label class="label" for="className">Name</label>
						<input id="className" name="className" type="text" class="input" placeholder="e.g. Fighter" required />
					</div>
					<div class="field">
						<label class="label" for="classDescription">Description <span class="optional">(optional)</span></label>
						<input id="classDescription" name="classDescription" type="text" class="input" />
					</div>
					<div class="field">
						<label class="label" for="classSource">Source <span class="optional">(optional)</span></label>
						<input id="classSource" name="classSource" type="text" class="input" placeholder="e.g. Player's Handbook" />
					</div>
					<div class="field">
						<label class="label" for="classLink">Link <span class="optional">(optional)</span></label>
						<input id="classLink" name="classLink" type="url" class="input" placeholder="https://..." />
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost" onclick={() => addingClass = false}>Cancel</button>
					<button type="submit" class="btn btn-primary">Add class</button>
				</div>
			</form>
		{/if}

		{#each data.gs.classes as cls}
			<div class="gs-class">
				<div class="gs-class__header">
					<div class="gs-class__info">
						<span class="gs-class__name">{cls.name}</span>
						{#if cls.description}<span class="gs-class__desc">{cls.description}</span>{/if}
						{#if cls.source}
							<span class="gs-class__desc">
								{#if cls.link}
									<a href={cls.link} target="_blank" rel="noopener">{cls.source}</a>
								{:else}
									{cls.source}
								{/if}
							</span>
						{/if}
					</div>
					<div class="gs-class__actions">
						{#if !cls.isAvailable}
							<span class="badge badge-muted">Hidden</span>
						{/if}
						<button class="btn btn-ghost btn-sm"
							onclick={() => editingClass = editingClass === cls.id ? null : cls.id}>
							{editingClass === cls.id ? 'Cancel' : 'Edit'}
						</button>
						<button class="btn btn-ghost btn-sm"
							onclick={() => addingSubclass = addingSubclass === cls.id ? null : cls.id}>
							+ Subclass
						</button>
						<form method="post" action="?/deleteClass" style="display:contents" use:enhance={confirm_enhance('Delete class and all its subclasses?')}>
							<input type="hidden" name="classId" value={cls.id} />
							<button type="submit" class="btn btn-ghost btn-sm btn-icon"
								
								aria-label="Delete class">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
								</svg>
							</button>
						</form>
					</div>
				</div>

				{#if editingClass === cls.id}
					<form method="post" action="?/updateClass"
						use:enhance={() => { return async ({ update }) => { editingClass = null; await update(); await invalidateAll(); }; }}
						style="padding: 0.75rem 1rem; border-top: 1px solid var(--border-muted);">
						<input type="hidden" name="classId" value={cls.id} />
						<div class="fields">
							<div class="field">
								<label class="label" for="edit-cname-{cls.id}">Name</label>
								<input id="edit-cname-{cls.id}" name="className" type="text" class="input" value={cls.name} required />
							</div>
							<div class="field">
								<label class="label" for="edit-cdesc-{cls.id}">Description <span class="optional">(optional)</span></label>
								<input id="edit-cdesc-{cls.id}" name="classDescription" type="text" class="input" value={cls.description ?? ''} />
							</div>
							<div class="field">
								<label class="label" for="edit-csource-{cls.id}">Source <span class="optional">(optional)</span></label>
								<input id="edit-csource-{cls.id}" name="classSource" type="text" class="input" value={cls.source ?? ''} placeholder="e.g. Player's Handbook" />
							</div>
							<div class="field">
								<label class="label" for="edit-clink-{cls.id}">Link <span class="optional">(optional)</span></label>
								<input id="edit-clink-{cls.id}" name="classLink" type="url" class="input" value={cls.link ?? ''} placeholder="https://..." />
							</div>
							<div class="field field--inline">
								<label class="label" for="edit-cavail-{cls.id}">Available</label>
								<select id="edit-cavail-{cls.id}" name="isAvailable" class="input input--select">
									<option value="true"  selected={cls.isAvailable}>Yes</option>
									<option value="false" selected={!cls.isAvailable}>No</option>
								</select>
							</div>
						</div>
						<div class="form-actions">
							<button type="button" class="btn btn-ghost btn-sm" onclick={() => editingClass = null}>Cancel</button>
							<button type="submit" class="btn btn-primary btn-sm">Save class</button>
						</div>
					</form>
				{/if}

				<!-- Subclasses list -->
				{#if cls.subclasses.length}
					<div class="gs-subclasses">
						{#each cls.subclasses as sub}
							{#if editingSubclass === sub.id}
								<div class="gs-subclass-edit">
									<form method="post" action="?/updateSubclass"
										use:enhance={() => { return async ({ update }) => { editingSubclass = null; await update(); await invalidateAll(); }; }}>
										<input type="hidden" name="subclassId" value={sub.id} />
										<div class="fields">
											<div class="field">
												<label class="label" for="edit-sname-{sub.id}">Name</label>
												<input id="edit-sname-{sub.id}" name="subclassName" type="text" class="input" value={sub.name} required />
											</div>
											<div class="field">
												<label class="label" for="edit-sdesc-{sub.id}">Description <span class="optional">(optional)</span></label>
												<input id="edit-sdesc-{sub.id}" name="subclassDescription" type="text" class="input" value={sub.description ?? ''} />
											</div>
											<div class="field">
												<label class="label" for="edit-ssource-{sub.id}">Source <span class="optional">(optional)</span></label>
												<input id="edit-ssource-{sub.id}" name="subclassSource" type="text" class="input" value={sub.source ?? ''} />
											</div>
											<div class="field">
												<label class="label" for="edit-slink-{sub.id}">Link <span class="optional">(optional)</span></label>
												<input id="edit-slink-{sub.id}" name="subclassLink" type="url" class="input" value={sub.link ?? ''} />
											</div>
											<div class="field field--inline">
												<label class="label" for="edit-savail-{sub.id}">Available</label>
												<select id="edit-savail-{sub.id}" name="isAvailable" class="input input--select">
													<option value="true"  selected={sub.isAvailable}>Yes</option>
													<option value="false" selected={!sub.isAvailable}>No</option>
												</select>
											</div>
										</div>
										<div class="form-actions">
											<button type="button" class="btn btn-ghost btn-sm" onclick={() => editingSubclass = null}>Cancel</button>
											<button type="submit" class="btn btn-primary btn-sm">Save</button>
										</div>
									</form>
								</div>
							{:else}
								<div class="gs-subclass">
									<div class="gs-subclass__body">
										<span class="gs-subclass__name {sub.isAvailable ? '' : 'gs-subclass__name--hidden'}">{sub.name}</span>
										{#if sub.source}
											<span class="gs-subclass__source">
												{#if sub.link}
													<a href={sub.link} target="_blank" rel="noopener">{sub.source}</a>
												{:else}
													{sub.source}
												{/if}
											</span>
										{/if}
									</div>
									<div style="display:flex; gap:0.25rem;">
										<button class="btn btn-ghost btn-sm btn-icon" onclick={() => editingSubclass = sub.id} aria-label="Edit subclass">
											<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
												<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
											</svg>
										</button>
										<form method="post" action="?/deleteSubclass" style="display:contents" use:enhance={confirm_enhance('Delete subclass?')}>
											<input type="hidden" name="subclassId" value={sub.id} />
											<button type="submit" class="btn btn-ghost btn-sm btn-icon"
												
												aria-label="Delete subclass">
												<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
													<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
												</svg>
											</button>
										</form>
									</div>
								</div>
							{/if}
						{/each}
					</div>
				{/if}

				<!-- Add subclass form -->
				{#if addingSubclass === cls.id}
					<form method="post" action="?/addSubclass"
						style="padding: 0.75rem 1rem; background: var(--bg-overlay); border-top: 1px solid var(--border-muted);"
						use:enhance={() => { return async ({ update }) => { addingSubclass = null; await update(); await invalidateAll(); }; }}>
						<input type="hidden" name="classId" value={cls.id} />
						<div class="fields">
							<div class="field">
								<label class="label" for="subclassName-{cls.id}">Name</label>
								<input id="subclassName-{cls.id}" name="subclassName" type="text" class="input" placeholder="e.g. Champion" required />
							</div>
							<div class="field">
								<label class="label" for="subclassDesc-{cls.id}">Description <span class="optional">(optional)</span></label>
								<input id="subclassDesc-{cls.id}" name="subclassDescription" type="text" class="input" />
							</div>
							<div class="field">
								<label class="label" for="subclassSource-{cls.id}">Source <span class="optional">(optional)</span></label>
								<input id="subclassSource-{cls.id}" name="subclassSource" type="text" class="input" placeholder="e.g. Player's Handbook" />
							</div>
							<div class="field">
								<label class="label" for="subclassLink-{cls.id}">Link <span class="optional">(optional)</span></label>
								<input id="subclassLink-{cls.id}" name="subclassLink" type="url" class="input" placeholder="https://..." />
							</div>
						</div>
						<div class="form-actions">
							<button type="button" class="btn btn-ghost btn-sm" onclick={() => addingSubclass = null}>Cancel</button>
							<button type="submit" class="btn btn-primary btn-sm">Add subclass</button>
						</div>
					</form>
				{/if}
			</div>
		{:else}
			{#if !addingClass}
				<p class="table__empty">No classes yet.</p>
			{/if}
		{/each}
	</div>
</div>