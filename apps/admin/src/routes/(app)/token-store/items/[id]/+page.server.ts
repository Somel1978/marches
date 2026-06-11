// apps/admin/src/routes/(app)/token-store/items/[id]/+page.server.ts
import { fail, redirect, error } from '@sveltejs/kit';
import { tokenStore, gameSystems, worlds } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');
	const [item, systems, allWorlds] = await Promise.all([
		tokenStore.items.getById(params.id),
		gameSystems.getActive(),
		worlds.getAll(),
	]);
	if (!item) throw error(404, 'Item not found');
	return { item, systems, worlds: allWorlds };
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		try {
			const rewardType = data.get('rewardType')?.toString() ?? 'MANUAL';
			const rewardValue = rewardType !== 'MANUAL' ? {
				percent:   Number(data.get('percent') ?? 0),
				direction: data.get('direction')?.toString() ?? 'BOTH',
			} : {};
			await tokenStore.items.update(params.id, {
				name:         data.get('name')?.toString()         ?? '',
				description:  data.get('description')?.toString()  || null,
				imageUrl:     data.get('imageUrl')?.toString()     || null,
				tokenCost:    Number(data.get('tokenCost') ?? 0),
				gameSystemId: data.get('gameSystemId')?.toString() || null,
				scope:        data.get('scope')?.toString()        ?? 'GLOBAL',
				worldId:      data.get('worldId')?.toString()      || null,
				rewardType,
				rewardValue,
				isActive:     data.get('isActive') === 'true',
				stock:        data.get('stock') ? Number(data.get('stock')) : null,
			}, locals.user!.id);
			return { success: true };
		} catch (e: any) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
	delete: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		try {
			await tokenStore.items.delete(params.id, locals.user!.id);
			redirect(302, '/token-store');
		} catch (e: any) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
