<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/regions/[regionId]/+page.svelte -->
<script lang="ts">
	import { renderMarkdown } from '@core/ui';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let addingLocation = $state(false);
	let editingWiki    = $state(false);

	const canManage = $derived((data as any).canManage === true);

	const dangerColors: Record<string, string> = {
		Safe: 'badge-success', Low: 'badge-accent',
		Moderate: 'badge-warning', High: 'badge-danger', Extreme: 'badge-danger',
	};
	const DANGER_RATINGS = ['Safe', 'Low', 'Moderate', 'High', 'Extreme'];
	const LOCATION_TYPES = ['Town', 'City', 'Dungeon', 'Ruins', 'Landmark', 'Wilderness', 'Other'];

	function e_reload() {
		return async ({ update }: any) => { await update(); await invalidateAll(); };
	}
</script>

<div class="page__header" style="margin-bottom:1rem;">
	<div>
		<a href="/dm/worlds/{data.region.worldId}/edit" class="back-link">← {(data.region as any).world?.name ?? 'World'}</a>
		<h2 class="page__title">{data.region.name}</h2>
		<div class="page__title-row">
			<span class="badge {dangerColors[data.region.dangerRating] ?? 'badge-muted'}">{data.region.dangerRating}</span>
			{#if data.region.minLevel && data.region.maxLevel}
				<span class="badge badge-muted">Lv {data.region.minLevel}–{data.region.maxLevel}</span>
			{/if}
			<span class="badge {data.region.isActive ? 'badge-success' : 'badge-muted'}">{data.region.isActive ? 'Active' : 'Inactive'}</span>
		</div>
	</div>
</div>

{#if (form as any)?.message}<div class="form-error">{(form as any).message}</div>{/if}
{#if (form as any)?.regionSuccess}<div class="form-success">Region saved.</div>{/if}
{#if (form as any)?.wikiSuccess}<div class="form-success">Wiki saved.</div>{/if}
{#if (form as any)?.locationSuccess}<div class="form-success">Location added.</div>{/if}

<div class="sections">
	<!-- Region details -->
	{#if canManage}
		<div class="card">
			<h3 class="section-title">Details</h3>
			<form method="post" action="?/updateRegion" use:enhance={e_reload}>
				<div class="fields">
					<div class="field">
						<label class="label" for="rname">Name</label>
						<input id="rname" name="name" type="text" class="input" value={data.region.name} required />
					</div>
					<div class="field">
						<label class="label" for="rdesc">Description</label>
						<textarea id="rdesc" name="description" class="input" rows="3">{data.region.description ?? ''}</textarea>
					</div>
					<div class="field">
						<label class="label" for="rimage">Image URL <span class="optional">(optional)</span></label>
						<input id="rimage" name="imageUrl" type="url" class="input" value={data.region.imageUrl ?? ''} placeholder="https://..." />
					</div>
					<div style="display:flex; gap:1rem; flex-wrap:wrap;">
						<div class="field" style="flex:1; min-width:120px;">
							<label class="label" for="rdanger">Danger rating</label>
							<select id="rdanger" name="dangerRating" class="input input--select">
								{#each DANGER_RATINGS as d}<option value={d} selected={d === data.region.dangerRating}>{d}</option>{/each}
							</select>
						</div>
						<div class="field" style="flex:1; min-width:80px;">
							<label class="label" for="rminlv">Min level</label>
							<input id="rminlv" name="minLevel" type="number" class="input" min="1" max="20" value={data.region.minLevel ?? ''} />
						</div>
						<div class="field" style="flex:1; min-width:80px;">
							<label class="label" for="rmaxlv">Max level</label>
							<input id="rmaxlv" name="maxLevel" type="number" class="input" min="1" max="20" value={data.region.maxLevel ?? ''} />
						</div>
						<div class="field" style="flex:1; min-width:80px;">
							<label class="label" for="rcolor">Color</label>
							<input id="rcolor" name="color" type="color" class="input" value={data.region.color} style="height:38px; padding:2px;" />
						</div>
						<div class="field" style="flex:1; min-width:80px;">
							<label class="label" for="ractive">Active</label>
							<select id="ractive" name="isActive" class="input input--select">
								<option value="true"  selected={data.region.isActive}>Yes</option>
								<option value="false" selected={!data.region.isActive}>No</option>
							</select>
						</div>
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary btn-sm">Save region</button>
				</div>
			</form>
		</div>
	{/if}
</div>

<!-- Wiki -->
<div class="card">
	<div class="page__header" style="margin-bottom:1rem;">
		<h3 class="section-title" style="margin:0;">Wiki</h3>
		{#if canManage}
			<button class="btn btn-ghost btn-sm" onclick={() => editingWiki = !editingWiki}>
				{editingWiki ? 'Cancel' : data.wiki ? 'Edit' : 'Create wiki page'}
			</button>
		{/if}
	</div>
	{#if editingWiki && canManage}
		<form method="post" action="?/saveWiki" use:enhance={() => {
			return async ({ update }) => { editingWiki = false; await update(); await invalidateAll(); };
		}}>
			<div class="fields">
				<div class="field">
					<label class="label" for="wtitle">Title</label>
					<input id="wtitle" name="title" type="text" class="input" value={data.wiki?.title ?? data.region.name} required />
				</div>
				<div class="field">
					<label class="label" for="wcontent">Content (Markdown)</label>
					<textarea id="wcontent" name="content" class="input" rows="12" style="font-family:monospace; font-size:0.875rem;">{data.wiki?.content ?? ''}</textarea>
				</div>
			</div>
			<div class="form-actions">
				<button type="submit" class="btn btn-primary btn-sm">Save wiki</button>
			</div>
		</form>
	{:else if data.wiki}
		<div class="markdown-body">{@html renderMarkdown(data.wiki.content)}</div>
		<p class="field-hint" style="margin-top:0.5rem;">{data.wiki.revisions.length} revision{data.wiki.revisions.length !== 1 ? 's' : ''}</p>
	{:else}
		<p class="table__empty">No wiki page yet.</p>
	{/if}
</div>

<!-- Locations -->
<div class="card">
	<div class="page__header" style="margin-bottom:1rem;">
		<h3 class="section-title" style="margin:0;">Locations ({data.region.locations.length})</h3>
		{#if canManage}
			<button class="btn btn-ghost btn-sm" onclick={() => addingLocation = !addingLocation}>
				{addingLocation ? 'Cancel' : '+ Add location'}
			</button>
		{/if}
	</div>

	{#if addingLocation && canManage}
		<form method="post" action="?/addLocation" use:enhance={() => {
			return async ({ update }) => { addingLocation = false; await update(); await invalidateAll(); };
		}} style="margin-bottom:1rem; padding:1rem; background:var(--bg-overlay); border-radius:var(--radius-md);">
			<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:0.75rem; margin-bottom:0.75rem;">
				<div class="field" style="margin:0; grid-column:1/-1;">
					<label class="label" for="lname">Name</label>
					<input id="lname" name="name" type="text" class="input" required />
				</div>
				<div class="field" style="margin:0;">
					<label class="label" for="ltype">Type</label>
					<select id="ltype" name="type" class="input input--select">
						{#each LOCATION_TYPES as t}<option value={t}>{t}</option>{/each}
					</select>
				</div>
				<div class="field" style="margin:0;">
					<label class="label" for="ldanger">Danger</label>
					<select id="ldanger" name="dangerRating" class="input input--select">
						{#each DANGER_RATINGS as d}<option value={d}>{d}</option>{/each}
					</select>
				</div>
				<div class="field" style="margin:0;">
					<label class="label" for="lminlv">Min level</label>
					<input id="lminlv" name="minLevel" type="number" class="input" min="1" max="20" />
				</div>
				<div class="field" style="margin:0;">
					<label class="label" for="lmaxlv">Max level</label>
					<input id="lmaxlv" name="maxLevel" type="number" class="input" min="1" max="20" />
				</div>
			</div>
			<div class="form-actions">
				<button type="submit" class="btn btn-primary btn-sm">Add location</button>
			</div>
		</form>
	{/if}

	{#if data.region.locations.length}
		<table class="table">
			<thead><tr><th>Name</th><th>Type</th><th>Danger</th><th class="col-hide-mobile">Levels</th><th></th></tr></thead>
			<tbody>
				{#each data.region.locations as loc}
					<tr>
						<td class="table__name">{loc.name}</td>
						<td><span class="badge badge-muted">{loc.type}</span></td>
						<td><span class="badge {dangerColors[loc.dangerRating] ?? 'badge-muted'}">{loc.dangerRating}</span></td>
						<td class="table__muted col-hide-mobile">{loc.minLevel && loc.maxLevel ? `Lv ${loc.minLevel}–${loc.maxLevel}` : '—'}</td>
						<td class="table__action">
							<a href="/dm/worlds/{data.region.worldId}/regions/{data.region.id}/locations/{loc.id}" class="btn btn-ghost btn-sm">
								{canManage ? 'Edit' : 'View'}
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<p class="table__empty">No locations yet.</p>
	{/if}
</div>
