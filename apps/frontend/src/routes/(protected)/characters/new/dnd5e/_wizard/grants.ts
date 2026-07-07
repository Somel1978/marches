// apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/grants.ts
// Pure derivation functions extracted from the ~30 page-level $derived blocks
// of the original monolithic wizard. Each function takes (sys, ws) — the
// system reference data and the WizardState instance — and returns derived
// data. Call these from inside a component-local `$derived.by(() => ...)` so
// Svelte's reactivity tracks whatever state fields were read during the call.
import { isAsiFeatureName, isEpicBoonFeatureName } from '@core/ui';
import type { WizardState } from './wizard-state.svelte.ts';
import type { AsiChoice, ChoicePoolSpec, DmgModChoice, FeatGrantSource, InnateSpellSource } from './types.ts';

// A choice pool sourced from a Feat carries `originSourceKey` so step
// components can route it to wherever that feat itself was picked
// (background feat pick, a species-trait feat grant, a class/subclass
// feature feat grant, or an ASI-slot feat pick).
export type RoutedChoicePoolSpec = ChoicePoolSpec & { originSourceKey?: string };
export type RoutedDmgModChoice = DmgModChoice & { originSourceKey?: string };

export type OriginBucket = 'species' | 'background' | 'classes';

export function originBucketForSourceKey(sourceKey: string | undefined): OriginBucket {
	if (!sourceKey) return 'classes';
	if (sourceKey.startsWith('st-')) return 'species';
	if (sourceKey === 'bg-feat') return 'background';
	return 'classes'; // cf-*, sf-*, asi-feat-*
}

export function asiFeatSourceKey(c: Pick<AsiChoice, 'sourceClassId' | 'sourceLevel'>): string {
	return `asi-feat-${c.sourceClassId}-${c.sourceLevel}`;
}

// Choice pools granted by a feat pick at a given sourceKey (background feat,
// trait feat, class feature feat, or ASI-slot feat).
export function featNestedPools(sys: any, ws: WizardState, sourceKey: string) {
	return {
		skill: featSkillChoices(sys, ws).filter(fc => fc.originSourceKey === sourceKey),
		save: featSaveChoices(sys, ws).filter(sc => sc.originSourceKey === sourceKey),
		tool: allToolChoices(sys, ws).filter(tc => tc.originSourceKey === sourceKey),
		language: allLanguageChoices(sys, ws).filter(lc => lc.originSourceKey === sourceKey),
		expertise: allExpertiseChoices(sys, ws).filter(ec => ec.originSourceKey === sourceKey),
		dmgMod: allDmgModChoices(sys, ws).filter(dc => dc.originSourceKey === sourceKey),
	};
}

export function bucketOfPool(p: { sourceType: string; originSourceKey?: string }): OriginBucket {
	if (p.sourceType === 'SpeciesTrait') return 'species';
	if (p.sourceType === 'Background') return 'background';
	if (p.sourceType === 'Feat') return originBucketForSourceKey(p.originSourceKey);
	return 'classes'; // ClassFeature, SubclassFeature
}

function splitList(raw: string | null | undefined): string[] {
	return (raw ?? '').split(',').map(s => s.trim()).filter(Boolean);
}

// Species traits above level 1 are informational at creation time — their
// choice pools and feat grants are deferred until the character reaches that level.
function isCreationTimeSpeciesTrait(t: any): boolean {
	return (t?.requiredLevel ?? 1) <= 1;
}

// ── Species / Background / Class selection ──────────────────────────────
export function selectedSpecies(sys: any, ws: WizardState): any {
	return (sys?.species ?? []).find((s: any) => s.id === ws.speciesId) ?? null;
}
export function filteredSpecies(sys: any, ws: WizardState): any[] {
	return (sys?.species ?? []).filter((s: any) => !ws.speciesSearch || s.name.toLowerCase().includes(ws.speciesSearch.toLowerCase()));
}
export function selectedBackground(sys: any, ws: WizardState): any {
	return (sys?.backgrounds ?? []).find((b: any) => b.id === ws.backgroundId) ?? null;
}
export function filteredBackgrounds(sys: any, ws: WizardState): any[] {
	return (sys?.backgrounds ?? []).filter((b: any) => !ws.backgroundSearch || b.name.toLowerCase().includes(ws.backgroundSearch.toLowerCase()));
}
export function selectedClass0(sys: any, ws: WizardState): any {
	return (sys?.classes ?? []).find((c: any) => ws.classAllocs[0]?.classId === c.id) ?? null;
}

// Returns feats matching a category string (Origin, Epic Boon, Fighting Style, General, etc.)
export function featsForCategory(sys: any, category: string): any[] {
	const cat = category.toLowerCase();
	if (cat === 'general') return (sys?.feats ?? []).filter((f: any) => f.isAvailable !== false && !f.isEpicBoon);
	return (sys?.feats ?? []).filter((f: any) =>
		f.isAvailable !== false &&
		splitList(f.categories).map(s => s.toLowerCase()).includes(cat)
	);
}

export function bgFeatOptions(sys: any, ws: WizardState): any[] {
	return featsForCategory(sys, selectedBackground(sys, ws)?.grantsFeatCategory ?? '');
}

// Whether the background's own feat requirement is satisfied — used to gate
// the Background step (does NOT check feature/trait feat picks; see bgFeatValid).
export function bgFeatValidBgOnly(sys: any, ws: WizardState): boolean {
	const bg = selectedBackground(sys, ws);
	if (!bg) return false;
	if (bg.grantsFeatId) return true;
	if (bg.grantsFeatCategory && !ws.bgFeatPick) return false;
	return true;
}

// Full validity including all feature/trait feat picks — used to gate final submit.
export function bgFeatValid(sys: any, ws: WizardState): boolean {
	if (!bgFeatValidBgOnly(sys, ws)) return false;
	for (const src of allFeatureGrantSources(sys, ws)) {
		if (!src.fixedFeatId && !ws.featureFeatPicks[src.sourceKey]) return false;
	}
	return true;
}

// ── Size choice — from species traits ────────────────────────────────────
export function sizeChoiceOptions(sys: any, ws: WizardState): string[] {
	const pool: string[] = [];
	for (const t of (selectedSpecies(sys, ws)?.traits ?? [])) {
		for (const s of splitList((t as any).sizeChoices)) if (!pool.includes(s)) pool.push(s);
	}
	return pool;
}
export function traitFixedSize(sys: any, ws: WizardState): string | null {
	return (selectedSpecies(sys, ws)?.traits ?? []).map((t: any) => t.size).find((s: any) => s) ?? null;
}

