<!-- apps/admin/src/routes/(app)/game-systems/[id]/species/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const system  = $derived((data as any).system);
	const species = $derived((data as any).species ?? []);

	let expandedSpecies = $state<string | null>(null);
	let showNew = $state(false);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/game-systems" class="back-link">← Game Systems</a>
			<h2 class="page__title">{system.name} — Species</h2>
		</div>
		<div style="display:flex; gap:0.5rem;">
			<a href="/game-systems/{system.id}/classes"     class="btn btn-ghost btn-sm">Classes</a>
			<a href="/game-systems/{system.id}/backgrounds" class="btn btn-ghost btn-sm">Backgrounds</a>
			<button type="button" class="btn btn-primary btn-sm" onclick={() => showNew = !showNew}>+ New species</button>
		</div>
	</div>

	{#if showNew}
		<div class="card" style="margin-bottom:1rem;">
			<h3 class="section-title">New species</h3>
			<form method="post" action="?/create" use:enhance={() => {
				return async ({ update }) => { await update(); await invalidateAll(); showNew = false; };
			}}>
				<div class="fields">
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:2 1 200px;">
							<label class="label" for="sname">Name</label>
							<input id="sname" name="name" type="text" class="input" required />
						</div>
						<div class="field" style="flex:1 1 100px;">
							<label class="label" for="isSubrace">Is subrace</label>
							<select id="isSubrace" name="isSubrace" class="input input--select">
								<option value="false">No</option>
								<option value="true">Yes</option>
							</select>
						</div>
						<div class="field" style="flex:1 1 100px;">
							<label class="label" for="isLegacy">Is legacy</label>
							<select id="isLegacy" name="isLegacy" class="input input--select">
								<option value="false">No</option>
								<option value="true">Yes</option>
							</select>
						</div>
					</div>
					<div class="field">
						<label class="label" for="sdesc">Description <span class="optional">(optional)</span></label>
						<textarea id="sdesc" name="description" class="input" rows="2"></textarea>
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => showNew = false}>Cancel</button>
					<button type="submit" class="btn btn-primary btn-sm">Create</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="card">
		{#if species.length}
			<div style="display:flex; flex-direction:column; gap:0.5rem;">
				{#each species as s}
					<div style="border:1px solid var(--border-muted); border-radius:var(--radius-md); overflow:hidden;">
						<div style="display:flex; align-items:center; gap:0.75rem; padding:0.625rem 0.75rem; background:var(--bg-overlay);">
							<button type="button" style="flex:1; text-align:left; background:none; border:none; cursor:pointer; font-weight:600;"
								onclick={() => expandedSpecies = expandedSpecies === s.id ? null : s.id}>
								{s.name}
								{#if s.isSubrace}<span class="badge badge-muted">Subrace</span>{/if}
								{#if s.isLegacy}<span class="badge badge-warning">Legacy</span>{/if}
								<span class="badge badge-muted">{s.traits?.length ?? 0} traits</span>
							</button>
							<form method="post" action="?/deleteSpecies" use:enhance={({ cancel }) => {
								if (!confirm(`Delete "${s.name}"?`)) cancel();
								return async ({ update }) => { await update(); await invalidateAll(); };
							}} style="margin:0;">
								<input type="hidden" name="id" value={s.id} />
								<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger);">✕</button>
							</form>
						</div>

						{#if expandedSpecies === s.id}
							<div style="padding:0.75rem; border-top:1px solid var(--border-muted);">
								{#if s.traits?.length}
									<div style="display:flex; flex-direction:column; gap:0.25rem; margin-bottom:0.5rem;">
										{#each s.traits as t}
											<div style="display:flex; align-items:center; gap:0.5rem; padding:0.375rem 0.5rem; background:var(--bg-surface); border-radius:var(--radius-sm);">
												{#if t.requiredLevel}<span class="badge badge-muted">Lv {t.requiredLevel}</span>{/if}
												<span style="flex:1; font-size:0.8125rem; font-weight:500;">{t.name}</span>
												{#if t.description}<span style="font-size:0.75rem; color:var(--text-muted); flex:2;">{t.description}</span>{/if}
												<form method="post" action="?/deleteTrait" use:enhance={() => {
													return async ({ update }) => { await update(); await invalidateAll(); };
												}} style="margin:0;">
													<input type="hidden" name="id" value={t.id} />
													<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger); font-size:0.75rem;">✕</button>
												</form>
											</div>
										{/each}
									</div>
								{/if}
								<form method="post" action="?/addTrait" use:enhance={() => {
									return async ({ update }) => { await update(); await invalidateAll(); };
								}}>
									<input type="hidden" name="speciesId" value={s.id} />
									<div style="display:flex; gap:0.5rem; align-items:flex-end; flex-wrap:wrap;">
										<div class="field" style="flex:0 0 55px; margin:0;">
											<label class="label" for="tl-{s.id}">Level</label>
											<input id="tl-{s.id}" name="requiredLevel" type="number" class="input" min="1" max="20" placeholder="—" />
										</div>
										<div class="field" style="flex:1 1 140px; margin:0;">
											<label class="label" for="tn-{s.id}">Trait name</label>
											<input id="tn-{s.id}" name="name" type="text" class="input" required />
										</div>
										<div class="field" style="flex:2 1 180px; margin:0;">
											<label class="label" for="td-{s.id}">Description</label>
											<input id="td-{s.id}" name="description" type="text" class="input" />
										</div>
										<button type="submit" class="btn btn-ghost btn-sm">Add trait</button>
									</div>
								</form>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<p class="table__empty">No species yet.</p>
		{/if}
	</div>
</div>
