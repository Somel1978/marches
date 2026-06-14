<!-- shared/ui/src/gamesystems/dnd5e/Dnd5eAsiFeatsPanel.svelte -->
<script lang="ts">
	let {
		asiSlots       = [],
		availableFeats = [],
		chosenFeats    = [],
		onAddFeat,
		onRemoveFeat,
	}: {
		asiSlots?:       any[];
		availableFeats?: any[];
		chosenFeats?:    any[];
			onAddFeat?:      (featId: string, opts: { sourceClassId: string; sourceLevel: number; stat1?: string; amount1?: number; stat2?: string; amount2?: number; stat3?: string; amount3?: number }) => void;
		onRemoveFeat?:   (id: string) => void;
	} = $props();

	const STATS = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];

	// Per-slot UI state
	let slotModes   = $state<Record<string, 'asi' | 'asi2' | 'asi3' | 'feat'>>({});
	let asiStat     = $state<Record<string, string>>({});
	let asi2Stat1   = $state<Record<string, string>>({});
	let asi2Stat2   = $state<Record<string, string>>({});
	let featPick    = $state<Record<string, string>>({});
	let featSearch  = $state<Record<string, string>>({});
	let editing     = $state<Record<string, boolean>>({});

	function slotKey(slot: any) { return `${slot.sourceClassId}_${slot.sourceLevel}`; }
	import { isAsiFeatureName } from './feature-names.ts';
	let featGrantedStat = $state<Record<string, string>>({});
	let asi3Stat1   = $state<Record<string, string>>({});
	let asi3Stat2   = $state<Record<string, string>>({});
	let asi3Stat3   = $state<Record<string, string>>({});
	function mode(slot: any): 'asi' | 'asi2' | 'asi3' | 'feat' { return slotModes[slotKey(slot)] ?? 'asi'; }

	function filteredFeats(slot: any) {
		const key  = slotKey(slot);
		const q    = (featSearch[key] ?? '').toLowerCase();
		let list   = availableFeats.filter((f: any) => slot.type === 'epic_boon' ? f.isEpicBoon : true);
		if (q) list = list.filter((f: any) =>
			f.name.toLowerCase().includes(q) ||
			f.snippet?.toLowerCase().includes(q) ||
			f.categories?.toLowerCase().includes(q)
		);
		return list;
	}

	function saveSlot(slot: any) {
		const key = slotKey(slot);
		const m   = mode(slot);
		const opts = { sourceClassId: slot.sourceClassId, sourceLevel: slot.sourceLevel };

		if (m === 'feat' && featPick[key]) {
			const selectedFeat = availableFeats.find((f: any) => f.id === featPick[key]);
			if (isAsiFeatureName(selectedFeat?.name)) {
				return;
			}
			// Feat-granted ASI: pass stat1/amount1 if the feat grants one
			const asiAmount = selectedFeat?.asiAmount ?? null;
			const asiFixed  = selectedFeat?.asiStatFixed ?? null;
			const chosenStat = asiFixed || featGrantedStat[key] || undefined;
			if (asiAmount && !chosenStat) return; // need stat choice first
			onAddFeat?.(featPick[key], {
				...opts,
				...(asiAmount && chosenStat ? { stat1: chosenStat, amount1: asiAmount } : {}),
			});
			editing[key] = false;
		} else if (m === 'asi' && asiStat[key]) {
			// Find the ASI feat in catalog
			const asiFeat = availableFeats.find((f: any) => isAsiFeatureName(f.name));
			if (asiFeat) {
				onAddFeat?.(asiFeat.id, { ...opts, stat1: asiStat[key], amount1: 2 });
			}
			editing[key] = false;
		} else if (m === 'asi2' && asi2Stat1[key] && asi2Stat2[key]) {
			const asiFeat = availableFeats.find((f: any) => isAsiFeatureName(f.name));
			if (asiFeat) {
				onAddFeat?.(asiFeat.id, { ...opts, stat1: asi2Stat1[key], amount1: 1, stat2: asi2Stat2[key], amount2: 1 });
			}
			editing[key] = false;
		} else if (m === 'asi3' && asi3Stat1[key] && asi3Stat2[key] && asi3Stat3[key]) {
			const asiFeat = availableFeats.find((f: any) => isAsiFeatureName(f.name));
			if (asiFeat) {
				onAddFeat?.(asiFeat.id, { ...opts, stat1: asi3Stat1[key], amount1: 1, stat2: asi3Stat2[key], amount2: 1, stat3: asi3Stat3[key], amount3: 1 });
			}
			editing[key] = false;
		}
	}

	function editSlot(slot: any) {
		editing[slotKey(slot)] = true;
	}

	// Find chosen feat for a resolved feat slot
	function resolvedFeat(slot: any) {
		const r = slot.resolved;
		if (!r || r.kind !== 'feat') return null;
		return chosenFeats.find((cf: any) => cf.id === r.charFeatId) ?? null;
	}
