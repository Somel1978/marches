// apps/admin/src/routes/(app)/availability/+page.server.ts
import { fail } from '@sveltejs/kit';
import { availability, users, characters } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const dayParam = url.searchParams.get('day');
	const day      = dayParam ? new Date(dayParam) : new Date();
	day.setHours(0, 0, 0, 0);
	const dayEnd = new Date(day);
	dayEnd.setHours(23, 59, 59, 999);

	// Get all slots for this day
	const slots = await availability.getAll(day, dayEnd);

	if (!slots.length) return { slots: [], dayStr: day.toISOString().split('T')[0] };

	// Enrich with user name and their characters
	const userIds  = [...new Set(slots.map(s => s.userId))];
	const allUsers = await users.getAll({ page: 1, perPage: 200 });
	const userMap  = Object.fromEntries((allUsers.items ?? []).map((u: any) => [u.id, u.name]));

	const allChars = (await Promise.all(userIds.map(uid => characters.getByUserId(uid)))).flat();
	const charMap: Record<string, any[]> = {};
	for (const c of allChars) {
		if (!charMap[c.userId]) charMap[c.userId] = [];
		charMap[c.userId].push(c);
	}

	// Group by slot (0-47) → list of { userId, userName, scope, worldIds, chars[] }
	const bySlot: Record<number, any[]> = {};
	for (const s of slots) {
		if (!bySlot[s.slot]) bySlot[s.slot] = [];
		bySlot[s.slot].push({
			id:       s.id,
			userId:   s.userId,
			userName: userMap[s.userId] ?? s.userId,
			scope:    s.scope,
			worldIds: s.worldIds,
			chars:    (charMap[s.userId] ?? []).filter((c: any) => c.status === 'ACTIVE'),
		});
	}

	return { bySlot, dayStr: day.toISOString().split('T')[0] };
};

export const actions: Actions = {
	deleteSlot: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Availability', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id   = data.get('id')?.toString() ?? '';
		if (!id) return fail(400, { message: 'Slot ID required.' });
		await availability.adminDelete(id, locals.user!.id);
		return { success: true };
	},
};