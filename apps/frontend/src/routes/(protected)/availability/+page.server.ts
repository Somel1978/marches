// apps/frontend/src/routes/(protected)/availability/+page.server.ts
import { fail } from '@sveltejs/kit';
import { availability, worlds, users } from '@core/database';
import { dayIdxFromUtcDate, mergeSlotsToBlocks, rangeToSlots, timeToSlot, weekBounds } from '$lib/availability/utils';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const weekParam = url.searchParams.get('week');
	const baseDate = weekParam ? new Date(weekParam + 'T00:00:00.000Z') : new Date();
	const { weekStart, weekEnd } = weekBounds(baseDate);
	const userId = locals.user!.id;

	const [mySlots, allSlots, allWorlds] = await Promise.all([
		availability.getForUser(userId, weekStart, weekEnd),
		availability.getAll(weekStart, weekEnd),
		worlds.getAll(),
	]);

	const worldMap = Object.fromEntries((allWorlds as any[]).map((w) => [w.id, w.name]));

	// Density per half-hour cell (read-only heatmap): "dayIdx:slot" -> player count
	const heatmapData: Record<string, number> = {};
	const uniquePlayers = new Set<string>();

	for (const s of allSlots) {
		const dayIdx = dayIdxFromUtcDate(new Date(s.date));
		const key = `${dayIdx}:${s.slot}`;
		heatmapData[key] = (heatmapData[key] ?? 0) + 1;
		uniquePlayers.add(s.userId);
	}

	// Per-day unique player counts (for overview footer stats)
	const dayPlayerCounts: Record<number, number> = {};
	for (let di = 0; di < 7; di++) {
		const ids = new Set(
			allSlots
				.filter((s) => dayIdxFromUtcDate(new Date(s.date)) === di)
				.map((s) => s.userId),
		);
		dayPlayerCounts[di] = ids.size;
	}

	// Build player rows
	const slotsByUser = new Map<string, typeof allSlots>();
	for (const s of allSlots) {
		if (!slotsByUser.has(s.userId)) slotsByUser.set(s.userId, []);
		slotsByUser.get(s.userId)!.push(s);
	}
	// Always include current user even with no slots
	if (!slotsByUser.has(userId)) slotsByUser.set(userId, []);

	const userIds = [...slotsByUser.keys()];
	const userRecords = await Promise.all(userIds.map((id) => users.getById(id)));
	const userInfo = Object.fromEntries(
		userRecords.filter(Boolean).map((u: any) => [u.id, { name: u.name, image: u.image }]),
	);

	type PlayerRow = {
		userId: string;
		name: string;
		image: string | null;
		isMe: boolean;
		blocks: ReturnType<typeof mergeSlotsToBlocks>;
	};

	const playerRows: PlayerRow[] = userIds
		.map((uid) => ({
			userId: uid,
			name: userInfo[uid]?.name ?? 'Player',
			image: userInfo[uid]?.image ?? null,
			isMe: uid === userId,
			blocks: mergeSlotsToBlocks(
				(slotsByUser.get(uid) ?? []).map((s) => ({
					date: new Date(s.date),
					slot: s.slot,
					scope: s.scope,
					worldIds: s.worldIds as string[],
				})),
			),
		}))
		.sort((a, b) => {
			if (a.isMe) return -1;
			if (b.isMe) return 1;
			return a.name.localeCompare(b.name);
		});

	return {
		userId,
		heatmapData,
		dayPlayerCounts,
		totalPlayers: uniquePlayers.size,
		playerRows,
		allWorlds,
		worldMap,
		weekStart: weekStart.toISOString(),
		weekEnd: weekEnd.toISOString(),
	};
};

export const actions: Actions = {
	updateRange: async ({ request, locals }) => {
		const data = await request.formData();
		const dateStr = data.get('date')?.toString() ?? '';
		const startTime = data.get('startTime')?.toString() ?? '';
		const endTime = data.get('endTime')?.toString() ?? '';
		const scope = (data.get('scope')?.toString() ?? 'GLOBAL') as 'GLOBAL' | 'WORLD';
		const worldIds = data.getAll('worldIds').map((v) => v.toString());
		const oldDate = data.get('oldDate')?.toString();
		const oldStart = data.has('oldStartSlot') ? Number(data.get('oldStartSlot')) : null;
		const oldEnd = data.has('oldEndSlot') ? Number(data.get('oldEndSlot')) : null;

		if (!dateStr) return fail(400, { message: 'Date is required.' });
		const slots = rangeToSlots(startTime, endTime);
		if (!slots?.length) return fail(400, { message: 'Invalid time range.' });
		if (scope === 'WORLD' && !worldIds.length) {
			return fail(400, { message: 'Select at least one world.' });
		}

		const uid = locals.user!.id;
		if (oldDate != null && oldStart != null && oldEnd != null && oldStart >= 0 && oldEnd >= oldStart) {
			const oldSlots: number[] = [];
			for (let s = oldStart; s <= oldEnd; s++) oldSlots.push(s);
			await availability.clearSlots(uid, new Date(oldDate + 'T00:00:00.000Z'), oldSlots);
		}

		await availability.setSlots(uid, new Date(dateStr + 'T00:00:00.000Z'), slots, scope, worldIds);
		return { success: true };
	},

	setRange: async ({ request, locals }) => {
		const data = await request.formData();
		const dateStr = data.get('date')?.toString() ?? '';
		const startTime = data.get('startTime')?.toString() ?? '';
		const endTime = data.get('endTime')?.toString() ?? '';
		const scope = (data.get('scope')?.toString() ?? 'GLOBAL') as 'GLOBAL' | 'WORLD';
		const worldIds = data.getAll('worldIds').map((v) => v.toString());

		if (!dateStr) return fail(400, { message: 'Date is required.' });
		const slots = rangeToSlots(startTime, endTime);
		if (!slots?.length) return fail(400, { message: 'Invalid time range.' });
		if (scope === 'WORLD' && !worldIds.length) {
			return fail(400, { message: 'Select at least one world.' });
		}

		await availability.setSlots(locals.user!.id, new Date(dateStr + 'T00:00:00.000Z'), slots, scope, worldIds);
		return { success: true };
	},

	clearRange: async ({ request, locals }) => {
		const data = await request.formData();
		const dateStr = data.get('date')?.toString() ?? '';
		const startSlot = Number(data.get('startSlot') ?? -1);
		const endSlot = Number(data.get('endSlot') ?? -1);
		if (!dateStr || startSlot < 0 || endSlot < startSlot) {
			return fail(400, { message: 'Invalid block.' });
		}
		const slots: number[] = [];
		for (let s = startSlot; s <= endSlot; s++) slots.push(s);
		await availability.clearSlots(locals.user!.id, new Date(dateStr + 'T00:00:00.000Z'), slots);
		return { success: true };
	},

	clearDay: async ({ request, locals }) => {
		const data = await request.formData();
		const dateStr = data.get('date')?.toString() ?? '';
		if (!dateStr) return fail(400, { message: 'Date required.' });
		await availability.clearDay(locals.user!.id, new Date(dateStr + 'T00:00:00.000Z'));
		return { success: true };
	},
};
