// apps/admin/src/routes/(app)/token-store/+page.server.ts
import { error } from '@sveltejs/kit';
import { tokenStore, gameSystems } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');
	const [items, systems] = await Promise.all([
		tokenStore.items.getAll({ activeOnly: false }),
		gameSystems.getActive(),
	]);
	const systemMap = Object.fromEntries((systems as any[]).map((s: any) => [s.id, s.name]));
	const enriched = (items as any[]).map((i: any) => ({
		...i,
		gameSystemName: i.gameSystemId ? (systemMap[i.gameSystemId] ?? i.gameSystemId) : '—',
	}));
	return { items: enriched };
};