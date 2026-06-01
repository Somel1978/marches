// apps/admin/src/routes/(app)/marketplace/data/export/+server.ts
import { error } from '@sveltejs/kit';
import { marketplace } from '@core/database';
import { checkPermission } from '@core/rbac';
import * as XLSX from 'xlsx';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
    try {
        const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'read' });
        if (!can.allowed) throw error(403, 'Forbidden');

        const items = await marketplace.items.getAllForExport();

        const rows = items.map(i => ({
            'Category':     i.category,
            'Name':         i.name,
            'Price':        i.buyPrice,
            'Base Item':    i.baseItem,
            'Var.':         i.isVariant          ? 'true' : '',
            'Rarity':       i.rarity,
            'Att.':         i.requiresAttunement  ? 'true' : '',
            'Requirements': i.requirements  ?? '',
            'Weight':       (i.weight !== null && !isNaN(i.weight)) ? i.weight : '',
            'Source':       i.source        ?? '',
            'Image':        i.imageUrl      ?? '',
            'Link':         i.link          ?? '',
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'marketplace');
        const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

        return new Response(buffer, {
            headers: {
                'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': 'attachment; filename="export_marketplace.xlsx"',
            },
        });
    } catch (e: any) {
        console.error('[export/marketplace] ERROR:', e?.message ?? e);
        throw error(500, `Export failed: ${e?.message ?? 'unknown error'}`);
    }
};