// ── Feat grant sources (species traits + class/subclass features) ────────
// Background's own feat pick is handled separately (bgFeatPick / grantsFeatCategory)
// since it renders directly in StepBackground, not via this generic list.
export function allFeatureGrantSources(sys: any, ws: WizardState): FeatGrantSource[] {
	const sources: FeatGrantSource[] = [];
	for (const t of (selectedSpecies(sys, ws)?.traits ?? [])) {
		if (!isCreationTimeSpeciesTrait(t)) continue;
		if ((t as any).grantsFeatId)            sources.push({ sourceKey: `st-${t.id}`, label: t.name, fixedFeatId: (t as any).grantsFeatId });
		else if ((t as any).grantsFeatCategory) sources.push({ sourceKey: `st-${t.id}`, label: t.name, category: (t as any).grantsFeatCategory });
	}
	for (const alloc of ws.classAllocs) {
		const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
		if (!cls) continue;
		for (const f of (cls.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel)) {
			if ((f as any).grantsFeatId)            sources.push({ sourceKey: `cf-${f.id}`, label: `${cls.name}: ${f.name}`, fixedFeatId: (f as any).grantsFeatId });
			else if ((f as any).grantsFeatCategory) sources.push({ sourceKey: `cf-${f.id}`, label: `${cls.name}: ${f.name}`, category: (f as any).grantsFeatCategory });
		}
		const sub = (cls.subclasses ?? []).find((s: any) => s.id === alloc.subclassId);
		if (sub) {
			for (const f of (sub.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel)) {
				if ((f as any).grantsFeatId)            sources.push({ sourceKey: `sf-${f.id}`, label: `${sub.name}: ${f.name}`, fixedFeatId: (f as any).grantsFeatId });
				else if ((f as any).grantsFeatCategory) sources.push({ sourceKey: `sf-${f.id}`, label: `${sub.name}: ${f.name}`, category: (f as any).grantsFeatCategory });
			}
		}
	}
	return sources;
}

export function allGrantedFeatIds(sys: any, ws: WizardState): { featId: string; sourceKey: string }[] {
	const ids: { featId: string; sourceKey: string }[] = [];
	const bg = selectedBackground(sys, ws);
	if (bg?.grantsFeatId) ids.push({ featId: bg.grantsFeatId, sourceKey: 'bg-feat' });
	else if (ws.bgFeatPick) ids.push({ featId: ws.bgFeatPick, sourceKey: 'bg-feat' });
	for (const src of allFeatureGrantSources(sys, ws)) {
		const pick = src.fixedFeatId ?? ws.featureFeatPicks[src.sourceKey];
		if (pick) ids.push({ featId: pick, sourceKey: src.sourceKey });
	}
	ws.asiChoices.forEach((c) => { if (c.featId) ids.push({ featId: c.featId, sourceKey: asiFeatSourceKey(c) }); });
	return ids;
}

// ── Skills ────────────────────────────────────────────────────────────────
export function backgroundFixedSkills(sys: any, ws: WizardState): string[] {
	return splitList(selectedBackground(sys, ws)?.grantsSkills);
}
export function backgroundChoiceCount(sys: any, ws: WizardState): number {
	return selectedBackground(sys, ws)?.skillChoiceCount ?? 0;
}
export function backgroundChoicePool(sys: any, ws: WizardState): string[] {
	return splitList(selectedBackground(sys, ws)?.skillChoicePool);
}

export function speciesFixedSkills(sys: any, ws: WizardState): string[] {
	return (selectedSpecies(sys, ws)?.traits ?? []).flatMap((t: any) => splitList(t.grantsSkills));
}
export function speciesTraitChoices(sys: any, ws: WizardState): any[] {
	return (selectedSpecies(sys, ws)?.traits ?? []).filter((t: any) => isCreationTimeSpeciesTrait(t) && t.skillChoiceCount && t.skillChoicePool);
}

export function autoGrantedSkills(sys: any, ws: WizardState): string[] {
	return [...backgroundFixedSkills(sys, ws), ...speciesFixedSkills(sys, ws)];
}

export function speciesAutoExpertise(sys: any, ws: WizardState): { skill: string; sourceName: string; sourceType: string; sourceId: string }[] {
	const sp = selectedSpecies(sys, ws);
	return (sp?.traits ?? []).flatMap((t: any) =>
		splitList(t.grantsExpertise).map((skill: string) => ({
			skill,
			sourceName: `${sp?.name}: ${t.name}`,
			sourceType: 'SpeciesTrait',
			sourceId: t.id,
		}))
	);
}
export function speciesAutoHalfSkills(sys: any, ws: WizardState): { skill: string; sourceName: string }[] {
	const sp = selectedSpecies(sys, ws);
	return (sp?.traits ?? []).flatMap((t: any) =>
		splitList(t.grantsHalfSkills).filter((s: string) => s !== '*').map((skill: string) => ({ skill, sourceName: `${sp?.name}: ${t.name}` }))
	);
}

export function featureAutoExpertise(sys: any, ws: WizardState): { skill: string; sourceName: string; sourceType: string; sourceId: string }[] {
	return ws.classAllocs.flatMap(alloc => {
		const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
		if (!cls) return [];
		return [
			...(cls.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel && f.grantsExpertise)
				.flatMap((f: any) => splitList(f.grantsExpertise).filter((s: string) => s !== '*').map((skill: string) => ({
					skill,
					sourceName: `${cls.name}: ${f.name}`,
					sourceType: 'ClassFeature',
					sourceId: f.id,
				}))),
			...(cls.subclasses ?? []).filter((s: any) => s.id === alloc.subclassId)
				.flatMap((s: any) => (s.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel && f.grantsExpertise)
					.flatMap((f: any) => splitList(f.grantsExpertise).filter((sk: string) => sk !== '*').map((skill: string) => ({
						skill,
						sourceName: `${s.name}: ${f.name}`,
						sourceType: 'SubclassFeature',
						sourceId: f.id,
					})))),
		];
	});
}
export function featureAutoHalfSkills(sys: any, ws: WizardState): { skill: string; sourceName: string }[] {
	return ws.classAllocs.flatMap(alloc => {
		const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
		if (!cls) return [];
		return [
			...(cls.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel && f.grantsHalfSkills)
				.flatMap((f: any) => f.grantsHalfSkills === '*'
					? [{ skill: '*', sourceName: `${cls.name}: ${f.name}` }]
					: splitList(f.grantsHalfSkills).map((skill: string) => ({ skill, sourceName: `${cls.name}: ${f.name}` }))),
			...(cls.subclasses ?? []).filter((s: any) => s.id === alloc.subclassId)
				.flatMap((s: any) => (s.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel && f.grantsHalfSkills)
					.flatMap((f: any) => f.grantsHalfSkills === '*'
						? [{ skill: '*', sourceName: `${s.name}: ${f.name}` }]
						: splitList(f.grantsHalfSkills).map((skill: string) => ({ skill, sourceName: `${s.name}: ${f.name}` })))),
		];
	});
}

export function classSkillPool(sys: any, ws: WizardState): string[] {
	return ((selectedClass0(sys, ws) as any)?.skillOptions ?? []).map((o: any) => o.skill);
}
export function classSkillCount(sys: any, ws: WizardState): number {
	return (selectedClass0(sys, ws) as any)?.skillChoiceCount ?? 2;
}
export function classSavingThrows(sys: any, ws: WizardState): string[] {
	return ((selectedClass0(sys, ws) as any)?.savingThrows ?? []).map((s: any) => s.stat);
}
export function featAutoSkills(sys: any, ws: WizardState): { skill: string; featName: string }[] {
	return allGrantedFeatIds(sys, ws).flatMap(({ featId }) => {
		const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
		if (!feat?.grantsSkills) return [];
		return splitList(feat.grantsSkills).map((skill: string) => ({ skill, featName: feat.name }));
	});
}
export function availableClassSkills(sys: any, ws: WizardState): string[] {
	const auto = autoGrantedSkills(sys, ws);
	const featAuto = featAutoSkills(sys, ws);
	return classSkillPool(sys, ws).filter(s => !auto.includes(s) && !featAuto.some(x => x.skill === s));
}

