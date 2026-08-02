<!-- apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/StepClasses.svelte -->
<!--
	Class/subclass browser (informational feature timeline, unchanged) plus an
	interactive per-allocated-class feature timeline: any class/subclass
	feature that grants a feat, a skill/tool/language/save/expertise pool, or
	is an ASI/Epic Boon slot renders its resolver directly under that feature
	once the class is allocated to a high-enough level. The base class skill
	pool (from the first allocated class) is shown right under "Your classes".
-->
<script lang="ts">
	import { DescriptionText } from '@core/ui';
	import { SKILL_DISPLAY, STAT_ABBR } from '@core/ui/gamesystems/dnd5e/skills.ts';
	import type { WizardState } from './wizard-state.svelte.ts';
	import type { ChoicePoolSpec } from './types.ts';
	import * as grants from './grants.ts';
	import ChoicePoolInline from './ChoicePoolInline.svelte';
	import FeatPickerInline from './FeatPickerInline.svelte';
	import AsiSlotInline from './AsiSlotInline.svelte';

	let { ws, sys, canViewDescriptions }: { ws: WizardState; sys: any; canViewDescriptions: boolean } = $props();

	const filteredClasses = $derived((sys?.classes ?? []).filter((c: any) => c.isAvailable && (!ws.classSearch || c.name.toLowerCase().includes(ws.classSearch.toLowerCase()))));
	const browseClass = $derived((sys?.classes ?? []).find((c: any) => c.id === ws.browseClassId) ?? null);
	const browseSub   = $derived((browseClass as any)?.subclasses?.find((s: any) => s.id === ws.browseSubId) ?? null);
	const browseTimeline = $derived(grants.featureTimeline(sys, ws.browseClassId, ws.browseSubId));

	const classSkillPool       = $derived(grants.classSkillPool(sys, ws));
	const classSkillCount      = $derived(grants.classSkillCount(sys, ws));
	const availableClassSkills = $derived(grants.availableClassSkills(sys, ws));
	const selectedClass0       = $derived(grants.selectedClass0(sys, ws));

	const allFeatureGrantSources = $derived(grants.allFeatureGrantSources(sys, ws).filter(s => s.sourceKey.startsWith('cf-') || s.sourceKey.startsWith('sf-')));
	const featureChoices    = $derived(grants.featureChoices(sys, ws));
	const featureSaveChoices = $derived(grants.featureSaveChoices(sys, ws));
	const featureToolChoices = $derived(grants.featureToolChoices(sys, ws));
	const featureLanguageChoices = $derived(grants.featureLanguageChoices(sys, ws));
	const allExpertiseChoices = $derived(grants.allExpertiseChoices(sys, ws));
	const allDmgModChoices    = $derived(grants.allDmgModChoices(sys, ws));
	const featSkillChoices    = $derived(grants.featSkillChoices(sys, ws));
	const featSaveChoices     = $derived(grants.featSaveChoices(sys, ws));
	const allToolChoices      = $derived(grants.allToolChoices(sys, ws));
	const allLanguageChoices  = $derived(grants.allLanguageChoices(sys, ws));

	function subclassesFor(classId: string, level: number) { return grants.subclassesFor(sys, classId, level); }

	// Every feature (class + subclass, up to allocatedLevel) for one allocation, sorted.
	function allocFeatures(alloc: { classId: string; subclassId: string; allocatedLevel: number }) {
		const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
		if (!cls) return [];
		const sub = (cls.subclasses ?? []).find((s: any) => s.id === alloc.subclassId);
		const rows = [
			...(cls.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel).map((f: any) => ({ ...f, sourceKey: `cf-${f.id}`, sourceLabel: cls.name, sourceType: 'ClassFeature' as const })),
			...((sub?.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel).map((f: any) => ({ ...f, sourceKey: `sf-${f.id}`, sourceLabel: sub!.name, sourceType: 'SubclassFeature' as const }))),
		];
		return rows.sort((a, b) => a.requiredLevel - b.requiredLevel || a.name.localeCompare(b.name));
	}

	// Everything a given feature might need resolved, gathered from the grants bundle.
	function resolversFor(alloc: { classId: string; subclassId: string; allocatedLevel: number }, feature: any) {
		const featSrc = allFeatureGrantSources.find(s => s.sourceKey === feature.sourceKey);
		const pickedFeatId = featSrc ? (featSrc.fixedFeatId ?? ws.featureFeatPicks[featSrc.sourceKey]) : '';
		const asi = ws.asiChoices.find(c => c.sourceClassId === alloc.classId && c.sourceLevel === feature.requiredLevel);
		return {
			featSrc,
			pickedFeatId,
			asi,
			skillPools: featureChoices.filter(fc => fc.sourceId === feature.id),
			savePools: featureSaveChoices.filter(sc => sc.sourceId === `${feature.id}-saves`),
			toolPools: featureToolChoices.filter(tc => tc.sourceId === `${feature.id}-tools`),
			languagePools: featureLanguageChoices.filter(lc => lc.sourceId === `${feature.id}-langs`),
			expertisePools: allExpertiseChoices.filter(ec => ec.sourceId === `${feature.id}-expertise`),
			dmgModPools: allDmgModChoices.filter(dc => dc.sourceType === feature.sourceType && dc.sourceId.startsWith(`${feature.id}-`)),
			nested: featSrc ? {
				skill: featSkillChoices.filter(fc => fc.originSourceKey === featSrc.sourceKey),
				save: featSaveChoices.filter(sc => sc.originSourceKey === featSrc.sourceKey),
				tool: allToolChoices.filter(tc => tc.originSourceKey === featSrc.sourceKey),
				language: allLanguageChoices.filter(lc => lc.originSourceKey === featSrc.sourceKey),
				expertise: allExpertiseChoices.filter(ec => ec.originSourceKey === featSrc.sourceKey),
				dmgMod: allDmgModChoices.filter(dc => dc.originSourceKey === featSrc.sourceKey),
			} : null,
		};
	}
	function hasAnyResolver(r: ReturnType<typeof resolversFor>) {
		return !!r.featSrc || !!r.asi || r.skillPools.length || r.savePools.length || r.toolPools.length || r.languagePools.length || r.expertisePools.length || r.dmgModPools.length;
	}

	function randomClass() {
		const pool = (filteredClasses.length ? filteredClasses : (sys?.classes ?? []).filter((c: any) => c.isAvailable))
			.filter((c: any) => !ws.classAllocs.find((a: any) => a.classId === c.id));
		if (!pool.length) return;
		const cls = pool[Math.floor(Math.random() * pool.length)];
		ws.classAllocs = [...ws.classAllocs, { classId: cls.id, subclassId: '', allocatedLevel: 1 }];
	}

	function expertisePool(ec: ChoicePoolSpec) {
		return grants.effectiveExpertisePool(ec, sys, ws);
	}
