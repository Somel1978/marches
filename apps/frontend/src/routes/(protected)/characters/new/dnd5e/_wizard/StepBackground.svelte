<!-- apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/StepBackground.svelte -->
<!--
	Background browser plus the background's own feat pick (fixed or
	category-choice) and its skill/tool/language/save choice pools, all
	resolved inline instead of on separate ASI/Skills steps.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { SKILL_DISPLAY, STAT_ABBR } from '@core/ui/gamesystems/dnd5e/skills.ts';
	import type { WizardState } from './wizard-state.svelte.ts';
	import * as grants from './grants.ts';
	import ChoicePoolInline from './ChoicePoolInline.svelte';
	import FeatPickerInline from './FeatPickerInline.svelte';

	let { ws, sys, canViewDescriptions }: { ws: WizardState; sys: any; canViewDescriptions: boolean } = $props();

	const selectedBackground  = $derived(grants.selectedBackground(sys, ws));
	const filteredBackgrounds = $derived(grants.filteredBackgrounds(sys, ws));
	const bgFeatOptions       = $derived(grants.bgFeatOptions(sys, ws));

	const backgroundChoiceCount = $derived(grants.backgroundChoiceCount(sys, ws));
	const backgroundChoicePool  = $derived(grants.backgroundChoicePool(sys, ws));
	const allSaveChoices        = $derived(grants.allSaveChoices(sys, ws));
	const allToolChoices        = $derived(grants.allToolChoices(sys, ws));
	const allLanguageChoices    = $derived(grants.allLanguageChoices(sys, ws));
	const allDmgModChoices      = $derived(grants.allDmgModChoices(sys, ws));

	const bgSavePool = $derived(allSaveChoices.find(sc => sc.sourceId === 'bg-saves'));
	const bgToolPool = $derived(allToolChoices.find(tc => tc.sourceId === 'bg-tools'));
	const bgLangPool = $derived(allLanguageChoices.find(lc => lc.sourceId === 'bg-langs'));
	const bgDmgModPools = $derived(allDmgModChoices.filter(dc => dc.sourceType === 'Background'));

	// The background's own granted feat (bgFeatId fixed, or bgFeatPick chosen)
	// may itself grant a further choice pool — nested inline resolution.
	const nestedFeatSkillPools = $derived(grants.featSkillChoices(sys, ws).filter(fc => fc.originSourceKey === 'bg-feat'));
	const nestedFeatSavePools  = $derived(grants.featSaveChoices(sys, ws).filter(sc => sc.originSourceKey === 'bg-feat'));
	const nestedFeatToolPools  = $derived(allToolChoices.filter(tc => tc.originSourceKey === 'bg-feat'));
	const nestedFeatLangPools  = $derived(allLanguageChoices.filter(lc => lc.originSourceKey === 'bg-feat'));
	const nestedFeatExpertisePools = $derived(grants.allExpertiseChoices(sys, ws).filter(ec => ec.originSourceKey === 'bg-feat'));
	const nestedFeatDmgModPools = $derived(allDmgModChoices.filter(dc => dc.originSourceKey === 'bg-feat'));

	function randomBackground() {
		const pool = filteredBackgrounds.length ? filteredBackgrounds : (sys?.backgrounds ?? []);
		if (pool.length) ws.backgroundId = pool[Math.floor(Math.random() * pool.length)].id;
	}

	let prevBackgroundId = $state('');
	$effect(() => {
		const id = ws.backgroundId;
		if (!id) { prevBackgroundId = ''; return; }
		if (prevBackgroundId && prevBackgroundId !== id) {
			untrack(() => { ws.bgFeatPick = ''; });
		}
		prevBackgroundId = id;
	});
</script>

