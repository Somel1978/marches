<!-- apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/StepSpecies.svelte -->
<!--
	Species browser plus, per trait card: a FeatPickerInline for trait feat
	grants and ChoicePoolInline pickers for trait skill/tool/language/save/
	expertise/damage-modifier choice pools — all resolved right where the
	trait that grants them is shown, instead of on a separate Skills step.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { SKILL_DISPLAY, STAT_ABBR } from '@core/ui/gamesystems/dnd5e/skills.ts';
	import type { WizardState } from './wizard-state.svelte.ts';
	import type { ChoicePoolSpec } from './types.ts';
	import * as grants from './grants.ts';
	import ChoicePoolInline from './ChoicePoolInline.svelte';
	import FeatPickerInline from './FeatPickerInline.svelte';

	let { ws, sys, canViewDescriptions }: { ws: WizardState; sys: any; canViewDescriptions: boolean } = $props();

	const selectedSpecies = $derived(grants.selectedSpecies(sys, ws));
	const filteredSpecies = $derived(grants.filteredSpecies(sys, ws));
	const sizeChoiceOptions = $derived(grants.sizeChoiceOptions(sys, ws));

	const featGrantSources = $derived(grants.allFeatureGrantSources(sys, ws).filter(src => src.sourceKey.startsWith('st-')));
	const featSkillChoices  = $derived(grants.featSkillChoices(sys, ws));
	const featSaveChoices   = $derived(grants.featSaveChoices(sys, ws));
	const allToolChoices       = $derived(grants.allToolChoices(sys, ws));
	const allLanguageChoices   = $derived(grants.allLanguageChoices(sys, ws));
	const allExpertiseChoices  = $derived(grants.allExpertiseChoices(sys, ws));
	const allDmgModChoices     = $derived(grants.allDmgModChoices(sys, ws));
	const speciesSaveChoices   = $derived(grants.speciesSaveChoices(sys, ws));
	const speciesFixedSkills    = $derived(grants.speciesFixedSkills(sys, ws));
	const speciesAutoExpertise  = $derived(grants.speciesAutoExpertise(sys, ws));
	const speciesAutoHalfSkills = $derived(grants.speciesAutoHalfSkills(sys, ws));

	function randomSpecies() {
		const pool = filteredSpecies.length ? filteredSpecies : (sys?.species ?? []);
		if (pool.length) ws.speciesId = pool[Math.floor(Math.random() * pool.length)].id;
	}

	// Drop species-scoped picks when the player switches species so stale pool
	// keys from a prior selection cannot block step advancement.
	let prevSpeciesId = $state('');
	$effect(() => {
		const id = ws.speciesId;
		if (!id) { prevSpeciesId = ''; return; }
		if (prevSpeciesId && prevSpeciesId !== id) {
			untrack(() => {
				ws.chosenSize = '';
				ws.featureFeatPicks = Object.fromEntries(
					Object.entries(ws.featureFeatPicks).filter(([k]) => !k.startsWith('st-'))
				);
			});
		}
		prevSpeciesId = id;
	});

	// Pools/feats sourced from a given trait's own feat grant (nested resolution:
	// a species trait grants a feat, and that feat itself grants a choice pool).
	function featDrivenPools(sourceKey: string) {
		return {
			skill: featSkillChoices.filter(fc => fc.originSourceKey === sourceKey),
			save: featSaveChoices.filter(sc => sc.originSourceKey === sourceKey),
			tool: allToolChoices.filter(tc => tc.originSourceKey === sourceKey),
			language: allLanguageChoices.filter(lc => lc.originSourceKey === sourceKey),
			expertise: allExpertiseChoices.filter(ec => ec.originSourceKey === sourceKey),
			dmgMod: allDmgModChoices.filter(dc => dc.originSourceKey === sourceKey),
		};
	}

	function expertisePool(ec: ChoicePoolSpec) {
		return grants.effectiveExpertisePool(ec, sys, ws);
	}
</script>

