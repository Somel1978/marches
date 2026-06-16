<!-- apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/backgrounds/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { ConfirmModal } from '@core/ui';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const system      = $derived((data as any).system);
	const backgrounds = $derived((data as any).backgrounds ?? []);
	let showNew  = $state(false);
	let expanded = $state<string | null>(null);
	let editing  = $state<string | null>(null);

	function toggle(id: string) {
		expanded = expanded === id ? null : id;
		if (editing && editing !== id) editing = null;
	}

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
			<a href="/game-systems" class="back-link">← Game Systems</a>
			<h2 class="page__title">{system.name} — Backgrounds</h2>
		</div>
		<div style="display:flex; gap:0.5rem; flex-wrap:wrap">
			<a href="/game-systems/{system.id}/dnd5e/classes" class="btn btn-ghost btn-sm">Classes</a>
			<a href="/game-systems/{system.id}/dnd5e/species" class="btn btn-ghost btn-sm">Species</a>
			<button type="button" class="btn btn-primary btn-sm" onclick={() => showNew = !showNew}>+ New background</button>
		</div>
	</div>

	{#if showNew}
		<div class="card" style="margin-bottom:1rem;">
			<h3 class="section-title">New background</h3>
			<form method="post" action="?/create" use:enhance={() => {
				return async ({ update }) => { await update(); await invalidateAll(); showNew = false; };
			}}>
				<div class="fields">
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:2 1 200px;">
							<label class="label" for="bname">Name</label>
							<input id="bname" name="name" type="text" class="input" required />
						</div>
						<div class="field" style="flex:2 1 200px;">
							<label class="label" for="bfeat">Feature name <span class="optional">(optional)</span></label>
							<input id="bfeat" name="featureName" type="text" class="input" placeholder="e.g. Researcher" />
						<div class="field">
							<label class="label" for="bgrantsfeat">Grants Feat Category</label>
							<input id="bgrantsfeat" name="grantsFeatCategory" type="text" class="input" placeholder="e.g. Origin" />
						</div>
						<div class="field">
							<label class="label" for="bgrantsfeatid">Grants Specific Feat</label>
							<select id="bgrantsfeatid" name="grantsFeatId" class="input input--select">
								<option value="">— None —</option>
								{#each (data.feats ?? []) as f}
									<option value={f.id}>{f.name}</option>
								{/each}
							</select>
						</div>
						</div>
					</div>
					<div class="field">
						<label class="label" for="bshort">Short description</label>
						<textarea id="bshort" name="shortDescription" class="input" rows="2"></textarea>
					</div>
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:1 1 180px;">
							<label class="label" for="bskill">Skill proficiencies</label>
							<input id="bskill" name="skillProficiencies" type="text" class="input" placeholder="Arcana, History" />
						</div>
						<div class="field" style="flex:1 1 180px;">
							<label class="label" for="btool">Tool proficiencies</label>
							<input id="btool" name="toolProficiencies" type="text" class="input" />
						</div>
						<div class="field" style="flex:1 1 180px;">
							<label class="label" for="blang">Languages</label>
							<input id="blang" name="languages" type="text" class="input" placeholder="Any two" />
						</div>
						<div class="field" style="flex:1 1 180px;">
							<label class="label" for="burl">URL <span class="optional">(optional)</span></label>
							<input id="burl" name="url" type="text" class="input" />
						</div>
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => showNew = false}>Cancel</button>
					<button type="submit" class="btn btn-primary btn-sm">Create</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="card" style="padding:0;">
		{#if backgrounds.length}
			{#each backgrounds as b}
				<!-- Row header — always visible -->
				<div
					onclick={() => toggle(b.id)} onkeydown={(e) => e.key === "Enter" && toggle(b.id)} role="button" tabindex="0"
					style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1rem; cursor:pointer; border-bottom:1px solid var(--border-muted); flex-wrap:wrap; {expanded === b.id ? 'background:var(--bg-overlay);' : ''}"
				>
					<div style="flex:2 1 140px; min-width:0;">
						<div style="font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{b.name}</div>
						{#if b.featureName}<div style="font-size:0.8125rem; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{b.featureName}</div>{/if}
					</div>
					<div style="flex:2 1 120px; min-width:0; font-size:0.8125rem; color:var(--text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{b.skillProficiencies ?? '—'}</div>
					<div style="flex:1 1 80px; min-width:0; font-size:0.8125rem; color:var(--text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{b.languages ?? '—'}</div>
					<div style="display:flex; align-items:center; gap:0.5rem; flex-shrink:0;" onclick={(e) => e.stopPropagation()} role="presentation">
						{#if b.isAvailable}<span class="badge badge-success" style="font-size:0.75rem;">✓</span>{:else}<span class="badge badge-muted" style="font-size:0.75rem;">—</span>{/if}
						<form method="post" action="?/deleteBackground" use:enhance={({ cancel }) => {
							askConfirm('Confirm', `Delete "${b.name}"?`, () => { cancel(); }); return;
							return async ({ update }) => { await update(); await invalidateAll(); };
						}} style="margin:0;">
							<input type="hidden" name="id" value={b.id} />
							<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger);">✕</button>
						</form>
					</div>
				</div>

				<!-- Expanded panel -->
				{#if expanded === b.id}
					<div style="padding:1rem; background:var(--bg-muted); border-bottom:1px solid var(--border-accent); word-break:break-word; overflow-wrap:anywhere;">
						{#if editing === b.id}
							<form method="post" action="?/updateBackground" use:enhance={() => {
								return async ({ update }) => { await update(); await invalidateAll(); editing = null; };
							}}>
								<input type="hidden" name="id" value={b.id} />
								<div class="fields">
									<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
										<div class="field" style="flex:2 1 180px;">
											<label class="label" for="ename-{b.id}">Name</label>
											<input id="ename-{b.id}" name="name" type="text" class="input" value={b.name} required />
										</div>
										<div class="field" style="flex:2 1 180px;">
											<label class="label" for="efeat-{b.id}">Feature name</label>
											<input id="efeat-{b.id}" name="featureName" type="text" class="input" value={b.featureName ?? ''} />
											<div class="field">
												<label class="label" for="egrantsfeat-{b.id}">Grants Feat Category</label>
												<input id="egrantsfeat-{b.id}" name="grantsFeatCategory" type="text" class="input" value={b.grantsFeatCategory ?? ''} placeholder="e.g. Origin" />
											</div>
											<div class="field">
												<label class="label" for="egrantsfeatid-{b.id}">Grants Specific Feat</label>
												<select id="egrantsfeatid-{b.id}" name="grantsFeatId" class="input input--select">
													<option value="">— None —</option>
													{#each (data.feats ?? []) as f}
														<option value={f.id} selected={b.grantsFeatId === f.id}>{f.name}</option>
													{/each}
												</select>
											</div>
										</div>
									</div>
									<div class="field">
										<label class="label" for="eshort-{b.id}">Short description</label>
										<textarea id="eshort-{b.id}" name="shortDescription" class="input" rows="3">{b.shortDescription ?? ''}</textarea>
									</div>
									<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
										<div class="field" style="flex:1 1 150px;">
											<label class="label" for="eskill-{b.id}">Skill proficiencies</label>
											<input id="eskill-{b.id}" name="skillProficiencies" type="text" class="input" value={b.skillProficiencies ?? ''} />
										</div>
										<div class="field" style="flex:1 1 150px;">
											<label class="label" for="etool-{b.id}">Tool proficiencies</label>
											<input id="etool-{b.id}" name="toolProficiencies" type="text" class="input" value={b.toolProficiencies ?? ''} />
										</div>
										<div class="field" style="flex:1 1 150px;">
											<label class="label" for="elang-{b.id}">Languages</label>
											<input id="elang-{b.id}" name="languages" type="text" class="input" value={b.languages ?? ''} />
										</div>
										<div class="field" style="flex:1 1 150px;">
											<label class="label" for="eurl-{b.id}">URL</label>
											<input id="eurl-{b.id}" name="url" type="text" class="input" value={b.url ?? ''} />
										</div>
										<div class="field" style="flex:0 0 100px;">
											<label class="label" for="eavail-{b.id}">Available</label>
											<select id="eavail-{b.id}" name="isAvailable" class="input input--select">
												<option value="true"  selected={b.isAvailable}>Yes</option>
												<option value="false" selected={!b.isAvailable}>No</option>
											</select>
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
								{#if b.shortDescription}
									<div>
										<p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.25rem;">Description</p>
										<p style="margin:0; font-size:0.875rem; color:var(--text-secondary); line-height:1.6;">{b.shortDescription}</p>
									</div>
								{/if}
								<div style="display:flex; gap:1.5rem; flex-wrap:wrap;">
									{#if b.skillProficiencies}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">Skills</p><p style="margin:0; font-size:0.875rem;">{b.skillProficiencies}</p></div>
									{/if}
									{#if b.toolProficiencies}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">Tools</p><p style="margin:0; font-size:0.875rem;">{b.toolProficiencies}</p></div>
									{/if}
									{#if b.languages}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">Languages</p><p style="margin:0; font-size:0.875rem;">{b.languages}</p></div>
									{/if}
									{#if b.url}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">URL</p><a href={b.url} target="_blank" style="font-size:0.875rem;">↗ Link</a></div>
									{/if}
								</div>
								<div><button class="btn btn-ghost btn-sm" onclick={() => editing = b.id}>Edit</button></div>
							</div>
						{/if}
					</div>
				{/if}
			{/each}
		{:else}
			<p class="table__empty">No backgrounds yet.</p>
		{/if}
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