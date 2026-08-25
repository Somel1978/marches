<!-- apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/AsiSlotInline.svelte -->
<script lang="ts">
	import { STATS, STAT_LABEL, type AsiChoice } from './types.ts';
	import { asiFeatSourceKey, featsForChoice } from './grants.ts';
	import type { WizardState } from './wizard-state.svelte.ts';
	import FeatPickerInline from './FeatPickerInline.svelte';
	import FeatNestedPoolsInline from './FeatNestedPoolsInline.svelte';

	let { choice, ws, sys, canViewDescriptions = true }: { choice: AsiChoice; ws: WizardState; sys: any; canViewDescriptions?: boolean } = $props();

	let search    = $state('');
	let previewId = $state('');

	const chosenFeat = $derived((sys?.feats ?? []).find((f: any) => f.id === choice.featId) ?? null);
	const candidateFeats = $derived(featsForChoice(sys, choice));
	const featSourceKey = $derived(asiFeatSourceKey(choice));

	function patch(p: Partial<AsiChoice>) {
		ws.updateAsiChoice(choice.sourceClassId, choice.sourceLevel, p);
	}

	function selectFeat(featId: string) {
		const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
		if (!feat) return;
		const next: Partial<AsiChoice> = { featId: feat.id, mode: choice.type === 'epic_boon' ? choice.mode : 'feat' };
		if (feat.asiStatFixed) {
			next.stat1 = feat.asiStatFixed;
			next.amount1 = feat.asiAmount ?? 1;
			next.featGrantedStat = feat.asiStatFixed;
		} else if (feat.asiAmount) {
			next.amount1 = feat.asiAmount ?? 1;
		}
		patch(next);
	}
</script>

<div class="card" style="padding:0.875rem;">
	<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.875rem;flex-wrap:wrap;gap:0.5rem;">
		<p style="margin:0;font-size:0.8125rem;font-weight:700;">
			{choice.sourceName} <span style="color:var(--text-muted);font-weight:400;">· Level {choice.sourceLevel}</span>
			{#if choice.type === 'epic_boon'}<span class="badge badge-warning" style="margin-left:6px;">Epic Boon</span>{/if}
		</p>
		{#if choice.mode && (choice.featId || (choice.mode === 'stat' && choice.stat1))}
			<span style="font-size:0.75rem;color:var(--color-success);">
				✓ {choice.mode === 'feat' || choice.type === 'epic_boon' ? (chosenFeat?.name ?? '') : `${STAT_LABEL[choice.stat1] ?? '—'} +${choice.amount1}${choice.stat2 ? `, ${STAT_LABEL[choice.stat2]} +${choice.amount2}` : ''}`}
			</span>
		{:else if choice.mode === 'feat' || choice.type === 'epic_boon'}
			<span style="font-size:0.75rem;color:var(--text-muted);">Select a feat from the list below</span>
		{/if}
	</div>

	{#if choice.type !== 'epic_boon'}
		<div class="wiz-toggle" style="margin-bottom:0.875rem;">
			<button type="button" class="wiz-toggle__btn" class:wiz-toggle__btn--active={choice.mode === 'stat'}
				onclick={() => patch({ mode: 'stat', featId: '', featGrantedStat: '' })}>ASI (+2 or +1/+1)</button>
			<button type="button" class="wiz-toggle__btn" class:wiz-toggle__btn--active={choice.mode === 'feat'}
				onclick={() => patch({ mode: 'feat', stat1: '', stat2: '', amount2: 0 })}>Choose a feat</button>
		</div>
	{/if}

	{#if choice.mode === 'stat'}
		<div style="display:flex;gap:0.625rem;flex-wrap:wrap;align-items:flex-end;">
			<div class="field" style="flex:0 0 110px;margin:0;">
				<label class="label" for="asi-stat1-{choice.sourceClassId}-{choice.sourceLevel}">Stat</label>
				<select id="asi-stat1-{choice.sourceClassId}-{choice.sourceLevel}" class="input input--select" value={choice.stat1}
					onchange={(e) => patch({ stat1: (e.currentTarget as HTMLSelectElement).value })}>
					<option value="">Choose…</option>
					{#each STATS as st}<option value={st}>{STAT_LABEL[st]}</option>{/each}
				</select>
			</div>
			<div class="field" style="flex:0 0 80px;margin:0;">
				<label class="label" for="asi-amt1-{choice.sourceClassId}-{choice.sourceLevel}">Amount</label>
				<select id="asi-amt1-{choice.sourceClassId}-{choice.sourceLevel}" class="input input--select" value={String(choice.amount1)}
					onchange={(e) => {
						const v = parseInt((e.currentTarget as HTMLSelectElement).value, 10);
						patch(v === 2 ? { amount1: v, stat2: '', amount2: 0 } : { amount1: v });
					}}>
					<option value="2">+2</option>
					<option value="1">+1</option>
				</select>
			</div>
			{#if choice.amount1 === 1}
				<div class="field" style="flex:0 0 110px;margin:0;">
					<label class="label" for="asi-stat2-{choice.sourceClassId}-{choice.sourceLevel}">Second stat</label>
					<select id="asi-stat2-{choice.sourceClassId}-{choice.sourceLevel}" class="input input--select" value={choice.stat2}
						onchange={(e) => patch({ stat2: (e.currentTarget as HTMLSelectElement).value, amount2: 1 })}>
						<option value="">Choose…</option>
						{#each STATS.filter(s => s !== choice.stat1) as st}<option value={st}>{STAT_LABEL[st]}</option>{/each}
					</select>
				</div>
			{/if}
		</div>

	{:else if choice.mode === 'feat' || choice.type === 'epic_boon'}
		{#if choice.featId}
			<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.625rem;padding:8px 10px;background:var(--bg-overlay);border-radius:var(--radius-md);">
				<span style="font-size:0.875rem;font-weight:700;flex:1;">{chosenFeat?.name ?? '—'}</span>
				<button type="button" class="btn btn-ghost btn-xs" onclick={() => patch({ featId: '', featGrantedStat: '', stat1: '', amount1: 0 })}>Change</button>
			</div>
			{#if chosenFeat?.asiAmount && !chosenFeat.asiStatFixed && !choice.featGrantedStat}
				<div class="field" style="margin-top:0.5rem;">
					<label class="label" for="asi-feat-stat-{choice.sourceClassId}-{choice.sourceLevel}">Choose stat for +{chosenFeat.asiAmount}</label>
					<select id="asi-feat-stat-{choice.sourceClassId}-{choice.sourceLevel}" class="input input--select" value={choice.featGrantedStat}
						onchange={(e) => {
							const stat = (e.currentTarget as HTMLSelectElement).value;
							patch({ featGrantedStat: stat, stat1: stat, amount1: chosenFeat?.asiAmount ?? 0 });
						}}>
						<option value="">Choose stat…</option>
						{#each STATS as st}<option value={st}>{STAT_LABEL[st]}</option>{/each}
					</select>
				</div>
			{/if}
			<FeatNestedPoolsInline {sys} {ws} sourceKey={featSourceKey} />
		{:else}
			<FeatPickerInline
				feats={candidateFeats}
				selectedId={choice.featId}
				onSelect={selectFeat}
				bind:search
				bind:previewId
				mode="preview"
				{canViewDescriptions}
				searchPlaceholder="Search feats…"
				emptyHint="Click a feat on the left to preview it, then click Select to confirm." />
		{/if}
	{/if}
</div>
