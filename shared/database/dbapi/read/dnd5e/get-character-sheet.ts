// shared/database/dbapi/read/dnd5e/get-character-sheet.ts
import { db } from '../../../index.ts';
import { isAsiFeatureName, isEpicBoonFeatureName } from './feature-names.ts';
import { SKILL_ABILITY, ALL_SKILLS, ALL_STATS, proficiencyBonus, abilityModifier } from './skills.ts';

export async function getDnd5eCharacterSheet(characterId: string) {
    const [sheet, classes, chosenFeats, abilityScores, skillGrants, saveGrants,
           toolGrants, languageGrants, damageModifierGrants, innateSpellbook] = await Promise.all([
        db.dnd5eCharacterSheet.findUnique({ where: { characterId } }),
        db.dnd5eCharacterClass.findMany({ where: { characterId }, orderBy: { allocatedLevel: 'desc' } }),
        db.dnd5eCharacterFeat.findMany({ where: { characterId }, include: { feat: true } }),
        db.dnd5eAbilityScore.findMany({ where: { characterId } }),
        db.dnd5eCharacterSkillGrant.findMany({ where: { characterId } }),
        db.dnd5eCharacterSavingThrowGrant.findMany({ where: { characterId } }),
        db.dnd5eCharacterToolGrant.findMany({ where: { characterId } }),
        db.dnd5eCharacterLanguageGrant.findMany({ where: { characterId } }),
        db.dnd5eCharacterDamageModifierGrant.findMany({ where: { characterId } }),
        db.dnd5eSpellbook.findFirst({
            where: { characterId, isInnate: true },
            include: { entries: { orderBy: [{ minCharLevel: 'asc' }, { spellId: 'asc' }] } },
        }),
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
        sheet?.speciesId    ? db.dnd5eSpecies.findUnique({ where: { id: sheet.speciesId }, include: { traits: { include: { speeds: { orderBy: { movementType: 'asc' } } } } } }) : null,
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
        expertiseChoiceCount:   number | null;
        expertiseChoicePool:    string | null;
    }[] = [];

    for (const cc of enrichedClasses) {
        const allFeatures = [
            ...(cc.classFeatures    ?? []).map((f: any) => ({ ...f, sourceType: 'ClassFeature',    sourceName: cc.classRef?.name    ?? '' })),
            ...(cc.subclassFeatures ?? []).map((f: any) => ({ ...f, sourceType: 'SubclassFeature', sourceName: cc.subclassRef?.name ?? '' })),
        ];
        for (const f of allFeatures) {
            const hasSkillChoice     = f.skillChoiceCount       && f.skillChoicePool;
            const hasSaveChoice      = f.savingThrowChoiceCount && f.savingThrowChoicePool;
            const hasExpertiseChoice = (f as any).expertiseChoiceCount && (f as any).expertiseChoicePool;
            if (!hasSkillChoice && !hasSaveChoice && !hasExpertiseChoice) continue;
            const skillDone     = !hasSkillChoice     || resolvedSkillSourceIds.has(f.id);
            const saveDone      = !hasSaveChoice      || resolvedSaveSourceIds.has(f.id);
            const expertiseDone = !hasExpertiseChoice || (skillGrants as any[]).some(g => g.sourceId === f.id && g.value >= 2.0);
            if (skillDone && saveDone && expertiseDone) continue;
            pendingChoices.push({
                sourceId:               f.id,
                sourceType:             f.sourceType,
                label:                  `${f.sourceName}: ${f.name} (level ${f.requiredLevel})`,
                skillChoiceCount:       hasSkillChoice     && !skillDone     ? f.skillChoiceCount     : null,
                skillChoicePool:        hasSkillChoice     && !skillDone     ? f.skillChoicePool      : null,
                savingThrowChoiceCount: hasSaveChoice      && !saveDone      ? f.savingThrowChoiceCount : null,
                savingThrowChoicePool:  hasSaveChoice      && !saveDone      ? f.savingThrowChoicePool  : null,
                expertiseChoiceCount:   hasExpertiseChoice && !expertiseDone ? (f as any).expertiseChoiceCount : null,
                expertiseChoicePool:    hasExpertiseChoice && !expertiseDone ? (f as any).expertiseChoicePool  : null,
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

    // ── Tools ─────────────────────────────────────────────────────────────────
    const OVERRIDE_TYPES_SET = new Set(['Override', 'Player', 'DM', 'Admin']);
    const toolOverrides = new Map<string, any>(); // tool → grant row
    const toolSourceGrants: any[] = [];
    for (const g of toolGrants as any[]) {
        if (OVERRIDE_TYPES_SET.has(g.sourceType)) { toolOverrides.set(g.tool, g); }
        else toolSourceGrants.push(g);
    }
    const enrichedTools = [...new Set([
        ...toolSourceGrants.map((g: any) => g.tool),
        ...[...toolOverrides.keys()],
    ])].map(tool => {
        const overrideGrant = toolOverrides.get(tool) ?? null;
        const sources = (toolGrants as any[]).filter(g => g.tool === tool && !OVERRIDE_TYPES_SET.has(g.sourceType))
            .map(g => ({ label: resolveGrantLabel(g) }));
        return { tool, overrideNote: overrideGrant?.note ?? null, hasOverride: !!overrideGrant, grantSources: sources };
    });

    // ── Languages ──────────────────────────────────────────────────────────────
    const langOverrides = new Map<string, any>();
    const langSourceGrants: any[] = [];
    for (const g of languageGrants as any[]) {
        if (OVERRIDE_TYPES_SET.has(g.sourceType)) { langOverrides.set(g.language, g); }
        else langSourceGrants.push(g);
    }
    const enrichedLanguages = [...new Set([
        ...langSourceGrants.map((g: any) => g.language),
        ...[...langOverrides.keys()],
    ])].map(language => {
        const overrideGrant = langOverrides.get(language) ?? null;
        const sources = (languageGrants as any[]).filter(g => g.language === language && !OVERRIDE_TYPES_SET.has(g.sourceType))
            .map(g => ({ label: resolveGrantLabel(g) }));
        return { language, overrideNote: overrideGrant?.note ?? null, hasOverride: !!overrideGrant, grantSources: sources };
    });

    // ── Damage modifiers ───────────────────────────────────────────────────────
    // Group by modifierType, deduplicate by damageType within each group
    const dmgByType: Record<string, { damageType: string; hasOverride: boolean; overrideNote: string | null; grantSources: any[] }[]> = {
        RESISTANCE: [], IMMUNITY: [], VULNERABILITY: [],
    };
    for (const modType of ['RESISTANCE', 'IMMUNITY', 'VULNERABILITY'] as const) {
        const rows = (damageModifierGrants as any[]).filter(g => g.modifierType === modType);
        const overrideMap = new Map<string, any>();
        const sourceRows: any[] = [];
        for (const g of rows) {
            if (OVERRIDE_TYPES_SET.has(g.sourceType)) overrideMap.set(g.damageType, g);
            else sourceRows.push(g);
        }
        const damageTypes = [...new Set([...sourceRows.map(g => g.damageType), ...[...overrideMap.keys()]])];
        dmgByType[modType] = damageTypes.map(damageType => ({
            damageType,
            hasOverride:  overrideMap.has(damageType),
            overrideNote: overrideMap.get(damageType)?.note ?? null,
            grantSources: sourceRows.filter(g => g.damageType === damageType).map(g => ({ label: resolveGrantLabel(g) })),
        }));
    }

    // ── Aggregate size, senses, speeds from species traits ───────────────────
    const activeTraits = (speciesRecord as any)?.traits ?? [];
    const traitSize        = activeTraits.map((t: any) => t.size).find((s: any) => s) ?? null;
    const traitSizeChoices = activeTraits.map((t: any) => t.sizeChoices).filter(Boolean).join(',') || null;
    // Combine senses (base physical senses) and grantsSenses (bonus senses) from all active traits
    const traitSenses      = activeTraits.flatMap((t: any) => [t.senses, t.grantsSenses]).filter(Boolean).join(', ') || null;
    // Aggregate speeds — sum by movementType across all traits
    const speedMap = new Map<string, number>();
    for (const t of activeTraits) {
        for (const sp of t.speeds ?? []) {
            speedMap.set(sp.movementType, (speedMap.get(sp.movementType) ?? 0) + sp.speed);
        }
    }

    // ── Add speed/senses from class/subclass features, background, feats ─────
    // Parse "WALK:10,SWIM:30" format and add additively to speedMap
    const parseGrantSpeed = (raw: string | null | undefined) => {
        if (!raw) return;
        for (const entry of raw.split(',').map(s => s.trim()).filter(Boolean)) {
            const [mt, val] = entry.split(':').map(s => s.trim());
            const speed = parseInt(val ?? '0', 10);
            if (mt && speed > 0) speedMap.set(mt.toUpperCase(), (speedMap.get(mt.toUpperCase()) ?? 0) + speed);
        }
    };
    // Collect extra senses from features/background/feats
    const extraSenses: string[] = [];
    const addGrantSenses = (raw: string | null | undefined) => { if (raw?.trim()) extraSenses.push(raw.trim()); };

    // Background
    if (backgroundRecord) {
        parseGrantSpeed((backgroundRecord as any).grantsSpeed);
        addGrantSenses((backgroundRecord as any).grantsSenses);
    }
    // Chosen feats
    for (const cf of chosenFeats) {
        parseGrantSpeed((cf.feat as any).grantsSpeed);
        addGrantSenses((cf.feat as any).grantsSenses);
    }
    // Class + subclass features
    for (const cc of enrichedClasses) {
        for (const f of [...(cc.classFeatures ?? []), ...(cc.subclassFeatures ?? [])]) {
            parseGrantSpeed((f as any).grantsSpeed);
            addGrantSenses((f as any).grantsSenses);
        }
    }

    const aggregatedSpeeds = [...speedMap.entries()].map(([movementType, speed]) => ({ movementType, speed }));
    // Combine trait senses + feature senses
    const allSenses = [traitSenses, ...extraSenses].filter(Boolean).join(', ') || null;

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
        tools:            enrichedTools,
        languages:        enrichedLanguages,
        resistances:      dmgByType.RESISTANCE,
        immunities:       dmgByType.IMMUNITY,
        vulnerabilities:  dmgByType.VULNERABILITY,
        innateSpellbook:  innateSpellbook ?? null,
        passivePerception,
        proficiencyBonus: pb,
        // Aggregated from species traits
        traitSize,
        traitSizeChoices,
        traitSenses,
        allSenses,
        aggregatedSpeeds,
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