export function featureChoices(sys: any, ws: WizardState): RoutedChoicePoolSpec[] {
	const result: RoutedChoicePoolSpec[] = [];
	for (const t of (selectedSpecies(sys, ws)?.traits ?? [])) {
		if (!isCreationTimeSpeciesTrait(t)) continue;
		if ((t as any).skillChoiceCount && (t as any).skillChoicePool) {
			result.push({ sourceId: t.id, sourceType: 'SpeciesTrait', label: `${selectedSpecies(sys, ws)?.name}: ${t.name}`, count: (t as any).skillChoiceCount, pool: splitList((t as any).skillChoicePool) });
		}
	}
	for (const alloc of ws.classAllocs) {
		const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
		if (!cls) continue;
		const allFeatures = [
			...(cls.features ?? []).map((f: any) => ({ ...f, sourceType: 'ClassFeature' })),
			...(cls.subclasses ?? []).filter((s: any) => s.id === alloc.subclassId)
				.flatMap((s: any) => (s.features ?? []).map((f: any) => ({ ...f, sourceType: 'SubclassFeature' }))),
		];
		for (const f of allFeatures) {
			if (f.requiredLevel <= alloc.allocatedLevel && f.skillChoiceCount && f.skillChoicePool) {
				result.push({ sourceId: f.id, sourceType: f.sourceType, label: `${cls.name}: ${f.name} (level ${f.requiredLevel})`, count: f.skillChoiceCount, pool: splitList(f.skillChoicePool) });
			}
		}
	}
	return result;
}

export function featSkillChoices(sys: any, ws: WizardState): RoutedChoicePoolSpec[] {
	return allGrantedFeatIds(sys, ws).flatMap(({ featId, sourceKey }) => {
		const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
		if (!feat?.skillChoiceCount || !feat?.skillChoicePool) return [];
		return [{ sourceId: sourceKey, sourceType: 'Feat', originSourceKey: sourceKey, label: feat.name, count: feat.skillChoiceCount, pool: splitList(feat.skillChoicePool) }];
	});
}

// All auto-granted (fixed) skills across all sources — used for dedup checks.
export function allGrantedSkillsSet(sys: any, ws: WizardState): Set<string> {
	return new Set([
		...autoGrantedSkills(sys, ws),
		...featAutoSkills(sys, ws).map(x => x.skill),
		...ws.chosenClassSkills,
		...Object.values(ws.chosenPoolSkills).flat(),
	]);
}
export function isTakenElsewhere(sys: any, ws: WizardState, skill: string, excludeSourceId: string): boolean {
	if (autoGrantedSkills(sys, ws).includes(skill)) return true;
	if (featAutoSkills(sys, ws).some(x => x.skill === skill)) return true;
	if (excludeSourceId !== '__class__' && ws.chosenClassSkills.includes(skill)) return true;
	for (const [k, v] of Object.entries(ws.chosenPoolSkills)) {
		if (k !== excludeSourceId && v.includes(skill)) return true;
	}
	return false;
}

// ── Saving throws ─────────────────────────────────────────────────────────
export function featAutoSaves(sys: any, ws: WizardState): { stat: string; sourceName: string; sourceType: string; sourceId: string }[] {
	return allGrantedFeatIds(sys, ws).flatMap(({ featId }) => {
		const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
		if (!feat?.grantsSavingThrows) return [];
		return splitList(feat.grantsSavingThrows).map((s: string) => s.toUpperCase())
			.map((stat: string) => ({ stat, sourceName: feat.name, sourceType: 'Feat', sourceId: feat.id }));
	});
}
export function featureAutoSaves(sys: any, ws: WizardState): { stat: string; sourceName: string; sourceType: string; sourceId: string }[] {
	return ws.classAllocs.flatMap(alloc => {
		const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
		if (!cls) return [];
		const thisClassBaseSaves = new Set((cls.savingThrows ?? []).map((s: any) => s.stat as string));
		const allFeatures = [
			...(cls.features ?? []).map((f: any) => ({ ...f, sourceName: cls.name, sourceType: 'ClassFeature' })),
			...(cls.subclasses ?? []).filter((s: any) => s.id === alloc.subclassId)
				.flatMap((s: any) => (s.features ?? []).map((f: any) => ({ ...f, sourceName: s.name, sourceType: 'SubclassFeature' }))),
		];
		return allFeatures
			.filter((f: any) => f.requiredLevel <= alloc.allocatedLevel && f.grantsSavingThrows)
			.flatMap((f: any) =>
				splitList(f.grantsSavingThrows).map((s: string) => s.toUpperCase())
					.filter((stat: string) => !thisClassBaseSaves.has(stat))
					.map((stat: string) => ({ stat, sourceName: `${f.sourceName}: ${f.name}`, sourceType: f.sourceType, sourceId: f.id }))
			);
	});
}
export function extraSavingThrows(sys: any, ws: WizardState): { stat: string; sourceName: string; sourceType: string; sourceId: string }[] {
	const classSaves = classSavingThrows(sys, ws);
	return [...featAutoSaves(sys, ws), ...featureAutoSaves(sys, ws)]
		.filter(({ stat }, i, arr) => arr.findIndex(x => x.stat === stat) === i && !classSaves.includes(stat));
}

