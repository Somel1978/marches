// apps/admin/src/routes/(app)/marketplace/transactions/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { marketplace } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const status = url.searchParams.get('status') ?? undefined;
	const page   = Number(url.searchParams.get('page') ?? 1);

	return await marketplace.transactions.getAll({ status, page });
};

export const actions: Actions = {
	approve: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		try {
			await marketplace.transactions.approve(id, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	reject: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		const note = data.get('note')?.toString().trim() ?? '';
		if (!note) return fail(400, { message: 'Review note required.' });
		try {
			await marketplace.transactions.reject(id, note, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
