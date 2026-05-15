// apps/admin/src/routes/(app)/audit/+page.server.ts
import { audit, platform } from '@core/database';
import { checkPermission } from '@core/rbac';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const perm = checkPermission(locals.permissions, { resourceKey: 'AuditLog', action: 'read' });
	if (!perm.allowed) throw error(403, 'Forbidden');

	const resourceKey = url.searchParams.get('resource') ?? undefined;
	const action      = url.searchParams.get('action')   ?? undefined;
	const from        = url.searchParams.get('from')     ? new Date(url.searchParams.get('from')!) : undefined;
	const to          = url.searchParams.get('to')       ? new Date(url.searchParams.get('to')!)   : undefined;
	const page        = Number(url.searchParams.get('page') ?? 1);

	// OWN level — silently force actorId to the requesting user.
	// They can only see their own audit trail.
	const actorId = perm.level === 'OWN'
		? locals.user!.id
		: url.searchParams.get('actor') ?? undefined;

	const [logs, resources] = await Promise.all([
		audit.getLogs({ resourceKey, action, actorId, from, to, page, perPage: 50 }),
		platform.getResources(),
	]);

	return {
		...logs,
		resources,
		isOwnOnly: perm.level === 'OWN',
		filters: {
			resourceKey: resourceKey ?? '',
			action:      action      ?? '',
			actorId:     perm.level === 'OWN' ? locals.user!.id : (url.searchParams.get('actor') ?? ''),
			from:        url.searchParams.get('from') ?? '',
			to:          url.searchParams.get('to')   ?? '',
		},
	};
};