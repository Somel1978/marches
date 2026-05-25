// apps/admin/src/routes/(app)/settings/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { platform } from '@core/database';
import { assertWritePermission, checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

// Core platform settings only — feature settings live under their own routes
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
	default: async ({ request, locals }) => {
		try {
			assertWritePermission(locals.permissions, 'System', 'update');
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}

		const data = await request.formData();
		const all  = await platform.getSettings(false);

		const entries: { key: string; value: string | null }[] = [];
		for (const setting of all.filter(s => isCoreSettings(s.key))) {
			const raw = data.get(setting.key)?.toString() ?? null;
			if (setting.isSecret && (!raw || raw === '')) continue;
			const trimmed = raw?.trim() || null;
			// Don't wipe an existing value with null unless intentional
			if (trimmed === null && setting.value !== null) continue;
			entries.push({ key: setting.key, value: trimmed });
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