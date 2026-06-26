// shared/database/dbapi/read/dnd5e/get-character-sheet.ts
import { db } from '../../../index.ts';
import { isAsiFeatureName, isEpicBoonFeatureName } from './feature-names.ts';
import { SKILL_ABILITY, ALL_SKILLS, ALL_STATS, proficiencyBonus, abilityModifier } from './skills.ts';

export async function getDnd5eCharacterSheet(characterId: string) {
    const [sheet, classes, chosenFeats, abilityScores, skillGrants, saveGrants] = await Promise.all([
        db.dnd5eCharacterSheet.findUnique({ where: { characterId } }),
        db.dnd5eCharacterClass.findMany({ where: { characterId }, orderBy: { allocatedLevel: 'desc' } }),
        db.dnd5eCharacterFeat.findMany({ where: { characterId }, include: { feat: true } }),
        db.dnd5eAbilityScore.findMany({ where: { characterId } }),
        db.dnd5eCharacterSkillGrant.findMany({ where: { characterId } }),
        db.dnd5eCharacterSavingThrowGrant.findMany({ where: { characterId } }),
    ]);


    if (!sheet && !classes.length) return null;

    // Clean up duplicate orphan rows (same featId, no sourceClassId) — keep only one per featId
    const orphansByFeatId = new Map<string, string[]>();
    for (const cf of chosenFeats) {
        if (cf.sourceClassId) continue;
        const list = orphansByFeatId.get(cf.featId) ?? [];
        list.push(cf.id);
        orphansByFeatId.set(cf.featId, list);
    }
    const toDelete: string[] = [];
    for (const [, ids] of orphansByFeatId) {
        if (ids.length > 1) toDelete.push(...ids.slice(1)); // keep first, delete rest
    }
    if (toDelete.length) {
        await db.dnd5eCharacterFeat.deleteMany({ where: { id: { in: toDelete } } });
        // Remove deleted rows from chosenFeats array
        const deleteSet = new Set(toDelete);
        chosenFeats.splice(0, chosenFeats.length, ...chosenFeats.filter((cf: any) => !deleteSet.has(cf.id)));
    }

    const classIds    = classes.map((c: any) => c.classId);
    const subclassIds = classes.map((c: any) => c.subclassId).filter(Boolean) as string[];

    const [classRecords, subclassRecords, speciesRecord, backgroundRecord] = await Promise.all([
        classIds.length    ? db.dnd5eClass.findMany({
            where:   { id: { in: classIds } },
            include: { features: { orderBy: { requiredLevel: 'asc' } } },
        }) : [],
        subclassIds.length ? db.dnd5eSubclass.findMany({
            where:   { id: { in: subclassIds } },
            include: { features: { orderBy: { requiredLevel: 'asc' } } },
        }) : [],
        sheet?.speciesId    ? db.dnd5eSpecies.findUnique({ where: { id: sheet.speciesId }, include: { traits: true } }) : null,
        sheet?.backgroundId ? db.dnd5eBackground.findUnique({ where: { id: sheet.backgroundId }, include: { grantsFeat: { select: { id: true, name: true } } } }) : null,
    ]);

    const classMap    = Object.fromEntries((classRecords as any[]).map((c: any) => [c.id, c]));
    const subclassMap = Object.fromEntries((subclassRecords as any[]).map((s: any) => [s.id, s]));

    const enrichedClasses = classes.map((cc: any) => {
        const classRef         = classMap[cc.classId]    ?? null;
        const subclassRef      = cc.subclassId ? (subclassMap[cc.subclassId] ?? null) : null;
        const classFeatures    = classRef?.features?.filter((f: any) => f.requiredLevel <= cc.allocatedLevel) ?? [];
        const subclassFeatures = subclassRef?.features?.filter((f: any) => f.requiredLevel <= cc.allocatedLevel) ?? [];
        return { ...cc, classRef, subclassRef, classFeatures, subclassFeatures };
    });

    // Compute ASI slots — each class feature named "Ability Score Improvement" or "Epic Boon Feat"
    const asiSlots: any[] = [];
    const usedFeatRowIds  = new Set<string>();
    const totalLevel = classes.reduce((s: number, c: any) => s + c.allocatedLevel, 0);
    for (const cc of enrichedClasses) {
        // ASI and Epic Boon slots come only from class features, not subclass features
        const allFeatures = cc.classFeatures ?? [];
        for (const feat of allFeatures) {
            const isAsi      = isAsiFeatureName(feat.name);
            const isEpicBoon = isEpicBoonFeatureName(feat.name);
            if (!isAsi && !isEpicBoon) continue;

            const resolved = findSlotResolution(cc.classId, feat.requiredLevel, chosenFeats, usedFeatRowIds);
            asiSlots.push({
                slotIndex:    asiSlots.length,
                type:         isEpicBoon ? 'epic_boon' : 'asi',
                sourceClass:  cc.classRef?.name ?? cc.classId,
                sourceClassId: cc.classId,
                sourceLevel:  feat.requiredLevel,
                canEpicBoon:  totalLevel >= 19,
                resolved,
            });
        }
    }

    const backgroundSlots: any[] = [];
    if (backgroundRecord) {
        const bg = backgroundRecord as any;
        if (bg.grantsFeatCategory || bg.grantsFeatId) {
            let resolved = findSlotResolution('background', 1, chosenFeats, usedFeatRowIds);

            // Auto-grant: if background has grantsFeatId but no row exists yet, create it now
            if (bg.grantsFeatId && !resolved) {
                await db.dnd5eCharacterFeat.deleteMany({
                    where: { characterId, sourceClassId: 'background', sourceLevel: 1 }
                });
                const newRow = await db.dnd5eCharacterFeat.create({
                    data: { characterId, featId: bg.grantsFeatId, sourceClassId: 'background', sourceLevel: 1 },
                    include: { feat: { select: { name: true, id: true } } },
                });
                resolved = {
                    kind:      'feat',
                    charFeatId: newRow.id,
                    featId:    bg.grantsFeatId,
                    featName:  (newRow as any).feat?.name ?? null,
                    asiStat1: null, asiAmount1: null, asiStat2: null, asiAmount2: null,
                };
            }

            backgroundSlots.push({
                type:          'background_feat',
                sourceClass:   bg.name,
                sourceClassId: 'background',
                sourceLevel:   1,
                featCategory:  bg.grantsFeatCategory ?? null,
                grantsFeatId:  bg.grantsFeatId ?? null,
                canEpicBoon:   false,
                resolved,
            });
        }
    }

    const allSlots     = [...asiSlots, ...backgroundSlots];
    const pendingSlots = allSlots.filter(s => !s.resolved).length;

    // ── Pending skill/save choice pools from features ─────────────────────
    // Features that have skillChoicePool or savingThrowChoicePool but haven't
    // been resolved yet (no skill/save grant with that sourceId exists).
    const resolvedSkillSourceIds = new Set((skillGrants as any[]).map(g => g.sourceId).filter(Boolean));
    const resolvedSaveSourceIds  = new Set((saveGrants  as any[]).map(g => g.sourceId).filter(Boolean));

    const pendingChoices: {
        sourceId:               string;
        sourceType:             string;
        label:                  string;
        skillChoiceCount:       number | null;
        skillChoicePool:        string | null;
        savingThrowChoiceCount: number | null;
        savingThrowChoicePool:  string | null;
    }[] = [];

    for (const cc of enrichedClasses) {
        const allFeatures = [
            ...(cc.classFeatures    ?? []).map((f: any) => ({ ...f, sourceType: 'ClassFeature',    sourceName: cc.classRef?.name    ?? '' })),
            ...(cc.subclassFeatures ?? []).map((f: any) => ({ ...f, sourceType: 'SubclassFeature', sourceName: cc.subclassRef?.name ?? '' })),
        ];
        for (const f of allFeatures) {
            const hasSkillChoice = f.skillChoiceCount       && f.skillChoicePool;
            const hasSaveChoice  = f.savingThrowChoiceCount && f.savingThrowChoicePool;
            if (!hasSkillChoice && !hasSaveChoice) continue;
            const skillDone = !hasSkillChoice || resolvedSkillSourceIds.has(f.id);
            const saveDone  = !hasSaveChoice  || resolvedSaveSourceIds.has(f.id);
            if (skillDone && saveDone) continue;
            pendingChoices.push({
                sourceId:               f.id,
                sourceType:             f.sourceType,
                label:                  `${f.sourceName}: ${f.name} (level ${f.requiredLevel})`,
                skillChoiceCount:       hasSkillChoice && !skillDone ? f.skillChoiceCount : null,
                skillChoicePool:        hasSkillChoice && !skillDone ? f.skillChoicePool  : null,
                savingThrowChoiceCount: hasSaveChoice  && !saveDone  ? f.savingThrowChoiceCount : null,
                savingThrowChoicePool:  hasSaveChoice  && !saveDone  ? f.savingThrowChoicePool  : null,
            });
        }
    }

    const pb = proficiencyBonus(totalLevel);

    // ── Skills — source grants MAX(value); single Override row wins outright ─────
    // Legacy sourceTypes Player/DM/Admin treated same as Override for back-compat.
    const OVERRIDE_TYPES = new Set(['Override', 'Player', 'DM', 'Admin']);
    const effectiveSkillValue = new Map<string, number>();
    const overrideSkillGrant  = new Map<string, any>(); // skill → grant row
    for (const grant of skillGrants) {
        const st = (grant as any).sourceType as string;
        if (OVERRIDE_TYPES.has(st)) {
            overrideSkillGrant.set(grant.skill as string, grant);
            continue;
        }
        const cur = effectiveSkillValue.get(grant.skill as string) ?? 0;
        if ((grant.value as number) > cur) effectiveSkillValue.set(grant.skill as string, grant.value as number);
    }
    // Override replaces source MAX entirely
    for (const [skill, grant] of overrideSkillGrant) {
        effectiveSkillValue.set(skill, grant.value as number);
    }

    // Build sourceId → label map for tooltip display (feature/trait/feat UUID → readable name)
    const sourceLabels = new Map<string, string>();
    if (backgroundRecord) {
        sourceLabels.set((backgroundRecord as any).id, `Background: ${(backgroundRecord as any).name}`);
    }
    if (speciesRecord) {
        sourceLabels.set((speciesRecord as any).id, `Species: ${(speciesRecord as any).name}`);
        for (const t of (speciesRecord as any).traits ?? []) {
            sourceLabels.set(t.id, `${(speciesRecord as any).name} — ${t.name}`);
        }
    }
    for (const cc of enrichedClasses) {
        for (const f of cc.classFeatures    ?? []) sourceLabels.set(f.id, `${cc.classRef?.name ?? 'Class'}: ${f.name}`);
        for (const f of cc.subclassFeatures ?? []) sourceLabels.set(f.id, `${cc.subclassRef?.name ?? 'Subclass'}: ${f.name}`);
    }
    for (const cf of chosenFeats) {
        const name = cf.feat?.name ?? null;
        if (name && cf.featId) sourceLabels.set(cf.featId, `Feat: ${name}`);
    }

    // Fallback labels for sourceTypes that have no sourceId
    const sourceTypeFallback: Record<string, string> = {
        Background:      backgroundRecord ? `Background: ${(backgroundRecord as any).name}` : 'Background',
        Class:           enrichedClasses[0]?.classRef?.name ? `${enrichedClasses[0].classRef.name} (class saves)` : 'Class',
        PlayerChoice:    'Class skill choice',
        SpeciesTrait:    speciesRecord ? `Species: ${(speciesRecord as any).name}` : 'Species trait',
        ClassFeature:    'Class feature',
        SubclassFeature: 'Subclass feature',
        Feat:            'Feat',
    };

    function resolveGrantLabel(g: any): string {
        if (g.sourceId && sourceLabels.has(g.sourceId)) return sourceLabels.get(g.sourceId)!;
        return sourceTypeFallback[g.sourceType] ?? g.sourceType;
    }

    const enrichedSkills = ALL_SKILLS.map(skill => {
        const value         = effectiveSkillValue.get(skill) ?? 0;
        const overrideGrant = overrideSkillGrant.get(skill) ?? null;
        const overrideValue = overrideGrant ? (overrideGrant.value as number) : null; // null = no override
        const overrideNote  = overrideGrant ? (overrideGrant.note as string | null) : null;
        const ability  = SKILL_ABILITY[skill];
        const scoreRow = abilityScores.find((a: any) => a.stat === ability);
        const abilMod  = abilityModifier(scoreRow?.baseScore ?? 10);
        const modifier = abilMod + Math.floor(pb * value);
        // Source grants for tooltip — all non-override rows, resolved to human labels
        const grantSources = (skillGrants as any[])
            .filter(g => g.skill === skill && !OVERRIDE_TYPES.has(g.sourceType))
            .map(g => ({ label: resolveGrantLabel(g), value: g.value as number }));
        return { skill, ability, value, overrideValue, overrideNote, modifier, grantSources };
    });

    // ── Saving throws — Override row wins; sourceId='__SUPPRESS__' = not proficient ──
    const otherProfStats = new Set(
        (saveGrants as any[])
            .filter(g => !OVERRIDE_TYPES.has(g.sourceType))
            .map(g => g.stat)
    );
    const overrideProf = new Map<string, boolean>(); // stat → proficient
    for (const grant of saveGrants as any[]) {
        if (OVERRIDE_TYPES.has(grant.sourceType as string)) {
            overrideProf.set(grant.stat, grant.sourceId !== '__SUPPRESS__');
        }
    }
    const enrichedSavingThrows = ALL_STATS.map(stat => {
        const proficient    = overrideProf.has(stat) ? overrideProf.get(stat)! : otherProfStats.has(stat);
        const overrideGrant = (saveGrants as any[]).find(g => g.stat === stat && OVERRIDE_TYPES.has(g.sourceType)) ?? null;
        const overrideNote  = overrideGrant ? (overrideGrant.note as string | null) : null;
        const scoreRow      = abilityScores.find((a: any) => a.stat === stat);
        const abilMod       = abilityModifier(scoreRow?.baseScore ?? 10);
        const modifier      = abilMod + (proficient ? pb : 0);
        const grantSources  = (saveGrants as any[])
            .filter(g => g.stat === stat && !OVERRIDE_TYPES.has(g.sourceType))
            .map(g => ({ label: resolveGrantLabel(g) }));
        const hasOverride   = overrideGrant !== null;
        return { stat, proficient, modifier, overrideNote, grantSources, hasOverride };
    });

    const passivePerception = 10 + (enrichedSkills.find(s => s.skill === 'PERCEPTION')?.modifier ?? 0);

    return {
        sheet,
        enrichedClasses,
        speciesRef:       speciesRecord    ?? null,
        backgroundRef:    backgroundRecord ?? null,
        asiSlots:         allSlots,
        pendingSlots,
        pendingChoices,
        chosenFeats,
        abilityScores,
        skills:           enrichedSkills,
        savingThrows:     enrichedSavingThrows,
        passivePerception,
        proficiencyBonus: pb,
    };
}

