// apps/admin/src/routes/(app)/world/settings/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { platform } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

const WORLD_SETTINGS = ['world.showDangerRating', 'world.showLevelRange'];

export const load: PageServerLoad = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');
	const all = await platform.getSettings();
	return { settings: all.filter(s => WORLD_SETTINGS.includes(s.key)) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data    = await request.formData();
		const entries = WORLD_SETTINGS.map(key => ({ key, value: data.get(key)?.toString() ?? null }));
		try {
			await platform.updateSettings(entries, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
