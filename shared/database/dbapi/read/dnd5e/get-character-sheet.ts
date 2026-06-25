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

    // ── Skills — grant log, effective = MAX(value), overrides take priority ───
    // Override priority: Admin > DM > Player. Each role can hold its own override row.
    // All grants remain tracked rows; when a feature/feat is removed at level-down,
    // its grant row is deleted via the standard cleanup flow.
    const OVERRIDE_PRIORITY = { Player: 1, DM: 2, Admin: 3 } as const;
    const effectiveSkillValue = new Map<string, number>();
    const overrideSkillValue  = new Map<string, { value: number; priority: number }>();
    for (const grant of skillGrants) {
        const st = (grant as any).sourceType as string;
        if (st === 'Player' || st === 'DM' || st === 'Admin') {
            const priority = OVERRIDE_PRIORITY[st as keyof typeof OVERRIDE_PRIORITY];
            const cur      = overrideSkillValue.get(grant.skill as string);
            if (!cur || priority > cur.priority) {
                overrideSkillValue.set(grant.skill as string, { value: grant.value as number, priority });
            }
            continue;
        }
        const cur = effectiveSkillValue.get(grant.skill as string) ?? 0;
        if ((grant.value as number) > cur) effectiveSkillValue.set(grant.skill as string, grant.value as number);
    }
    // Highest-priority override (if any) replaces the MAX
    for (const [skill, { value }] of overrideSkillValue) {
        effectiveSkillValue.set(skill, value);
    }

    const enrichedSkills = ALL_SKILLS.map(skill => {
        const value    = effectiveSkillValue.get(skill) ?? 0;
        const ability  = SKILL_ABILITY[skill];
        const scoreRow = abilityScores.find((a: any) => a.stat === ability);
        const abilMod  = abilityModifier(scoreRow?.baseScore ?? 10);
        const modifier = abilMod + Math.floor(pb * value);
        const sources  = [...new Set((skillGrants as any[]).filter(g => g.skill === skill).map(g => g.sourceType))];
        return { skill, ability, value, modifier, sources };
    });

    // ── Saving throws — proficient if any grant row exists, overrides take priority ──
    // Override priority: Admin > DM > Player. A row alone makes proficient.
    // sourceId === '__SUPPRESS__' forces non-proficient even if other sources grant it.
    const otherProfStats = new Set(
        (saveGrants as any[])
            .filter(g => g.sourceType !== 'Player' && g.sourceType !== 'DM' && g.sourceType !== 'Admin')
            .map(g => g.stat)
    );
    const overrideProf = new Map<string, { proficient: boolean; priority: number }>();
    for (const grant of saveGrants as any[]) {
        const st = grant.sourceType as string;
        if (st === 'Player' || st === 'DM' || st === 'Admin') {
            const priority   = OVERRIDE_PRIORITY[st as keyof typeof OVERRIDE_PRIORITY];
            const proficient = grant.sourceId !== '__SUPPRESS__';
            const cur        = overrideProf.get(grant.stat);
            if (!cur || priority > cur.priority) {
                overrideProf.set(grant.stat, { proficient, priority });
            }
        }
    }
    const enrichedSavingThrows = ALL_STATS.map(stat => {
        const proficient = overrideProf.has(stat) ? overrideProf.get(stat)!.proficient : otherProfStats.has(stat);
        const scoreRow   = abilityScores.find((a: any) => a.stat === stat);
        const abilMod    = abilityModifier(scoreRow?.baseScore ?? 10);
        const modifier   = abilMod + (proficient ? pb : 0);
        const sources    = [...new Set((saveGrants as any[]).filter(g => g.stat === stat).map(g => g.sourceType))];
        return { stat, proficient, modifier, sources };
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