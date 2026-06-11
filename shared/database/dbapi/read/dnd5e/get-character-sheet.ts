// shared/database/dbapi/read/dnd5e/get-character-sheet.ts
import { db } from '../../../index.ts';

export async function getDnd5eCharacterSheet(characterId: string) {
    const [sheet, classes, chosenFeats, abilityScores] = await Promise.all([
        db.dnd5eCharacterSheet.findUnique({ where: { characterId } }),
        db.dnd5eCharacterClass.findMany({ where: { characterId }, orderBy: { allocatedLevel: 'desc' } }),
        db.dnd5eCharacterFeat.findMany({ where: { characterId }, include: { feat: true } }),
        db.dnd5eAbilityScore.findMany({ where: { characterId } }),
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

    const totalLevel = classes.reduce((s: number, c: any) => s + c.allocatedLevel, 0);

    // Compute ASI slots — each class feature named "Ability Score Improvement" or "Epic Boon Feat"
    const asiSlots: any[] = [];
    const usedFeatRowIds  = new Set<string>();
    for (const cc of enrichedClasses) {
        // ASI and Epic Boon slots come only from class features, not subclass features
        const allFeatures = cc.classFeatures ?? [];
        for (const feat of allFeatures) {
            const isAsi      = feat.name === 'Ability Score Improvement';
            const isEpicBoon = feat.name === 'Epic Boon Feat';
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

    // Background feat slots — grantsFeatCategory (player picks) or grantsFeatId (auto-granted, locked)
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

    return {
        sheet,
        enrichedClasses,
        speciesRef:    speciesRecord    ?? null,
        backgroundRef: backgroundRecord ?? null,
        asiSlots: allSlots,
        pendingSlots,
        chosenFeats,
        abilityScores,
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
        const isAsi    = featName === 'Ability Score Improvement';
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