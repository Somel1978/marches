<!-- apps/admin/src/routes/(app)/tools/eplanner/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let saving = $state(false);

	const cfg = $derived(data.config);

	function crLabel(cr: number): string {
		if (cr === 0.125) return '1/8';
		if (cr === 0.25)  return '1/4';
		if (cr === 0.5)   return '1/2';
		return `${cr}`;
	}

	const submitFn = () => {
		saving = true;
		return async ({ update }: { update: () => Promise<void> }) => { saving = false; await update(); };
	};
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">Encounter Planner</h2>
			<p style="margin:0; font-size:0.875rem; color:var(--text-muted);">{data.system.name} · variables used by the /tools/eplanner calculator</p>
		</div>
		<form method="post" action="?/reset" use:enhance={submitFn}>
			<button type="submit" class="btn btn-ghost btn-sm" disabled={saving}
				onclick={(e) => { if (!confirm('Reset all encounter planner tables to the 2024 DMG defaults?')) e.preventDefault(); }}>
				Reset to defaults
			</button>
		</form>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if form?.success}<div class="form-success">Saved.</div>{/if}

	<!-- Config scalars -->
	<div class="card" style="margin-bottom:1rem;">
		<h3 class="section-title">Mission config</h3>
		<form method="post" action="?/saveConfig" use:enhance={submitFn}>
			<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:1rem;">
				<div class="field">
					<label class="label" for="moderateRatio">Moderate ratio</label>
					<input id="moderateRatio" name="moderateRatio" type="number" step="0.05" min="0" class="input" value={cfg.moderateRatio} required />
					<p class="field-hint">Mission is Moderate above this share of the adventure-day budget.</p>
				</div>
				<div class="field">
					<label class="label" for="highRatio">High ratio</label>
					<input id="highRatio" name="highRatio" type="number" step="0.05" min="0" class="input" value={cfg.highRatio} required />
				</div>
				<div class="field">
					<label class="label" for="extremeRatio">Extreme ratio</label>
					<input id="extremeRatio" name="extremeRatio" type="number" step="0.05" min="0" class="input" value={cfg.extremeRatio} required />
				</div>
				<div class="field">
					<label class="label" for="rewardGpRate">Reward GP rate</label>
					<input id="rewardGpRate" name="rewardGpRate" type="number" step="0.05" min="0" class="input" value={cfg.rewardGpRate} required />
					<p class="field-hint">GP per point of per-player reward XP.</p>
				</div>
				<div class="field">
					<label class="label" for="adventureDayMultiplier">Adventure day ×</label>
					<input id="adventureDayMultiplier" name="adventureDayMultiplier" type="number" step="0.5" min="0" class="input" value={cfg.adventureDayMultiplier} required />
					<p class="field-hint">ADXP = High threshold × this × party size.</p>
				</div>
			</div>
			<div class="form-actions">
				<button type="submit" class="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save config'}</button>
			</div>
		</form>
	</div>

	<!-- Level thresholds -->
	<div class="card" style="margin-bottom:1rem;">
		<h3 class="section-title">Level XP thresholds (per character)</h3>
		<form method="post" action="?/saveThresholds" use:enhance={submitFn}>
			<div class="table-wrap">
				<table class="table">
					<thead>
						<tr><th>Level</th><th>Low</th><th>Moderate</th><th>High</th></tr>
					</thead>
					<tbody>
						{#each cfg.levelThresholds as t (t.level)}
							<tr>
								<td style="font-weight:700;">{t.level}</td>
								<td><input name={`low__${t.level}`} type="number" min="0" class="input input-sm" style="max-width:110px;" value={t.low} required /></td>
								<td><input name={`mod__${t.level}`} type="number" min="0" class="input input-sm" style="max-width:110px;" value={t.moderate} required /></td>
								<td><input name={`high__${t.level}`} type="number" min="0" class="input input-sm" style="max-width:110px;" value={t.high} required /></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="form-actions">
				<button type="submit" class="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save thresholds'}</button>
			</div>
		</form>
	</div>

	<!-- Monster count multipliers -->
	<div class="card" style="margin-bottom:1rem;">
		<h3 class="section-title">Monster count multipliers</h3>
		<p style="margin:0 0 0.75rem; font-size:0.8125rem; color:var(--text-muted);">The highest "min monsters" at or below the encounter's monster count applies.</p>
		<form method="post" action="?/saveMultipliers" use:enhance={submitFn}>
			<div class="table-wrap">
				<table class="table" style="max-width:420px;">
					<thead>
						<tr><th>Min monsters</th><th>Multiplier</th><th></th></tr>
					</thead>
					<tbody>
						{#each cfg.multiplierRows as row (row.id)}
							<tr>
								<td style="font-weight:700;">{row.minCount}+</td>
								<td><input name={`mult__${row.minCount}`} type="number" step="0.05" min="0.05" class="input input-sm" style="max-width:110px;" value={row.multiplier} required /></td>
								<td>
									<button type="submit" class="btn btn-ghost btn-sm" formaction="?/deleteMultiplier" name="id" value={row.id}>Delete</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="form-actions">
				<button type="submit" class="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save multipliers'}</button>
			</div>
		</form>
		<form method="post" action="?/addMultiplier" use:enhance={submitFn} style="display:flex; align-items:flex-end; gap:0.75rem; margin-top:0.75rem; flex-wrap:wrap;">
			<div class="field" style="margin:0;">
				<label class="label" for="newMinCount">Min monsters</label>
				<input id="newMinCount" name="minCount" type="number" min="1" class="input input-sm" style="max-width:110px;" required />
			</div>
			<div class="field" style="margin:0;">
				<label class="label" for="newMultiplier">Multiplier</label>
				<input id="newMultiplier" name="multiplier" type="number" step="0.05" min="0.05" class="input input-sm" style="max-width:110px;" required />
			</div>
			<button type="submit" class="btn btn-secondary" disabled={saving}>Add breakpoint</button>
		</form>
	</div>

	<!-- CR → XP -->
	<div class="card" style="margin-bottom:1rem;">
		<h3 class="section-title">CR → XP</h3>
		<form method="post" action="?/saveXp" use:enhance={submitFn}>
			<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:0.5rem 1rem;">
				{#each cfg.crToXpRows as row (row.id)}
					<div style="display:flex; align-items:center; gap:0.5rem;">
						<span style="min-width:44px; font-weight:700; font-size:0.8125rem;">CR {crLabel(row.cr)}</span>
						<input name={`xp__${row.cr}`} type="number" min="0" class="input input-sm" value={row.xp} required />
					</div>
				{/each}
			</div>
			<div class="form-actions">
				<button type="submit" class="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save XP table'}</button>
			</div>
		</form>
		<form method="post" action="?/addXp" use:enhance={submitFn} style="display:flex; align-items:flex-end; gap:0.75rem; margin-top:0.75rem; flex-wrap:wrap;">
			<div class="field" style="margin:0;">
				<label class="label" for="newCr">CR</label>
				<input id="newCr" name="cr" type="number" step="0.125" min="0" class="input input-sm" style="max-width:110px;" required />
			</div>
			<div class="field" style="margin:0;">
				<label class="label" for="newXp">XP</label>
				<input id="newXp" name="xp" type="number" min="0" class="input input-sm" style="max-width:130px;" required />
			</div>
			<button type="submit" class="btn btn-secondary" disabled={saving}>Add CR</button>
		</form>
	</div>
</div>
