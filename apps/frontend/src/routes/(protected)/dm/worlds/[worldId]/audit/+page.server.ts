// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/audit/+page.server.ts
import { error } from '@sveltejs/kit';
import { audit } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent, url }) => {
	const { canManage } = await parent();
	if (!canManage) throw error(403, 'You do not have management access to this world.');

	const resourceKey = url.searchParams.get('resource') ?? undefined;
	const action      = url.searchParams.get('action')   ?? undefined;
	const from        = url.searchParams.get('from') ? new Date(url.searchParams.get('from')!) : undefined;
	const to          = url.searchParams.get('to')   ? new Date(url.searchParams.get('to')!)   : undefined;
	const page        = Number(url.searchParams.get('page') ?? 1);

	// Scope: logs where resourceId = worldId (direct world actions)
	// or filtered by resourceKey for broader context.
	// For now: show all logs with resourceId = worldId, or if a resourceKey is
	// selected, show logs for that resource type (unscoped — DM sees platform-wide
	// for the selected resource type, which is intentional context).
	const logs = await audit.getLogs({
		resourceKey,
		resourceId: resourceKey ? undefined : params.worldId,
		action,
		from,
		to,
		page,
		perPage: 50,
	});

	return {
		...logs,
		filters: {
			resourceKey: resourceKey ?? '',
			action:      action      ?? '',
			from:        url.searchParams.get('from') ?? '',
			to:          url.searchParams.get('to')   ?? '',
		},
	};
};
