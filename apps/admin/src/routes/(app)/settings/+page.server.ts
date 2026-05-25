// apps/admin/src/routes/(app)/settings/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { platform } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

const CORE_PREFIXES = ['smtp.', 'email.', 'site.', 'discord.'];

function isCoreSettings(key: string) {
	return CORE_PREFIXES.some(prefix => key.startsWith(prefix));
}

export const load: PageServerLoad = async ({ locals }) => {
	const canRead = checkPermission(locals.permissions, { resourceKey: 'System', action: 'read' });
	if (!canRead.allowed) throw error(403, 'Forbidden');
	const all = await platform.getSettings(true);
	return { settings: all.filter(s => isCoreSettings(s.key)) };
};

export const actions: Actions = {
	saveSetting: async ({ request, locals }) => {
		const canUpdate = checkPermission(locals.permissions, { resourceKey: 'System', action: 'update' });
		if (!canUpdate.allowed) return fail(403, { message: 'Forbidden' });

		const data     = await request.formData();
		const key      = data.get('key')?.toString()   ?? '';
		const raw      = data.get('value')?.toString() ?? '';
		const isSecret = data.get('isSecret') === 'true';

		if (!key || !isCoreSettings(key)) return fail(400, { message: 'Invalid setting key.' });

		// For secrets: empty value = keep current, don't wipe
		if (isSecret && raw === '') return { success: true, key };

		const value = raw.trim() || null;

		try {
			await platform.updateSettings([{ key, value }], locals.user!.id);
			return { success: true, key };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};