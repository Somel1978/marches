<!-- apps/frontend/src/routes/(protected)/dm/quests/_planner/EncounterPlannerPanel.svelte -->
<script lang="ts">
	import { calculateMission, type EncounterPlannerConfig, type DifficultyTier } from '@core/database/eplanner-calc';
	import { missionInputFromPlanner, storedFromPlanner } from './planner.ts';
	import type { PlannerEncounter, PlannerState } from './types.ts';

	let {
		config,
		planner = $bindable(),
		disabled = false,
		onMissionXp,
	}: {
		config: EncounterPlannerConfig;
		planner: PlannerState;
		disabled?: boolean;
		onMissionXp?: (xp: number) => void;
	} = $props();

	const TIER_COLORS: Record<DifficultyTier, string> = {
		Low:      'var(--color-success)',
		Moderate: 'var(--brand-accent)',
		High:     'var(--color-warning)',
		Extreme:  'var(--color-danger)',
	};

	function crLabel(cr: number): string {
		if (cr === 0.125) return '1/8';
		if (cr === 0.25)  return '1/4';
		if (cr === 0.5)   return '1/2';
		return `${cr}`;
	}

	const crOptions = $derived([...config.crToXp].sort((a, b) => a.cr - b.cr));
	let pendingCr = $state<Record<number, number>>({});

	function defaultCr(): number {
		return crOptions[0]?.cr ?? 1;
	}

	function addEncounter() {
		const id = planner.nextId++;
		planner.encounters.push({ id, monsters: [] });
		pendingCr[id] = defaultCr();
	}
	function removeEncounter(id: number) {
		if (planner.encounters.length <= 1) return;
		planner.encounters = planner.encounters.filter(e => e.id !== id);
		delete pendingCr[id];
	}
	function addMonster(enc: PlannerEncounter) {
		const cr = pendingCr[enc.id] ?? crOptions[0]?.cr ?? 1;
		const existing = enc.monsters.find(m => m.cr === cr);
		if (existing) existing.count++;
		else enc.monsters.push({ cr, count: 1 });
	}
	function bumpMonster(enc: PlannerEncounter, group: { cr: number; count: number }, delta: number) {
		group.count += delta;
		if (group.count <= 0) enc.monsters = enc.monsters.filter(m => m !== group);
	}

	const result = $derived(calculateMission(missionInputFromPlanner(planner), config));
	const storedPlan = $derived(storedFromPlanner(planner));
	const adxpPct = $derived(Math.min(result.missionDifficultyRatio * 100, 100));
	const missionColor = $derived(TIER_COLORS[result.missionTier]);
	const monsterCount = $derived(
		planner.encounters.reduce((s, e) => s + e.monsters.reduce((n, m) => n + m.count, 0), 0),
	);

	$effect(() => {
		onMissionXp?.(result.totalXp);
	});
</script>

<!-- Hidden fields for form submission -->
<input type="hidden" name="missionXp" value={result.totalXp} />
<input type="hidden" name="encounterPlan" value={JSON.stringify(storedPlan)} />

