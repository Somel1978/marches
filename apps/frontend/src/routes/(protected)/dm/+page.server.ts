// apps/frontend/src/routes/(protected)/dm/+page.server.ts
import { error } from '@sveltejs/kit';
import { dms, quests } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'DMProfile', action: 'read' });
	if (!can.allowed) throw error(403, 'You need the DM role to access this area.');

	const profile  = await dms.profiles.getByUserId(locals.user!.id);
	const myQuests = profile ? await quests.getByDM(profile.id) : [];

	return { profile, quests: myQuests };
};