<!-- apps/admin/src/routes/(app)/game-systems/[id]/progression/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: any } = $props();
	const system     = $derived((data as any).system);
	const thresholds = $derived((system?.progressionThresholds ?? []).slice().sort((a: any, b: any) => a.xpRequired - b.xpRequired));

	let editing = $state<string | null>(null);
</script>

<div class="page">
	{#if form?.message}<div class="form-error" style="margin-bottom:1rem;">{form.message}</div>{/if}
	<div class="page__header">
		<div>
			<a href="/game-systems" class="back-link">← Game Systems</a>
			<h2 class="page__title">{system.name} — Progression</h2>
		</div>
		<div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
			<a href="/game-systems/{system.id}/progression/data/export" class="btn btn-ghost btn-sm" download>↓ Export</a>
			<a href="/game-systems/{system.id}/progression/data/import" class="btn btn-ghost btn-sm">↑ Import</a>
		</div>
	</div>

	<!-- Warning if no thresholds configured -->
	{#if !thresholds.length}
		<div style="padding:0.75rem 1rem;background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.4);border-radius:var(--radius-md);margin-bottom:1rem;display:flex;gap:0.75rem;align-items:flex-start;">
			<span style="font-size:1.25rem;flex-shrink:0;">⚠️</span>
			<div>
				<p style="font-weight:700;margin:0 0 0.25rem;color:#ca8a04;">No progression thresholds configured</p>
				<p style="font-size:0.8125rem;color:var(--text-secondary);margin:0;">Characters cannot gain XP, level up, or be created above level 1 until at least one threshold is added. Add thresholds below before activating this game system.</p>
			</div>
		</div>
	{/if}

	<!-- Existing thresholds -->
	<div class="card" style="margin-bottom:1rem;">
		<h3 class="section-title">Thresholds ({thresholds.length})</h3>
		{#if thresholds.length}
			<div class="table-wrap">
				<table class="table">
				<thead><tr><th>Label</th><th>XP Required</th><th>Description</th><th></th></tr></thead>
				<tbody>
					{#each thresholds as t}
						{#if editing === t.id}
							<tr>
								<td colspan="4">
									<form method="post" action="?/update"
										use:enhance={() => async ({ update }) => { await update(); await invalidateAll(); editing = null; }}>
										<input type="hidden" name="id" value={t.id} />
										<div style="display:flex; gap:0.5rem; align-items:flex-end; flex-wrap:wrap;">
											<div class="field" style="flex:1 1 120px; margin:0;">
												<label class="label" for="edit-label-{t.id}">Label</label>
												<input id="edit-label-{t.id}" name="label" type="text" class="input" value={t.label} required />
											</div>
											<div class="field" style="flex:0 0 120px; margin:0;">
												<label class="label" for="edit-xp-{t.id}">XP Required</label>
												<input id="edit-xp-{t.id}" name="xpRequired" type="number" class="input" value={t.xpRequired} required />
											</div>
											<div class="field" style="flex:2 1 200px; margin:0;">
												<label class="label" for="edit-desc-{t.id}">Description</label>
												<input id="edit-desc-{t.id}" name="description" type="text" class="input" value={t.description ?? ''} />
											</div>
											<button type="submit" class="btn btn-primary btn-sm">Save</button>
											<button type="button" class="btn btn-ghost btn-sm" onclick={() => editing = null}>Cancel</button>
										</div>
									</form>
								</td>
							</tr>
						{:else}
							<tr>
								<td style="font-weight:600;">{t.label}</td>
								<td>{t.xpRequired.toLocaleString()} XP</td>
								<td class="table__muted">{t.description ?? '—'}</td>
								<td style="display:flex; gap:0.5rem; flex-wrap:wrap">
									<button type="button" class="btn btn-ghost btn-sm" onclick={() => editing = t.id}>Edit</button>
									<form method="post" action="?/delete"
										use:enhance={({ cancel }) => {
											if (!confirm(`Delete "${t.label}"?`)) cancel();
											return async ({ update }) => { await update(); await invalidateAll(); };
										}} style="margin:0;">
										<input type="hidden" name="id" value={t.id} />
										<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger);">✕</button>
									</form>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
</div>
		{:else}
			<p class="table__empty">No thresholds yet.</p>
		{/if}
	</div>

	<!-- Add new threshold -->
	<div class="card">
		<h3 class="section-title">Add threshold</h3>
		<form method="post" action="?/create"
			use:enhance={() => async ({ update }) => { await update(); await invalidateAll(); }}>
			<div style="display:flex; gap:0.5rem; align-items:flex-end; flex-wrap:wrap;">
				<div class="field" style="flex:1 1 120px; margin:0;">
					<label class="label" for="label">Label</label>
					<input id="label" name="label" type="text" class="input" placeholder="e.g. Level 5" required />
				</div>
				<div class="field" style="flex:0 0 120px; margin:0;">
					<label class="label" for="xpRequired">XP Required</label>
					<input id="xpRequired" name="xpRequired" type="number" class="input" min="0" required />
				</div>
				<div class="field" style="flex:2 1 200px; margin:0;">
					<label class="label" for="desc">Description <span class="optional">(optional)</span></label>
					<input id="desc" name="description" type="text" class="input" />
				</div>
				<button type="submit" class="btn btn-primary btn-sm">Add</button>
			</div>
		</form>
	</div>
</div>