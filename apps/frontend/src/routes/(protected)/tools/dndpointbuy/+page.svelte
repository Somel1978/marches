<!-- apps/frontend/src/routes/(protected)/tools/dndpointbuy/+page.svelte -->
<script lang="ts">
	const MIN_STAT     = 8;
	const STD_MAX_STAT = 15;
	const TOTAL_BUDGET = 27;

	const POINT_COSTS: Record<number, number> = {
		8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
	};

	const MODIFIERS: Record<number, number> = {
		8: -1, 9: -1, 10: 0, 11: 0, 12: 1, 13: 1, 14: 2, 15: 2, 16: 3, 17: 3
	};

	const ABILITY_ICONS: Record<string, string> = {
		Strength: '⚔', Dexterity: '🏹', Constitution: '🛡',
		Intelligence: '📖', Wisdom: '🔮', Charisma: '👑',
	};
	const ABILITY_COLORS: Record<string, string> = {
		Strength: '#C0392B', Dexterity: '#27AE60', Constitution: '#E67E22',
		Intelligence: '#2980B9', Wisdom: '#8E44AD', Charisma: '#E91E8C',
	};

	type AbilityName = 'Strength' | 'Dexterity' | 'Constitution' | 'Intelligence' | 'Wisdom' | 'Charisma';
	const ABILITIES: AbilityName[] = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];

	// Standard scores (8–15, point buy cost table)
	let scores = $state<Record<AbilityName, number>>({
		Strength: 8, Dexterity: 8, Constitution: 8,
		Intelligence: 8, Wisdom: 8, Charisma: 8,
	});

	// Bonus points granted (user-configurable)
	let bonusGranted = $state(0);

	// Bonus points allocated per ability (1:1, any score above stdMax included)
	let bonus = $state<Record<AbilityName, number>>({
		Strength: 0, Dexterity: 0, Constitution: 0,
		Intelligence: 0, Wisdom: 0, Charisma: 0,
	});

	// Total score per ability
	const total = $derived<Record<AbilityName, number>>(
		Object.fromEntries(ABILITIES.map(a => [a, scores[a] + bonus[a]])) as Record<AbilityName, number>
	);

	// Standard pool
	const stdSpent     = $derived(ABILITIES.reduce((s, a) => s + POINT_COSTS[scores[a]], 0));
	const stdRemaining = $derived(TOTAL_BUDGET - stdSpent);

	// Bonus pool
	const bonusSpent     = $derived(ABILITIES.reduce((s, a) => s + bonus[a], 0));
	const bonusRemaining = $derived(bonusGranted - bonusSpent);

	function mod(val: number): string {
		const m = MODIFIERS[val] ?? Math.floor((val - 10) / 2);
		return m >= 0 ? `+${m}` : `${m}`;
	}

	// Standard controls
	function canStdIncrease(a: AbilityName) {
		const next = scores[a] + 1;
		if (next > STD_MAX_STAT) return false;
		return stdRemaining >= (POINT_COSTS[next] - POINT_COSTS[scores[a]]);
	}
	function canStdDecrease(a: AbilityName) { return scores[a] > MIN_STAT; }
	function stdIncrease(a: AbilityName) { if (canStdIncrease(a)) scores[a]++; }
	function stdDecrease(a: AbilityName) { if (canStdDecrease(a)) scores[a]--; }

	// Bonus controls
	function canBonusIncrease(a: AbilityName) { return bonusRemaining > 0 && total[a] < 17; }
	function canBonusDecrease(a: AbilityName) { return bonus[a] > 0; }
	function bonusIncrease(a: AbilityName) { if (canBonusIncrease(a)) bonus[a]++; }
	function bonusDecrease(a: AbilityName) { if (canBonusDecrease(a)) bonus[a]--; }

	function reset() {
		for (const a of ABILITIES) { scores[a] = 8; bonus[a] = 0; }
	}

	const stdPct    = $derived(Math.min((stdSpent / TOTAL_BUDGET) * 100, 100));
	const bonusPct  = $derived(bonusGranted > 0 ? Math.min((bonusSpent / bonusGranted) * 100, 100) : 0);

	const stdColor  = $derived(
		stdRemaining === 0 ? 'var(--color-success)' :
		stdRemaining < 4   ? 'var(--color-warning)' : 'var(--brand-accent)'
	);
	const bonusColor = $derived(
		bonusRemaining === 0 ? 'var(--color-success)' :
		bonusRemaining < 2   ? 'var(--color-warning)' : 'var(--color-bonus)'
	);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">Point Buy Calculator</h2>
			<p style="margin:0; font-size:0.875rem; color:var(--text-muted);">D&D 5e · 27 standard points + optional bonus pool</p>
		</div>
		<button class="btn btn-ghost btn-sm" onclick={reset}>Reset</button>
	</div>

	<!-- Budget bars -->
	<div class="card" style="margin-bottom:1rem; padding:1rem 1.25rem; display:flex; flex-direction:column; gap:0.875rem;">

		<!-- Standard pool -->
		<div>
			<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.375rem;">
				<span style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-secondary);">Standard Points</span>
				<span style="font-size:1.25rem; font-weight:700; color:{stdColor}; font-variant-numeric:tabular-nums;">
					{stdRemaining} <span style="font-size:0.8125rem; font-weight:400; color:var(--text-muted);">/ {TOTAL_BUDGET}</span>
				</span>
			</div>
			<div style="height:6px; background:var(--bg-overlay); border-radius:99px; overflow:hidden;">
				<div style="height:100%; width:{stdPct}%; background:{stdColor}; border-radius:99px; transition:width var(--transition-base), background var(--transition-fast);"></div>
			</div>
		</div>

		<!-- Bonus pool -->
		<div>
			<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.375rem; gap:1rem; flex-wrap:wrap;">
				<div style="display:flex; align-items:center; gap:0.75rem;">
					<span style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-secondary);">Bonus Points (1:1)</span>
					<div style="display:flex; align-items:center; gap:0.25rem;">
						<button
							onclick={() => { if (bonusGranted > 0) { bonusGranted--; for (const a of ABILITIES) bonus[a] = Math.min(bonus[a], bonusGranted - (ABILITIES.filter(x => x !== a).reduce((s,x) => s + bonus[x], 0))); } }}
							style="width:22px; height:22px; border:1px solid var(--border-base); border-radius:var(--radius-sm); background:var(--bg-overlay); color:var(--text-primary); font-size:0.875rem; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1;"
						>−</button>
						<span style="font-size:0.875rem; font-weight:700; color:var(--color-bonus); min-width:20px; text-align:center; font-variant-numeric:tabular-nums;">{bonusGranted}</span>
						<button
							onclick={() => bonusGranted++}
							style="width:22px; height:22px; border:1px solid var(--border-base); border-radius:var(--radius-sm); background:var(--bg-overlay); color:var(--text-primary); font-size:0.875rem; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1;"
						>+</button>
						<span style="font-size:0.75rem; color:var(--text-muted); margin-left:0.25rem;">granted</span>
					</div>
				</div>
				{#if bonusGranted > 0}
					<span style="font-size:1.25rem; font-weight:700; color:{bonusColor}; font-variant-numeric:tabular-nums;">
						{bonusRemaining} <span style="font-size:0.8125rem; font-weight:400; color:var(--text-muted);">/ {bonusGranted}</span>
					</span>
				{/if}
			</div>
			{#if bonusGranted > 0}
				<div style="height:6px; background:var(--bg-overlay); border-radius:99px; overflow:hidden;">
					<div style="height:100%; width:{bonusPct}%; background:{bonusColor}; border-radius:99px; transition:width var(--transition-base), background var(--transition-fast);"></div>
				</div>
				<p style="margin:0.25rem 0 0; font-size:0.75rem; color:var(--text-muted);">Bonus points cost 1 per +1 stat, up to 17 per ability.</p>
			{/if}
		</div>
	</div>

	<!-- Ability score cards -->
	<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:0.75rem;">
		{#each ABILITIES as ability}
			{@const score    = scores[ability]}
			{@const bon      = bonus[ability]}
			{@const tot      = total[ability]}
			{@const color    = ABILITY_COLORS[ability]}
			{@const icon     = ABILITY_ICONS[ability]}

			<div class="card" style="padding:1.25rem; border-color:{color}22; position:relative; overflow:hidden;">
				<div style="position:absolute; top:-20px; right:-20px; font-size:4rem; opacity:0.06; line-height:1; user-select:none;">{icon}</div>

				<!-- Header -->
				<div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.875rem;">
					<span style="font-size:1.25rem;">{icon}</span>
					<span style="font-size:0.8125rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:{color};">{ability}</span>
				</div>

				<!-- Score display -->
				<div style="display:flex; align-items:baseline; gap:0.5rem; margin-bottom:0.75rem;">
					<span style="font-size:2.5rem; font-weight:800; color:var(--text-primary); font-variant-numeric:tabular-nums; line-height:1;">{tot}</span>
					<span style="font-size:1.125rem; font-weight:600; color:{color}; font-variant-numeric:tabular-nums;">{mod(tot)}</span>
					{#if bon > 0}
						<span style="font-size:0.75rem; padding:0.125rem 0.4rem; background:color-mix(in srgb, var(--color-bonus) 13%, transparent); color:var(--color-bonus); border-radius:99px; font-weight:600;">+{bon} bonus</span>
					{/if}
				</div>

				<!-- Cost badge -->
				<div style="margin-bottom:0.875rem;">
					<span style="font-size:0.75rem; padding:0.125rem 0.5rem; background:{color}18; color:{color}; border-radius:99px; font-weight:600;">
						{POINT_COSTS[score]} pt{bon > 0 ? ` + ${bon}` : ''}
					</span>
				</div>

				<!-- Standard controls -->
				<div style="display:flex; gap:0.375rem; margin-bottom:{bonusGranted > 0 ? '0.5rem' : '0'};">
					<button
						onclick={() => stdDecrease(ability)}
						disabled={!canStdDecrease(ability)}
						class="ctrl-btn"
						style="opacity:{canStdDecrease(ability) ? 1 : 0.3}; flex:1;"
					>−</button>
					<span style="flex:1; text-align:center; font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; justify-content:center; font-weight:600;">{score}</span>
					<button
						onclick={() => stdIncrease(ability)}
						disabled={!canStdIncrease(ability)}
						class="ctrl-btn"
						style="opacity:{canStdIncrease(ability) ? 1 : 0.3}; flex:1; background:{canStdIncrease(ability) ? color + '22' : 'var(--bg-overlay)'};"
					>+</button>
				</div>

				<!-- Bonus controls (shown only if bonus pool active) -->
				{#if bonusGranted > 0}
					<div style="display:flex; gap:0.375rem; padding-top:0.5rem; border-top:1px solid var(--border-muted);">
						<button
							onclick={() => bonusDecrease(ability)}
							disabled={!canBonusDecrease(ability)}
							class="ctrl-btn"
							style="opacity:{canBonusDecrease(ability) ? 1 : 0.3}; flex:1; border-color:color-mix(in srgb, var(--color-bonus) 27%, transparent);"
						>−</button>
						<span style="flex:1; text-align:center; font-size:0.75rem; color:var(--color-bonus); display:flex; align-items:center; justify-content:center; font-weight:700;">{bon > 0 ? `+${bon}` : '·'}</span>
						<button
							onclick={() => bonusIncrease(ability)}
							disabled={!canBonusIncrease(ability)}
							class="ctrl-btn"
							style="opacity:{canBonusIncrease(ability) ? 1 : 0.3}; flex:1; border-color:color-mix(in srgb, var(--color-bonus) 27%, transparent); background:{canBonusIncrease(ability) ? 'color-mix(in srgb, var(--color-bonus) 13%, transparent)' : 'var(--bg-overlay)'};"
						>+</button>
					</div>
					<p style="margin:0.25rem 0 0; font-size:0.6875rem; color:var(--text-muted); text-align:center;">bonus (1:1)</p>
				{/if}

				<!-- Range bar -->
				<div style="margin-top:0.75rem; display:flex; gap:2px;">
					{#each [8,9,10,11,12,13,14,15] as v}
						<div style="flex:1; height:3px; border-radius:99px; background:{v <= score ? color : 'var(--bg-overlay)'}; transition:background var(--transition-fast);"></div>
					{/each}
					{#if bon > 0}
						{#each Array(bon) as _}
							<div style="flex:1; height:3px; border-radius:99px; background:var(--color-bonus);"></div>
						{/each}
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Summary -->
	<div class="card" style="margin-top:1rem;">
		<h3 class="section-title">Summary</h3>
		<div class="table-wrap">
			<table class="table">
				<thead>
					<tr>
						<th>Ability</th>
						<th style="text-align:center;">Base</th>
						{#if bonusGranted > 0}<th style="text-align:center; color:var(--color-bonus);">Bonus</th>{/if}
						<th style="text-align:center;">Total</th>
						<th style="text-align:center;">Modifier</th>
						<th style="text-align:center;">Cost</th>
					</tr>
				</thead>
				<tbody>
					{#each ABILITIES as ability}
						{@const score = scores[ability]}
						{@const bon   = bonus[ability]}
						{@const tot   = total[ability]}
						<tr>
							<td>
								<span style="display:flex; align-items:center; gap:0.375rem;">
									<span>{ABILITY_ICONS[ability]}</span>
									<span>{ability}</span>
								</span>
							</td>
							<td style="text-align:center; font-variant-numeric:tabular-nums;">{score}</td>
							{#if bonusGranted > 0}
								<td style="text-align:center; color:{bon > 0 ? 'var(--color-bonus)' : 'var(--text-muted)'}; font-weight:{bon > 0 ? 700 : 400};">{bon > 0 ? `+${bon}` : '—'}</td>
							{/if}
							<td style="text-align:center; font-weight:700; font-variant-numeric:tabular-nums;">{tot}</td>
							<td style="text-align:center; font-variant-numeric:tabular-nums; color:{MODIFIERS[tot] !== undefined ? (MODIFIERS[tot] >= 0 ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--color-success)'};">{mod(tot)}</td>
							<td style="text-align:center; color:var(--text-muted);">{POINT_COSTS[score]}{bon > 0 ? `+${bon}` : ''}</td>
						</tr>
					{/each}
					<tr style="border-top:2px solid var(--border-accent);">
						<td colspan={bonusGranted > 0 ? 4 : 3} style="text-align:right; font-weight:700; padding-right:1rem;">Total spent</td>
						<td></td>
						<td style="text-align:center; font-weight:700; color:{stdRemaining === 0 ? 'var(--color-success)' : 'var(--brand-accent)'};">
							{stdSpent}/{TOTAL_BUDGET}{bonusGranted > 0 ? ` + ${bonusSpent}/${bonusGranted}` : ''}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<!-- Reference -->
	<div class="card" style="margin-top:1rem;">
		<h3 class="section-title">Standard Cost Reference</h3>
		<div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
			{#each Object.entries(POINT_COSTS) as [s, cost]}
				<div style="display:flex; flex-direction:column; align-items:center; padding:0.5rem 0.75rem; background:var(--bg-overlay); border-radius:var(--radius-md); min-width:52px;">
					<span style="font-size:1.125rem; font-weight:700;">{s}</span>
					<span style="font-size:0.75rem; color:var(--text-muted);">{cost} pt</span>
				</div>
			{/each}

		</div>
	</div>
</div>

<style>
	.ctrl-btn {
		padding: 0.375rem;
		border: 1px solid var(--border-base);
		border-radius: var(--radius-sm);
		background: var(--bg-overlay);
		color: var(--text-primary);
		font-size: 1.125rem;
		font-weight: 700;
		cursor: pointer;
		transition: all var(--transition-fast);
	}
	.ctrl-btn:disabled { cursor: not-allowed; }
</style>