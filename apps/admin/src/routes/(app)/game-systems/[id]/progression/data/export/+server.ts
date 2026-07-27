// apps/admin/src/routes/(app)/game-systems/[id]/progression/data/export/+server.ts
import { error } from '@sveltejs/kit';
import { gameSystems } from '@core/database';
import { checkPermission } from '@core/rbac';
import * as XLSX from 'xlsx';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
    const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'read' });
    if (!can.allowed) throw error(403, 'Forbidden');

    const system = await gameSystems.getById(params.id);
    if (!system) throw error(404, 'Game system not found');

    const rows = (system.progressionThresholds ?? [])
        .slice()
        .sort((a: any, b: any) => a.xpRequired - b.xpRequired)
        .map((t: any) => ({
            label:             t.label,
            xpRequired:        t.xpRequired,
            milestoneRequired: t.milestoneRequired ?? 0,
            description:       t.description ?? '',
            sortOrder:         t.sortOrder,
        }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'progression');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    return new Response(buffer, {
        headers: {
            'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="export_progression_${system.name.replace(/\s+/g, '_')}.xlsx"`,
        },
    });
};