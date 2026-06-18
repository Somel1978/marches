<!-- apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/classes/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const system  = $derived((data as any).system);
	const classes = $derived((data as any).classes ?? []);

	let showNew = $state(false);
	let search  = $state('');
	const filtered = $derived(search ? classes.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase())) : classes);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/game-systems" class="back-link">← Game Systems</a>
			<h2 class="page__title">{system.name} — Classes</h2>
		</div>
		<div style="display:flex; gap:0.5rem; flex-wrap:wrap">
			<a href="/game-systems/{system.id}/dnd5e/species"     class="btn btn-ghost btn-sm">Species</a>
			<a href="/game-systems/{system.id}/dnd5e/backgrounds" class="btn btn-ghost btn-sm">Backgrounds</a>
			<a href="/game-systems/{system.id}/data/import/dnd5e"      class="btn btn-ghost btn-sm">Import</a>
			<button type="button" class="btn btn-primary btn-sm" onclick={() => showNew = !showNew}>+ New class</button>
			<input type="text" class="input" style="max-width:220px;" placeholder="Search classes…" bind:value={search} />
		</div>
	</div>

	{#if (form as any)?.message}<div class="form-error" style="margin-bottom:1rem;">{(form as any).message}</div>{/if}

	{#if showNew}
		<div class="card" style="margin-bottom:1rem;">
			<h3 class="section-title">New class</h3>
			<form method="post" action="?/create" use:enhance={() => {
				return async ({ update }) => { await update(); await invalidateAll(); showNew = false; };
			}}>
				<div class="fields">
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:2 1 200px;">
							<label class="label" for="name">Name</label>
							<input id="name" name="name" type="text" class="input" required />
						</div>
						<div class="field" style="flex:1 1 80px;">
							<label class="label" for="hitDice">Hit dice</label>
							<input id="hitDice" name="hitDice" type="number" class="input" min="4" max="12" step="2" placeholder="d8" />
						</div>
						<div class="field" style="flex:1 1 120px;">
							<label class="label" for="canCastSpells">Can cast spells</label>
							<select id="canCastSpells" name="canCastSpells" class="input input--select">
								<option value="false">No</option>
								<option value="true">Yes</option>
							</select>
						</div>
					</div>
					<div class="field">
						<label class="label" for="primaryAbilities">Primary abilities <span class="optional">(optional)</span></label>
						<input id="primaryAbilities" name="primaryAbilities" type="text" class="input" placeholder="Strength, Constitution" />
					</div>
					<div class="field">
						<label class="label" for="description">Description <span class="optional">(optional)</span></label>
						<textarea id="description" name="description" class="input" rows="3"></textarea>
					</div>
					<div class="field">
						<label class="label" for="equipmentDescription">Equipment description <span class="optional">(optional)</span></label>
						<textarea id="equipmentDescription" name="equipmentDescription" class="input" rows="3"></textarea>
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => showNew = false}>Cancel</button>
					<button type="submit" class="btn btn-primary btn-sm">Create class</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="card">
		{#if classes.length}
			<div class="table-wrap">
				<table class="table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Hit dice</th>
						<th>Spells</th>
						<th>Subclasses</th>
						<th>Features</th>
						<th>Available</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as c}
						<tr>
							<td style="font-weight:600;">{c.name}</td>
							<td>{c.hitDice ? `d${c.hitDice}` : '—'}</td>
							<td>{c.canCastSpells ? '✓' : '—'}</td>
							<td>{c.subclasses?.length ?? 0}</td>
							<td>{c.features?.length ?? 0}</td>
							<td>{c.isAvailable ? '✓' : '—'}</td>
							<td><a href="/game-systems/{system.id}/dnd5e/classes/{c.id}" class="btn btn-ghost btn-sm">Manage</a></td>
						</tr>
					{/each}
				</tbody>
			</table>
</div>
		{:else}
			<p class="table__empty">No classes yet. Create the first one above.</p>
		{/if}
	</div>
</div>