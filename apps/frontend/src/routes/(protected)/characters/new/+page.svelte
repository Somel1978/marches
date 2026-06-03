<!-- apps/frontend/src/routes/(protected)/characters/new/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import { Dnd5eCharacterCreation } from '@core/ui';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const systems    = $derived((data as any).systems   ?? []);
	const systemData = $derived((data as any).systemData);
	const gameSystem = $derived((data as any).gameSystem);

	const isDnd5e = $derived(gameSystem?.slug === 'dnd5e' || systems.length === 1);
</script>

<div class="page">
	<div class="page__header">
		<h2 class="page__title">New character</h2>
	</div>

	{#if (form as any)?.message}
		<div class="form-error" style="margin-bottom:1rem;">{(form as any).message}</div>
	{/if}

	<form method="post" action="?/create" use:enhance>
		<div class="sections">

			<!-- System -->
			<div class="card">
				<h3 class="section-title">Game system</h3>
				<div class="field">
					<label class="label" for="gameSystemId">System</label>
					<select id="gameSystemId" name="gameSystemId" class="input input--select" required>
						{#each systems as s}
							<option value={s.id}>{s.name}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Identity -->
			<div class="card">
				<h3 class="section-title">Identity</h3>
				<div class="fields">
					<div class="field">
						<label class="label" for="name">Name <span class="required">*</span></label>
						<input id="name" name="name" type="text" class="input" required
							value={(form as any)?.name ?? ''} />
					</div>

					<!-- dnd5e: species, background, classes -->
					{#if isDnd5e}
						<Dnd5eCharacterCreation {systemData} />
					{:else}
						<div class="form-hint">Character creation for {gameSystem?.name ?? 'this system'} is coming soon.</div>
					{/if}
				</div>
			</div>

			<!-- Backstory -->
			<div class="card">
				<h3 class="section-title">Backstory <span class="optional">(optional)</span></h3>
				<div class="field">
					<label class="label" for="description">Description</label>
					<textarea id="description" name="description" class="input" rows="5"
						placeholder="Tell your character's story…">{(form as any)?.description ?? ''}</textarea>
				</div>
				<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
					<div class="field" style="flex:1 1 200px;">
						<label class="label" for="avatarUrl">Avatar URL <span class="optional">(optional)</span></label>
						<input id="avatarUrl" name="avatarUrl" type="text" class="input"
							value={(form as any)?.avatarUrl ?? ''} placeholder="https://…" />
					</div>
				</div>
			</div>

		</div>

		<!-- World assignment -->
		{#if ((data as any).activeWorlds ?? []).length}
			<div class="card" style="margin-top:1rem;">
				<h3 class="section-title">World <span class="optional">(optional)</span></h3>
				<p class="field-hint" style="margin-bottom:0.75rem;">Assign this character to a world. If left blank the character will be global.</p>
				<div class="field">
					<label class="label" for="worldId">World</label>
					<select id="worldId" name="worldId" class="input input--select">
						<option value="">Global (no world)</option>
						{#each (data as any).activeWorlds as w}
							<option value={w.id}>{w.name}</option>
						{/each}
					</select>
				</div>
			</div>
		{/if}

		<div class="form-actions" style="margin-top:1rem;">
			<a href="/characters" class="btn btn-ghost">Cancel</a>
			<button type="submit" class="btn btn-primary">Submit for approval</button>
		</div>
	</form>
</div>