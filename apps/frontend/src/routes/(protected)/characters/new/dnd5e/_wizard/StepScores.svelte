<!-- apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/StepScores.svelte -->
<script lang="ts">
	import { STATS, STAT_LABEL } from './types.ts';
	import { BUDGET, POINT_COSTS, SA_VALUES, mod } from './wizard-state.svelte.ts';
	import type { WizardState } from './wizard-state.svelte.ts';
	import * as grants from './grants.ts';

	let { ws, sys }: { ws: WizardState; sys: any } = $props();

	const selectedSpecies = $derived(grants.selectedSpecies(sys, ws));

	function setBonusGranted(v: number) {
		const clamped = Math.max(0, Math.min(6, Math.floor(v) || 0));
		ws.bonusGranted = clamped;
		// Trim any bonus points already assigned beyond the new cap.
		let over = ws.bonusSpent - clamped;
		if (over > 0) {
			const nextBonus = { ...ws.bonus };
			for (const st of STATS) {
				if (over <= 0) break;
				const take = Math.min(nextBonus[st], over);
				nextBonus[st] -= take;
				over -= take;
			}
			ws.bonus = nextBonus;
		}
	}
</script>

<div class="wizard-scores-step">

	<div class="card" style="flex:1;min-width:0;">

		<!-- Method toggle -->
		<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
			<div class="wiz-toggle">
				<button type="button" class="wiz-toggle__btn" class:wiz-toggle__btn--active={!ws.rolled && !ws.standardArray}
					onclick={() => ws.resetPointBuy()}>Point buy</button>
				<button type="button" class="wiz-toggle__btn" class:wiz-toggle__btn--active={ws.standardArray}
					onclick={() => ws.useStandardArray()}>Standard array</button>
				<button type="button" class="wiz-toggle__btn" class:wiz-toggle__btn--active={ws.rolled}
					onclick={() => ws.rollScores()}>🎲 Roll 4d6</button>
			</div>
			{#if !ws.rolled && !ws.standardArray}
				<div style="display:flex;align-items:center;gap:0.625rem;">
					<div style="height:5px;width:100px;background:var(--bg-overlay);border-radius:99px;overflow:hidden;">
						<div style="height:100%;width:{Math.min(((BUDGET - ws.remaining) / BUDGET) * 100, 100)}%;background:var(--accent);border-radius:99px;transition:width var(--transition-base);"></div>
					</div>
					<span style="font-size:0.8125rem;font-weight:600;color:{ws.remaining === 0 ? 'var(--color-success)' : 'var(--accent-light)'};">{ws.remaining} left</span>
				</div>
			{/if}
		</div>

		<!-- Standard array assignment -->
		{#if ws.standardArray}
			<div style="margin-bottom:0.875rem;background:var(--bg-overlay);border-radius:var(--radius-md);padding:0.75rem;">
				<p class="wiz-pool__label" style="margin-bottom:0.5rem;">Assign values: {SA_VALUES.join(', ')}</p>
				<div class="wizard-scores-grid wizard-scores-grid--6col" style="text-align:center;">
					{#each STATS as st}
						<div class="wizard-stat-box">
							<p class="wizard-stat-box__label">{STAT_LABEL[st]}</p>
							<select class="input input--select" style="font-size:0.8125rem;padding:0.25rem 0.375rem;text-align:center;"
								bind:value={ws.scores[st]}
								onchange={(e) => { ws.scores = { ...ws.scores, [st]: parseInt((e.target as HTMLSelectElement).value) }; }}>
								<option value={0}>—</option>
								{#each SA_VALUES as v}
									<option value={v} disabled={ws.saAssigned.includes(st) ? false : ws.saAssigned.map(s => ws.scores[s]).includes(v)}>{v}</option>
								{/each}
							</select>
							<p class="wizard-stat-box__mod">{ws.scores[st] > 0 ? mod(ws.total[st]) : '—'}</p>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<!-- Point buy / rolled stat boxes -->
			<div class="wizard-scores-grid">
				{#each STATS as st}
					<div class="wizard-stat-box">
						<p class="wizard-stat-box__label">{STAT_LABEL[st]}</p>
						<p class="wizard-stat-box__value">{ws.total[st]}</p>
						<p class="wizard-stat-box__mod">{mod(ws.total[st])}</p>
						{#if !ws.rolled}
							<p class="wizard-stat-box__cost">Cost: {POINT_COSTS[ws.scores[st]] ?? 0}</p>
						{/if}
						<div style="display:flex;gap:4px;justify-content:center;margin-top:0.375rem;">
							<button type="button" class="wizard-ctrl-btn" disabled={!ws.canDec(st)} onclick={() => ws.dec(st)}>−</button>
							<button type="button" class="wizard-ctrl-btn" disabled={!ws.canInc(st)} onclick={() => ws.inc(st)}>+</button>
						</div>
						{#if ws.bonusGranted > 0}
							<div style="display:flex;gap:4px;justify-content:center;margin-top:2px;">
								<button type="button" class="wizard-ctrl-btn" style="border-color:color-mix(in srgb, var(--color-bonus) 40%, transparent);" disabled={!ws.canBonusDec(st)} onclick={() => ws.bonusDec(st)}>−</button>
								<button type="button" class="wizard-ctrl-btn" style="border-color:color-mix(in srgb, var(--color-bonus) 40%, transparent);" disabled={!ws.canBonusInc(st)} onclick={() => ws.bonusInc(st)}>+</button>
							</div>
							{#if ws.bonus[st]}<p style="font-size:0.625rem;color:var(--color-bonus);margin:2px 0 0;text-align:center;">+{ws.bonus[st]} bonus</p>{/if}
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		{#if ws.rolled}
			<button type="button" class="btn btn-ghost btn-sm" onclick={() => ws.resetPointBuy()}>↺ Reset to point buy</button>
		{/if}

		<!-- Bonus ability score points (e.g. DM-awarded boons) -->
		<div style="border-top:1px solid var(--border-muted);margin-top:1rem;padding-top:1rem;">
			<div class="field" style="margin:0;max-width:220px;">
				<label class="label" for="bonus-granted">Bonus points granted <span class="table__muted">(optional)</span></label>
				<input id="bonus-granted" type="number" class="input" min="0" max="6" value={ws.bonusGranted}
					oninput={(e) => setBonusGranted(parseInt((e.currentTarget as HTMLInputElement).value, 10))} />
			</div>
			{#if ws.bonusGranted > 0}
				<p style="font-size:0.75rem;color:var(--text-muted);margin:0.5rem 0 0;">
					{ws.bonusLeft} of {ws.bonusGranted} bonus point{ws.bonusGranted === 1 ? '' : 's'} left to assign — use the purple +/− controls above.
				</p>
			{/if}
		</div>
	</div>

	<!-- Score summary sidebar -->
	<div class="card" style="width:180px;flex-shrink:0;">
		<p class="wiz-pool__label" style="margin-bottom:10px;">{ws.name || 'Character'}</p>
		{#if selectedSpecies}<p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 10px;">{selectedSpecies.name}</p>{/if}
		<div style="border-top:1px solid var(--border-muted);padding-top:10px;">
			<p class="wiz-pool__label" style="margin-bottom:6px;">Final scores</p>
			<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;font-size:0.75rem;">
				{#each STATS as st}
					<span style="color:var(--text-secondary);">{STAT_LABEL[st]} <strong style="color:var(--text-primary);">{ws.total[st]}</strong></span>
				{/each}
			</div>
		</div>
	</div>
</div>