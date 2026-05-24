// apps/frontend/src/routes/(protected)/dm/+page.server.ts
import { error } from '@sveltejs/kit';
import { dms, quests, availability, characters } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'DMProfile', action: 'read' });
	if (!can.allowed) throw error(403, 'You need the DM role to access this area.');

	const profile  = await dms.profiles.getByUserId(locals.user!.id);
	const myQuests = profile ? await quests.getByDM(profile.id) : [];

	// Player availability for the next 7 days — grouped by date+slot
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const weekEnd = new Date(today);
	weekEnd.setDate(today.getDate() + 6);
	weekEnd.setHours(23, 59, 59, 999);

	const allSlots = await availability.getAll(today, weekEnd);

	// Enrich each slot with user's active characters
	const userIds  = [...new Set(allSlots.map((s: any) => s.userId))];
	const allChars = userIds.length
		? (await Promise.all(userIds.map((uid: string) => characters.getByUserId(uid)))).flat()
		: [];
	const charsByUser: Record<string, any[]> = {};
	for (const c of allChars) {
		if (c.status !== 'ACTIVE') continue;
		if (!charsByUser[c.userId]) charsByUser[c.userId] = [];
		charsByUser[c.userId].push({ id: c.id, name: c.name, totalLevel: (c as any).totalLevel ?? 0 });
	}

	// Group by date → slot → players
	const playerAvailability: Record<string, Record<number, { userId: string; chars: any[]; scope: string; worldIds: string[] }[]>> = {};
	for (const s of allSlots) {
		if (s.userId === locals.user!.id) continue; // skip DM's own slots
		const dk = new Date(s.date).toISOString().split('T')[0];
		if (!playerAvailability[dk]) playerAvailability[dk] = {};
		if (!playerAvailability[dk][s.slot]) playerAvailability[dk][s.slot] = [];
		playerAvailability[dk][s.slot].push({
			userId:   s.userId,
			scope:    s.scope,
			worldIds: s.worldIds as string[],
			chars:    charsByUser[s.userId] ?? [],
		});
	}

	return { profile, quests: myQuests, playerAvailability };
};