<div class="wiz-browser">

	<!-- List -->
	<div class="wiz-browser__list">
		<div class="wiz-browser__search">
			<input type="text" placeholder="Search species…" bind:value={ws.speciesSearch} />
			<button type="button" class="btn btn-ghost btn-sm" title="Random species" onclick={randomSpecies}>🎲</button>
		</div>
		<div class="wiz-browser__rows">
			{#each filteredSpecies as sp}
				<button type="button" class="wiz-row" class:wiz-row--selected={ws.speciesId === sp.id}
					onclick={() => { ws.speciesId = sp.id; }}>
					<div class="wiz-row__av">
						{#if (sp as any).avatarUrl}<img src={(sp as any).avatarUrl} alt={sp.name} />{:else}🧝{/if}
					</div>
					<div class="wiz-row__body">
						<p class="wiz-row__name">{sp.name}</p>
						<div class="wiz-row__sub">
							{#if sp.isLegacy}<span class="badge badge-warning" style="font-size:0.625rem;">Legacy</span>{/if}
							{#if sp.isSubrace}<span class="badge badge-muted" style="font-size:0.625rem;">Subrace</span>{/if}
						</div>
					</div>
					{#if ws.speciesId === sp.id}<span class="wiz-row__check">✓</span>{/if}
				</button>
			{:else}
				<p class="table__empty" style="padding:1rem 0.75rem;">No species match.</p>
			{/each}
		</div>
	</div>

	<!-- Detail panel -->
	<div class="wiz-browser__panel">
		{#if selectedSpecies}
			<div style="display:flex;align-items:flex-start;gap:0.875rem;margin-bottom:0.875rem;">
				<div class="wiz-row__av" style="width:52px;height:52px;font-size:1.5rem;flex-shrink:0;">
					{#if (selectedSpecies as any).avatarUrl}<img src={(selectedSpecies as any).avatarUrl} alt={selectedSpecies.name} />{:else}🧝{/if}
				</div>
				<div>
					<h3 class="wiz-panel__title">{selectedSpecies.name}</h3>
					<div class="panel-badges" style="display:flex;gap:4px;flex-wrap:wrap;">
						{#if selectedSpecies.isLegacy}<span class="badge badge-warning">Legacy</span>{/if}
						{#if selectedSpecies.isSubrace}<span class="badge badge-muted">Subrace</span>{/if}
						{#each (selectedSpecies.traits ?? []) as t}
							{#if (t as any).size}<span class="badge badge-muted">{(t as any).size}</span>{/if}
							{#each ((t as any).speeds ?? []) as sp}<span class="badge badge-muted">{sp.movementType.charAt(0) + sp.movementType.slice(1).toLowerCase()} {sp.speed} ft</span>{/each}
							{#if (t as any).senses}<span class="badge badge-muted">👁 {(t as any).senses}</span>{/if}
							{#if (t as any).grantsSenses}<span class="badge badge-muted">👁 {(t as any).grantsSenses}</span>{/if}
						{/each}
					</div>
				</div>
			</div>

			{#if canViewDescriptions && selectedSpecies.description}
				<p class="wiz-panel__desc">{selectedSpecies.description}</p>
			{/if}

			<!-- Auto-granted skills/expertise summary -->
			{#if speciesFixedSkills.length || speciesAutoExpertise.length || speciesAutoHalfSkills.length}
				<div class="wiz-panel__section" style="margin-bottom:0.75rem;">
					<p class="wiz-panel__label" style="margin-bottom:6px;">Auto-granted</p>
					<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
						{#each speciesFixedSkills as skill}<span class="badge badge-muted">{SKILL_DISPLAY[skill] ?? skill}</span>{/each}
						{#each speciesAutoExpertise as { skill }}<span class="badge badge-accent">{SKILL_DISPLAY[skill] ?? skill} ×2</span>{/each}
						{#each speciesAutoHalfSkills as { skill }}<span class="badge badge-muted">{skill === '*' ? 'All skills' : (SKILL_DISPLAY[skill] ?? skill)} ½</span>{/each}
					</div>
				</div>
			{/if}

			<!-- Size choice picker -->
			{#if sizeChoiceOptions.length > 0}
				<div class="wiz-pool" style="margin-bottom:0.75rem;">
					<div class="wiz-pool__header">
						<span class="wiz-pool__label">Choose your size</span>
						<span class="wiz-pool__count" class:wiz-pool__count--done={!!ws.chosenSize}>{ws.chosenSize ? '1 / 1 ✓' : '0 / 1'}</span>
					</div>
					<div class="wiz-chip-group">
						{#each sizeChoiceOptions as opt}
							<button type="button" class="wiz-chip" class:wiz-chip--chosen={ws.chosenSize === opt}
								onclick={() => { ws.chosenSize = opt; }}>{opt}</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Traits -->
			{#if selectedSpecies.traits?.length}
				<p class="wiz-panel__label">Traits</p>
				<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:0.75rem;">
					{#each selectedSpecies.traits as t}
						{@const atCreation = (t.requiredLevel ?? 1) <= 1}
						{@const sourceKey = `st-${t.id}`}
						{@const featSrc = featGrantSources.find(s => s.sourceKey === sourceKey)}
						{@const traitSkillPool = (t.skillChoiceCount && t.skillChoicePool) ? t.skillChoicePool.split(',').map((s: string) => s.trim()).filter(Boolean) : []}
						{@const traitSavePoolSpec = speciesSaveChoices.find(sc => sc.sourceId === `${t.id}-saves`)}
						{@const traitToolPoolSpec = allToolChoices.find(tc => tc.sourceId === `${t.id}-tools`)}
						{@const traitLangPoolSpec = allLanguageChoices.find(lc => lc.sourceId === `${t.id}-langs`)}
						{@const traitExpertisePoolSpec = allExpertiseChoices.find(ec => ec.sourceId === `${t.id}-expertise`)}
						{@const traitDmgModPools = allDmgModChoices.filter(dc => dc.sourceId.startsWith(`${t.id}-`))}
						{@const pickedFeatId = featSrc ? (featSrc.fixedFeatId ?? ws.featureFeatPicks[featSrc.sourceKey]) : ''}
						{@const nestedPools = featSrc ? featDrivenPools(featSrc.sourceKey) : null}
						<div class="trait-card" style="border-left:3px solid var(--border-accent);background:var(--bg-surface);border-radius:0 var(--radius-md) var(--radius-md) 0;padding:8px 10px;">
							<p style="margin:0 0 3px;font-size:0.8125rem;font-weight:700;color:var(--accent-light);">
								{t.name}{#if (t as any).requiredLevel > 1} <span style="font-weight:400;color:var(--text-muted);">(Lv {(t as any).requiredLevel})</span>{/if}
							</p>
							{#if canViewDescriptions && t.description}
								<p style="margin:0;font-size:0.8125rem;color:var(--text-secondary);line-height:1.5;">{t.description}</p>
							{:else if !canViewDescriptions}
								<p style="margin:0;font-size:0.8125rem;color:var(--text-muted);font-style:italic;">📖 Description not available — contact your DM.</p>
							{/if}

							<!-- Trait feat grant + choice pools (creation-time traits only) -->
							{#if atCreation && featSrc}
								<div style="margin-top:8px;">
									<p class="label" style="margin-bottom:0.375rem;">
										🏅 <strong>Granted feat</strong>
										{#if featSrc.category}<span style="font-size:0.75rem;color:var(--text-muted);"> — Choose a {featSrc.category} feat</span>{/if}
									</p>
									{#if featSrc.fixedFeatId}
										{@const fixedFeat = (sys?.feats ?? []).find((f: any) => f.id === featSrc.fixedFeatId)}
										{#if fixedFeat}
											<div style="border-left:3px solid var(--border-accent);background:var(--bg-overlay);border-radius:0 var(--radius-md) var(--radius-md) 0;padding:8px 10px;">
												<p style="margin:0 0 3px;font-size:0.875rem;font-weight:700;color:var(--accent-light);">🏅 {fixedFeat.name}</p>
												{#if canViewDescriptions && fixedFeat.description}<p style="margin:0;font-size:0.8125rem;color:var(--text-secondary);line-height:1.5;">{fixedFeat.description}</p>{/if}
											</div>
										{/if}
									{:else if featSrc.category}
										<FeatPickerInline
											feats={grants.featsForCategory(sys, featSrc.category)}
											selectedId={pickedFeatId}
											onSelect={(featId) => { ws.featureFeatPicks = { ...ws.featureFeatPicks, [featSrc.sourceKey]: featId }; }}
											bind:search={ws.featureFeatSearch[featSrc.sourceKey]}
											{canViewDescriptions} />
									{/if}
									<!-- Nested: the granted feat's own choice pools -->
									{#if pickedFeatId && nestedPools}
										{#each nestedPools.skill as fc}
											<div style="margin-top:8px;"><ChoicePoolInline label="Feat: {fc.label}" count={fc.count} pool={fc.pool} chosen={ws.chosenPoolSkills[fc.sourceId] ?? []} onToggle={(v) => ws.togglePoolSkill(fc.sourceId, v, fc.count)} displayFn={(v) => SKILL_DISPLAY[v] ?? v} isDisabled={(v) => grants.isTakenElsewhere(sys, ws, v, fc.sourceId)} /></div>
										{/each}
										{#each nestedPools.save as sc}
											<div style="margin-top:8px;"><ChoicePoolInline label="Feat save: {sc.label}" count={sc.count} pool={sc.pool} chosen={ws.chosenSavePools[sc.sourceId] ?? []} onToggle={(v) => ws.toggleSavePool(sc.sourceId, v, sc.count)} displayFn={(v) => STAT_ABBR[v] ?? v} /></div>
										{/each}
										{#each nestedPools.tool as tc}
											<div style="margin-top:8px;"><ChoicePoolInline label="Feat tools: {tc.label}" count={tc.count} pool={tc.pool} chosen={ws.chosenToolPools[tc.sourceId] ?? []} onToggle={(v) => ws.toggleToolPool(tc.sourceId, v, tc.count)} /></div>
										{/each}
										{#each nestedPools.language as lc}
											<div style="margin-top:8px;"><ChoicePoolInline label="Feat languages: {lc.label}" count={lc.count} pool={lc.pool} chosen={ws.chosenLanguagePools[lc.sourceId] ?? []} onToggle={(v) => ws.toggleLanguagePool(lc.sourceId, v, lc.count)} /></div>
										{/each}
										{#each nestedPools.expertise as ec}
											{@const pool = expertisePool(ec)}
											<div style="margin-top:8px;"><ChoicePoolInline label="Feat expertise: {ec.label}" count={ec.count} pool={pool} chosen={ws.chosenExpertisePools[ec.sourceId] ?? []} onToggle={(v) => ws.toggleExpertisePool(ec.sourceId, v, ec.count)} displayFn={(v) => SKILL_DISPLAY[v] ?? v} hint={pool.length ? '' : 'Choose proficient skills first'} /></div>
										{/each}
										{#each nestedPools.dmgMod as dc}
											<div style="margin-top:8px;"><ChoicePoolInline label={dc.label} count={dc.count} pool={dc.pool} chosen={ws.chosenDmgMods[dc.sourceId] ?? []} onToggle={(v) => ws.toggleDmgModPool(dc.sourceId, v, dc.count)} /></div>
										{/each}
									{/if}
								</div>
							{/if}

							<!-- Trait's own choice pools (creation-time only) -->
							{#if atCreation && traitSkillPool.length}
								<div style="margin-top:8px;">
									<ChoicePoolInline label="Skills" count={t.skillChoiceCount} pool={traitSkillPool}
										chosen={ws.chosenPoolSkills[t.id] ?? []}
										onToggle={(v) => ws.togglePoolSkill(t.id, v, t.skillChoiceCount)}
										displayFn={(v) => SKILL_DISPLAY[v] ?? v}
										isDisabled={(v) => grants.isTakenElsewhere(sys, ws, v, t.id)} />
								</div>
							{/if}
							{#if atCreation && traitSavePoolSpec}
								<div style="margin-top:8px;">
									<ChoicePoolInline label="Saving throws" count={traitSavePoolSpec.count} pool={traitSavePoolSpec.pool}
										chosen={ws.chosenSavePools[traitSavePoolSpec.sourceId] ?? []}
										onToggle={(v) => ws.toggleSavePool(traitSavePoolSpec.sourceId, v, traitSavePoolSpec.count)}
										displayFn={(v) => STAT_ABBR[v] ?? v} />
								</div>
							{/if}
							{#if atCreation && traitToolPoolSpec}
								<div style="margin-top:8px;">
									<ChoicePoolInline label="Tools" count={traitToolPoolSpec.count} pool={traitToolPoolSpec.pool}
										chosen={ws.chosenToolPools[traitToolPoolSpec.sourceId] ?? []}
										onToggle={(v) => ws.toggleToolPool(traitToolPoolSpec.sourceId, v, traitToolPoolSpec.count)} />
								</div>
							{/if}
							{#if atCreation && traitLangPoolSpec}
								<div style="margin-top:8px;">
									<ChoicePoolInline label="Languages" count={traitLangPoolSpec.count} pool={traitLangPoolSpec.pool}
										chosen={ws.chosenLanguagePools[traitLangPoolSpec.sourceId] ?? []}
										onToggle={(v) => ws.toggleLanguagePool(traitLangPoolSpec.sourceId, v, traitLangPoolSpec.count)} />
								</div>
							{/if}
							{#if atCreation && traitExpertisePoolSpec}
								{@const pool = expertisePool(traitExpertisePoolSpec)}
								<div style="margin-top:8px;">
									<ChoicePoolInline label="Expertise" count={traitExpertisePoolSpec.count} pool={pool}
										chosen={ws.chosenExpertisePools[traitExpertisePoolSpec.sourceId] ?? []}
										onToggle={(v) => ws.toggleExpertisePool(traitExpertisePoolSpec.sourceId, v, traitExpertisePoolSpec.count)}
										displayFn={(v) => SKILL_DISPLAY[v] ?? v}
										hint={pool.length ? '' : 'Choose proficient skills first'} />
								</div>
							{/if}
							{#if atCreation}
								{#each traitDmgModPools as dc}
									<div style="margin-top:8px;">
										<ChoicePoolInline label={dc.label} count={dc.count} pool={dc.pool}
											chosen={ws.chosenDmgMods[dc.sourceId] ?? []}
											onToggle={(v) => ws.toggleDmgModPool(dc.sourceId, v, dc.count)} />
									</div>
								{/each}
							{/if}
						</div>
					{/each}
				</div>
			{/if}

		{:else}
			<div class="wiz-browser__empty">
				<span style="font-size:2rem;">🧝</span>
				<p>Select a species to view details.</p>
			</div>
		{/if}
	</div>
</div>
