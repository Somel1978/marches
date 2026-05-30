<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/regions/[regionId]/locations/[locationId]/+page.svelte -->
<script lang="ts">
	import { renderMarkdown } from '@core/ui';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let editingWiki = $state(false);

	const canManage = $derived((data as any).canManage === true);

	const dangerColors: Record<string, string> = {
		Safe: 'badge-success', Low: 'badge-accent',
		Moderate: 'badge-warning', High: 'badge-danger', Extreme: 'badge-danger',
	};
	const DANGER_RATINGS = ['Safe', 'Low', 'Moderate', 'High', 'Extreme'];
	const LOCATION_TYPES = ['Town', 'City', 'Dungeon', 'Ruins', 'Landmark', 'Wilderness', 'Other'];

	function e_reload() { return async ({ update }: any) => { await update(); await invalidateAll(); }; }
</script>

<div class="page__header" style="margin-bottom:1rem;">
	<div>
		<a href="/dm/worlds/{(data.location.region as any)?.worldId}/regions/{data.location.regionId}" class="back-link">
			← {(data.location.region as any)?.name ?? 'Region'}
		</a>
		<h2 class="page__title">{data.location.name}</h2>
		<div class="page__title-row">
			<span class="badge badge-muted">{data.location.type}</span>
			<span class="badge {dangerColors[data.location.dangerRating] ?? 'badge-muted'}">{data.location.dangerRating}</span>
		</div>
	</div>
</div>

{#if (form as any)?.message}<div class="form-error">{(form as any).message}</div>{/if}
{#if form?.success}<div class="form-success">Location saved.</div>{/if}
{#if (form as any)?.wikiSuccess}<div class="form-success">Wiki saved.</div>{/if}

{#if canManage}
	<div class="sections">
		<div class="card" style="max-width:600px;">
			<h3 class="section-title">Details</h3>
			<form method="post" action="?/update" use:enhance={e_reload}>
				<div class="fields">
					<div class="field"><label class="label" for="lname">Name</label>
						<input id="lname" name="name" type="text" class="input" value={data.location.name} required /></div>
					<div class="field"><label class="label" for="ldesc">Description</label>
						<textarea id="ldesc" name="description" class="input" rows="3">{data.location.description ?? ''}</textarea></div>
					<div class="field"><label class="label" for="limage">Image URL</label>
						<input id="limage" name="imageUrl" type="url" class="input" value={data.location.imageUrl ?? ''} placeholder="https://..." /></div>
					<div style="display:flex; gap:1rem; flex-wrap:wrap;">
						<div class="field" style="flex:2; min-width:120px;"><label class="label" for="ltype">Type</label>
							<select id="ltype" name="type" class="input input--select">
								{#each LOCATION_TYPES as t}<option value={t} selected={t === data.location.type}>{t}</option>{/each}
							</select></div>
						<div class="field" style="flex:2; min-width:120px;"><label class="label" for="ldanger">Danger</label>
							<select id="ldanger" name="dangerRating" class="input input--select">
								{#each DANGER_RATINGS as d}<option value={d} selected={d === data.location.dangerRating}>{d}</option>{/each}
							</select></div>
						<div class="field" style="flex:1; min-width:80px;"><label class="label" for="lminlv">Min Lv</label>
							<input id="lminlv" name="minLevel" type="number" class="input" min="1" max="20" value={data.location.minLevel ?? ''} /></div>
						<div class="field" style="flex:1; min-width:80px;"><label class="label" for="lmaxlv">Max Lv</label>
							<input id="lmaxlv" name="maxLevel" type="number" class="input" min="1" max="20" value={data.location.maxLevel ?? ''} /></div>
						<div class="field" style="flex:1; min-width:80px;"><label class="label" for="lactive">Active</label>
							<select id="lactive" name="isActive" class="input input--select">
								<option value="true"  selected={data.location.isActive}>Yes</option>
								<option value="false" selected={!data.location.isActive}>No</option>
							</select></div>
					</div>
				</div>
				<div class="form-actions"><button type="submit" class="btn btn-primary btn-sm">Save</button></div>
			</form>
		</div>
	</div>
{/if}

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
				<div class="field"><label class="label" for="wtitle">Title</label>
					<input id="wtitle" name="title" type="text" class="input" value={data.wiki?.title ?? data.location.name} required /></div>
				<div class="field"><label class="label" for="wcontent">Content (Markdown)</label>
					<textarea id="wcontent" name="content" class="input" rows="10" style="font-family:monospace; font-size:0.875rem;">{data.wiki?.content ?? ''}</textarea></div>
			</div>
			<div class="form-actions"><button type="submit" class="btn btn-primary btn-sm">Save wiki</button></div>
		</form>
	{:else if data.wiki}
		<div class="markdown-body">{@html renderMarkdown(data.wiki.content)}</div>
		<p class="field-hint" style="margin-top:0.5rem;">{data.wiki.revisions.length} revision{data.wiki.revisions.length !== 1 ? 's' : ''}</p>
	{:else}
		<p class="table__empty">No wiki page yet.</p>
	{/if}
</div>
