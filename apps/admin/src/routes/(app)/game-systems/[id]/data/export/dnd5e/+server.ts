// apps/admin/src/routes/(app)/game-systems/[id]/data/export/dnd5e/+server.ts
import { error } from '@sveltejs/kit';
import { dnd5e, gameSystems } from '@core/database';
import { checkPermission } from '@core/rbac';
import * as XLSX from 'xlsx';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, params, locals }) => {
    const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'read' });
    if (!can.allowed) throw error(403, 'Forbidden');

    const type = url.searchParams.get('type') ?? '';
    const systemId = params.id;

    let rows: any[] = [];
    let filename = `export_${type}.xlsx`;

    switch (type) {

        case 'classes': {
            const all = await dnd5e.classes.getAll(systemId);
            rows = all.map(c => ({
                id:                       c.id,
                uploadId:                 (c as any).uploadId ?? '',
                name:                     c.name,
                hitDice:                  c.hitDice ?? '',
                canCastSpells:            c.canCastSpells,
                subclassAvailableAtLevel: c.subclassAvailableAtLevel,
                primaryAbilities:         c.primaryAbilities ?? '',
                equipmentDescription:     c.equipmentDescription ?? '',
                description:              c.description ?? '',
                source:                   c.source ?? '',
                link:                     c.link ?? '',
                sortOrder:                c.sortOrder,
                skillChoiceCount:  (c as any).skillChoiceCount ?? '',
                grantsSavingThrows: ((c as any).savingThrows ?? []).map((s: any) => s.stat).join(','),
                skillPool:          ((c as any).skillOptions ?? []).map((o: any) => o.skill).join(','),
            }));
            break;
        }

        case 'classFeatures': {
            const all = await dnd5e.classes.getAll(systemId);
            for (const cls of all) {
                for (const f of (cls.features ?? [])) {
                    rows.push({ id: f.id, classId: cls.id, uploadId: (f as any).uploadId ?? '', className: cls.name, name: f.name, requiredLevel: f.requiredLevel, description: f.description ?? '', url: (f as any).url ?? '',
                        grantsSkills: (f as any).grantsSkills ?? '', grantsExpertise: (f as any).grantsExpertise ?? '', expertiseChoiceCount: (f as any).expertiseChoiceCount ?? '', expertiseChoicePool: (f as any).expertiseChoicePool ?? '',
                        grantsHalfSkills: (f as any).grantsHalfSkills ?? '', grantsSavingThrows: (f as any).grantsSavingThrows ?? '',
                        skillChoiceCount: (f as any).skillChoiceCount ?? '', skillChoicePool: (f as any).skillChoicePool ?? '',
                        savingThrowChoiceCount: (f as any).savingThrowChoiceCount ?? '', savingThrowChoicePool: (f as any).savingThrowChoicePool ?? '',
                        grantsTools: (f as any).grantsTools ?? '', toolChoiceCount: (f as any).toolChoiceCount ?? '', toolChoicePool: (f as any).toolChoicePool ?? '',
                        grantsLanguages: (f as any).grantsLanguages ?? '', languageChoiceCount: (f as any).languageChoiceCount ?? '', languageChoicePool: (f as any).languageChoicePool ?? '',
                        grantsResistances: (f as any).grantsResistances ?? '', grantsImmunities: (f as any).grantsImmunities ?? '', grantsVulnerabilities: (f as any).grantsVulnerabilities ?? '', grantsInnateSpells: (f as any).grantsInnateSpells ?? '', grantsSpeed: (f as any).grantsSpeed ?? '', grantsSenses: (f as any).grantsSenses ?? '' });
                }
            }
            rows.sort((a, b) => a.className.localeCompare(b.className) || a.requiredLevel - b.requiredLevel);
            break;
        }

        case 'subclasses': {
            const all = await dnd5e.classes.getAll(systemId);
            for (const cls of all) {
                for (const s of (cls.subclasses ?? [])) {
                    rows.push({ id: s.id, classId: cls.id, uploadId: (s as any).uploadId ?? '', className: cls.name, name: s.name, description: s.description ?? '', source: s.source ?? '', link: s.link ?? '', canCastSpells: (s as any).canCastSpells ?? false, sortOrder: s.sortOrder });
                }
            }
            rows.sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name));
            break;
        }

        case 'subclassFeatures': {
            const all = await dnd5e.classes.getAll(systemId);
            for (const cls of all) {
                for (const s of (cls.subclasses ?? [])) {
                    for (const f of (s.features ?? [])) {
                        rows.push({ id: f.id, classId: cls.id, subclassId: s.id, uploadId: (f as any).uploadId ?? '', className: cls.name, subclassName: s.name, name: f.name, requiredLevel: f.requiredLevel, description: f.description ?? '', url: (f as any).url ?? '',
                            grantsSkills: (f as any).grantsSkills ?? '', grantsExpertise: (f as any).grantsExpertise ?? '', expertiseChoiceCount: (f as any).expertiseChoiceCount ?? '', expertiseChoicePool: (f as any).expertiseChoicePool ?? '',
                            grantsHalfSkills: (f as any).grantsHalfSkills ?? '', grantsSavingThrows: (f as any).grantsSavingThrows ?? '',
                            skillChoiceCount: (f as any).skillChoiceCount ?? '', skillChoicePool: (f as any).skillChoicePool ?? '',
                            savingThrowChoiceCount: (f as any).savingThrowChoiceCount ?? '', savingThrowChoicePool: (f as any).savingThrowChoicePool ?? '',
                            grantsTools: (f as any).grantsTools ?? '', toolChoiceCount: (f as any).toolChoiceCount ?? '', toolChoicePool: (f as any).toolChoicePool ?? '',
                            grantsLanguages: (f as any).grantsLanguages ?? '', languageChoiceCount: (f as any).languageChoiceCount ?? '', languageChoicePool: (f as any).languageChoicePool ?? '',
                            grantsResistances: (f as any).grantsResistances ?? '', grantsImmunities: (f as any).grantsImmunities ?? '', grantsVulnerabilities: (f as any).grantsVulnerabilities ?? '', grantsInnateSpells: (f as any).grantsInnateSpells ?? '', grantsSpeed: (f as any).grantsSpeed ?? '', grantsSenses: (f as any).grantsSenses ?? '' });
                    }
                }
            }
            rows.sort((a, b) => a.className.localeCompare(b.className) || a.subclassName.localeCompare(b.subclassName) || a.requiredLevel - b.requiredLevel);
            break;
        }

        case 'species': {
            const all = await dnd5e.species.getAll(systemId);
            rows = all.map(s => ({
                id:          s.id,
                uploadId:    (s as any).uploadId ?? '',
                name:        s.name,
                description: s.description ?? '',
                source:      s.source      ?? '',
                link:        s.link        ?? '',
                isSubrace:   s.isSubrace,
                isLegacy:    s.isLegacy,
                sortOrder:   s.sortOrder,
            }));
            break;
        }

        case 'speciesTraits': {
            const all = await dnd5e.species.getAll(systemId);
            for (const sp of all) {
                for (const t of ((sp as any).traits ?? [])) {
                    rows.push({ id: t.id, speciesId: sp.id, uploadId: (t as any).uploadId ?? '', speciesName: sp.name, name: t.name, description: t.description ?? '', requiredLevel: t.requiredLevel ?? '',
                        size: (t as any).size ?? '', sizeChoices: (t as any).sizeChoices ?? '', senses: (t as any).senses ?? '',
                        WALK:   ((t as any).speeds ?? []).find((sp: any) => sp.movementType === 'WALK')?.speed   ?? '',
                        FLY:    ((t as any).speeds ?? []).find((sp: any) => sp.movementType === 'FLY')?.speed    ?? '',
                        SWIM:   ((t as any).speeds ?? []).find((sp: any) => sp.movementType === 'SWIM')?.speed   ?? '',
                        CLIMB:  ((t as any).speeds ?? []).find((sp: any) => sp.movementType === 'CLIMB')?.speed  ?? '',
                        BURROW: ((t as any).speeds ?? []).find((sp: any) => sp.movementType === 'BURROW')?.speed ?? '',
                        grantsSkills: (t as any).grantsSkills ?? '', grantsExpertise: (t as any).grantsExpertise ?? '', expertiseChoiceCount: (t as any).expertiseChoiceCount ?? '', expertiseChoicePool: (t as any).expertiseChoicePool ?? '', grantsHalfSkills: (t as any).grantsHalfSkills ?? '',
                        skillChoiceCount: (t as any).skillChoiceCount ?? '', skillChoicePool: (t as any).skillChoicePool ?? '',
                        savingThrowChoiceCount: (t as any).savingThrowChoiceCount ?? '', savingThrowChoicePool: (t as any).savingThrowChoicePool ?? '',
                        grantsTools: (t as any).grantsTools ?? '', toolChoiceCount: (t as any).toolChoiceCount ?? '', toolChoicePool: (t as any).toolChoicePool ?? '',
                        grantsLanguages: (t as any).grantsLanguages ?? '', languageChoiceCount: (t as any).languageChoiceCount ?? '', languageChoicePool: (t as any).languageChoicePool ?? '',
                        grantsResistances: (t as any).grantsResistances ?? '', grantsImmunities: (t as any).grantsImmunities ?? '', grantsVulnerabilities: (t as any).grantsVulnerabilities ?? '', grantsInnateSpells: (t as any).grantsInnateSpells ?? '' });
                }
            }
            rows.sort((a, b) => a.speciesName.localeCompare(b.speciesName) || a.name.localeCompare(b.name));
            break;
        }

        case 'backgrounds': {
            const all = await dnd5e.backgrounds.getAll(systemId);
            rows = all.map(b => ({
                id:                 b.id,
                uploadId:           (b as any).uploadId ?? '',
                name:               b.name,
                shortDescription:   b.shortDescription ?? '',
                featureName:        b.featureName ?? '',
                grantsFeatCategory: (b as any).grantsFeatCategory ?? '',
                grantsFeatId:       (b as any).grantsFeatId ?? '',
                grantsSkills:       (b as any).grantsSkills ?? '',
                skillChoiceCount:        (b as any).skillChoiceCount        ?? '',
                skillChoicePool:         (b as any).skillChoicePool         ?? '',
                savingThrowChoiceCount:  (b as any).savingThrowChoiceCount  ?? '',
                savingThrowChoicePool:   (b as any).savingThrowChoicePool   ?? '',
                toolProficiencies:  b.toolProficiencies ?? '',
                languages:          b.languages ?? '',
                url:                b.url ?? '',
                sortOrder:          b.sortOrder,
                grantsTools:           (b as any).grantsTools           ?? '',
                toolChoiceCount:       (b as any).toolChoiceCount       ?? '',
                toolChoicePool:        (b as any).toolChoicePool        ?? '',
                grantsLanguages:       (b as any).grantsLanguages       ?? '',
                languageChoiceCount:   (b as any).languageChoiceCount   ?? '',
                languageChoicePool:    (b as any).languageChoicePool    ?? '',
                grantsResistances:     (b as any).grantsResistances     ?? '',
                grantsImmunities:      (b as any).grantsImmunities      ?? '',
                grantsVulnerabilities: (b as any).grantsVulnerabilities ?? '',
                grantsInnateSpells:     (b as any).grantsInnateSpells     ?? '',
                grantsSpeed:            (b as any).grantsSpeed            ?? '',
                grantsSenses:           (b as any).grantsSenses           ?? '',
            }));
            break;
        }

        case 'feats': {
            const all = await dnd5e.feats.getAll(systemId);
            rows = all.map(f => ({
                id:              f.id,
                uploadId:        (f as any).uploadId ?? '',
                name:            f.name,
                description:     f.description    ?? '',
                snippet:         f.snippet         ?? '',
                repeatable:      f.repeatable,
                categories:      f.categories      ?? '',
                prerequisites:   f.prerequisites   ?? '',
                detailsUrl:      f.detailsUrl       ?? '',
                isEpicBoon:      f.isEpicBoon,
                asiAmount:       f.asiAmount        ?? '',
                asiStatFixed:    f.asiStatFixed     ?? '',
                asiStatChoices:  f.asiStatChoices   ?? '',
                grantsSkills:           (f as any).grantsSkills           ?? '',
                grantsExpertise:        (f as any).grantsExpertise        ?? '',
                expertiseChoiceCount:    (f as any).expertiseChoiceCount    ?? '',
                expertiseChoicePool:     (f as any).expertiseChoicePool     ?? '',
                grantsHalfSkills:       (f as any).grantsHalfSkills       ?? '',
                grantsSavingThrows:     (f as any).grantsSavingThrows     ?? '',
                skillChoiceCount:       (f as any).skillChoiceCount       ?? '',
                skillChoicePool:        (f as any).skillChoicePool        ?? '',
                savingThrowChoiceCount: (f as any).savingThrowChoiceCount ?? '',
                savingThrowChoicePool:  (f as any).savingThrowChoicePool  ?? '',
                grantsTools:           (f as any).grantsTools           ?? '',
                toolChoiceCount:       (f as any).toolChoiceCount       ?? '',
                toolChoicePool:        (f as any).toolChoicePool        ?? '',
                grantsLanguages:       (f as any).grantsLanguages       ?? '',
                languageChoiceCount:   (f as any).languageChoiceCount   ?? '',
                languageChoicePool:    (f as any).languageChoicePool    ?? '',
                grantsResistances:     (f as any).grantsResistances     ?? '',
                grantsImmunities:      (f as any).grantsImmunities      ?? '',
                grantsVulnerabilities: (f as any).grantsVulnerabilities ?? '',
                grantsInnateSpells:     (f as any).grantsInnateSpells     ?? '',
                sortOrder:       f.sortOrder,
            }));
            break;
        }

        case 'spells': {
            const all = await dnd5e.spells.getAll(systemId);
            rows = all.map(s => ({
                'Spell ID':               s.spellId,
                'Name':                   s.name,
                'Link':                   s.link                    ?? '',
                'Level':                  s.level === 0 ? 'Cantrip' : s.level,
                'School':                 s.school,
                'Concentration':          s.concentration,
                'Ritual':                 s.ritual,
                'Is Homebrew':            s.isHomebrew,
                'Is Legacy':              s.isLegacy,
                'Cantrip Damage':         s.cantripDamage           ?? '',
                'Cantrip Dmg Lvl 5':      s.cantripDamageLvl5       ?? '',
                'Cantrip Dmg Lvl 11':     s.cantripDamageLvl11      ?? '',
                'Cantrip Dmg Lvl 17':     s.cantripDamageLvl17      ?? '',
                'Spell Damage':           s.spellDamage             ?? '',
                'Upcast Per Slot':        s.spellUpcastPerSlot      ?? '',
                'Upcast Every 2 Slots':   s.spellUpcastEveryTwoSlots ?? '',
                'Spell Progression':      s.spellProgression        ?? '',
                'Progression Note':       s.spellProgressionNote    ?? '',
                'Range Origin':           s.rangeOrigin             ?? '',
                'Range Value (ft)':       s.rangeValue              ?? '',
                'AoE Type':               s.aoeType                 ?? '',
                'AoE Value (ft)':         s.aoeValue                ?? '',
                'Duration Type':          s.durationType            ?? '',
                'Duration Interval':      s.durationInterval        ?? '',
                'Duration Unit':          s.durationUnit            ?? '',
                'Requires Saving Throw':  s.requiresSavingThrow,
                'Saving Throw':   s.savingThrow  ?? '',
                'Requires Attack Roll':   s.requiresAttackRoll,
                'Can Cast Higher Level':  s.canCastAtHigherLevel,
                'Casting Time':           s.castingTime   ?? '',
                'Components':             s.components    ?? '',
                'Description':            s.description   ?? '',
                'Source Book':            s.sourceBook    ?? '',
                'Tags':                   s.tags          ?? '',
                'Spell List':             s.spellList     ?? '',
            }));
            filename = 'export_spells.xlsx';
            break;
        }

        case 'spellSlots': {
            const all = await dnd5e.spellSlots.getAll(systemId);
            rows = all.map(r => ({
                'Class ID':      r.classId,
                'Class Name':    r.className,
                'Subclass ID':   (r as any).subclassId   ?? '',
                'Subclass Name': (r as any).subclassName ?? '',
                'Caster Type':   r.casterType,
                'Level':         r.classLevel,
                'Slot 1':  r.slot1, 'Slot 2':  r.slot2, 'Slot 3':  r.slot3,
                'Slot 4':  r.slot4, 'Slot 5':  r.slot5, 'Slot 6':  r.slot6,
                'Slot 7':  r.slot7, 'Slot 8':  r.slot8, 'Slot 9':  r.slot9,
            }));
            filename = 'export_spell_slots.xlsx';
            break;
        }

        case 'spellsKnown': {
            const all = await dnd5e.spellsKnown.getAll(systemId);
            rows = all.map(r => ({
                'Class ID':      r.classId,
                'Class Name':    r.className,
                'Subclass ID':   (r as any).subclassId   ?? '',
                'Subclass Name': (r as any).subclassName ?? '',
                'Level':         r.classLevel,
                'Cantrips':      r.cantrips   ?? '',
                'Prepared':      r.prepared   ?? '',
                'Additional':    r.additional ?? '',
                'Note':          r.note       ?? '',
            }));
            filename = 'export_spells_known.xlsx';
            break;
        }

        default:
            throw error(400, `Unknown export type: ${type}`);
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type);
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    return new Response(buffer, {
        headers: {
            'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    });
};