<div class="wiz-browser">

	<!-- List -->
	<div class="wiz-browser__list">
		<div class="wiz-browser__search">
			<input type="text" placeholder="Search backgrounds…" bind:value={ws.backgroundSearch} />
			<button type="button" class="btn btn-ghost btn-sm" title="Random background" onclick={randomBackground}>🎲</button>
		</div>
		<div class="wiz-browser__rows">
			{#each filteredBackgrounds as bg}
				<button type="button" class="wiz-row" class:wiz-row--selected={ws.backgroundId === bg.id}
					onclick={() => { ws.backgroundId = bg.id; }}>
					<div class="wiz-row__body">
						<p class="wiz-row__name">{bg.name}</p>
						<div class="wiz-row__sub">
							{#if (bg as any).grantsFeat}
								<span class="badge badge-accent" style="font-size:0.625rem;">🏅 {(bg as any).grantsFeat.name}</span>
							{:else if (bg as any).grantsFeatCategory}
								<span class="badge badge-accent" style="font-size:0.625rem;">{(bg as any).grantsFeatCategory} feat</span>
							{/if}
						</div>
					</div>
					{#if ws.backgroundId === bg.id}<span class="wiz-row__check">✓</span>{/if}
				</button>
			{:else}
				<p class="table__empty" style="padding:1rem 0.75rem;">No backgrounds match.</p>
			{/each}
		</div>
	</div>

	<!-- Detail panel -->
	<div class="wiz-browser__panel">
		{#if selectedBackground}
			{@const bg = selectedBackground as any}
			<h3 class="wiz-panel__title">{bg.name}</h3>

			{#if bg.shortDescription}
				<p class="wiz-panel__desc">{bg.shortDescription}</p>
			{/if}

			{#if bg.skillGrants?.length || bg.toolProficiencies || bg.languages || bg.grantsSkills || bg.grantsTools || bg.grantsLanguages}
				<div class="wiz-panel__section" style="margin-bottom:0.75rem;">
					<p class="wiz-panel__label" style="margin-bottom:6px;">Grants</p>
					<div style="display:flex;flex-direction:column;gap:4px;font-size:0.8125rem;color:var(--text-secondary);">
						{#if bg.skillGrants?.length}<span><strong>Skills:</strong> {bg.skillGrants.map((g: any) => SKILL_DISPLAY[g.skill] ?? g.skill).join(', ')}</span>{/if}
						{#if bg.grantsSkills}<span><strong>Skills:</strong> {bg.grantsSkills}</span>{/if}
						{#if bg.grantsTools}<span><strong>Tools:</strong> {bg.grantsTools}</span>{/if}
						{#if bg.grantsLanguages}<span><strong>Languages:</strong> {bg.grantsLanguages}</span>{/if}
					</div>
				</div>
			{/if}

			<!-- Fixed feat -->
			{#if bg.grantsFeatId && bg.grantsFeat}
				<div class="wiz-panel__section">
					<p class="wiz-panel__label" style="margin-bottom:6px;">Granted feat</p>
					<div style="border-left:3px solid var(--border-accent);background:var(--bg-surface);border-radius:0 var(--radius-md) var(--radius-md) 0;padding:8px 10px;">
						<p style="margin:0 0 3px;font-size:0.875rem;font-weight:700;color:var(--accent-light);">🏅 {bg.grantsFeat.name}</p>
						{#if canViewDescriptions && bg.grantsFeat.description}
							<p style="margin:0;font-size:0.8125rem;color:var(--text-secondary);line-height:1.5;">{bg.grantsFeat.description}</p>
						{:else if !canViewDescriptions}
							<p style="margin:0;font-size:0.8125rem;color:var(--text-muted);font-style:italic;">📖 Description not available — contact your DM.</p>
						{/if}
					</div>
				</div>

			<!-- Feat category pick -->
			{:else if bg.grantsFeatCategory}
				<div class="wiz-panel__section">
					<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
						<p class="wiz-panel__label" style="color:var(--accent-light);">⚠ Choose a {bg.grantsFeatCategory} feat</p>
						{#if !ws.bgFeatPick}<span style="font-size:0.75rem;color:var(--color-warning);">Required to continue</span>{/if}
					</div>
					<FeatPickerInline
						feats={bgFeatOptions}
						selectedId={ws.bgFeatPick}
						onSelect={(featId) => { ws.bgFeatPick = featId; }}
						bind:search={ws.bgFeatSearch}
						{canViewDescriptions} />
				</div>
			{/if}

			<!-- Nested: the background's own granted feat's further choice pools -->
			{#if bg.grantsFeatId || ws.bgFeatPick}
				{#each nestedFeatSkillPools as fc}
					<div class="wiz-panel__section"><ChoicePoolInline label="Feat: {fc.label}" count={fc.count} pool={fc.pool} chosen={ws.chosenPoolSkills[fc.sourceId] ?? []} onToggle={(v) => ws.togglePoolSkill(fc.sourceId, v, fc.count)} displayFn={(v) => SKILL_DISPLAY[v] ?? v} isDisabled={(v) => grants.isTakenElsewhere(sys, ws, v, fc.sourceId)} /></div>
				{/each}
				{#each nestedFeatSavePools as sc}
					<div class="wiz-panel__section"><ChoicePoolInline label="Feat save: {sc.label}" count={sc.count} pool={sc.pool} chosen={ws.chosenSavePools[sc.sourceId] ?? []} onToggle={(v) => ws.toggleSavePool(sc.sourceId, v, sc.count)} displayFn={(v) => STAT_ABBR[v] ?? v} /></div>
				{/each}
				{#each nestedFeatToolPools as tc}
					<div class="wiz-panel__section"><ChoicePoolInline label="Feat tools: {tc.label}" count={tc.count} pool={tc.pool} chosen={ws.chosenToolPools[tc.sourceId] ?? []} onToggle={(v) => ws.toggleToolPool(tc.sourceId, v, tc.count)} /></div>
				{/each}
				{#each nestedFeatLangPools as lc}
					<div class="wiz-panel__section"><ChoicePoolInline label="Feat languages: {lc.label}" count={lc.count} pool={lc.pool} chosen={ws.chosenLanguagePools[lc.sourceId] ?? []} onToggle={(v) => ws.toggleLanguagePool(lc.sourceId, v, lc.count)} /></div>
				{/each}
				{#each nestedFeatExpertisePools as ec}
					{@const pool = grants.effectiveExpertisePool(ec, sys, ws)}
					<div class="wiz-panel__section"><ChoicePoolInline label="Feat expertise: {ec.label}" count={ec.count} pool={pool} chosen={ws.chosenExpertisePools[ec.sourceId] ?? []} onToggle={(v) => ws.toggleExpertisePool(ec.sourceId, v, ec.count)} displayFn={(v) => SKILL_DISPLAY[v] ?? v} hint={pool.length ? '' : 'Choose proficient skills first'} /></div>
				{/each}
				{#each nestedFeatDmgModPools as dc}
					<div class="wiz-panel__section"><ChoicePoolInline label={dc.label} count={dc.count} pool={dc.pool} chosen={ws.chosenDmgMods[dc.sourceId] ?? []} onToggle={(v) => ws.toggleDmgModPool(dc.sourceId, v, dc.count)} /></div>
				{/each}
			{/if}

			<!-- Background's own skill/tool/language/save choice pools -->
			{#if backgroundChoiceCount > 0 && backgroundChoicePool.length > 0}
				<div class="wiz-panel__section">
					<ChoicePoolInline label="Skills" count={backgroundChoiceCount} pool={backgroundChoicePool}
						chosen={ws.chosenPoolSkills[ws.backgroundId ?? ''] ?? []}
						onToggle={(v) => ws.togglePoolSkill(ws.backgroundId ?? '', v, backgroundChoiceCount)}
						displayFn={(v) => SKILL_DISPLAY[v] ?? v}
						isDisabled={(v) => grants.isTakenElsewhere(sys, ws, v, ws.backgroundId ?? '')}
						hint="Choose {backgroundChoiceCount}" />
				</div>
			{/if}
			{#if bgSavePool}
				<div class="wiz-panel__section">
					<ChoicePoolInline label="Saving throws" count={bgSavePool.count} pool={bgSavePool.pool}
						chosen={ws.chosenSavePools[bgSavePool.sourceId] ?? []}
						onToggle={(v) => ws.toggleSavePool(bgSavePool.sourceId, v, bgSavePool.count)}
						displayFn={(v) => STAT_ABBR[v] ?? v} />
				</div>
			{/if}
			{#if bgToolPool}
				<div class="wiz-panel__section">
					<ChoicePoolInline label="Tools" count={bgToolPool.count} pool={bgToolPool.pool}
						chosen={ws.chosenToolPools[bgToolPool.sourceId] ?? []}
						onToggle={(v) => ws.toggleToolPool(bgToolPool.sourceId, v, bgToolPool.count)} />
				</div>
			{/if}
			{#if bgLangPool}
				<div class="wiz-panel__section">
					<ChoicePoolInline label="Languages" count={bgLangPool.count} pool={bgLangPool.pool}
						chosen={ws.chosenLanguagePools[bgLangPool.sourceId] ?? []}
						onToggle={(v) => ws.toggleLanguagePool(bgLangPool.sourceId, v, bgLangPool.count)} />
				</div>
			{/if}
			{#each bgDmgModPools as dc}
				<div class="wiz-panel__section">
					<ChoicePoolInline label={dc.label} count={dc.count} pool={dc.pool}
						chosen={ws.chosenDmgMods[dc.sourceId] ?? []}
						onToggle={(v) => ws.toggleDmgModPool(dc.sourceId, v, dc.count)} />
				</div>
			{/each}

		{:else}
			<div class="wiz-browser__empty">
				<span style="font-size:2rem;">📜</span>
				<p>Select a background to view details.</p>
			</div>
		{/if}
	</div>
</div>
