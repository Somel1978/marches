<!-- apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/StepIdentity.svelte -->
<script lang="ts">
	import { generateFantasyName } from '@core/ui';
	import type { WizardState } from './wizard-state.svelte.ts';
	import { selectedSpecies } from './grants.ts';

	let { ws, sys, activeWorlds }: { ws: WizardState; sys: any; activeWorlds: any[] } = $props();

	function randomName() { ws.name = generateFantasyName(selectedSpecies(sys, ws)?.name); }
</script>

<div class="wizard-identity-grid">

	<div class="card">
		<div class="page__header" style="margin-bottom:1rem;">
			<h3 class="section-title" style="margin:0;">Your character</h3>
			<button type="button" class="btn btn-ghost btn-sm" onclick={randomName}>🎲 Name</button>
		</div>

		<div class="field">
			<label class="label" for="char-name">Name</label>
			<input id="char-name" type="text" class="input" bind:value={ws.name} placeholder="Character name" />
		</div>

		<div class="field">
			<label class="label" for="char-world">World <span class="table__muted">(optional)</span></label>
			<select id="char-world" class="input input--select" bind:value={ws.worldId}>
				<option value="">Global — no world</option>
				{#each activeWorlds as w}<option value={w.id}>{w.name}</option>{/each}
			</select>
		</div>

		<div style="border-top:1px solid var(--border-muted);margin-top:1rem;padding-top:1rem;">
			<p class="wiz-pool__label" style="margin-bottom:0.625rem;">Artwork <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-muted);">(optional)</span></p>
			<div class="field">
				<label class="label" for="char-avatar">Avatar URL</label>
				<input id="char-avatar" type="url" class="input" bind:value={ws.avatarUrl} placeholder="https://…" />
			</div>
			<div class="field">
				<label class="label" for="char-portrait">Portrait URL</label>
				<input id="char-portrait" type="url" class="input" bind:value={ws.portraitUrl} placeholder="https://…" />
			</div>
		</div>
	</div>

	<!-- Preview card -->
	<div class="card" style="text-align:center;">
		<p class="wiz-pool__label" style="margin-bottom:0.75rem;">Preview</p>
		{#if ws.avatarUrl}
			<img src={ws.avatarUrl} alt={ws.name}
				style="width:88px;height:88px;border-radius:50%;object-fit:cover;margin:0 auto 0.75rem;display:block;border:2px solid var(--border-accent);"
				onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
		{:else}
			<div style="width:88px;height:88px;border-radius:50%;background:var(--bg-overlay);border:2px solid var(--border-muted);display:flex;align-items:center;justify-content:center;margin:0 auto 0.75rem;font-size:2rem;">🧑</div>
		{/if}
		<p style="margin:0;font-size:1rem;font-weight:700;">{ws.name || 'Unnamed'}</p>
		{#if ws.worldId}<p style="margin:0.25rem 0 0;font-size:0.8125rem;color:var(--text-muted);">{activeWorlds.find((w: any) => w.id === ws.worldId)?.name}</p>{/if}
		<p style="margin:0.875rem 0 0;font-size:0.75rem;color:var(--text-muted);line-height:1.5;">Species, class and background will appear here as you choose them.</p>
	</div>

</div>