</script>

<div style="display:flex;flex-direction:column;gap:1rem;">

	<!-- Your classes (allocated) -->
	{#if ws.classAllocs.length}
		<div class="card" style="padding:0.875rem;">
			<p class="wiz-pool__label" style="margin-bottom:0.625rem;">Your classes</p>
			<div style="display:flex;flex-direction:column;gap:0.375rem;">
				{#each ws.classAllocs as a, i}
					{@const cls = (sys?.classes ?? []).find((c: any) => c.id === a.classId)}
					{@const sub = cls?.subclasses?.find((s: any) => s.id === a.subclassId)}
					{@const subs = subclassesFor(a.classId, a.allocatedLevel)}
					{@const features = allocFeatures(a)}
					<div class="wizard-class-row">
						<div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
							<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
								<strong style="font-size:0.875rem;">{cls?.name ?? '?'}</strong>
								{#if sub}<span class="table__muted" style="font-size:0.8125rem;">· {sub.name}</span>{/if}
								<span class="badge badge-accent">Lv {a.allocatedLevel}</span>
							</div>
							<div style="display:flex;gap:0.25rem;align-items:center;">
								<button type="button" class="wizard-ctrl-btn" onclick={() => ws.bumpClassLevel(i, -1)}>−</button>
								<button type="button" class="wizard-ctrl-btn" onclick={() => ws.bumpClassLevel(i, 1)}>+</button>
								<button type="button" class="btn btn-danger btn-sm" onclick={() => ws.removeClass(i)}>✕</button>
							</div>
						</div>

						{#if i === 0 && availableClassSkills.length > 0}
							<div style="margin-top:0.5rem;">
								<ChoicePoolInline label="Class skills — {cls?.name ?? ''}" count={classSkillCount} pool={availableClassSkills}
									chosen={ws.chosenClassSkills}
									onToggle={(v) => {
										if (ws.chosenClassSkills.includes(v)) ws.chosenClassSkills = ws.chosenClassSkills.filter(s => s !== v);
										else if (ws.chosenClassSkills.length < Math.min(classSkillCount, availableClassSkills.length)) ws.chosenClassSkills = [...ws.chosenClassSkills, v];
									}}
									displayFn={(v) => SKILL_DISPLAY[v] ?? v}
									hint="Choose {classSkillCount}" />
							</div>
						{/if}

						{#if subs.length}
							<div style="margin-top:0.5rem;">
								{#if a.subclassId}
									{@const selSub = subs.find(s => s.id === a.subclassId)}
									<div style="display:flex;align-items:center;gap:0.5rem;padding:6px 10px;background:var(--bg-overlay);border-radius:var(--radius-md);">
										<span style="flex:1;font-size:0.875rem;font-weight:600;color:var(--accent-light);">📚 {selSub?.name}</span>
										<button type="button" class="btn btn-ghost btn-xs" onclick={() => ws.updateClassAlloc(i, { subclassId: '' })}>Change</button>
									</div>
								{:else}
									<p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 0.375rem;">Subclass <span style="opacity:0.6;">(optional at this level)</span></p>
									<div class="wiz-browser wiz-browser--compact" style="max-height:280px;">
										<div class="wiz-browser__list">
											<div class="wiz-browser__rows">
												{#each subs as s}
													<button type="button" class="wiz-row" class:wiz-row--selected={a.subclassId === s.id}
														onclick={() => ws.updateClassAlloc(i, { subclassId: s.id })}>
														<div class="wiz-row__body">
															<p class="wiz-row__name">{s.name}</p>
															{#if s.source}<div class="wiz-row__sub"><span class="wiz-tag wiz-tag--origin">{s.source}</span></div>{/if}
														</div>
														{#if a.subclassId === s.id}<span class="wiz-row__check">✓</span>{/if}
													</button>
												{/each}
											</div>
										</div>
										<div class="wiz-browser__panel">
											{#if a.subclassId}
												{@const sel = subs.find(s => s.id === a.subclassId)}
												{#if sel}
													<h4 class="wiz-panel__title">{sel.name}</h4>
													{#if sel.source}<p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 6px;">{sel.source}</p>{/if}
													{#if canViewDescriptions && sel.description}<DescriptionText text={sel.description} class="wiz-panel__desc" />{:else if !canViewDescriptions}<p class="wiz-panel__desc" style="font-style:italic;color:var(--text-muted);">📖 Description not available.</p>{/if}
												{/if}
											{:else}
												<div class="wiz-browser__empty" style="min-height:60px;"><p>Select a subclass to view details.</p></div>
											{/if}
										</div>
									</div>
								{/if}
							</div>
						{/if}

						<!-- Interactive feature timeline — inline resolvers -->
						{#if features.length}
							<div style="margin-top:0.625rem;display:flex;flex-direction:column;gap:0.5rem;">
								{#each features as feature (feature.sourceKey)}
									{@const r = resolversFor(a, feature)}
									{#if hasAnyResolver(r)}
										<div style="border-left:2px solid var(--border-muted);padding-left:0.625rem;">
											<p style="margin:0 0 0.375rem;font-size:0.75rem;color:var(--text-muted);">
												Lv {feature.requiredLevel} · <strong style="color:var(--text-secondary);">{feature.name}</strong> <span style="opacity:0.7;">({feature.sourceLabel})</span>
											</p>

											{#if r.featSrc}
												{@const featSrc = r.featSrc}
												{#if featSrc.fixedFeatId}
													{@const fixedFeat = (sys?.feats ?? []).find((f: any) => f.id === featSrc.fixedFeatId)}
													{#if fixedFeat}
														<div style="border-left:3px solid var(--border-accent);background:var(--bg-overlay);border-radius:0 var(--radius-md) var(--radius-md) 0;padding:8px 10px;margin-bottom:0.375rem;">
															<p style="margin:0 0 3px;font-size:0.875rem;font-weight:700;color:var(--accent-light);">🏅 {fixedFeat.name}</p>
															{#if canViewDescriptions && fixedFeat.description}<DescriptionText text={fixedFeat.description} class="wiz-inline-desc" />{/if}
														</div>
													{/if}
												{:else if featSrc.category}
													<p class="label" style="margin-bottom:0.375rem;">🏅 Choose a {featSrc.category} feat</p>
													<FeatPickerInline
														feats={grants.featsForCategory(sys, featSrc.category)}
														selectedId={r.pickedFeatId}
														onSelect={(featId) => { ws.featureFeatPicks = { ...ws.featureFeatPicks, [featSrc.sourceKey]: featId }; }}
														bind:search={ws.featureFeatSearch[featSrc.sourceKey]}
														{canViewDescriptions} />
												{/if}
												{#if r.pickedFeatId && r.nested}
													{#each r.nested.skill as fc}
														<div style="margin-top:0.5rem;"><ChoicePoolInline label="Feat: {fc.label}" count={fc.count} pool={fc.pool} chosen={ws.chosenPoolSkills[fc.sourceId] ?? []} onToggle={(v) => ws.togglePoolSkill(fc.sourceId, v, fc.count)} displayFn={(v) => SKILL_DISPLAY[v] ?? v} isDisabled={(v) => grants.isTakenElsewhere(sys, ws, v, fc.sourceId)} /></div>
													{/each}
													{#each r.nested.save as sc}
														<div style="margin-top:0.5rem;"><ChoicePoolInline label="Feat save: {sc.label}" count={sc.count} pool={sc.pool} chosen={ws.chosenSavePools[sc.sourceId] ?? []} onToggle={(v) => ws.toggleSavePool(sc.sourceId, v, sc.count)} displayFn={(v) => STAT_ABBR[v] ?? v} /></div>
													{/each}
													{#each r.nested.tool as tc}
														<div style="margin-top:0.5rem;"><ChoicePoolInline label="Feat tools: {tc.label}" count={tc.count} pool={tc.pool} chosen={ws.chosenToolPools[tc.sourceId] ?? []} onToggle={(v) => ws.toggleToolPool(tc.sourceId, v, tc.count)} /></div>
													{/each}
													{#each r.nested.language as lc}
														<div style="margin-top:0.5rem;"><ChoicePoolInline label="Feat languages: {lc.label}" count={lc.count} pool={lc.pool} chosen={ws.chosenLanguagePools[lc.sourceId] ?? []} onToggle={(v) => ws.toggleLanguagePool(lc.sourceId, v, lc.count)} /></div>
													{/each}
													{#each r.nested.expertise as ec}
														{@const pool = expertisePool(ec)}
														<div style="margin-top:0.5rem;"><ChoicePoolInline label="Feat expertise: {ec.label}" count={ec.count} pool={pool} chosen={ws.chosenExpertisePools[ec.sourceId] ?? []} onToggle={(v) => ws.toggleExpertisePool(ec.sourceId, v, ec.count)} displayFn={(v) => SKILL_DISPLAY[v] ?? v} hint={pool.length ? '' : 'Choose proficient skills first'} /></div>
													{/each}
													{#each r.nested.dmgMod as dc}
														<div style="margin-top:0.5rem;"><ChoicePoolInline label={dc.label} count={dc.count} pool={dc.pool} chosen={ws.chosenDmgMods[dc.sourceId] ?? []} onToggle={(v) => ws.toggleDmgModPool(dc.sourceId, v, dc.count)} /></div>
													{/each}
												{/if}
											{/if}

											{#each r.skillPools as fc}
												<div style="margin-top:0.375rem;"><ChoicePoolInline label="Skills" count={fc.count} pool={fc.pool} chosen={ws.chosenPoolSkills[fc.sourceId] ?? []} onToggle={(v) => ws.togglePoolSkill(fc.sourceId, v, fc.count)} displayFn={(v) => SKILL_DISPLAY[v] ?? v} isDisabled={(v) => grants.isTakenElsewhere(sys, ws, v, fc.sourceId)} /></div>
											{/each}
											{#each r.savePools as sc}
												<div style="margin-top:0.375rem;"><ChoicePoolInline label="Saving throws" count={sc.count} pool={sc.pool} chosen={ws.chosenSavePools[sc.sourceId] ?? []} onToggle={(v) => ws.toggleSavePool(sc.sourceId, v, sc.count)} displayFn={(v) => STAT_ABBR[v] ?? v} /></div>
											{/each}
											{#each r.toolPools as tc}
												<div style="margin-top:0.375rem;"><ChoicePoolInline label="Tools" count={tc.count} pool={tc.pool} chosen={ws.chosenToolPools[tc.sourceId] ?? []} onToggle={(v) => ws.toggleToolPool(tc.sourceId, v, tc.count)} /></div>
											{/each}
											{#each r.languagePools as lc}
												<div style="margin-top:0.375rem;"><ChoicePoolInline label="Languages" count={lc.count} pool={lc.pool} chosen={ws.chosenLanguagePools[lc.sourceId] ?? []} onToggle={(v) => ws.toggleLanguagePool(lc.sourceId, v, lc.count)} /></div>
											{/each}
											{#each r.expertisePools as ec}
												{@const pool = expertisePool(ec)}
												<div style="margin-top:0.375rem;"><ChoicePoolInline label="Expertise" count={ec.count} pool={pool} chosen={ws.chosenExpertisePools[ec.sourceId] ?? []} onToggle={(v) => ws.toggleExpertisePool(ec.sourceId, v, ec.count)} displayFn={(v) => SKILL_DISPLAY[v] ?? v} hint={pool.length ? '' : 'Choose proficient skills first'} /></div>
											{/each}
											{#each r.dmgModPools as dc}
												<div style="margin-top:0.375rem;"><ChoicePoolInline label={dc.label} count={dc.count} pool={dc.pool} chosen={ws.chosenDmgMods[dc.sourceId] ?? []} onToggle={(v) => ws.toggleDmgModPool(dc.sourceId, v, dc.count)} /></div>
											{/each}

											{#if r.asi}
												<div style="margin-top:0.375rem;">
													<AsiSlotInline choice={r.asi} {ws} {sys} {canViewDescriptions} />
												</div>
											{/if}
										</div>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
			<div style="display:flex;align-items:center;justify-content:space-between;margin-top:0.5rem;font-size:0.8125rem;">
				<span style="color:var(--text-muted);">Total: <strong style="color:var(--accent-light);">{ws.totalLevel}</strong></span>
				{#if ws.classAllocs.length > 0}<span style="color:var(--text-muted);">← Browse to add another class</span>{/if}
			</div>
		</div>
	{/if}

	<!-- Class browser -->
	<div class="wiz-browser">
		<div class="wiz-browser__list">
			<div class="wiz-browser__search">
				<input type="text" placeholder="Search classes…" bind:value={ws.classSearch} />
				<button type="button" class="btn btn-ghost btn-sm" title="Random class" onclick={randomClass}>🎲</button>
			</div>
			<div class="wiz-browser__rows">
				{#each filteredClasses as cls}
					<button type="button" class="wiz-row" class:wiz-row--selected={ws.browseClassId === cls.id}
						onclick={() => ws.selectBrowseClass(cls.id)}>
						<div class="wiz-row__body">
							<p class="wiz-row__name">{cls.name}</p>
							<div class="wiz-row__sub">
								{#if cls.hitDice}<span class="badge badge-muted" style="font-size:0.625rem;">d{cls.hitDice}</span>{/if}
								{#if cls.primaryAbilities}<span style="color:var(--text-muted);font-size:0.6875rem;">{cls.primaryAbilities}</span>{/if}
							</div>
						</div>
						{#if ws.classAllocs.find((a: any) => a.classId === cls.id)}
							<span class="badge badge-accent" style="font-size:0.625rem;flex-shrink:0;">✓ Added</span>
						{/if}
					</button>
				{:else}
					<p class="table__empty" style="padding:1rem 0.75rem;">No classes match.</p>
				{/each}
			</div>
		</div>

		<div class="wiz-browser__panel">
			{#if browseClass}
				{@const bc = browseClass as any}

				<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem;margin-bottom:0.75rem;">
					<div>
						<h3 class="wiz-panel__title">{bc.name}</h3>
						<div style="display:flex;gap:5px;flex-wrap:wrap;">
							{#if bc.hitDice}<span class="badge badge-muted">d{bc.hitDice} hit die</span>{/if}
							{#if bc.primaryAbilities}<span class="badge badge-muted">{bc.primaryAbilities}</span>{/if}
						</div>
					</div>
					<button type="button" class="btn btn-primary btn-sm" style="flex-shrink:0;" onclick={() => ws.addBrowseClass()}>
						{ws.classAllocs.find((a: any) => a.classId === bc.id) ? 'Update' : '+ Add'}
					</button>
				</div>

				{#if canViewDescriptions && bc.description}
					<DescriptionText text={bc.description} class="wiz-panel__desc" />
				{:else if !canViewDescriptions}
					<p class="wiz-panel__desc" style="font-style:italic;color:var(--text-muted);">📖 Description not available — contact your DM.</p>
				{/if}

				<div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.75rem;">
					<label class="label" for="browse-level" style="margin:0;white-space:nowrap;font-size:0.75rem;">Level</label>
					<input id="browse-level" type="number" class="input" style="width:60px;" min="1" max="20" bind:value={ws.browseLevel} />
					<div style="flex:1;height:4px;background:var(--bg-overlay);border-radius:99px;overflow:hidden;">
						<div style="height:100%;width:{Math.min((ws.browseLevel / 20) * 100, 100)}%;background:var(--accent);border-radius:99px;transition:width var(--transition-base);"></div>
					</div>
				</div>

				{#if bc.subclasses?.length}
					{@const availSubs = bc.subclasses.filter((s: any) => ws.browseLevel >= (bc.subclassAvailableAtLevel ?? 3))}
					{#if availSubs.length}
						<div class="wiz-panel__section" style="margin-bottom:0.75rem;">
							<p class="wiz-panel__label" style="margin-bottom:6px;">Subclass</p>
							<div class="wiz-browser wiz-browser--compact">
								<div class="wiz-browser__list">
									<div class="wiz-browser__rows">
										<button type="button" class="wiz-row" class:wiz-row--selected={ws.browseSubId === ''}
											onclick={() => ws.browseSubId = ''}>
											<div class="wiz-row__body"><p class="wiz-row__name" style="color:var(--text-muted);">No subclass</p></div>
										</button>
										{#each availSubs as sub}
											<button type="button" class="wiz-row" class:wiz-row--selected={ws.browseSubId === sub.id}
												onclick={() => ws.browseSubId = sub.id}>
												<div class="wiz-row__body"><p class="wiz-row__name">{sub.name}</p></div>
												{#if ws.browseSubId === sub.id}<span class="wiz-row__check">✓</span>{/if}
											</button>
										{/each}
									</div>
								</div>
								<div class="wiz-browser__panel" style="padding:10px;">
									{#if browseSub}
										{@const bs = browseSub as any}
										{#if canViewDescriptions && bs.description}
											<DescriptionText text={bs.description} class="wiz-inline-desc" />
										{:else if !canViewDescriptions}
											<p style="font-size:0.8125rem;color:var(--text-muted);font-style:italic;margin:0;">📖 Description not available — contact your DM.</p>
										{/if}
									{:else}
										<div class="wiz-browser__empty" style="min-height:60px;"><p>Select a subclass.</p></div>
									{/if}
								</div>
							</div>
						</div>
					{:else}
						<p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 0.75rem;">Subclass available at level {bc.subclassAvailableAtLevel ?? 3}.</p>
					{/if}
				{/if}

				<!-- Informational feature timeline (browse preview) -->
				{#if browseTimeline.length}
					<div class="wiz-panel__section">
						<p class="wiz-panel__label" style="margin-bottom:6px;">Feature timeline</p>
						<div class="feat-timeline">
							{#each browseTimeline as feat}
								{@const open = ws.openFeats.has(feat.id)}
								{@const past = feat.level <= ws.browseLevel}
								<div class="feat-row">
									<button type="button" class="feat-row__header" onclick={() => ws.toggleFeat(feat.id)}>
										<span class="feat-row__level" style="color:{past ? 'var(--accent-light)' : 'var(--text-muted)'};">{feat.level}</span>
										<span class="feat-row__name" style="color:{past ? 'var(--text-primary)' : 'var(--text-muted)'};">{feat.name}</span>
										<span class="feat-row__source">
											<span class="badge" style="font-size:0.5625rem;background:{feat.sourceType === 'subclass' ? 'rgba(142,68,173,0.15)' : 'rgba(184,115,74,0.12)'};color:{feat.sourceType === 'subclass' ? '#BF7EE0' : 'var(--accent-light)'};">{feat.source}</span>
										</span>
										<span class="feat-row__chevron" class:feat-row__chevron--open={open}>▶</span>
									</button>
									{#if open && feat.description}
										{#if canViewDescriptions}
											<div class="feat-row__body">
												<DescriptionText text={feat.description} />
											</div>
										{:else}
											<div class="feat-row__body" style="font-style:italic;color:var(--text-muted);">📖 Description not available — contact your DM.</div>
										{/if}
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}

			{:else}
				<div class="wiz-browser__empty">
					<span style="font-size:2rem;">⚔️</span>
					<p>Select a class to view its details and features.</p>
				</div>
			{/if}
		</div>
	</div>
</div>
