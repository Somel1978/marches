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

// Validation rules per setting key
function validateSetting(key: string, value: string): string | null {
	if (!value) return null; // empty = clear, always valid

	// URL fields
	if (key === 'site.url' || key === 'email.replyTo' || key.endsWith('.webhookUrl')) {
		try { new URL(value); } catch { return `"${key}" must be a valid URL (e.g. https://example.com).`; }
	}
	// SMTP port
	if (key === 'smtp.port') {
		const n = Number(value);
		if (!Number.isInteger(n) || n < 1 || n > 65535) return 'SMTP port must be a number between 1 and 65535.';
	}
	// Email addresses
	if (key === 'smtp.from' || key === 'email.replyTo') {
		if (value.includes('@') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value))
			return `"${key}" must be a valid email address.`;
	}
	// Discord IDs / tokens — basic non-empty + no whitespace
	if (key.startsWith('discord.') && /\s/.test(value)) {
		return `"${key}" must not contain spaces.`;
	}
	return null;
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

		// Validate format
		const validationError = validateSetting(key, value ?? '');
		if (validationError) return fail(400, { message: validationError });

		try {
			await platform.updateSettings([{ key, value }], locals.user!.id);
			return { success: true, key };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};