// apps/admin/src/routes/(app)/characters/slots/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { characters } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	return { slotData: await characters.getAllSlotInfo() };
};

export const actions: Actions = {
	grantSlot: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data   = await request.formData();
		const userId = data.get('userId')?.toString() ?? '';
		const delta  = Number(data.get('delta') ?? 0);
		const reason = data.get('reason')?.toString().trim() ?? '';

		if (!userId) return fail(400, { message: 'User is required.' });
		if (!reason) return fail(400, { message: 'Reason is required.' });
		if (delta === 0) return fail(400, { message: 'Delta cannot be zero.' });

		try {
			await characters.grantSlot(userId, delta, reason, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
