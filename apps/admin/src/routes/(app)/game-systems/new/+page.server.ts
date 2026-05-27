// apps/admin/src/routes/(app)/game-systems/new/+page.server.ts
import { fail, redirect, error } from '@sveltejs/kit';
import { gameSystems } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
	if (!can.allowed) throw error(403, 'Forbidden');
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden', name: '', slug: '', description: '' });

		const data        = await request.formData();
		const name        = data.get('name')?.toString().trim()        ?? '';
		const slug        = data.get('slug')?.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? '';
		const description = data.get('description')?.toString().trim() ?? '';

		if (!name) return fail(400, { message: 'Name is required.', name, slug, description });

		try {
			const gs = await gameSystems.create({ name, slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), description: description || undefined }, locals.user!.id);
			redirect(302, `/game-systems/${gs.id}`);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message, name, slug, description });
			throw e;
		}
	},
};