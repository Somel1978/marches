// apps/admin/src/routes/(app)/game-systems/[id]/data/export/+server.ts
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
            }));
            break;
        }

        case 'classFeatures': {
            const all = await dnd5e.classes.getAll(systemId);
            for (const cls of all) {
                for (const f of (cls.features ?? [])) {
                    rows.push({ className: cls.name, name: f.name, requiredLevel: f.requiredLevel, description: f.description ?? '', url: (f as any).url ?? '' });
                }
            }
            rows.sort((a, b) => a.className.localeCompare(b.className) || a.requiredLevel - b.requiredLevel);
            break;
        }

        case 'subclasses': {
            const all = await dnd5e.classes.getAll(systemId);
            for (const cls of all) {
                for (const s of (cls.subclasses ?? [])) {
                    rows.push({ className: cls.name, name: s.name, description: s.description ?? '', source: s.source ?? '', link: s.link ?? '', sortOrder: s.sortOrder });
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
                        rows.push({ className: cls.name, subclassName: s.name, name: f.name, requiredLevel: f.requiredLevel, description: f.description ?? '', url: (f as any).url ?? '' });
                    }
                }
            }
            rows.sort((a, b) => a.className.localeCompare(b.className) || a.subclassName.localeCompare(b.subclassName) || a.requiredLevel - b.requiredLevel);
            break;
        }

        case 'species': {
            const all = await dnd5e.species.getAll(systemId);
            rows = all.map(s => ({ name: s.name, description: s.description ?? '', source: s.source ?? '', link: s.link ?? '', isSubrace: s.isSubrace, isLegacy: s.isLegacy, sortOrder: s.sortOrder }));
            break;
        }

        case 'speciesTraits': {
            const all = await dnd5e.species.getAll(systemId);
            for (const sp of all) {
                for (const t of ((sp as any).traits ?? [])) {
                    rows.push({ speciesName: sp.name, name: t.name, description: t.description ?? '', requiredLevel: t.requiredLevel ?? '' });
                }
            }
            rows.sort((a, b) => a.speciesName.localeCompare(b.speciesName) || a.name.localeCompare(b.name));
            break;
        }

        case 'backgrounds': {
            const all = await dnd5e.backgrounds.getAll(systemId);
            rows = all.map(b => ({ name: b.name, shortDescription: b.shortDescription ?? '', featureName: b.featureName ?? '', skillProficiencies: b.skillProficiencies ?? '', toolProficiencies: b.toolProficiencies ?? '', languages: b.languages ?? '', url: b.url ?? '', sortOrder: b.sortOrder }));
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