export function featSaveChoices(sys: any, ws: WizardState): RoutedChoicePoolSpec[] {
	return allGrantedFeatIds(sys, ws).flatMap(({ featId, sourceKey }) => {
		const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
		if (!feat?.savingThrowChoiceCount || !feat?.savingThrowChoicePool) return [];
		return [{ sourceId: `${sourceKey}-saves`, sourceDbId: feat.id, sourceType: 'Feat', originSourceKey: sourceKey, label: feat.name, count: feat.savingThrowChoiceCount, pool: splitList(feat.savingThrowChoicePool).map(s => s.toUpperCase()) }];
	});
}
export function featureSaveChoices(sys: any, ws: WizardState): RoutedChoicePoolSpec[] {
	return ws.classAllocs.flatMap(alloc => {
		const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
		if (!cls) return [];
		const allFeatures = [
			...(cls.features ?? []).map((f: any) => ({ ...f, sourceName: cls.name, sourceType: 'ClassFeature' })),
			...(cls.subclasses ?? []).filter((s: any) => s.id === alloc.subclassId)
				.flatMap((s: any) => (s.features ?? []).map((f: any) => ({ ...f, sourceName: s.name, sourceType: 'SubclassFeature' }))),
		];
		return allFeatures
			.filter((f: any) => f.requiredLevel <= alloc.allocatedLevel && f.savingThrowChoiceCount && f.savingThrowChoicePool)
			.map((f: any) => ({
				sourceId: `${f.id}-saves`, sourceDbId: f.id,
				label: `${f.sourceName}: ${f.name} (level ${f.requiredLevel})`,
				count: f.savingThrowChoiceCount,
				pool: splitList(f.savingThrowChoicePool).map((s: string) => s.toUpperCase()),
				sourceType: f.sourceType,
			}));
	});
}
export function bgSaveChoices(sys: any, ws: WizardState): RoutedChoicePoolSpec[] {
	const bg = selectedBackground(sys, ws);
	if (!bg?.savingThrowChoiceCount || !bg?.savingThrowChoicePool) return [];
	return [{ sourceId: 'bg-saves', sourceDbId: bg?.id ?? null, sourceType: 'Background', label: bg?.name ?? 'Background', count: bg.savingThrowChoiceCount, pool: splitList(bg.savingThrowChoicePool).map((s: string) => s.toUpperCase()) }];
}
export function speciesSaveChoices(sys: any, ws: WizardState): RoutedChoicePoolSpec[] {
	const sp = selectedSpecies(sys, ws);
	return (sp?.traits ?? []).filter((t: any) => isCreationTimeSpeciesTrait(t) && t.savingThrowChoiceCount && t.savingThrowChoicePool)
		.map((t: any) => ({
			sourceId: `${t.id}-saves`, sourceDbId: t.id, sourceType: 'SpeciesTrait',
			label: `${sp?.name}: ${t.name}`, count: t.savingThrowChoiceCount,
			pool: splitList(t.savingThrowChoicePool).map((s: string) => s.toUpperCase()),
		}));
}
export function allSaveChoices(sys: any, ws: WizardState): RoutedChoicePoolSpec[] {
	return [...bgSaveChoices(sys, ws), ...speciesSaveChoices(sys, ws), ...featureSaveChoices(sys, ws), ...featSaveChoices(sys, ws)];
}

// ── Tools ─────────────────────────────────────────────────────────────────
export function autoGrantedTools(sys: any, ws: WizardState): { tool: string; sourceType: string; sourceId: string | null }[] {
	const tools: { tool: string; sourceType: string; sourceId: string | null }[] = [];
	const bg = selectedBackground(sys, ws);
	for (const t of splitList(bg?.grantsTools)) tools.push({ tool: t, sourceType: 'Background', sourceId: bg?.id ?? null });
	for (const t of (selectedSpecies(sys, ws)?.traits ?? [])) {
		for (const tool of splitList((t as any).grantsTools)) tools.push({ tool, sourceType: 'SpeciesTrait', sourceId: t.id });
	}
	for (const { featId } of allGrantedFeatIds(sys, ws)) {
		const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
		if (feat) for (const tool of splitList(feat.grantsTools)) tools.push({ tool, sourceType: 'Feat', sourceId: feat.id });
	}
	for (const alloc of ws.classAllocs) {
		const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
		if (!cls) continue;
		const allFeatures = [
			...(cls.features ?? []).map((f: any) => ({ ...f, sourceType: 'ClassFeature' })),
			...(cls.subclasses ?? []).filter((s: any) => s.id === alloc.subclassId)
				.flatMap((s: any) => (s.features ?? []).map((f: any) => ({ ...f, sourceType: 'SubclassFeature' }))),
		];
		for (const f of allFeatures.filter((f: any) => f.requiredLevel <= alloc.allocatedLevel && f.grantsTools)) {
			for (const tool of splitList(f.grantsTools)) tools.push({ tool, sourceType: f.sourceType, sourceId: f.id });
		}
	}
	return tools;
}
export function featureToolChoices(sys: any, ws: WizardState): RoutedChoicePoolSpec[] {
	return ws.classAllocs.flatMap(alloc => {
		const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
		if (!cls) return [];
		const allFeatures = [
			...(cls.features ?? []).map((f: any) => ({ ...f, sourceName: cls.name, sourceType: 'ClassFeature' })),
			...(cls.subclasses ?? []).filter((s: any) => s.id === alloc.subclassId)
				.flatMap((s: any) => (s.features ?? []).map((f: any) => ({ ...f, sourceName: s.name, sourceType: 'SubclassFeature' }))),
		];
		return allFeatures
			.filter((f: any) => f.requiredLevel <= alloc.allocatedLevel && f.toolChoiceCount && f.toolChoicePool)
			.map((f: any) => ({
				sourceId: `${f.id}-tools`, sourceDbId: f.id,
				label: `${f.sourceName}: ${f.name} (level ${f.requiredLevel})`,
				count: f.toolChoiceCount, pool: splitList(f.toolChoicePool), sourceType: f.sourceType,
			}));
	});
}
export function allToolChoices(sys: any, ws: WizardState): RoutedChoicePoolSpec[] {
	const pools: RoutedChoicePoolSpec[] = [];
	const bg = selectedBackground(sys, ws);
	if (bg?.toolChoiceCount && bg?.toolChoicePool)
		pools.push({ sourceId: 'bg-tools', sourceDbId: bg.id, sourceType: 'Background', label: bg.name ?? 'Background', count: bg.toolChoiceCount, pool: splitList(bg.toolChoicePool) });
	for (const t of (selectedSpecies(sys, ws)?.traits ?? [])) {
		if (!isCreationTimeSpeciesTrait(t)) continue;
		if ((t as any).toolChoiceCount && (t as any).toolChoicePool)
			pools.push({ sourceId: `${t.id}-tools`, sourceDbId: t.id, sourceType: 'SpeciesTrait', label: t.name, count: (t as any).toolChoiceCount, pool: splitList((t as any).toolChoicePool) });
	}
	for (const { featId, sourceKey } of allGrantedFeatIds(sys, ws)) {
		const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
		if (feat?.toolChoiceCount && feat?.toolChoicePool)
			pools.push({ sourceId: `${featId}-tools`, sourceDbId: feat.id, sourceType: 'Feat', originSourceKey: sourceKey, label: `Feat: ${feat.name}`, count: feat.toolChoiceCount, pool: splitList(feat.toolChoicePool) });
	}
	for (const fc of featureToolChoices(sys, ws)) pools.push(fc);
	return pools;
}

