<!-- apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/feats/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const system = $derived((data as any).system);
	const feats  = $derived((data as any).feats as any[]);

	let expanded   = $state<string | null>(null);
	let editing    = $state<string | null>(null);
	let showCreate = $state(false);

	function toggle(id: string) {
		expanded = expanded === id ? null : id;
		if (editing && editing !== id) editing = null;
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/game-systems/{system.id}" class="back-link">← {system.name}</a>
			<h2 class="page__title">Feats</h2>
		</div>
		<div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
			<a href="/game-systems/{system.id}/dnd5e/classes"     class="btn btn-ghost btn-sm">Classes</a>
			<a href="/game-systems/{system.id}/dnd5e/species"     class="btn btn-ghost btn-sm">Species</a>
			<a href="/game-systems/{system.id}/dnd5e/backgrounds" class="btn btn-ghost btn-sm">Backgrounds</a>
			<a href="/game-systems/{system.id}/data/import/dnd5e" class="btn btn-ghost btn-sm">Import</a>
			<button class="btn btn-primary btn-sm" onclick={() => showCreate = !showCreate}>+ New Feat</button>
		</div>
	</div>

	{#if (form as any)?.message}
		<div class="form-error" style="margin-bottom:1rem;">{(form as any).message}</div>
	{/if}

	{#if showCreate}
		<div class="card" style="margin-bottom:1rem;">
			<h3 class="section-title">New Feat</h3>
			<form method="post" action="?/create" use:enhance={() => {
				return async ({ update }) => { showCreate = false; await update(); await invalidateAll(); };
			}}>
				<div class="fields">
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:2 1 200px;">
							<label class="label" for="new-name">Name <span class="required">*</span></label>
							<input id="new-name" name="name" type="text" class="input" required />
						</div>
						<div class="field" style="flex:3 1 300px;">
							<label class="label" for="new-snippet">Snippet</label>
							<input id="new-snippet" name="snippet" type="text" class="input" placeholder="One-line summary" />
						</div>
					</div>
					<div class="field">
						<label class="label" for="new-desc">Description</label>
						<textarea id="new-desc" name="description" class="input" rows="3"></textarea>
					</div>
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:2 1 180px;">
							<label class="label" for="new-categories">Categories</label>
							<input id="new-categories" name="categories" type="text" class="input" placeholder="General, Fighting Style…" />
						</div>
						<div class="field" style="flex:2 1 180px;">
							<label class="label" for="new-prereqs">Prerequisites</label>
							<input id="new-prereqs" name="prerequisites" type="text" class="input" placeholder="STR 13 or higher…" />
						</div>
						<div class="field" style="flex:2 1 180px;">
							<label class="label" for="new-url">Details URL</label>
							<input id="new-url" name="detailsUrl" type="text" class="input" placeholder="https://…" />
						</div>
						<div class="field" style="flex:0 0 110px;">
							<label class="label" for="new-repeatable">Repeatable</label>
							<select id="new-repeatable" name="repeatable" class="input input--select">
								<option value="false">No</option>
								<option value="true">Yes</option>
							</select>
						</div>
						<div class="field" style="flex:0 0 110px;">
							<label class="label" for="new-epicboon">Epic Boon</label>
							<select id="new-epicboon" name="isEpicBoon" class="input input--select">
								<option value="false">No</option>
								<option value="true">Yes</option>
							</select>
						</div>
						<div class="field" style="flex:0 0 100px;">
							<label class="label" for="new-available">Available</label>
							<select id="new-available" name="isAvailable" class="input input--select">
								<option value="true">Yes</option>
								<option value="false">No</option>
							</select>
						</div>
					</div>
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:0 0 110px;">
							<label class="label" for="new-asi-amount">ASI grant</label>
							<select id="new-asi-amount" name="asiAmount" class="input input--select">
								<option value="">None</option>
								<option value="1">+1</option>
								<option value="2">+2</option>
							</select>
						</div>
						<div class="field" style="flex:1 1 180px;">
							<label class="label" for="new-asi-fixed">Fixed stat <span style="font-weight:400;opacity:0.65;">(empty = player picks)</span></label>
							<select id="new-asi-fixed" name="asiStatFixed" class="input input--select">
								<option value="">— Player picks —</option>
								{#each ['STRENGTH','DEXTERITY','CONSTITUTION','INTELLIGENCE','WISDOM','CHARISMA'] as st}
									<option value={st}>{st.charAt(0)+st.slice(1).toLowerCase()}</option>
								{/each}
							</select>
						</div>
						<div class="field" style="flex:2 1 220px;">
							<label class="label" for="new-asi-choices">Allowed choices <span style="font-weight:400;opacity:0.65;">(comma-sep, empty = any)</span></label>
							<input id="new-asi-choices" name="asiStatChoices" type="text" class="input" placeholder="STRENGTH,DEXTERITY" />
						</div>
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => showCreate = false}>Cancel</button>
					<button type="submit" class="btn btn-primary btn-sm">Create</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="card" style="padding:0;">
		{#if feats.length}
			{#each feats as feat}
				<!-- Row header -->
				<div
					onclick={() => toggle(feat.id)} onkeydown={(e) => e.key === "Enter" && toggle(feat.id)} role="button" tabindex="0"
					style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1rem; cursor:pointer; border-bottom:1px solid var(--border-muted); flex-wrap:wrap; {expanded === feat.id ? 'background:var(--bg-overlay);' : ''}"
				>
					<div style="flex:2 1 160px; min-width:0;">
						<div style="font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{feat.name}</div>
						{#if feat.snippet}<div style="font-size:0.8125rem; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{feat.snippet}</div>{/if}
					</div>
					<div style="flex:2 1 120px; min-width:0; display:flex; flex-wrap:wrap; gap:2px;">
						{#if feat.categories}
							{#each feat.categories.split(',') as cat}
								<span class="badge badge-muted" style="font-size:0.6875rem;">{cat.trim()}</span>
							{/each}
						{/if}
					</div>
					<div style="display:flex; align-items:center; gap:0.375rem; flex-shrink:0; flex-wrap:wrap;">
						{#if feat.isEpicBoon}<span class="badge badge-warning" style="font-size:0.75rem;">Epic</span>{/if}
						{#if feat.repeatable}<span class="badge badge-accent" style="font-size:0.75rem;">Rep.</span>{/if}
						{#if feat.asiAmount}<span class="badge badge-accent" style="font-size:0.75rem;">+{feat.asiAmount} {feat.asiStatFixed ? feat.asiStatFixed.slice(0,3) : 'stat'}</span>{/if}
						{#if feat.isAvailable}<span class="badge badge-success" style="font-size:0.75rem;">✓</span>{:else}<span class="badge badge-muted" style="font-size:0.75rem;">—</span>{/if}
					</div>
					<div onclick={(e) => e.stopPropagation()} role="presentation" style="flex-shrink:0;">
						<form method="post" action="?/delete" use:enhance={({ cancel }) => {
							if (!confirm(`Delete "${feat.name}"?`)) cancel();
							return async ({ update }) => { await update(); await invalidateAll(); };
						}} style="margin:0;">
							<input type="hidden" name="id" value={feat.id} />
							<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger);">✕</button>
						</form>
					</div>
				</div>

				<!-- Expanded panel -->
				{#if expanded === feat.id}
					<div style="padding:1rem; background:var(--bg-muted); border-bottom:1px solid var(--border-accent); word-break:break-word; overflow-wrap:anywhere;">
						{#if editing === feat.id}
							<form method="post" action="?/update" use:enhance={() => {
								return async ({ update }) => { await update(); await invalidateAll(); editing = null; };
							}}>
								<input type="hidden" name="id" value={feat.id} />
								<div class="fields">
									<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
										<div class="field" style="flex:2 1 200px;">
											<label class="label" for="ename-{feat.id}">Name</label>
											<input id="ename-{feat.id}" name="name" type="text" class="input" value={feat.name} required />
										</div>
										<div class="field" style="flex:3 1 300px;">
											<label class="label" for="esnippet-{feat.id}">Snippet</label>
											<input id="esnippet-{feat.id}" name="snippet" type="text" class="input" value={feat.snippet ?? ''} />
										</div>
									</div>
									<div class="field">
										<label class="label" for="edesc-{feat.id}">Description</label>
										<textarea id="edesc-{feat.id}" name="description" class="input" rows="4">{feat.description ?? ''}</textarea>
									</div>
									<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
										<div class="field" style="flex:2 1 180px;">
											<label class="label" for="ecat-{feat.id}">Categories</label>
											<input id="ecat-{feat.id}" name="categories" type="text" class="input" value={feat.categories ?? ''} />
										</div>
										<div class="field" style="flex:2 1 180px;">
											<label class="label" for="eprereqs-{feat.id}">Prerequisites</label>
											<input id="eprereqs-{feat.id}" name="prerequisites" type="text" class="input" value={feat.prerequisites ?? ''} />
										</div>
										<div class="field" style="flex:2 1 180px;">
											<label class="label" for="eurl-{feat.id}">Details URL</label>
											<input id="eurl-{feat.id}" name="detailsUrl" type="text" class="input" value={feat.detailsUrl ?? ''} />
										</div>
										<div class="field" style="flex:0 0 110px;">
											<label class="label" for="erep-{feat.id}">Repeatable</label>
											<select id="erep-{feat.id}" name="repeatable" class="input input--select">
												<option value="false" selected={!feat.repeatable}>No</option>
												<option value="true"  selected={feat.repeatable}>Yes</option>
											</select>
										</div>
										<div class="field" style="flex:0 0 110px;">
											<label class="label" for="eepic-{feat.id}">Epic Boon</label>
											<select id="eepic-{feat.id}" name="isEpicBoon" class="input input--select">
												<option value="false" selected={!feat.isEpicBoon}>No</option>
												<option value="true"  selected={feat.isEpicBoon}>Yes</option>
											</select>
										</div>
										<div class="field" style="flex:0 0 100px;">
											<label class="label" for="eavail-{feat.id}">Available</label>
											<select id="eavail-{feat.id}" name="isAvailable" class="input input--select">
												<option value="true"  selected={feat.isAvailable}>Yes</option>
												<option value="false" selected={!feat.isAvailable}>No</option>
											</select>
										</div>
									</div>
									<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
										<div class="field" style="flex:0 0 110px;">
											<label class="label" for="easi-amount-{feat.id}">ASI grant</label>
											<select id="easi-amount-{feat.id}" name="asiAmount" class="input input--select">
												<option value="" selected={!feat.asiAmount}>None</option>
												<option value="1" selected={feat.asiAmount === 1}>+1</option>
												<option value="2" selected={feat.asiAmount === 2}>+2</option>
											</select>
										</div>
										<div class="field" style="flex:1 1 180px;">
											<label class="label" for="easi-fixed-{feat.id}">Fixed stat <span style="font-weight:400;opacity:0.65;">(empty = player picks)</span></label>
											<select id="easi-fixed-{feat.id}" name="asiStatFixed" class="input input--select">
												<option value="" selected={!feat.asiStatFixed}>— Player picks —</option>
												{#each ['STRENGTH','DEXTERITY','CONSTITUTION','INTELLIGENCE','WISDOM','CHARISMA'] as st}
													<option value={st} selected={feat.asiStatFixed === st}>{st.charAt(0)+st.slice(1).toLowerCase()}</option>
												{/each}
											</select>
										</div>
										<div class="field" style="flex:2 1 220px;">
											<label class="label" for="easi-choices-{feat.id}">Allowed choices <span style="font-weight:400;opacity:0.65;">(comma-sep, empty = any)</span></label>
											<input id="easi-choices-{feat.id}" name="asiStatChoices" type="text" class="input" value={feat.asiStatChoices ?? ''} placeholder="STRENGTH,DEXTERITY" />
										</div>
									</div>
								</div>
								<div class="form-actions">
									<button type="button" class="btn btn-ghost btn-sm" onclick={() => editing = null}>Cancel</button>
									<button type="submit" class="btn btn-primary btn-sm">Save</button>
								</div>
							</form>
						{:else}
							<div style="display:grid; gap:0.75rem;">
								{#if feat.description}
									<div>
										<p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.25rem;">Description</p>
										<p style="margin:0; font-size:0.875rem; color:var(--text-secondary); line-height:1.6; white-space:pre-wrap;">{feat.description}</p>
									</div>
								{/if}
								<div style="display:flex; gap:1.5rem; flex-wrap:wrap;">
									{#if feat.prerequisites}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">Prerequisites</p><p style="margin:0; font-size:0.875rem;">{feat.prerequisites}</p></div>
									{/if}
									{#if feat.categories}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">Categories</p><p style="margin:0; font-size:0.875rem;">{feat.categories}</p></div>
									{/if}
									{#if feat.detailsUrl}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">Reference</p><a href={feat.detailsUrl} target="_blank" style="font-size:0.875rem;">↗ Link</a></div>
									{/if}
								</div>
								<div><button class="btn btn-ghost btn-sm" onclick={() => editing = feat.id}>Edit</button></div>
							</div>
						{/if}
					</div>
				{/if}
			{/each}
		{:else}
			<p class="table__empty">No feats yet. Create one above or import from XLSX.</p>
		{/if}
	</div>
</div>