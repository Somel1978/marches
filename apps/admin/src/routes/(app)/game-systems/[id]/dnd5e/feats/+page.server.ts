// apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/feats/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { gameSystems, dnd5e } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const system = await gameSystems.getById(params.id);
	if (!system) throw error(404, 'Game system not found');
	const feats  = await dnd5e.feats.getAllForAdmin(params.id);
	return { system, feats };
};

export const actions: Actions = {
	create: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { message: 'Name required.' });
		try {
			await dnd5e.feats.create({
				gameSystemId:  params.id,
				name,
				description:   data.get('description')?.toString().trim()   || undefined,
				snippet:       data.get('snippet')?.toString().trim()        || undefined,
				repeatable:    data.get('repeatable') === 'true',
				categories:    data.get('categories')?.toString().trim()     || undefined,
				prerequisites: data.get('prerequisites')?.toString().trim()  || undefined,
				detailsUrl:    data.get('detailsUrl')?.toString().trim()     || undefined,
				isEpicBoon:    data.get('isEpicBoon') === 'true',
				isAvailable:   data.get('isAvailable') !== 'false',
				sortOrder:     Number(data.get('sortOrder') ?? 0),
			}, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	update: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		if (!id) return fail(400, { message: 'ID required.' });
		try {
			await dnd5e.feats.update(id, {
				name:          data.get('name')?.toString().trim()          || undefined,
				description:   data.get('description')?.toString().trim()   || undefined,
				snippet:       data.get('snippet')?.toString().trim()        || undefined,
				repeatable:    data.get('repeatable') === 'true',
				categories:    data.get('categories')?.toString().trim()     || undefined,
				prerequisites: data.get('prerequisites')?.toString().trim()  || undefined,
				detailsUrl:    data.get('detailsUrl')?.toString().trim()     || undefined,
				isEpicBoon:    data.get('isEpicBoon') === 'true',
				isAvailable:   data.get('isAvailable') !== 'false',
				sortOrder:     Number(data.get('sortOrder') ?? 0),
			}, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	delete: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		try {
			await dnd5e.feats.delete(id, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
