// apps/admin/src/routes/(app)/quests/+page.server.ts
import { error } from '@sveltejs/kit';
import { quests } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'Quest', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const status = url.searchParams.get('status') ?? undefined;
	const page   = Number(url.searchParams.get('page') ?? 1);

	return await quests.getAll({ status, page });
};