// Match a slot to a chosen feat by sourceClassId + sourceLevel.
// Falls back to unlinked feats (sourceClassId is null) matched in order.
function findSlotResolution(sourceClassId: string, sourceLevel: number, chosenFeats: any[], usedFeatRowIds: Set<string>) {
    // Primary: exact slot match
    const cf = chosenFeats.find(
        (f: any) => f.sourceClassId === sourceClassId && f.sourceLevel === sourceLevel
    );
    function resolve(row: any) {
        const featName = row.feat?.name ?? null;
        const isAsi    = isAsiFeatureName(featName);
        return {
            kind:      isAsi ? 'asi' : 'feat',
            charFeatId: row.id,
            featId:    row.featId,
            featName,
            asiStat1:   row.asiStat1   ?? null,
            asiAmount1: row.asiAmount1 ?? null,
            asiStat2:   row.asiStat2   ?? null,
            asiAmount2: row.asiAmount2 ?? null,
        };
    }

    if (cf) { usedFeatRowIds.add(cf.id); return resolve(cf); }

    // Fallback: unlinked feat row not yet assigned
    const orphan = chosenFeats.find((f: any) => !f.sourceClassId && !usedFeatRowIds.has(f.id));
    if (orphan) { usedFeatRowIds.add(orphan.id); return resolve(orphan); }

    return null;
}