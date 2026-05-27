// apps/admin/src/routes/(app)/dms/[id]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { db } from '@core/database';
import { dms, gameSystems } from '@core/database';
import { checkPermission, invalidateUserPermissions } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'DMProfile', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const [profile, systems] = await Promise.all([
		dms.profiles.getById(params.id),
		gameSystems.getActive(),
	]);

	if (!profile) throw error(404, 'DM profile not found');

	return { profile, systems };
};

export const actions: Actions = {
	revoke: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'DMProfile', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		try {
			const profile = await dms.profiles.getById(params.id);
			await dms.profiles.revoke(params.id, locals.user!.id);
			if (profile) invalidateUserPermissions(profile.userId);
			return { revokeSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	update: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'DMProfile', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data              = await request.formData();
		const bio               = data.get('bio')?.toString().trim()               ?? '';
		const specialties       = data.get('specialties')?.toString().trim()       ?? '';
		const rules             = data.get('rules')?.toString().trim()             ?? '';
		const isPublic          = data.get('isPublic') === 'true';
		const isActive          = data.get('isActive') === 'true';
		const preferredSystemIds = data.getAll('preferredSystemIds').map(v => v.toString());

		try {
			await dms.profiles.update(params.id, {
				bio:               bio         || null,
				specialties:       specialties || null,
				rules:             rules       || null,
				isPublic,
				isActive,
				preferredSystemIds,
			}, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};