</script>

{#if asiSlots.length > 0}
<div class="card">
	<h3 class="section-title">Ability Score Improvements & Feats</h3>

	<div style="display:flex; flex-direction:column; gap:0.5rem;">
		{#each asiSlots as slot}
			{@const key      = slotKey(slot)}
			{@const r        = slot.resolved}
			{@const isEditing = !r || editing[key]}

			<div style="padding:0.875rem; background:var(--bg-overlay); border-radius:var(--radius-md); border:1px solid {isEditing && !r ? 'var(--color-warning)' : 'var(--border-muted)'};">

				<!-- Slot header -->
				<div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem; margin-bottom:{isEditing ? '0.75rem' : '0'};">
					<div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
						<span style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--brand-accent);">{slot.sourceClass}</span>
						<span style="font-size:0.75rem; color:var(--text-muted);">Lv{slot.sourceLevel}</span>
						{#if slot.type === 'epic_boon'}
							<span style="font-size:0.6875rem; padding:0.125rem 0.4rem; background:var(--color-warning); color:#fff; border-radius:99px; font-weight:600;">Epic Boon</span>
						{:else if slot.canEpicBoon}
							<span style="font-size:0.6875rem; padding:0.125rem 0.4rem; background:var(--bg-muted); color:var(--color-warning); border-radius:99px;">Epic Boon eligible</span>
						{/if}
					</div>

					{#if r && !isEditing}
						{@const cf = chosenFeats.find((c: any) => c.id === r.charFeatId)}
						<!-- Resolved display -->
						<div style="display:flex; align-items:center; gap:0.75rem;">
							{#if r.kind === 'asi'}
								<span style="font-size:0.875rem; font-weight:600; color:var(--color-success);">⬆ Ability Score Improvement</span>
								<span style="font-size:0.75rem; color:var(--text-muted);">(see ability scores)</span>
								{#if onRemoveFeat && cf}
									<button onclick={() => onRemoveFeat?.(cf.id)}
										style="font-size:0.75rem; color:var(--color-danger); background:none; border:none; cursor:pointer; padding:0.125rem 0.375rem; border-radius:var(--radius-sm); border:1px solid var(--color-danger);">Remove</button>
								{/if}
							{:else if r.kind === 'feat'}
								<span style="font-size:0.875rem; font-weight:600; color:var(--color-success);">🏅 {cf?.feat?.name ?? r.featName ?? 'Feat chosen'}</span>
								{#if cf?.feat?.snippet}<span style="font-size:0.8125rem; color:var(--text-muted);">{cf.feat.snippet}</span>{/if}
								{#if onRemoveFeat && cf}
									<button onclick={() => onRemoveFeat?.(cf.id)}
										style="font-size:0.75rem; color:var(--color-danger); background:none; border:none; cursor:pointer; padding:0.125rem 0.375rem; border-radius:var(--radius-sm); border:1px solid var(--color-danger);">Remove</button>
								{/if}
							{/if}
							<button onclick={() => editSlot(slot)}
								style="font-size:0.75rem; color:var(--text-muted); background:none; border:1px solid var(--border-base); cursor:pointer; padding:0.125rem 0.5rem; border-radius:var(--radius-sm);">Edit</button>
						</div>
					{/if}
				</div>

				<!-- Picker — shown when pending or editing -->
				{#if isEditing}
					<!-- Mode selector -->
					{#if slot.type !== 'epic_boon'}
						<div style="display:flex; gap:0.375rem; margin-bottom:0.75rem; flex-wrap:wrap;">
							{#each [['asi','+2 One Stat'],['asi2','+1/+1 Two Stats'],['asi3','+1/+1/+1 Three Stats'],['feat','Feat']] as [val, label]}
								<button onclick={() => slotModes[key] = val as any}
									style="padding:0.25rem 0.75rem; border-radius:99px; border:1px solid {mode(slot) === val ? 'var(--brand-accent)' : 'var(--border-base)'}; background:{mode(slot) === val ? 'rgba(184,115,74,0.15)' : 'var(--bg-overlay)'}; color:{mode(slot) === val ? 'var(--brand-accent)' : 'var(--text-secondary)'}; font-size:0.75rem; font-weight:600; cursor:pointer;">
									{label}
								</button>
							{/each}
						</div>
					{/if}

					{#if mode(slot) === 'asi' && slot.type !== 'epic_boon'}
						<div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
							<span style="font-size:0.8125rem; color:var(--text-secondary);">+2 to</span>
							<select class="input input--select" style="width:160px;" bind:value={asiStat[key]}>
								<option value="">Select stat…</option>
								{#each STATS as stat}<option value={stat}>{stat}</option>{/each}
							</select>
							<button onclick={() => saveSlot(slot)} disabled={!asiStat[key]}
								style="padding:0.375rem 1rem; background:var(--brand-accent); color:#fff; border:none; border-radius:var(--radius-sm); font-size:0.8125rem; font-weight:600; cursor:pointer; opacity:{asiStat[key] ? 1 : 0.4};">
								Confirm
							</button>
							{#if r}<button onclick={() => { editing[key] = false; }} style="padding:0.375rem 0.75rem; background:none; border:1px solid var(--border-base); border-radius:var(--radius-sm); font-size:0.8125rem; cursor:pointer; color:var(--text-muted);">Cancel</button>{/if}
						</div>

					{:else if mode(slot) === 'asi2' && slot.type !== 'epic_boon'}
						<div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
							<select class="input input--select" style="width:150px;" bind:value={asi2Stat1[key]}>
								<option value="">First stat…</option>
								{#each STATS as stat}<option value={stat} disabled={stat === asi2Stat2[key]}>{stat}</option>{/each}
							</select>
							<span style="color:var(--text-muted);">/</span>
							<select class="input input--select" style="width:150px;" bind:value={asi2Stat2[key]}>
								<option value="">Second stat…</option>
								{#each STATS as stat}<option value={stat} disabled={stat === asi2Stat1[key]}>{stat}</option>{/each}
							</select>
							<button onclick={() => saveSlot(slot)} disabled={!asi2Stat1[key] || !asi2Stat2[key]}
								style="padding:0.375rem 1rem; background:var(--brand-accent); color:#fff; border:none; border-radius:var(--radius-sm); font-size:0.8125rem; font-weight:600; cursor:pointer; opacity:{asi2Stat1[key] && asi2Stat2[key] ? 1 : 0.4};">
								Confirm
							</button>
							{#if r}<button onclick={() => { editing[key] = false; }} style="padding:0.375rem 0.75rem; background:none; border:1px solid var(--border-base); border-radius:var(--radius-sm); font-size:0.8125rem; cursor:pointer; color:var(--text-muted);">Cancel</button>{/if}
						</div>

					{:else if mode(slot) === 'asi3' && slot.type !== 'epic_boon'}
						<div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
							<select class="input input--select" style="width:140px;" bind:value={asi3Stat1[key]}>
								<option value="">First stat…</option>
								{#each STATS as stat}<option value={stat} disabled={stat === asi3Stat2[key] || stat === asi3Stat3[key]}>{stat}</option>{/each}
							</select>
							<span style="color:var(--text-muted);">/</span>
							<select class="input input--select" style="width:140px;" bind:value={asi3Stat2[key]}>
								<option value="">Second stat…</option>
								{#each STATS as stat}<option value={stat} disabled={stat === asi3Stat1[key] || stat === asi3Stat3[key]}>{stat}</option>{/each}
							</select>
							<span style="color:var(--text-muted);">/</span>
							<select class="input input--select" style="width:140px;" bind:value={asi3Stat3[key]}>
								<option value="">Third stat…</option>
								{#each STATS as stat}<option value={stat} disabled={stat === asi3Stat1[key] || stat === asi3Stat2[key]}>{stat}</option>{/each}
							</select>
							<button onclick={() => saveSlot(slot)} disabled={!asi3Stat1[key] || !asi3Stat2[key] || !asi3Stat3[key]}
								style="padding:0.375rem 1rem; background:var(--brand-accent); color:#fff; border:none; border-radius:var(--radius-sm); font-size:0.8125rem; font-weight:600; cursor:pointer; opacity:{asi3Stat1[key] && asi3Stat2[key] && asi3Stat3[key] ? 1 : 0.4};">
								Confirm
							</button>
							{#if r}<button onclick={() => { editing[key] = false; }} style="padding:0.375rem 0.75rem; background:none; border:1px solid var(--border-base); border-radius:var(--radius-sm); font-size:0.8125rem; cursor:pointer; color:var(--text-muted);">Cancel</button>{/if}
						</div>
					{:else}
						<!-- Feat picker -->
						<div>
							<input type="text" class="input" placeholder="Search feats…" style="margin-bottom:0.5rem;"
								bind:value={featSearch[key]} />
							<div style="max-height:200px; overflow-y:auto; display:flex; flex-direction:column; gap:0.25rem;">
								{#each filteredFeats(slot) as feat}
									{@const alreadyTaken = !feat.repeatable && chosenFeats.some((cf: any) => cf.featId === feat.id)}
									<label style="display:flex; align-items:flex-start; gap:0.5rem; padding:0.5rem; background:{featPick[key] === feat.id ? 'rgba(184,115,74,0.12)' : 'var(--bg-muted)'}; border-radius:var(--radius-sm); cursor:{alreadyTaken ? 'not-allowed' : 'pointer'}; opacity:{alreadyTaken ? 0.5 : 1}; border:1px solid {featPick[key] === feat.id ? 'var(--brand-accent)' : 'transparent'};">
										<input type="radio" name="feat-{key}" value={feat.id}
											bind:group={featPick[key]} disabled={alreadyTaken}
											onchange={() => { featGrantedStat[key] = feat.asiStatFixed ?? ''; }}
											style="margin-top:2px; accent-color:var(--brand-accent);" />
										<div>
											<div style="display:flex; align-items:center; gap:0.375rem; flex-wrap:wrap;">
												<span style="font-size:0.875rem; font-weight:600;">{feat.name}</span>
												{#if feat.isEpicBoon}<span style="font-size:0.6875rem; padding:0.0625rem 0.375rem; background:var(--color-warning); color:#fff; border-radius:99px;">Epic Boon</span>{/if}
												{#if feat.repeatable}<span style="font-size:0.6875rem; padding:0.0625rem 0.375rem; background:var(--bg-overlay); color:var(--text-muted); border-radius:99px;">Repeatable</span>{/if}
												{#if feat.asiAmount}<span style="font-size:0.6875rem; padding:0.0625rem 0.375rem; background:rgba(34,197,94,0.15); color:var(--color-success); border-radius:99px;">+{feat.asiAmount} {feat.asiStatFixed ?? 'stat'}</span>{/if}
												{#if alreadyTaken}<span style="font-size:0.6875rem; color:var(--text-muted);">Already taken</span>{/if}
											</div>
											{#if feat.snippet}<p style="margin:0.125rem 0 0; font-size:0.8125rem; color:var(--text-secondary);">{feat.snippet}</p>{/if}
											{#if feat.prerequisites}<p style="margin:0.125rem 0 0; font-size:0.75rem; color:var(--text-muted);">Requires: {feat.prerequisites}</p>{/if}
										</div>
									</label>
								{:else}
									<p style="color:var(--text-muted); font-size:0.875rem; padding:0.5rem;">No feats match.</p>
								{/each}
							</div>
							{#if featPick[key]}
								{@const selFeat = availableFeats.find((f: any) => f.id === featPick[key])}
								{#if selFeat?.asiAmount && !selFeat?.asiStatFixed}
									{@const choices = selFeat.asiStatChoices ? selFeat.asiStatChoices.split(',').map((s: string) => s.trim()) : STATS}
									<div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.5rem; padding:0.5rem 0.625rem; background:var(--bg-overlay); border-radius:var(--radius-sm); border:1px solid var(--border-muted);">
										<span style="font-size:0.8125rem; color:var(--text-secondary); white-space:nowrap;">+{selFeat.asiAmount} to</span>
										<select class="input input--select" style="flex:1;" bind:value={featGrantedStat[key]}>
											<option value="">— Choose stat —</option>
											{#each choices as st}<option value={st}>{st.charAt(0)+st.slice(1).toLowerCase()}</option>{/each}
										</select>
									</div>
								{:else if selFeat?.asiAmount && selFeat?.asiStatFixed}
									<p style="font-size:0.8125rem; color:var(--color-success); margin:0.375rem 0 0;">✓ Grants +{selFeat.asiAmount} {selFeat.asiStatFixed.charAt(0)+selFeat.asiStatFixed.slice(1).toLowerCase()} automatically</p>
								{/if}
							{/if}
							{#if true}
								{@const selFeat2 = featPick[key] ? availableFeats.find((f: any) => f.id === featPick[key]) : null}
								{@const needsStat = selFeat2?.asiAmount && !selFeat2?.asiStatFixed && !featGrantedStat[key]}
								<div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
									<button onclick={() => saveSlot(slot)} disabled={!featPick[key] || !!needsStat}
										style="padding:0.375rem 1rem; background:var(--brand-accent); color:#fff; border:none; border-radius:var(--radius-sm); font-size:0.8125rem; font-weight:600; cursor:pointer; opacity:{featPick[key] && !needsStat ? 1 : 0.4};">
										Choose Feat
									</button>
									{#if r}<button onclick={() => { editing[key] = false; }} style="padding:0.375rem 0.75rem; background:none; border:1px solid var(--border-base); border-radius:var(--radius-sm); font-size:0.8125rem; cursor:pointer; color:var(--text-muted);">Cancel</button>{/if}
								</div>
							{/if}
						</div>
					{/if}
				{/if}
			</div>
		{/each}
	</div>
</div>
{/if}