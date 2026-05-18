// apps/admin/src/routes/(app)/characters/settings/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { platform } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

const CHARACTER_SETTINGS = [
	'character.baseSlots',
	'character.startingGold',
	'character.restDays',
];

export const load: PageServerLoad = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const all      = await platform.getSettings();
	const settings = all.filter(s => CHARACTER_SETTINGS.includes(s.key));

	return { settings };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data    = await request.formData();
		const updates = CHARACTER_SETTINGS.map(key => ({
			key,
			value: data.get(key)?.toString().trim() ?? '',
		})).filter(u => u.value !== '');

		try {
			await platform.updateSettings(updates, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
