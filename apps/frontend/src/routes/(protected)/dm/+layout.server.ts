// apps/frontend/src/routes/(protected)/dm/+layout.server.ts
import { error } from '@sveltejs/kit';
import { dms, worlds } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'DMProfile', action: 'read' });
	if (!can.allowed) throw error(403, 'You need the DM role to access this area.');

	const profile = await dms.profiles.getByUserId(locals.user!.id);
	if (!profile) throw error(403, 'No DM profile found.');

	const myWorlds = await worlds.getByDMProfile(profile.id);

	return { dmProfile: profile, myWorlds };
};
