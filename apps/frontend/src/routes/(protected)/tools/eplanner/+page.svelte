<!-- apps/frontend/src/routes/(protected)/tools/eplanner/+page.svelte -->
<script lang="ts">
	import { calculateMission, type EncounterPlannerConfig, type DifficultyTier } from '@core/database/eplanner-calc';

	let { data } = $props();
	const config = $derived(data.config as EncounterPlannerConfig);

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

	// ── State ──────────────────────────────────────────────────────────────────
	type MonsterGroup = { cr: number; count: number };
	type Encounter    = { id: number; monsters: MonsterGroup[] };

	let level      = $state(5);
	let partySize  = $state(4);
	let adjustPct  = $state(0);   // percentage, converted to decimal for calc
	let lairXp     = $state(0);

	let nextId     = 2;
	let encounters = $state<Encounter[]>([{ id: 1, monsters: [] }]);

	// Pending "add monster" selections per encounter id
	let pendingCr = $state<Record<number, number>>({});

	function addEncounter() {
		encounters.push({ id: nextId++, monsters: [] });
	}
	function removeEncounter(id: number) {
		encounters = encounters.filter(e => e.id !== id);
	}
	function addMonster(enc: Encounter) {
		const cr = pendingCr[enc.id] ?? 1;
		const existing = enc.monsters.find(m => m.cr === cr);
		if (existing) existing.count++;
		else enc.monsters.push({ cr, count: 1 });
	}
	function bumpMonster(enc: Encounter, group: MonsterGroup, delta: number) {
		group.count += delta;
		if (group.count <= 0) enc.monsters = enc.monsters.filter(m => m !== group);
	}
	function reset() {
		level = 5; partySize = 4; adjustPct = 0; lairXp = 0;
		encounters = [{ id: nextId++, monsters: [] }];
	}

	// ── Calculation ────────────────────────────────────────────────────────────
	const result = $derived(calculateMission({
		level,
		partySize,
		adjustment: adjustPct / 100,
		lairXp,
		encounters: encounters.map(e => ({
			monsterCrs: e.monsters.flatMap(m => Array(m.count).fill(m.cr)),
		})),
	}, config));

	const monsterCount = $derived(encounters.reduce((s, e) => s + e.monsters.reduce((n, m) => n + m.count, 0), 0));
	const adxpPct      = $derived(Math.min(result.missionDifficultyRatio * 100, 100));
	const missionColor = $derived(TIER_COLORS[result.missionTier]);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">Encounter Planner</h2>
			<p style="margin:0; font-size:0.875rem; color:var(--text-muted);">D&D 5e · build encounters, get mission XP and rewards</p>
		</div>
		<button class="btn btn-ghost btn-sm" onclick={reset}>Reset</button>
	</div>

	<!-- Party settings -->
	<div class="card" style="margin-bottom:1rem; padding:1rem 1.25rem;">
		<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:1rem;">
			<label class="ep-field">
				<span class="ep-field__label">Party level</span>
				<input class="input" type="number" min="1" max="20" bind:value={level} />
			</label>
			<label class="ep-field">
				<span class="ep-field__label">Party size</span>
				<input class="input" type="number" min="1" max="10" bind:value={partySize} />
			</label>
			<label class="ep-field">
				<span class="ep-field__label">Adjustment %</span>
				<input class="input" type="number" step="5" bind:value={adjustPct} />
			</label>
			<label class="ep-field">
				<span class="ep-field__label">Lair / bonus XP</span>
				<input class="input" type="number" min="0" step="50" bind:value={lairXp} />
			</label>
		</div>
	</div>

	<div class="ep-layout">
		<!-- Encounters -->
		<div style="display:flex; flex-direction:column; gap:0.75rem; min-width:0;">
			{#each encounters as enc, i (enc.id)}
				{@const br = result.encounters[i]}
				<div class="card" style="padding:1rem 1.25rem;">
					<div style="display:flex; align-items:center; justify-content:space-between; gap:0.75rem; margin-bottom:0.75rem;">
						<div style="display:flex; align-items:center; gap:0.625rem;">
							<span style="font-size:0.8125rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-secondary);">Encounter {i + 1}</span>
							{#if br && enc.monsters.length > 0}
								<span class="ep-badge" style="background:{TIER_COLORS[br.tier]}22; color:{TIER_COLORS[br.tier]};">{br.tier}</span>
							{/if}
						</div>
						{#if encounters.length > 1}
							<button class="btn btn-ghost btn-sm" onclick={() => removeEncounter(enc.id)}>Remove</button>
						{/if}
					</div>

					<!-- Monster groups -->
					{#if enc.monsters.length > 0}
						<div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.75rem;">
							{#each enc.monsters as group (group.cr)}
								<div class="ep-monster">
									<span style="font-weight:700;">CR {crLabel(group.cr)}</span>
									<span style="color:var(--text-muted); font-size:0.75rem;">{crOptions.find(o => o.cr === group.cr)?.xp ?? 0} XP</span>
									<div style="display:flex; align-items:center; gap:0.25rem; margin-left:0.375rem;">
										<button class="ep-ctrl" onclick={() => bumpMonster(enc, group, -1)}>−</button>
										<span style="min-width:20px; text-align:center; font-weight:700; font-variant-numeric:tabular-nums;">{group.count}</span>
										<button class="ep-ctrl" onclick={() => bumpMonster(enc, group, 1)}>+</button>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p style="margin:0 0 0.75rem; font-size:0.8125rem; color:var(--text-muted);">No monsters yet — pick a CR below.</p>
					{/if}

					<!-- Add monster -->
					<div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
						<select class="input" style="width:auto; min-width:110px;" bind:value={pendingCr[enc.id]}>
							{#each crOptions as opt (opt.cr)}
								<option value={opt.cr}>CR {crLabel(opt.cr)} · {opt.xp} XP</option>
							{/each}
						</select>
						<button class="btn btn-secondary btn-sm" onclick={() => addMonster(enc)}>Add monster</button>
					</div>

					<!-- Encounter math -->
					{#if br && enc.monsters.length > 0}
						<div style="display:flex; gap:1.25rem; flex-wrap:wrap; margin-top:0.875rem; padding-top:0.75rem; border-top:1px solid var(--border-muted); font-size:0.8125rem;">
							<span style="color:var(--text-muted);">Base <strong style="color:var(--text-primary);">{br.baseXp.toLocaleString()} XP</strong></span>
							<span style="color:var(--text-muted);">Multiplier <strong style="color:var(--text-primary);">×{br.multiplier}</strong></span>
							<span style="color:var(--text-muted);">Adjusted <strong style="color:{TIER_COLORS[br.tier]};">{br.adjustedXp.toLocaleString()} XP</strong></span>
							<span style="color:var(--text-muted);">{Math.round(br.difficultyRatio * 100)}% of High budget</span>
						</div>
					{/if}
				</div>
			{/each}

			<button class="btn btn-secondary" onclick={addEncounter} style="align-self:flex-start;">+ Add encounter</button>
		</div>

		<!-- Summary -->
		<div class="card" style="padding:1.25rem; align-self:start; position:sticky; top:1rem;">
			<h3 class="section-title" style="margin-top:0;">Mission Summary</h3>

			<div style="display:flex; align-items:baseline; gap:0.625rem; margin-bottom:0.25rem;">
				<span style="font-size:2.25rem; font-weight:800; font-variant-numeric:tabular-nums; line-height:1;">{result.totalXp.toLocaleString()}</span>
				<span style="font-size:0.875rem; color:var(--text-muted);">total XP</span>
			</div>
			<span class="ep-badge" style="background:{missionColor}22; color:{missionColor};">{result.missionTier} mission</span>

			<!-- Adventure day bar -->
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
					<span style="font-weight:600; font-variant-numeric:tabular-nums;">{encounters.length} · {monsterCount} monsters</span>
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

			<p style="margin:1rem 0 0; font-size:0.75rem; color:var(--text-muted);">
				Tiers compare adjusted XP against the party's Low / Moderate / High budgets.
				Mission tier compares total XP to the adventure-day budget.
			</p>
		</div>
	</div>
</div>

<style>
	.ep-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 300px;
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
