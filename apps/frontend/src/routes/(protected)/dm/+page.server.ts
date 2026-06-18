// apps/frontend/src/routes/(protected)/dm/+page.server.ts
import { quests, availability, characters } from '@core/database';
import type { PageServerLoad } from './$types';

const EXCLUDED_STATUSES = ['RETIRED', 'DECEASED', 'REJECTED'];

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { dmProfile } = await parent();

	const myQuests = await quests.getByDM(dmProfile.id);

	const today = new Date();
	today.setUTCHours(0, 0, 0, 0);
	const weekEnd = new Date(today);
	weekEnd.setUTCDate(today.getUTCDate() + 6);
	weekEnd.setUTCHours(23, 59, 59, 999);

	const allSlots = await availability.getAll(today, weekEnd);

	const userIds  = [...new Set(allSlots.map((s: any) => s.userId))];
	const allChars = userIds.length
		? (await Promise.all((userIds as string[]).map((uid: string) => characters.getByUserId(uid)))).flat()
		: [];
	const charsByUser: Record<string, any[]> = {};
	for (const c of allChars) {
		if (EXCLUDED_STATUSES.includes(c.status)) continue;
		if (!charsByUser[c.userId]) charsByUser[c.userId] = [];
		const totalLevel = (c as any).totalLevel ?? ((c as any).classes ?? []).reduce((s: number, cl: any) => s + (cl.allocatedLevel ?? 0), 0);
		charsByUser[c.userId].push({ id: c.id, name: c.name, status: c.status, totalLevel });
	}

	const playerAvailability: Record<string, Record<number, { userId: string; chars: any[]; needsNewChar: boolean; scope: string; worldIds: string[] }[]>> = {};
	for (const s of allSlots) {
		// Include all users — DM sees everyone including themselves
		const dk = new Date(s.date).toISOString().split('T')[0];
		if (!playerAvailability[dk]) playerAvailability[dk] = {};
		if (!playerAvailability[dk][s.slot]) playerAvailability[dk][s.slot] = [];
		const chars = charsByUser[s.userId] ?? [];
		playerAvailability[dk][s.slot].push({
			userId:       s.userId,
			scope:        s.scope,
			worldIds:     s.worldIds as string[],
			chars,
			needsNewChar: chars.length === 0,
		});
	}

	return { quests: myQuests, playerAvailability };
};