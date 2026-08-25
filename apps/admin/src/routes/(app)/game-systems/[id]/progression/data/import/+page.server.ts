// apps/admin/src/routes/(app)/game-systems/[id]/progression/data/import/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { gameSystems } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad, Actions } from './$types';

const normalize = (s: any) => (s ?? '').toString().replace(/\s+/g, ' ').trim();

export const load: PageServerLoad = async ({ params, locals }) => {
    const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
    if (!can.allowed) throw error(403, 'Forbidden');
    const system = await gameSystems.getById(params.id);
    if (!system) throw error(404, 'Game system not found');
    return { system };
};

export const actions: Actions = {
    default: async ({ params, request, locals }) => {
        const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
        if (!can.allowed) return fail(403, { message: 'Forbidden' });

        const data        = await request.formData();
        const raw         = data.get('json')?.toString() ?? '';
        const allowUpdate = data.get('allowUpdate') === 'true';
        if (!raw) return fail(400, { message: 'No data provided.' });

        try {
            const rows: any[] = JSON.parse(raw);
            let created = 0; let updated = 0; let skipped = 0;
            const system = await gameSystems.getById(params.id);
            if (!system) return fail(404, { message: 'Game system not found.' });
            const existing = system.progressionThresholds ?? [];

            for (const row of rows) {
                const label      = normalize(row.label);
                const xpRequired = parseInt(String(row.xpRequired ?? '').replace(/[^0-9]/g, ''), 10);
                if (!label || isNaN(xpRequired)) { skipped++; continue; }
                const msParsed = parseInt(String(row.milestoneRequired ?? '').replace(/[^0-9]/g, ''), 10);
                const milestoneRequired = isNaN(msParsed) ? 0 : msParsed;

                const match = existing.find((t: any) => normalize(t.label).toLowerCase() === label.toLowerCase());
                if (match) {
                    if (!allowUpdate) { skipped++; continue; }
                    await gameSystems.progression.update(match.id, {
                        label, xpRequired, milestoneRequired,
                        description: row.description || undefined,
                        sortOrder:   Number(row.sortOrder) || 0,
                    }, locals.user!.id);
                    updated++;
                } else {
                    await gameSystems.progression.create({
                        gameSystemId: params.id,
                        label, xpRequired, milestoneRequired,
                        description: row.description || undefined,
                        sortOrder:   Number(row.sortOrder) || 0,
                    }, locals.user!.id);
                    created++;
                }
            }
            return { success: true, created, updated, skipped };
        } catch (e: any) {
            return fail(400, { message: `Import failed: ${e.message}` });
        }
    },
};