<fieldset disabled={disabled} style="border:none; padding:0; margin:0;">
	<div class="card" style="margin-bottom:1rem; padding:1rem 1.25rem;">
		<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:1rem;">
			<label class="ep-field">
				<span class="ep-field__label">Party level</span>
				<input class="input" type="number" min="1" max="20" bind:value={planner.level} />
			</label>
			<label class="ep-field">
				<span class="ep-field__label">Party size</span>
				<input class="input" type="number" min="1" max="10" bind:value={planner.partySize} />
			</label>
			<label class="ep-field">
				<span class="ep-field__label">Adjustment %</span>
				<input class="input" type="number" step="5" bind:value={planner.adjustPct} />
			</label>
			<label class="ep-field">
				<span class="ep-field__label">Lair / bonus XP</span>
				<input class="input" type="number" min="0" step="50" bind:value={planner.lairXp} />
			</label>
		</div>
	</div>

	<div class="ep-layout">
		<div style="display:flex; flex-direction:column; gap:0.75rem; min-width:0;">
			{#each planner.encounters as enc, i (enc.id)}
				{@const br = result.encounters[i]}
				<div class="card" style="padding:1rem 1.25rem;">
					<div style="display:flex; align-items:center; justify-content:space-between; gap:0.75rem; margin-bottom:0.75rem;">
						<div style="display:flex; align-items:center; gap:0.625rem;">
							<span style="font-size:0.8125rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-secondary);">Encounter {i + 1}</span>
							{#if br && enc.monsters.length > 0}
								<span class="ep-badge" style="background:{TIER_COLORS[br.tier]}22; color:{TIER_COLORS[br.tier]};">{br.tier}</span>
							{/if}
						</div>
						{#if planner.encounters.length > 1}
							<button type="button" class="btn btn-ghost btn-sm" onclick={() => removeEncounter(enc.id)}>Remove</button>
						{/if}
					</div>

					{#if enc.monsters.length > 0}
						<div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.75rem;">
							{#each enc.monsters as group (group.cr)}
								<div class="ep-monster">
									<span style="font-weight:700;">CR {crLabel(group.cr)}</span>
									<span style="color:var(--text-muted); font-size:0.75rem;">{crOptions.find(o => o.cr === group.cr)?.xp ?? 0} XP</span>
									<div style="display:flex; align-items:center; gap:0.25rem; margin-left:0.375rem;">
										<button type="button" class="ep-ctrl" onclick={() => bumpMonster(enc, group, -1)}>−</button>
										<span style="min-width:20px; text-align:center; font-weight:700; font-variant-numeric:tabular-nums;">{group.count}</span>
										<button type="button" class="ep-ctrl" onclick={() => bumpMonster(enc, group, 1)}>+</button>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p style="margin:0 0 0.75rem; font-size:0.8125rem; color:var(--text-muted);">No monsters yet — pick a CR below.</p>
					{/if}

					<div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
						<select
							class="input"
							style="width:auto; min-width:110px;"
							value={pendingCr[enc.id] ?? defaultCr()}
							onchange={(e) => { pendingCr[enc.id] = Number((e.currentTarget as HTMLSelectElement).value); }}
						>
							{#each crOptions as opt (opt.cr)}
								<option value={opt.cr}>CR {crLabel(opt.cr)} · {opt.xp} XP</option>
							{/each}
						</select>
						<button type="button" class="btn btn-secondary btn-sm" onclick={() => addMonster(enc)}>Add monster</button>
					</div>

					{#if br && enc.monsters.length > 0}
						<div style="display:flex; gap:1.25rem; flex-wrap:wrap; margin-top:0.875rem; padding-top:0.75rem; border-top:1px solid var(--border-muted); font-size:0.8125rem;">
							<span style="color:var(--text-muted);">Base <strong style="color:var(--text-primary);">{br.baseXp.toLocaleString()} XP</strong></span>
							<span style="color:var(--text-muted);">Multiplier <strong style="color:var(--text-primary);">×{br.multiplier}</strong></span>
							<span style="color:var(--text-muted);">Adjusted <strong style="color:{TIER_COLORS[br.tier]};">{br.adjustedXp.toLocaleString()} XP</strong></span>
						</div>
					{/if}
				</div>
			{/each}

			<button type="button" class="btn btn-secondary" onclick={addEncounter} style="align-self:flex-start;">+ Add encounter</button>
		</div>

		<div class="card" style="padding:1.25rem; align-self:start; position:sticky; top:1rem;">
			<h3 class="section-title" style="margin-top:0;">Mission XP</h3>
			<div style="display:flex; align-items:baseline; gap:0.625rem; margin-bottom:0.25rem;">
				<span style="font-size:2.25rem; font-weight:800; font-variant-numeric:tabular-nums; line-height:1;">{result.totalXp.toLocaleString()}</span>
				<span style="font-size:0.875rem; color:var(--text-muted);">total XP</span>
			</div>
			<span class="ep-badge" style="background:{missionColor}22; color:{missionColor};">{result.missionTier} mission</span>
			<p class="field-hint" style="margin:0.75rem 0 0;">Saved as quest mission XP — split equally among confirmed players at payout.</p>

			<div style="margin-top:1.125rem;">
				<div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-bottom:0.375rem;">
					<span>Adventure day budget</span>
					<span style="font-variant-numeric:tabular-nums;">{Math.round(result.missionDifficultyRatio * 100)}% of {result.adventureDayXp.toLocaleString()}</span>
				</div>
				<div style="height:6px; background:var(--bg-overlay); border-radius:99px; overflow:hidden;">
					<div style="height:100%; width:{adxpPct}%; background:{missionColor}; border-radius:99px; transition:width var(--transition-base), background var(--transition-fast);"></div>
				</div>
			</div>

			<div style="display:flex; flex-direction:column; gap:0.625rem; margin-top:1.25rem; padding-top:1rem; border-top:1px solid var(--border-muted); font-size:0.875rem;">
				<div style="display:flex; justify-content:space-between;">
					<span style="color:var(--text-muted);">Encounters</span>
					<span style="font-weight:600; font-variant-numeric:tabular-nums;">{planner.encounters.length} · {monsterCount} monsters</span>
				</div>
				<div style="display:flex; justify-content:space-between;">
					<span style="color:var(--text-muted);">Reward XP / player</span>
					<span style="font-weight:700; font-variant-numeric:tabular-nums;">{result.rewardXpPerPlayer.toLocaleString()}</span>
				</div>
				<div style="display:flex; justify-content:space-between;">
					<span style="color:var(--text-muted);">Reward GP / player</span>
					<span style="font-weight:700; font-variant-numeric:tabular-nums;">{result.rewardGp.toLocaleString()}</span>
				</div>
			</div>
		</div>
	</div>
</fieldset>

<style>
	.ep-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 280px;
		gap: 1rem;
		align-items: start;
	}
	@media (max-width: 860px) {
		.ep-layout { grid-template-columns: 1fr; }
	}
	.ep-field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}
	.ep-field__label {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
	}
	.ep-badge {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.125rem 0.55rem;
		border-radius: 99px;
	}
	.ep-monster {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.625rem;
		background: var(--bg-overlay);
		border: 1px solid var(--border-muted);
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
	}
	.ep-ctrl {
		width: 22px;
		height: 22px;
		border: 1px solid var(--border-base);
		border-radius: var(--radius-sm);
		background: var(--bg-overlay);
		color: var(--text-primary);
		font-size: 0.875rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}
</style>
