<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/progression/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { WorldProgressionLadderEditor } from '@core/ui';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const e_reload = () => async ({ update }: any) => { await update(); await invalidateAll(); };
</script>

{#if (form as any)?.message}
	<div class="form-error" style="margin-bottom:1rem;">{(form as any).message}</div>
{/if}

<div class="card" style="margin-bottom:1rem;">
	<h3 class="section-title">Default progression mode for new characters</h3>
	{#if (form as any)?.modeSuccess}
		<div class="form-success" style="margin-bottom:0.75rem;">Progression mode updated.</div>
	{/if}
	<form method="post" action="?/updateProgressionMode" use:enhance={e_reload}>
		<div style="display:flex; gap:0.5rem; align-items:flex-end; flex-wrap:wrap;">
			<div class="field" style="margin:0; flex:0 0 220px;">
				<label class="label" for="progressionMode">Mode</label>
				<select id="progressionMode" name="progressionMode" class="input input--select">
					<option value=""          selected={!data.progressionMode}>Inherit game system default</option>
					<option value="XP"        selected={data.progressionMode === 'XP'}>XP</option>
					<option value="MILESTONE" selected={data.progressionMode === 'MILESTONE'}>Milestone</option>
				</select>
			</div>
			<button type="submit" class="btn btn-primary btn-sm">Save</button>
		</div>
		<p class="field-hint" style="margin-top:0.5rem;">
			Snapshotted onto characters created with this world selected. Existing characters keep their mode.
		</p>
	</form>
</div>

<div class="card">
	<h3 class="section-title">Progression ladder overrides</h3>
	{#if (form as any)?.progressionSuccess}
		<div class="form-success" style="margin-bottom:0.75rem;">
			Ladder overrides saved.
			{#if (form as any).charactersReconciled != null}
				Re-resolved {(form as any).charactersReconciled} character(s)
				{#if (form as any).pendingChanges}
					— {(form as any).pendingChanges} entered level-up/down pending
				{/if}.
			{/if}
		</div>
	{/if}
	{#if data.gameSystem}
		<p class="field-hint" style="margin-bottom:0.75rem;">
			Base ladder: <strong>{(data.gameSystem as any).name}</strong>
		</p>
	{/if}
	<WorldProgressionLadderEditor
		thresholds={data.systemThresholds ?? []}
		overrides={data.overrides ?? []}
		homeCharacterCount={data.homeCharacterCount ?? 0}
		enhance={e_reload}
	/>
</div>
