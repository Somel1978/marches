// apps/admin/src/routes/(app)/quests/settings/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { platform } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

const QUEST_SETTINGS = ['quest.minCapacity', 'quest.maxCapacity', 'quest.destroyableCategories'];

export const load: PageServerLoad = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'Quest', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const all = await platform.getSettings();
	return { settings: all.filter(s => QUEST_SETTINGS.includes(s.key)) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Quest', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data    = await request.formData();
		// Convert checkbox array to comma-delimited string
		const destroyableCats = data.getAll('quest.destroyableCategories[]').map(v => v.toString());
		data.set('quest.destroyableCategories', destroyableCats.join(','));
		const entries = QUEST_SETTINGS.map(key => ({ key, value: data.get(key)?.toString().trim() ?? '' }));

		try {
			await platform.updateSettings(entries, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};