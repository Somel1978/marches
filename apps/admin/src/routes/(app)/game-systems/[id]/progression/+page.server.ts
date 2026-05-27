// apps/admin/src/routes/(app)/game-systems/[id]/progression/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { gameSystems } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const system = await gameSystems.getById(params.id);
	if (!system) throw error(404, 'Game system not found');
	return { system };
};

export const actions: Actions = {
	create: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const label       = data.get('label')?.toString().trim()       ?? '';
		const xpRequired  = parseInt(data.get('xpRequired')?.toString() ?? '', 10);
		const description = data.get('description')?.toString().trim() || undefined;
		if (!label || xpRequired === null || isNaN(xpRequired)) return fail(400, { message: 'Label and XP required.' });
		try {
			await gameSystems.progression.create({ gameSystemId: params.id, label, xpRequired, description }, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	update: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const id          = data.get('id')?.toString() ?? '';
		const label       = data.get('label')?.toString().trim()       ?? '';
		const xpRequired  = parseInt(data.get('xpRequired')?.toString() ?? '', 10);
		const description = data.get('description')?.toString().trim() || null;
		try {
			await gameSystems.progression.update(id, { label, xpRequired, description: description ?? undefined }, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	delete: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		try {
			await gameSystems.progression.delete(id, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};