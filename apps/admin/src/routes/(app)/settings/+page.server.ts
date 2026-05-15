// apps/admin/src/routes/(app)/settings/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { platform } from '@core/database';
import { assertWritePermission, checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const canRead = checkPermission(locals.permissions, { resourceKey: 'System', action: 'read' });
	if (!canRead.allowed) throw error(403, 'Forbidden');

	// Only return non-secret values + masked secrets for display
	return { settings: await platform.getSettings(true) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		try {
			assertWritePermission(locals.permissions, 'System', 'update');
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}

		const data    = await request.formData();
		// Get all current settings keys then update each submitted value
		const all     = await platform.getSettings(false);
		const entries: { key: string; value: string | null }[] = [];

		for (const setting of all) {
			const raw = data.get(setting.key)?.toString() ?? null;
			// Skip masked secrets — if the user didn't change them they come back as '••••••••'
			if (setting.isSecret && raw === '••••••••') continue;
			entries.push({ key: setting.key, value: raw?.trim() || null });
		}

		try {
			await platform.updateSettings(entries, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
