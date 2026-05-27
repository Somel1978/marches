<!-- apps/admin/src/routes/(app)/game-systems/[id]/backgrounds/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const system      = $derived((data as any).system);
	const backgrounds = $derived((data as any).backgrounds ?? []);
	let showNew = $state(false);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/game-systems" class="back-link">← Game Systems</a>
			<h2 class="page__title">{system.name} — Backgrounds</h2>
		</div>
		<div style="display:flex; gap:0.5rem;">
			<a href="/game-systems/{system.id}/classes" class="btn btn-ghost btn-sm">Classes</a>
			<a href="/game-systems/{system.id}/species" class="btn btn-ghost btn-sm">Species</a>
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

	<div class="card">
		{#if backgrounds.length}
			<table class="table">
				<thead><tr><th>Name</th><th>Feature</th><th>Skills</th><th>Languages</th><th>Available</th><th></th></tr></thead>
				<tbody>
					{#each backgrounds as b}
						<tr>
							<td style="font-weight:600;">{b.name}</td>
							<td>{b.featureName ?? '—'}</td>
							<td class="table__muted">{b.skillProficiencies ?? '—'}</td>
							<td class="table__muted">{b.languages ?? '—'}</td>
							<td>{b.isAvailable ? '✓' : '—'}</td>
							<td>
								<form method="post" action="?/deleteBackground" use:enhance={({ cancel }) => {
									if (!confirm(`Delete "${b.name}"?`)) cancel();
									return async ({ update }) => { await update(); await invalidateAll(); };
								}} style="margin:0;">
									<input type="hidden" name="id" value={b.id} />
									<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger);">✕</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p class="table__empty">No backgrounds yet.</p>
		{/if}
	</div>
</div>
