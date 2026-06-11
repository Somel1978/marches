// apps/admin/src/routes/(app)/token-store/data/import/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { tokenStore } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import * as XLSX from 'xlsx';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'update' });
	if (!can.allowed) throw error(403, 'Forbidden');
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const file = data.get('file') as File | null;
		if (!file || file.size === 0) return fail(400, { message: 'Please upload an xlsx file.' });
		try {
			const buffer = await file.arrayBuffer();
			const wb     = XLSX.read(buffer, { type: 'array' });
			const sheet  = wb.Sheets[wb.SheetNames[0]];
			const rows: any[] = XLSX.utils.sheet_to_json(sheet);
			const mapped = rows.map((r: any) => ({
				name:         r['Name']         ?? '',
				description:  r['Description']  || null,
				imageUrl:     r['Image URL']     || null,
				tokenCost:    Number(r['Token Cost'] ?? 0),
				gameSystemId: r['Game System']   || null,
				scope:        r['Scope']         || 'GLOBAL',
				worldId:      r['World ID']      || null,
				rewardType:   r['Reward Type']   || 'MANUAL',
				rewardValue:  r['Reward Value']  || '{}',
				isActive:     r['Active'] !== 'false',
				stock:        r['Stock'] || null,
			}));
			const result = await tokenStore.items.import(mapped, locals.user!.id);
			return { success: true, ...result };
		} catch (e: any) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
