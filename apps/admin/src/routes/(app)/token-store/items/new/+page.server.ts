// apps/admin/src/routes/(app)/token-store/items/new/+page.server.ts
import { fail, redirect, error } from '@sveltejs/kit';
import { tokenStore, gameSystems, worlds } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'create' });
	if (!can.allowed) throw error(403, 'Forbidden');
	const [systems, allWorlds] = await Promise.all([gameSystems.getActive(), worlds.getAll()]);
	return { systems, worlds: allWorlds };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		try {
			const rewardType = data.get('rewardType')?.toString() ?? 'MANUAL';
			const rewardValue = rewardType !== 'MANUAL' ? {
				percent:   Number(data.get('percent') ?? 0),
				direction: data.get('direction')?.toString() ?? 'BOTH',
			} : {};
			await tokenStore.items.create({
				name:         data.get('name')?.toString()         ?? '',
				description:  data.get('description')?.toString()  || undefined,
				imageUrl:     data.get('imageUrl')?.toString()     || undefined,
				tokenCost:    Number(data.get('tokenCost') ?? 0),
				gameSystemId: data.get('gameSystemId')?.toString() || undefined,
				scope:        data.get('scope')?.toString()        ?? 'GLOBAL',
				worldId:      data.get('worldId')?.toString()      || undefined,
				rewardType,
				rewardValue,
				isActive:     data.get('isActive') === 'true',
				stock:        data.get('stock') ? Number(data.get('stock')) : undefined,
			}, locals.user!.id);
			redirect(302, '/token-store');
		} catch (e: any) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
