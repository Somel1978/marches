// apps/admin/src/routes/(app)/dms/settings/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { platform } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

const DM_SETTINGS = ['dm.ratingsEnabled'];

export const load: PageServerLoad = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'DMProfile', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const all = await platform.getSettings();
	return { settings: all.filter(s => DM_SETTINGS.includes(s.key)) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'DMProfile', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data    = await request.formData();
		const entries = DM_SETTINGS.map(key => ({
			key,
			value: data.get(key)?.toString().trim() ?? null,
		}));

		try {
			await platform.updateSettings(entries, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
