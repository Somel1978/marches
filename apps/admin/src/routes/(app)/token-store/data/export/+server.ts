// apps/admin/src/routes/(app)/token-store/data/export/+server.ts
import { error } from '@sveltejs/kit';
import { tokenStore } from '@core/database';
import { checkPermission } from '@core/rbac';
import * as XLSX from 'xlsx';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const items = await tokenStore.items.getAllForExport();
	const rows = items.map((i: any) => ({
		'Name':         i.name,
		'Description':  i.description  ?? '',
		'Image URL':    i.imageUrl      ?? '',
		'Token Cost':   i.tokenCost,
		'Game System':  i.gameSystemId  ?? '',
		'Scope':        i.scope,
		'World ID':     i.worldId       ?? '',
		'Reward Type':  i.rewardType,
		'Reward Value': JSON.stringify(i.rewardValue),
		'Active':       i.isActive ? 'true' : 'false',
		'Stock':        i.stock ?? '',
	}));

	const ws = XLSX.utils.json_to_sheet(rows);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'token-store');
	const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

	return new Response(buffer, {
		headers: {
			'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': 'attachment; filename="export_token_store.xlsx"',
		},
	});
};
