// apps/admin/src/routes/(app)/marketplace/settings/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { platform } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

const KEYS = ['marketplace.sellPricePercent', 'marketplace.stockEnabled', 'marketplace.levelRestrictions'];

export const load: PageServerLoad = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const all = await platform.getSettings();
	return { settings: all.filter(s => KEYS.includes(s.key)) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data    = await request.formData();
		const entries = [
			{ key: 'marketplace.sellPricePercent', value: data.get('sellPricePercent')?.toString().trim() ?? null },
			{ key: 'marketplace.stockEnabled',     value: data.get('stockEnabled')?.toString().trim()     ?? null },
			{ key: 'marketplace.levelRestrictions',value: data.get('levelRestrictions')?.toString().trim() ?? null },
		];

		// Validate JSON
		const restrictionsRaw = entries.find(e => e.key === 'marketplace.levelRestrictions')?.value;
		if (restrictionsRaw) {
			try { JSON.parse(restrictionsRaw); } catch { return fail(400, { message: 'Level restrictions must be valid JSON.' }); }
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
