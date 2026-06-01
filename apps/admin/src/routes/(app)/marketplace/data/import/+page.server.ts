// apps/admin/src/routes/(app)/marketplace/data/import/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { marketplace } from '@core/database';
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
			const buffer  = await file.arrayBuffer();
			const wb      = XLSX.read(buffer, { type: 'array' });
			const sheet   = wb.Sheets[wb.SheetNames[0]];
			const rows: any[] = XLSX.utils.sheet_to_json(sheet);

			const mapped = rows.map((r: any) => ({
				category:     r['Category']     ?? '',
				name:         r['Name']         ?? '',
				price:        r['Price']        ?? 0,
				baseItem:     r['Base Item']    ?? '',
				variant:      r['Var.']         ?? '',
				rarity:       r['Rarity']       ?? 'Unknown',
				attunement:   r['Att.']         ?? '',
				requirements: r['Requirements'] ?? '',
				weight:       (r['Weight'] !== undefined && r['Weight'] !== '' && !isNaN(Number(r['Weight']))) ? Number(r['Weight']) : null,
				source:       r['Source']       ?? '',
				imageUrl:     r['Image']        ?? '',
				link:         r['Link']         ?? '',
			}));

			const result = await marketplace.items.import(mapped, locals.user!.id);
			return { success: true, ...result };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};