// ── Languages ─────────────────────────────────────────────────────────────
export function autoGrantedLanguages(sys: any, ws: WizardState): { language: string; sourceType: string; sourceId: string | null }[] {
	const langs: { language: string; sourceType: string; sourceId: string | null }[] = [];
	const bg = selectedBackground(sys, ws);
	for (const l of splitList(bg?.grantsLanguages)) langs.push({ language: l, sourceType: 'Background', sourceId: bg?.id ?? null });
	for (const t of (selectedSpecies(sys, ws)?.traits ?? [])) {
		for (const l of splitList((t as any).grantsLanguages)) langs.push({ language: l, sourceType: 'SpeciesTrait', sourceId: t.id });
	}
	for (const { featId } of allGrantedFeatIds(sys, ws)) {
		const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
		if (feat) for (const l of splitList(feat.grantsLanguages)) langs.push({ language: l, sourceType: 'Feat', sourceId: feat.id });
	}
	return langs;
}
export function featureLanguageChoices(sys: any, ws: WizardState): RoutedChoicePoolSpec[] {
	return ws.classAllocs.flatMap(alloc => {
		const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
		if (!cls) return [];
		const allFeatures = [
			...(cls.features ?? []).map((f: any) => ({ ...f, sourceName: cls.name, sourceType: 'ClassFeature' })),
			...(cls.subclasses ?? []).filter((s: any) => s.id === alloc.subclassId)
				.flatMap((s: any) => (s.features ?? []).map((f: any) => ({ ...f, sourceName: s.name, sourceType: 'SubclassFeature' }))),
		];
		return allFeatures
			.filter((f: any) => f.requiredLevel <= alloc.allocatedLevel && f.languageChoiceCount && f.languageChoicePool)
			.map((f: any) => ({
				sourceId: `${f.id}-langs`, sourceDbId: f.id,
				label: `${f.sourceName}: ${f.name} (level ${f.requiredLevel})`,
				count: f.languageChoiceCount, pool: splitList(f.languageChoicePool), sourceType: f.sourceType,
			}));
	});
}
export function allLanguageChoices(sys: any, ws: WizardState): RoutedChoicePoolSpec[] {
	const pools: RoutedChoicePoolSpec[] = [];
	const bg = selectedBackground(sys, ws);
	if (bg?.languageChoiceCount && bg?.languageChoicePool)
		pools.push({ sourceId: 'bg-langs', sourceDbId: bg.id, sourceType: 'Background', label: bg.name ?? 'Background', count: bg.languageChoiceCount, pool: splitList(bg.languageChoicePool) });
	for (const t of (selectedSpecies(sys, ws)?.traits ?? [])) {
		if (!isCreationTimeSpeciesTrait(t)) continue;
		if ((t as any).languageChoiceCount && (t as any).languageChoicePool)
			pools.push({ sourceId: `${t.id}-langs`, sourceDbId: t.id, sourceType: 'SpeciesTrait', label: t.name, count: (t as any).languageChoiceCount, pool: splitList((t as any).languageChoicePool) });
	}
	for (const { featId, sourceKey } of allGrantedFeatIds(sys, ws)) {
		const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
		if (feat?.languageChoiceCount && feat?.languageChoicePool)
			pools.push({ sourceId: `${featId}-langs`, sourceDbId: feat.id, sourceType: 'Feat', originSourceKey: sourceKey, label: `Feat: ${feat.name}`, count: feat.languageChoiceCount, pool: splitList(feat.languageChoicePool) });
	}
	for (const fc of featureLanguageChoices(sys, ws)) pools.push(fc);
	return pools;
}

// ── Expertise ─────────────────────────────────────────────────────────────

// Skills the character is proficient in at creation time (full proficiency only).
export function proficientSkills(sys: any, ws: WizardState): Set<string> {
	return new Set([
		...autoGrantedSkills(sys, ws),
		...featAutoSkills(sys, ws).map(x => x.skill),
		...ws.chosenClassSkills,
		...Object.values(ws.chosenPoolSkills).flat(),
		...speciesAutoExpertise(sys, ws).map(x => x.skill),
		...featureAutoExpertise(sys, ws).map(x => x.skill),
	]);
}

// Expertise can only be applied to skills the character is already proficient in.
// A pool of "*" means "any proficient skill".
export function effectiveExpertisePool(ec: ChoicePoolSpec, sys: any, ws: WizardState): string[] {
	const prof = proficientSkills(sys, ws);
	if (ec.pool.length === 1 && ec.pool[0] === '*') return [...prof].sort();
	if (ec.pool.includes('*')) return [...prof].sort();
	return ec.pool.filter(s => prof.has(s));
}

export function trimInvalidExpertiseChoices(sys: any, ws: WizardState) {
	const specs = allExpertiseChoices(sys, ws);
	let changed = false;
	const next: Record<string, string[]> = {};
	for (const [sourceId, chosen] of Object.entries(ws.chosenExpertisePools)) {
		const ec = specs.find(s => s.sourceId === sourceId);
		if (!ec) { next[sourceId] = chosen; continue; }
		const allowed = new Set(effectiveExpertisePool(ec, sys, ws));
		const trimmed = chosen.filter(s => allowed.has(s));
		if (trimmed.length !== chosen.length) changed = true;
		if (trimmed.length) next[sourceId] = trimmed;
		else if (chosen.length) changed = true;
	}
	if (changed) ws.chosenExpertisePools = next;
}

export function allExpertiseChoices(sys: any, ws: WizardState): RoutedChoicePoolSpec[] {
	const pools: RoutedChoicePoolSpec[] = [];
	for (const t of (selectedSpecies(sys, ws)?.traits ?? [])) {
		if (!isCreationTimeSpeciesTrait(t)) continue;
		if ((t as any).expertiseChoiceCount && (t as any).expertiseChoicePool)
			pools.push({ sourceId: `${t.id}-expertise`, sourceDbId: t.id, sourceType: 'SpeciesTrait', label: t.name, count: (t as any).expertiseChoiceCount, pool: splitList((t as any).expertiseChoicePool) });
	}
	for (const alloc of ws.classAllocs) {
		const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
		if (!cls) continue;
		for (const f of (cls.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel && (f as any).expertiseChoiceCount && (f as any).expertiseChoicePool))
			pools.push({ sourceId: `${f.id}-expertise`, sourceDbId: f.id, sourceType: 'ClassFeature', label: `${cls.name}: ${f.name}`, count: (f as any).expertiseChoiceCount, pool: splitList((f as any).expertiseChoicePool) });
		const sub = (cls.subclasses ?? []).find((s: any) => s.id === alloc.subclassId);
		if (sub) {
			for (const f of (sub.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel && (f as any).expertiseChoiceCount && (f as any).expertiseChoicePool))
				pools.push({ sourceId: `${f.id}-expertise`, sourceDbId: f.id, sourceType: 'SubclassFeature', label: `${sub.name}: ${f.name}`, count: (f as any).expertiseChoiceCount, pool: splitList((f as any).expertiseChoicePool) });
		}
	}
	for (const { featId, sourceKey } of allGrantedFeatIds(sys, ws)) {
		const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
		if (feat?.expertiseChoiceCount && feat?.expertiseChoicePool)
			pools.push({ sourceId: `${featId}-expertise`, sourceDbId: feat.id, sourceType: 'Feat', originSourceKey: sourceKey, label: `Feat: ${feat.name}`, count: feat.expertiseChoiceCount, pool: splitList(feat.expertiseChoicePool) });
	}
	return pools;
}

export type ExpertiseGrantSubmission = {
	skill: string;
	sourceType: string;
	sourceId: string;
	label: string;
};

// Every expertise row to show on Review and submit as expertisePoolSkill (value 2.0).
// Covers auto-granted expertise (species/class features) and player-chosen pools.
// Feat auto grantsExpertise is handled separately by addCharacterFeat at submit time.
export function expertiseGrantSubmissions(sys: any, ws: WizardState): ExpertiseGrantSubmission[] {
	const subs: ExpertiseGrantSubmission[] = [];

	for (const row of speciesAutoExpertise(sys, ws)) {
		subs.push({ skill: row.skill, sourceType: row.sourceType, sourceId: row.sourceId, label: row.sourceName });
	}
	for (const row of featureAutoExpertise(sys, ws)) {
		subs.push({ skill: row.skill, sourceType: row.sourceType, sourceId: row.sourceId, label: row.sourceName });
	}
	for (const ec of allExpertiseChoices(sys, ws)) {
		for (const skill of ws.chosenExpertisePools[ec.sourceId] ?? []) {
			subs.push({
				skill,
				sourceType: ec.sourceType,
				sourceId: ec.sourceDbId ?? ec.sourceId,
				label: ec.label,
			});
		}
	}

	return subs;
}

