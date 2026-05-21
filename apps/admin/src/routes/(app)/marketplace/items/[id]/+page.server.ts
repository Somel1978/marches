// apps/admin/src/routes/(app)/marketplace/items/[id]/+page.server.ts
import { fail, error, redirect } from '@sveltejs/kit';
import { marketplace } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const item = await marketplace.items.getById(params.id);
	if (!item) throw error(404, 'Item not found');

	return { item };
};

export const actions: Actions = {
	delete: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		try {
			await marketplace.items.delete(params.id, locals.user!.id);
			redirect(302, '/marketplace/items');
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	default: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data        = await request.formData();
		const isAvailable = data.get('isAvailable') === 'true';
		const buyPrice    = Number(data.get('buyPrice') ?? 0);
		const stockStr    = data.get('stock')?.toString().trim();
		const stock       = stockStr === '' || stockStr === 'null' ? null : Number(stockStr);

		try {
			await marketplace.items.update(params.id, { isAvailable, buyPrice, stock }, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};