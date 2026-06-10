// apps/admin/src/routes/(app)/game-systems/+page.server.ts
import { fail } from '@sveltejs/kit';
import { gameSystems, db } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const systems = await gameSystems.getAll();
	// Check each system has progression thresholds configured
	const thresholdCounts = await db.progressionThreshold.groupBy({
		by:    ['gameSystemId'],
		_count: { id: true },
	});
	const countMap = Object.fromEntries(thresholdCounts.map((t: any) => [t.gameSystemId, t._count.id]));
	const systemsWithWarnings = (systems as any[]).map((s: any) => ({
		...s,
		hasProgression: (countMap[s.id] ?? 0) > 0,
	}));
	return { systems: systemsWithWarnings };
};

export const actions: Actions = {
	toggleActive: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data     = await request.formData();
		const id       = data.get('id')?.toString() ?? '';
		const isActive = data.get('isActive') === 'true';
		try {
			await gameSystems.update(id, { isActive }, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};