// ── Damage modifiers (resistance/immunity/vulnerability) ──────────────────
export function autoGrantedDamageModifiers(sys: any, ws: WizardState): { modifierType: string; damageType: string; sourceType: string; sourceId: string | null }[] {
	const mods: { modifierType: string; damageType: string; sourceType: string; sourceId: string | null }[] = [];
	const addMods = (source: any, sourceType: string, sourceId: string | null) => {
		for (const t of splitList(source?.grantsResistances))     mods.push({ modifierType: 'RESISTANCE',    damageType: t, sourceType, sourceId });
		for (const t of splitList(source?.grantsImmunities))      mods.push({ modifierType: 'IMMUNITY',      damageType: t, sourceType, sourceId });
		for (const t of splitList(source?.grantsVulnerabilities)) mods.push({ modifierType: 'VULNERABILITY', damageType: t, sourceType, sourceId });
	};
	addMods(selectedBackground(sys, ws), 'Background', selectedBackground(sys, ws)?.id ?? null);
	for (const t of (selectedSpecies(sys, ws)?.traits ?? [])) addMods(t, 'SpeciesTrait', t.id);
	for (const { featId } of allGrantedFeatIds(sys, ws)) {
		const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
		if (feat) addMods(feat, 'Feat', feat.id);
	}
	for (const alloc of ws.classAllocs) {
		const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
		if (!cls) continue;
		const allFeatures = [
			...(cls.features ?? []).map((f: any) => ({ ...f, sourceType: 'ClassFeature' })),
			...(cls.subclasses ?? []).filter((s: any) => s.id === alloc.subclassId)
				.flatMap((s: any) => (s.features ?? []).map((f: any) => ({ ...f, sourceType: 'SubclassFeature' }))),
		];
		for (const f of allFeatures.filter((f: any) => f.requiredLevel <= alloc.allocatedLevel)) addMods(f, f.sourceType, f.id);
	}
	return mods;
}

export function allDmgModChoices(sys: any, ws: WizardState): RoutedDmgModChoice[] {
	const choices: RoutedDmgModChoice[] = [];
	const addChoices = (source: any, sourceType: string, sourceId: string, label: string, originSourceKey?: string) => {
		for (const [modType, countKey, poolKey] of [
			['RESISTANCE',    'resistanceChoiceCount',    'resistanceChoicePool'],
			['IMMUNITY',      'immunityChoiceCount',      'immunityChoicePool'],
			['VULNERABILITY', 'vulnerabilityChoiceCount', 'vulnerabilityChoicePool'],
		] as [string, string, string][]) {
			if (source?.[countKey] && source?.[poolKey]) {
				const pool = splitList(source[poolKey]);
				if (pool.length) choices.push({ sourceId: `${sourceId}-${modType}`, sourceType, originSourceKey, label: `${label} — ${modType.charAt(0) + modType.slice(1).toLowerCase()}`, modifierType: modType as any, count: source[countKey], pool });
			}
		}
	};
	const bg = selectedBackground(sys, ws);
	addChoices(bg, 'Background', bg?.id ?? 'bg', bg?.name ?? 'Background');
	for (const t of (selectedSpecies(sys, ws)?.traits ?? [])) {
		if (isCreationTimeSpeciesTrait(t)) addChoices(t, 'SpeciesTrait', t.id, t.name);
	}
	for (const { featId, sourceKey } of allGrantedFeatIds(sys, ws)) {
		const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
		if (feat) addChoices(feat, 'Feat', feat.id, `Feat: ${feat.name}`, sourceKey);
	}
	for (const alloc of ws.classAllocs) {
		const cls = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
		if (!cls) continue;
		for (const f of (cls.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel))
			addChoices(f, 'ClassFeature', f.id, `${cls.name}: ${f.name}`);
		const sub = (cls.subclasses ?? []).find((s: any) => s.id === alloc.subclassId);
		if (sub) for (const f of (sub.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel))
			addChoices(f, 'SubclassFeature', f.id, `${sub.name}: ${f.name}`);
	}
	return choices;
}

// ── Speed / senses / innate spells ────────────────────────────────────────
export function autoGrantedSpeeds(sys: any, ws: WizardState): { movementType: string; speed: number }[] {
	const speedMap = new Map<string, number>();
	const parse = (raw: string | null | undefined) => {
		if (!raw) return;
		for (const entry of splitList(raw)) {
			const [mt, val] = entry.split(':').map(s => s.trim());
			const speed = parseInt(val ?? '0', 10);
			if (mt && speed > 0) speedMap.set(mt.toUpperCase(), (speedMap.get(mt.toUpperCase()) ?? 0) + speed);
		}
	};
	parse(selectedBackground(sys, ws)?.grantsSpeed);
	for (const { featId } of allGrantedFeatIds(sys, ws)) {
		const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
		if (feat) parse(feat.grantsSpeed);
	}
	for (const alloc of ws.classAllocs) {
		const classRef = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
		const features = [
			...((classRef?.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel)),
			...((classRef?.subclasses?.find((s: any) => s.id === alloc.subclassId)?.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel)),
		];
		for (const f of features) parse((f as any).grantsSpeed);
	}
	return [...speedMap.entries()].map(([movementType, speed]) => ({ movementType, speed }));
}
export function autoGrantedSenses(sys: any, ws: WizardState): string[] {
	const senses: string[] = [];
	const add = (raw: string | null | undefined) => { if (raw?.trim()) senses.push(raw.trim()); };
	add(selectedBackground(sys, ws)?.grantsSenses);
	for (const { featId } of allGrantedFeatIds(sys, ws)) {
		const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
		if (feat) add(feat.grantsSenses);
	}
	for (const alloc of ws.classAllocs) {
		const classRef = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
		const features = [
			...((classRef?.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel)),
			...((classRef?.subclasses?.find((s: any) => s.id === alloc.subclassId)?.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel)),
		];
		for (const f of features) add((f as any).grantsSenses);
	}
	return senses;
}
export function autoGrantedInnateSpellSources(sys: any, ws: WizardState): InnateSpellSource[] {
	const sources: InnateSpellSource[] = [];
	const bg = selectedBackground(sys, ws);
	if (bg?.grantsInnateSpells) sources.push({ raw: bg.grantsInnateSpells, sourceType: 'Background', sourceId: bg.id ?? '' });
	for (const t of (selectedSpecies(sys, ws)?.traits ?? [])) {
		if ((t as any).grantsInnateSpells) sources.push({ raw: (t as any).grantsInnateSpells, sourceType: 'SpeciesTrait', sourceId: t.id });
	}
	for (const { featId } of allGrantedFeatIds(sys, ws)) {
		const feat = (sys?.feats ?? []).find((f: any) => f.id === featId);
		if (feat?.grantsInnateSpells) sources.push({ raw: feat.grantsInnateSpells, sourceType: 'Feat', sourceId: feat.id });
	}
	return sources;
}
export function autoGrantedInnateSpells(sys: any, ws: WizardState): { name: string; minCharLevel: number; usesPerDay: number | null; sourceType: string; sourceId: string }[] {
	const spells: { name: string; minCharLevel: number; usesPerDay: number | null; sourceType: string; sourceId: string }[] = [];
	for (const src of autoGrantedInnateSpellSources(sys, ws)) {
		for (const entry of splitList(src.raw)) {
			const parts        = entry.split(':').map(s => s.trim());
			const name         = parts[0];
			const minCharLevel = parseInt(parts[1] ?? '1', 10) || 1;
			const usesRaw      = parseInt(parts[2] ?? '0', 10);
			spells.push({ name, minCharLevel, usesPerDay: usesRaw === 0 ? null : usesRaw, sourceType: src.sourceType, sourceId: src.sourceId });
		}
	}
	return spells;
}

