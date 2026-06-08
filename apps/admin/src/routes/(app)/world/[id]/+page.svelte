<!-- apps/admin/src/routes/(app)/world/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let addingRegion  = $state(false);
	let placingMarker = $state<string | null>(null);

	const dangerColors: Record<string, string> = {
		Safe: 'badge-success', Low: 'badge-accent',
		Moderate: 'badge-warning', High: 'badge-danger', Extreme: 'badge-danger',
	};
	const DANGER_RATINGS = ['Safe', 'Low', 'Moderate', 'High', 'Extreme'];

	function onMapClick(e: MouseEvent) {
		if (!placingMarker) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width  * 100).toFixed(2);
		const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(2);
		const f = document.getElementById('marker-form-' + placingMarker) as HTMLFormElement;
		(f.querySelector('[name="mapX"]') as HTMLInputElement).value = x;
		(f.querySelector('[name="mapY"]') as HTMLInputElement).value = y;
		f.requestSubmit();
		placingMarker = null;
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/world" class="back-link">← Worlds</a>
			<h2 class="page__title">{data.world.name}</h2>
			<span class="badge {data.world.isActive ? 'badge-success' : 'badge-muted'}">{data.world.isActive ? 'Active' : 'Inactive'}</span>
		</div>
		<a href="/world/{data.world.id}/marketplace" class="btn btn-ghost btn-sm">🛒 Marketplace</a>
		<a href="/world/{data.world.id}/journal" class="btn btn-ghost btn-sm">📖 Journal</a>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if (form as any)?.worldSuccess}<div class="form-success">World updated.</div>{/if}
	{#if (form as any)?.regionSuccess}<div class="form-success">Region created.</div>{/if}

	<div class="sections">
		<!-- World details -->
		<div class="card">
			<h3 class="section-title">Details</h3>
			<form method="post" action="?/updateWorld" use:enhance={() => {
				return async ({ update }) => { await update(); await invalidateAll(); };
			}}>
				<div class="fields">
					<div class="field">
						<label class="label" for="wname">Name</label>
						<input id="wname" name="name" type="text" class="input" value={data.world.name} required />
					</div>
					<div class="field">
						<label class="label" for="wdesc">Description</label>
						<textarea id="wdesc" name="description" class="input" rows="2">{data.world.description ?? ''}</textarea>
					</div>
					<div class="field">
						<label class="label" for="wmap">Map image URL</label>
						<input id="wmap" name="mapImageUrl" type="url" class="input" value={data.world.mapImageUrl ?? ''} placeholder="https://..." />
					</div>
					<div class="field field--inline">
						<label class="label" for="wactive">Active</label>
						<select id="wactive" name="isActive" class="input input--select">
							<option value="true"  selected={data.world.isActive}>Yes</option>
							<option value="false" selected={!data.world.isActive}>No</option>
						</select>
					</div>
				</div>
				<div class="field">
					<label class="label" for="w-global">Global characters</label>
					<select id="w-global" name="acceptsGlobalCharacters" class="input input--select">
						<option value="true" selected={(data.world as any).acceptsGlobalCharacters !== false}>Accept global characters</option>
						<option value="false" selected={(data.world as any).acceptsGlobalCharacters === false}>World-specific characters only</option>
					</select>
					<p class="field-hint">When set to world-specific only, global characters cannot sign up for quests in this world.</p>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary btn-sm">Save</button>
				</div>
			</form>
		</div>

		<!-- Map with region markers -->
		<div class="card">
			<div class="page__header" style="margin-bottom:1rem;">
				<h3 class="section-title" style="margin:0;">Map</h3>
				{#if placingMarker}
					<div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap">
						<span class="badge badge-warning">Click map to place marker</span>
						<button class="btn btn-ghost btn-sm" onclick={() => placingMarker = null}>Cancel</button>
					</div>
				{/if}
			</div>

			{#if data.world.mapImageUrl}
				<!-- When placing a marker, wrap in a button for accessibility -->
				{#if placingMarker}
					<button type="button"
						style="position:relative; display:block; width:100%; padding:0; border:none; background:none; cursor:crosshair;"
						aria-label="Click to place region marker"
						onclick={onMapClick}>
						<img src={data.world.mapImageUrl} alt="World map" style="width:100%; display:block; border-radius:var(--radius-md);" />
						{#each data.world.regions as region}
							{#if region.mapX !== null && region.mapY !== null}
								<div style="position:absolute; left:{region.mapX}%; top:{region.mapY}%; transform:translate(-50%,-50%); pointer-events:none;">
									<div style="width:16px; height:16px; border-radius:50%; background:{region.color}; border:3px solid white;"></div>
								</div>
							{/if}
						{/each}
					</button>
				{:else}
					<div style="position:relative; display:inline-block; width:100%;">
						<img src={data.world.mapImageUrl} alt="World map" style="width:100%; display:block; border-radius:var(--radius-md);" />
						{#each data.world.regions as region}
							{#if region.mapX !== null && region.mapY !== null}
								<a href="/world/{data.world.id}/regions/{region.id}"
									style="position:absolute; left:{region.mapX}%; top:{region.mapY}%; transform:translate(-50%,-50%); z-index:10; text-decoration:none;"
									title={region.name}>
									<div style="width:16px; height:16px; border-radius:50%; background:{region.color}; border:3px solid white; box-shadow:0 0 0 2px {region.color}40;"></div>
									<span style="position:absolute; top:20px; left:50%; transform:translateX(-50%); white-space:nowrap; font-size:0.7rem; font-weight:600; color:white; text-shadow:0 1px 3px rgba(0,0,0,0.8); background:rgba(0,0,0,0.5); padding:1px 4px; border-radius:3px;">{region.name}</span>
								</a>
							{/if}
						{/each}
					</div>
				{/if}
				<p class="field-hint" style="margin-top:0.5rem;">Click a region's "Place marker" button then click on the map to position it.</p>
			{:else}
				<p class="table__muted">No map image. Add a map image URL in the Details section.</p>
			{/if}
		</div>
	</div>

	<!-- Regions -->
	<div class="card">
		<div class="page__header" style="margin-bottom:1rem;">
			<h3 class="section-title" style="margin:0;">Regions ({data.world.regions.length})</h3>
			<button class="btn btn-ghost btn-sm" onclick={() => addingRegion = !addingRegion}>
				{addingRegion ? 'Cancel' : '+ Add region'}
			</button>
		</div>

		{#if addingRegion}
			<form method="post" action="?/addRegion" use:enhance={() => {
				return async ({ update }) => { addingRegion = false; await update(); await invalidateAll(); };
			}} style="margin-bottom:1.5rem; padding:1rem; background:var(--bg-overlay); border-radius:var(--radius-md);">
				<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:0.75rem; margin-bottom:0.75rem;">
					<div class="field" style="margin:0;">
						<label class="label" for="rname">Name</label>
						<input id="rname" name="name" type="text" class="input" required />
					</div>
					<div class="field" style="margin:0;">
						<label class="label" for="rdanger">Danger</label>
						<select id="rdanger" name="dangerRating" class="input input--select">
							{#each DANGER_RATINGS as d}<option value={d}>{d}</option>{/each}
						</select>
					</div>
					<div class="field" style="margin:0;">
						<label class="label" for="rminlv">Min level</label>
						<input id="rminlv" name="minLevel" type="number" class="input" min="1" max="20" />
					</div>
					<div class="field" style="margin:0;">
						<label class="label" for="rmaxlv">Max level</label>
						<input id="rmaxlv" name="maxLevel" type="number" class="input" min="1" max="20" />
					</div>
					<div class="field" style="margin:0;">
						<label class="label" for="rcolor">Marker color</label>
						<input id="rcolor" name="color" type="color" class="input" value="#6366f1" style="height:38px; padding:2px;" />
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary btn-sm">Add region</button>
				</div>
			</form>
		{/if}

		<div class="table-wrap">
			<div class="table-wrap">
				<table class="table">
				<thead>
					<tr>
						<th>Region</th>
						<th>Danger</th>
						<th class="col-hide-mobile">Levels</th>
						<th class="col-hide-mobile">Locations</th>
						<th>Marker</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.world.regions as region}
						<tr>
							<td>
								<div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap">
									<div style="width:12px; height:12px; border-radius:50%; background:{region.color}; flex-shrink:0;"></div>
									<span class="table__name">{region.name}</span>
								</div>
							</td>
							<td><span class="badge {dangerColors[region.dangerRating] ?? 'badge-muted'}">{region.dangerRating}</span></td>
							<td class="table__muted col-hide-mobile">{region.minLevel && region.maxLevel ? `Lv ${region.minLevel}–${region.maxLevel}` : '—'}</td>
							<td class="table__muted col-hide-mobile">{region.locations.length}</td>
							<td>
								{#if data.world.mapImageUrl}
									<button class="btn btn-ghost btn-sm"
										onclick={() => placingMarker = placingMarker === region.id ? null : region.id}>
										{placingMarker === region.id ? 'Cancel' : region.mapX !== null ? 'Move' : 'Place'}
									</button>
									<form id="marker-form-{region.id}" method="post" action="?/updateMarker" style="display:none;"
										use:enhance={() => { return async ({ update }) => { await update(); await invalidateAll(); }; }}>
										<input type="hidden" name="regionId" value={region.id} />
										<input type="hidden" name="mapX" />
										<input type="hidden" name="mapY" />
									</form>
								{:else}
									<span class="table__muted" style="font-size:0.8125rem;">Upload map first</span>
								{/if}
							</td>
							<td class="table__action">
								<a href="/world/{data.world.id}/regions/{region.id}" class="btn btn-ghost btn-sm">Edit</a>
							</td>
						</tr>
					{:else}
						<tr><td colspan="6" class="table__empty">No regions yet.</td></tr>
					{/each}
				</tbody>
			</table>
</div>
		</div>

	<!-- DMs assigned to this world -->
	<div class="card">
		<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem; flex-wrap:wrap">
			<h3 class="section-title" style="margin:0;">World DMs ({(data as any).world.dms?.length ?? 0})</h3>
		</div>

		<!-- Assign new DM -->
		<form method="post" action="?/assignDM" use:enhance={() => {
			return async ({ update }) => { await update(); await invalidateAll(); };
		}}>
			<div style="display:flex; gap:0.5rem; align-items:flex-end; margin-bottom:1rem; flex-wrap:wrap;">
				<div class="field" style="margin:0; flex:1; min-width:180px;">
					<label class="label" for="dmSelect">Assign DM</label>
					<select id="dmSelect" name="dmProfileId" class="input input--select" required>
						<option value="">Select DM…</option>
						{#each ((data as any).allDMs ?? []) as dm}
							{#if !((data as any).world.dms ?? []).some((d: any) => d.dmProfileId === dm.id)}
								<option value={dm.id}>{dm.name ?? dm.user?.name ?? dm.id}</option>
							{/if}
						{/each}
					</select>
				</div>
				<div class="field" style="margin:0; flex:0 0 auto;">
					<label class="label" for="canManageNew">Can manage world</label>
					<select id="canManageNew" name="canManage" class="input input--select" style="width:120px;">
						<option value="false">Quest only</option>
						<option value="true">Full access</option>
					</select>
				</div>
				<button type="submit" class="btn btn-primary btn-sm" style="margin-bottom:0;">Assign</button>
			</div>
		</form>

		{#if (form as any)?.dmSuccess}<div class="form-success" style="margin-bottom:0.75rem;">DM assignment updated.</div>{/if}

		{#if ((data as any).world.dms ?? []).length}
			<div class="table-wrap">
				<table class="table">
				<thead>
					<tr>
						<th>DM</th>
						<th>Access</th>
						<th>Assigned</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each (data as any).world.dms as dm}
						<tr>
							<td>
								{#each ((data as any).allDMs ?? []).filter((d: any) => d.id === dm.dmProfileId) as profile}
									<strong>{profile.name ?? profile.user?.name ?? dm.dmProfileId}</strong>
								{/each}
							</td>
							<td>
								<form method="post" action="?/updateDMPermission" use:enhance={() => {
									return async ({ update }) => { await update(); await invalidateAll(); };
								}}>
									<input type="hidden" name="dmProfileId" value={dm.dmProfileId} />
									<div style="display:flex; gap:0.375rem; align-items:center; flex-wrap:wrap">
										<select name="canManage" class="input input--select" style="width:120px; padding:0.25rem 0.5rem; font-size:0.8125rem;">
											<option value="false" selected={!dm.canManage}>Quest only</option>
											<option value="true"  selected={dm.canManage}>Full access</option>
										</select>
										<button type="submit" class="btn btn-ghost btn-sm">Save</button>
									</div>
								</form>
							</td>
							<td class="table__muted">{new Date(dm.assignedAt).toLocaleDateString()}</td>
							<td class="table__action">
								<form method="post" action="?/removeDM" use:enhance={() => {
									return async ({ update }) => { await update(); await invalidateAll(); };
								}}>
									<input type="hidden" name="dmProfileId" value={dm.dmProfileId} />
									<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger);">Remove</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
</div>
		{:else}
			<p class="table__empty">No DMs assigned to this world yet.</p>
		{/if}
	</div>
	</div>
</div>