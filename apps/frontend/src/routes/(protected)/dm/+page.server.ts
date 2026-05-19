// apps/frontend/src/routes/(protected)/dm/+page.server.ts
import { error } from '@sveltejs/kit';
import { dms } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'DMProfile', action: 'read' });

	console.log('[DM] userId:', locals.user?.id);
	console.log('[DM] permissions:', JSON.stringify(Object.fromEntries(locals.permissions)));
	console.log('[DM] can read DMProfile:', can.allowed, can.level);

	if (!can.allowed) throw error(403, 'You need the DM role to access this area.');

	const profile = await dms.profiles.getByUserId(locals.user!.id);
	if (!profile) throw error(403, 'DM profile not found. Contact an admin.');

	return { profile };
};