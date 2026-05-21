<!-- apps/admin/src/routes/(app)/world/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let adding = $state(false);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">Worlds</h2>
			<p class="page__subtitle">{data.worlds.length} world{data.worlds.length !== 1 ? 's' : ''}</p>
		</div>
		<button class="btn btn-primary btn-sm" onclick={() => adding = !adding}>
			{adding ? 'Cancel' : '+ New world'}
		</button>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if form?.success}<div class="form-success">World created.</div>{/if}

	{#if adding}
		<div class="card" style="max-width:480px; margin-bottom:1.5rem;">
			<form method="post" action="?/create" use:enhance={() => {
				return async ({ update }) => { adding = false; await update(); await invalidateAll(); };
			}}>
				<div class="fields">
					<div class="field">
						<label class="label" for="wname">Name</label>
						<input id="wname" name="name" type="text" class="input" placeholder="e.g. The Realm of Aethoria" required />
					</div>
					<div class="field">
						<label class="label" for="wdesc">Description <span class="optional">(optional)</span></label>
						<textarea id="wdesc" name="description" class="input" rows="2"></textarea>
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary btn-sm">Create world</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="sections">
		{#each data.worlds as world}
			<div class="card">
				<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;">
					<div>
						<h3 style="margin:0 0 0.25rem; font-size:1rem; font-weight:700;">{world.name}</h3>
						<p style="font-size:0.875rem; color:var(--text-muted); margin:0;">{world.regions.length} region{world.regions.length !== 1 ? 's' : ''}</p>
					</div>
					<a href="/world/{world.id}" class="btn btn-ghost btn-sm">Manage</a>
				</div>
			</div>
		{:else}
			<div class="card" style="text-align:center; padding:2rem;">
				<p class="table__empty">No worlds yet. Create your first world!</p>
			</div>
		{/each}
	</div>
</div>