// ── Overall pool completeness (used for final-submit gating) ─────────────
export function dmgModPoolsSatisfied(sys: any, ws: WizardState): boolean {
	return allDmgModChoices(sys, ws).every(ch => (ws.chosenDmgMods[ch.sourceId] ?? []).length >= Math.min(ch.count, ch.pool.length));
}
export function allPoolsSatisfied(sys: any, ws: WizardState): boolean {
	const bgCount = backgroundChoiceCount(sys, ws);
	const bgPool  = backgroundChoicePool(sys, ws);
	return (
		dmgModPoolsSatisfied(sys, ws) &&
		featureChoices(sys, ws).every(fc => (ws.chosenPoolSkills[fc.sourceId] ?? []).length >= Math.min(fc.count, fc.pool.length)) &&
		(bgCount === 0 || (ws.chosenPoolSkills[ws.backgroundId ?? ''] ?? []).length >= Math.min(bgCount, bgPool.length)) &&
		speciesTraitChoices(sys, ws).every((t: any) => (ws.chosenPoolSkills[t.id] ?? []).length >= Math.min(t.skillChoiceCount, splitList(t.skillChoicePool).length)) &&
		featSkillChoices(sys, ws).every(fc => (ws.chosenPoolSkills[fc.sourceId] ?? []).length >= Math.min(fc.count, fc.pool.length)) &&
		allSaveChoices(sys, ws).every(sc => (ws.chosenSavePools[sc.sourceId] ?? []).length >= Math.min(sc.count, sc.pool.length)) &&
		allToolChoices(sys, ws).every(tc => (ws.chosenToolPools[tc.sourceId] ?? []).length >= Math.min(tc.count, tc.pool.length)) &&
		allLanguageChoices(sys, ws).every(lc => (ws.chosenLanguagePools[lc.sourceId] ?? []).length >= Math.min(lc.count, lc.pool.length)) &&
		allExpertiseChoices(sys, ws).every(ec => {
			const pool = effectiveExpertisePool(ec, sys, ws);
			return (ws.chosenExpertisePools[ec.sourceId] ?? []).length >= Math.min(ec.count, pool.length);
		}) &&
		(sizeChoiceOptions(sys, ws).length === 0 || !!ws.chosenSize || !!traitFixedSize(sys, ws))
	);
}

// Pool completeness scoped to a specific origin bucket — used for per-step gating.
function poolBlockersForBucket(sys: any, ws: WizardState, bucket: OriginBucket): string[] {
	const blockers: string[] = [];
	const inBucket = (p: { sourceType: string; originSourceKey?: string }) => bucketOfPool(p) === bucket;
	const need = (label: string, chosen: string[], count: number, pool: string[]) => {
		const req = Math.min(count, pool.length);
		if (req > 0 && chosen.length < req) blockers.push(label);
	};

	if (bucket === 'background') {
		const bgCount = backgroundChoiceCount(sys, ws);
		const bgPool  = backgroundChoicePool(sys, ws);
		need('Background skills', ws.chosenPoolSkills[ws.backgroundId ?? ''] ?? [], bgCount, bgPool);
	}
	if (bucket === 'species') {
		if (sizeChoiceOptions(sys, ws).length > 0 && !ws.chosenSize && !traitFixedSize(sys, ws)) {
			blockers.push('Size');
		}
	}
	for (const fc of featureChoices(sys, ws).filter(inBucket)) {
		need(fc.label, ws.chosenPoolSkills[fc.sourceId] ?? [], fc.count, fc.pool);
	}
	for (const fc of featSkillChoices(sys, ws).filter(inBucket)) {
		need(fc.label, ws.chosenPoolSkills[fc.sourceId] ?? [], fc.count, fc.pool);
	}
	for (const sc of allSaveChoices(sys, ws).filter(inBucket)) {
		need(sc.label, ws.chosenSavePools[sc.sourceId] ?? [], sc.count, sc.pool);
	}
	for (const tc of allToolChoices(sys, ws).filter(inBucket)) {
		need(tc.label, ws.chosenToolPools[tc.sourceId] ?? [], tc.count, tc.pool);
	}
	for (const lc of allLanguageChoices(sys, ws).filter(inBucket)) {
		need(lc.label, ws.chosenLanguagePools[lc.sourceId] ?? [], lc.count, lc.pool);
	}
	for (const ec of allExpertiseChoices(sys, ws).filter(inBucket)) {
		const pool = effectiveExpertisePool(ec, sys, ws);
		need(ec.label, ws.chosenExpertisePools[ec.sourceId] ?? [], ec.count, pool);
	}
	for (const ch of allDmgModChoices(sys, ws).filter(inBucket)) {
		need(ch.label, ws.chosenDmgMods[ch.sourceId] ?? [], ch.count, ch.pool);
	}
	for (const src of allFeatureGrantSources(sys, ws).filter(s => originBucketForSourceKey(s.sourceKey) === bucket)) {
		if (!src.fixedFeatId && !ws.featureFeatPicks[src.sourceKey]) {
			blockers.push(src.category ? `${src.label} feat (${src.category})` : `${src.label} feat`);
		}
	}
	return blockers;
}

export function poolsSatisfiedForBucket(sys: any, ws: WizardState, bucket: OriginBucket): boolean {
	return poolBlockersForBucket(sys, ws, bucket).length === 0;
}

// ── ASI / Epic Boon slots ─────────────────────────────────────────────────
export function asiSlots(sys: any, ws: WizardState): Omit<AsiChoice, 'mode' | 'stat1' | 'amount1' | 'stat2' | 'amount2' | 'featId'>[] {
	const slots: Omit<AsiChoice, 'mode' | 'stat1' | 'amount1' | 'stat2' | 'amount2' | 'featId'>[] = [];
	const level = ws.classAllocs.reduce((s, c) => s + (c.allocatedLevel || 0), 0);
	for (const alloc of ws.classAllocs) {
		const classRef    = (sys?.classes ?? []).find((c: any) => c.id === alloc.classId);
		const subclassRef = classRef?.subclasses?.find((s: any) => s.id === alloc.subclassId);
		const classFeats   = (classRef?.features    ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel);
		const subFeats     = (subclassRef?.features ?? []).filter((f: any) => f.requiredLevel <= alloc.allocatedLevel);
		for (const feat of [...classFeats, ...subFeats]) {
			const isAsi      = isAsiFeatureName(feat.name);
			const isEpicBoon = isEpicBoonFeatureName(feat.name);
			if (!isAsi && !isEpicBoon) continue;
			slots.push({
				sourceClassId: alloc.classId,
				sourceLevel:   feat.requiredLevel,
				type:          isEpicBoon ? 'epic_boon' : 'asi',
				canEpicBoon:   level >= 19,
				sourceName:    classRef?.name ?? alloc.classId,
			});
		}
	}
	return slots;
}

