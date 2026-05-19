// apps/frontend/src/routes/(protected)/dm/profile/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { dms, gameSystems } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'DMProfile', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const [profile, systems] = await Promise.all([
		dms.profiles.getByUserId(locals.user!.id),
		gameSystems.getAvailable(),
	]);

	if (!profile) throw error(403, 'DM profile not found. Contact an admin.');

	return { profile, systems };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const profile = await dms.profiles.getByUserId(locals.user!.id);
		if (!profile) return fail(403, { message: 'DM profile not found.' });

		const data        = await request.formData();
		const bio         = data.get('bio')?.toString().trim()         ?? '';
		const specialties = data.get('specialties')?.toString().trim() ?? '';
		const rules       = data.get('rules')?.toString().trim()       ?? '';
		const isPublic    = data.get('isPublic') === 'true';
		const preferredSystemIds = data.getAll('preferredSystemIds').map(v => v.toString());

		try {
			await dms.profiles.update(profile.id, {
				bio:               bio         || null,
				specialties:       specialties || null,
				rules:             rules       || null,
				isPublic,
				preferredSystemIds,
			}, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
