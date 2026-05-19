// apps/frontend/src/routes/(protected)/dm-request/+page.server.ts
import { redirect, fail } from '@sveltejs/kit';
import { dms, roles } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// If user already has an active DM profile, redirect to DM Hub
	const dmProfile = await dms.profiles.getByUserId(locals.user!.id);
	if (dmProfile?.isActive) redirect(302, '/dm');

	const latestRequest = await dms.roleRequests.getLatestByUser(locals.user!.id);
	const allRoles      = await roles.getAll();
	const dmRole        = allRoles.find(r => r.name === 'DM');

	return { latestRequest, dmRole };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const data   = await request.formData();
		const roleId = data.get('roleId')?.toString() ?? '';
		const reason = data.get('reason')?.toString().trim() ?? '';

		if (!roleId) return fail(400, { message: 'Role is required.' });
		if (!reason) return fail(400, { message: 'Please explain why you want to become a DM.' });

		try {
			await dms.roleRequests.create(locals.user!.id, roleId, reason);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};