// Syncs ws.asiChoices to match the current asiSlots (add/remove/preserve existing picks).
// Call from an $effect in the orchestrator; mirrors the original reactive block.
export function syncAsiChoices(sys: any, ws: WizardState) {
	const slots = asiSlots(sys, ws);
	const existingChoices = ws.asiChoices;
	ws.asiChoices = slots.map((slot) => {
		const existing = existingChoices.find(
			(c: AsiChoice) => c.sourceClassId === slot.sourceClassId && c.sourceLevel === slot.sourceLevel
		);
		return existing ?? {
			...slot,
			mode: null, stat1: '', amount1: 2, stat2: '', amount2: 0, featId: '', featGrantedStat: '',
		};
	});
	migrateAsiFeatPoolKeys(ws);
}

// Older sessions keyed feat choice pools by ASI slot index (`asi-feat-0`); stable keys
// use class id + level so picks survive slot reordering.
function migrateAsiFeatPoolKeys(ws: WizardState) {
	const migrate = (record: Record<string, string[]>, oldSuffix: string, newSuffix: string) => {
		const oldKey = oldSuffix;
		const newKey = newSuffix;
		if (oldKey === newKey || !record[oldKey]) return record;
		const next = { ...record };
		if (!next[newKey]) next[newKey] = next[oldKey];
		delete next[oldKey];
		return next;
	};

	for (let i = 0; i < ws.asiChoices.length; i++) {
		const c = ws.asiChoices[i];
		if (!c.featId) continue;
		const oldBase = `asi-feat-${i}`;
		const newBase = asiFeatSourceKey(c);
		if (oldBase === newBase) continue;
		ws.chosenPoolSkills = migrate(ws.chosenPoolSkills, oldBase, newBase);
		ws.chosenSavePools = migrate(ws.chosenSavePools, `${oldBase}-saves`, `${newBase}-saves`);
	}
}

export function availableFeats(sys: any): any[] {
	return (sys?.feats ?? []).filter((f: any) => f.isAvailable !== false && !f.isEpicBoon);
}
export function epicBoonFeats(sys: any): any[] {
	return (sys?.feats ?? []).filter((f: any) => f.isAvailable !== false && f.isEpicBoon);
}
export function featsForChoice(sys: any, choice: AsiChoice): any[] {
	if (choice.type === 'epic_boon') return epicBoonFeats(sys);
	if (choice.canEpicBoon) return (sys?.feats ?? []).filter((f: any) => f.isAvailable !== false && !isAsiFeatureName(f.name));
	return availableFeats(sys);
}
export function asiValid(sys: any, ws: WizardState): boolean {
	return ws.asiChoices.every(c => asiChoiceValid(sys, c));
}

export function asiChoiceValid(sys: any, c: AsiChoice): boolean {
	if (c.type === 'epic_boon') return !!c.featId;
	if (c.mode === 'feat') {
		if (!c.featId) return false;
		const featDef = (sys?.feats ?? []).find((f: any) => f.id === c.featId);
		if (featDef?.asiAmount && !featDef.asiStatFixed && !c.featGrantedStat) return false;
		return true;
	}
	if (c.mode === 'stat') return !!c.stat1 && c.amount1 > 0;
	return false;
}

// ── Step-level / final validation ─────────────────────────────────────────
export function canAdvanceStep(sys: any, ws: WizardState, step: number): boolean {
	return advanceBlockersForStep(sys, ws, step).length === 0;
}

export function advanceBlockersForStep(sys: any, ws: WizardState, step: number): string[] {
	const blockers: string[] = [];
	switch (step) {
		case 0:
			if (!ws.name.trim()) blockers.push('Character name');
			break;
		case 1:
			if (!ws.speciesId) blockers.push('Species');
			blockers.push(...poolBlockersForBucket(sys, ws, 'species'));
			break;
		case 2:
			if (!ws.backgroundId) blockers.push('Background');
			if (!bgFeatValidBgOnly(sys, ws)) blockers.push('Background feat');
			blockers.push(...poolBlockersForBucket(sys, ws, 'background'));
			break;
		case 3:
			if (!ws.scoresValid) blockers.push('Ability scores');
			break;
		case 4: {
			if (!ws.classesValid) blockers.push('Class');
			const skillCount = classSkillCount(sys, ws);
			const avail = availableClassSkills(sys, ws);
			if (ws.chosenClassSkills.length < Math.min(skillCount, avail.length)) blockers.push('Class skills');
			blockers.push(...poolBlockersForBucket(sys, ws, 'classes'));
			for (const c of ws.asiChoices) {
				if (!asiChoiceValid(sys, c)) {
					blockers.push(`${c.sourceName} Lv${c.sourceLevel} ASI`);
				}
			}
			break;
		}
	}
	return blockers;
}

export function canSubmit(sys: any, ws: WizardState): boolean {
	const skillCount = classSkillCount(sys, ws);
	const avail = availableClassSkills(sys, ws);
	return (
		ws.name.trim().length > 0 && !!ws.speciesId && !!ws.backgroundId && bgFeatValid(sys, ws) &&
		ws.scoresValid && ws.classesValid && asiValid(sys, ws) &&
		ws.chosenClassSkills.length >= Math.min(skillCount, avail.length) &&
		allPoolsSatisfied(sys, ws)
	);
}

// ── Class browser helpers ─────────────────────────────────────────────────
export function subclassesFor(sys: any, classId: string, level: number): any[] {
	const cls = (sys?.classes ?? []).find((c: any) => c.id === classId);
	if (!cls) return [];
	return (cls.subclasses ?? []).filter((s: any) => level >= (cls.subclassAvailableAtLevel ?? 3));
}
export function featureTimeline(sys: any, browseClassId: string, browseSubId: string): { id: string; level: number; name: string; description: string | null; source: string; sourceType: 'class' | 'subclass' }[] {
	const rows: { id: string; level: number; name: string; description: string | null; source: string; sourceType: 'class' | 'subclass' }[] = [];
	const bc = (sys?.classes ?? []).find((c: any) => c.id === browseClassId);
	if (!bc) return rows;
	for (const f of (bc.features ?? [])) rows.push({ id: `cls-${f.id}`, level: f.requiredLevel, name: f.name, description: f.description ?? null, source: bc.name, sourceType: 'class' });
	const bs = (bc.subclasses ?? []).find((s: any) => s.id === browseSubId);
	if (bs) for (const f of (bs.features ?? [])) rows.push({ id: `sub-${f.id}`, level: f.requiredLevel, name: f.name, description: f.description ?? null, source: bs.name, sourceType: 'subclass' });
	return rows.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}
