import { availability, users, worlds, characters } from '@core/database';
import {
	dayIdxFromUtcDate,
	mergeSlotsToBlocks,
	weekBounds,
} from '$lib/availability/utils';

const EXCLUDED_STATUSES = ['RETIRED', 'DECEASED', 'REJECTED'];

export type DmCharTag = {
	id: string;
	name: string;
	totalLevel: number;
	worldId: string | null;
};

export type DmPlayerRow = {
	userId: string;
	name: string;
	image: string | null;
	blocks: ReturnType<typeof mergeSlotsToBlocks>;
	chars: DmCharTag[];
	needsNewChar: boolean;
};

export type AvailabilityDashboardData = {
	heatmapData: Record<string, number>;
	dayPlayerCounts: Record<number, number>;
	totalPlayers: number;
	playerRows: DmPlayerRow[];
	weekStart: string;
	weekEnd: string;
	worldMap: Record<string, string>;
};

function buildHeatmap(slots: { userId: string; date: Date | string; slot: number }[]) {
	const heatmapData: Record<string, number> = {};
	for (const s of slots) {
		const dayIdx = dayIdxFromUtcDate(new Date(s.date));
		const key = `${dayIdx}:${s.slot}`;
		heatmapData[key] = (heatmapData[key] ?? 0) + 1;
	}
	return heatmapData;
}

function buildDayPlayerCounts(slots: { userId: string; date: Date | string }[]) {
	const dayPlayerCounts: Record<number, number> = {};
	for (let di = 0; di < 7; di++) {
		const ids = new Set(
			slots
				.filter((s) => dayIdxFromUtcDate(new Date(s.date)) === di)
				.map((s) => s.userId),
		);
		dayPlayerCounts[di] = ids.size;
	}
	return dayPlayerCounts;
}

async function fetchUserInfo(userIds: string[]) {
	if (!userIds.length) return {};
	const userRecords = await Promise.all(userIds.map((id) => users.getById(id)));
	return Object.fromEntries(
		userRecords.filter(Boolean).map((u: any) => [u.id, { name: u.name, image: u.image }]),
	) as Record<string, { name: string; image: string | null }>;
}

async function fetchCharsByUser(userIds: string[], worldId?: string, acceptsGlobal = true) {
	if (!userIds.length) return {} as Record<string, DmCharTag[]>;
	const allChars = (await Promise.all(userIds.map((uid) => characters.getByUserId(uid)))).flat();
	const charsByUser: Record<string, DmCharTag[]> = {};

	for (const c of allChars) {
		if (EXCLUDED_STATUSES.includes((c as any).status)) continue;
		const uid = (c as any).userId;
		if (!charsByUser[uid]) charsByUser[uid] = [];
		const totalLevel =
			(c as any).totalLevel ??
			((c as any).classes ?? []).reduce((s: number, cl: any) => s + (cl.allocatedLevel ?? 0), 0);
		charsByUser[uid].push({
			id: (c as any).id,
			name: (c as any).name,
			totalLevel,
			worldId: (c as any).worldId ?? null,
		});
	}

	if (!worldId) return charsByUser;

	const filtered: Record<string, DmCharTag[]> = {};
	for (const [uid, chars] of Object.entries(charsByUser)) {
		filtered[uid] = acceptsGlobal ? chars : chars.filter((c) => c.worldId === worldId);
	}
	return filtered;
}

export function filterSlotsForWorld(slots: any[], worldId: string) {
	return slots.filter(
		(s) =>
			s.scope === 'GLOBAL' ||
			(s.scope === 'WORLD' && (s.worldIds as string[])?.includes(worldId)),
	);
}

export async function buildDmAvailabilityDashboard(opts: {
	weekStart: Date;
	weekEnd: Date;
	slots: any[];
	worldMap?: Record<string, string>;
	charsByUser: Record<string, DmCharTag[]>;
}): Promise<AvailabilityDashboardData> {
	const { weekStart, weekEnd, slots, charsByUser } = opts;
	const worldMap = opts.worldMap ?? {};

	const userIds = [...new Set(slots.map((s) => s.userId))];
	const userInfo = await fetchUserInfo(userIds);

	const playerRows: DmPlayerRow[] = userIds
		.map((uid) => {
			const chars = charsByUser[uid] ?? [];
			return {
				userId: uid,
				name: userInfo[uid]?.name ?? 'Player',
				image: userInfo[uid]?.image ?? null,
				blocks: mergeSlotsToBlocks(
					slots
						.filter((s) => s.userId === uid)
						.map((s) => ({
							date: new Date(s.date),
							slot: s.slot,
							scope: s.scope,
							worldIds: s.worldIds as string[],
						})),
				),
				chars,
				needsNewChar: chars.length === 0,
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name));

	return {
		heatmapData: buildHeatmap(slots),
		dayPlayerCounts: buildDayPlayerCounts(slots),
		totalPlayers: userIds.length,
		playerRows,
		weekStart: weekStart.toISOString(),
		weekEnd: weekEnd.toISOString(),
		worldMap,
	};
}

export async function loadWorldAvailability(
	worldId: string,
	weekParam: string | null,
	acceptsGlobalCharacters: boolean,
): Promise<AvailabilityDashboardData> {
	const baseDate = weekParam ? new Date(weekParam + 'T00:00:00.000Z') : new Date();
	const { weekStart, weekEnd } = weekBounds(baseDate);

	const [allSlots, allWorlds] = await Promise.all([
		availability.getAll(weekStart, weekEnd),
		worlds.getAll(),
	]);

	const worldMap = Object.fromEntries((allWorlds as any[]).map((w) => [w.id, w.name]));
	const worldSlots = filterSlotsForWorld(allSlots as any[], worldId);
	const userIds = [...new Set(worldSlots.map((s: any) => s.userId))];
	const charsByUser = await fetchCharsByUser(userIds, worldId, acceptsGlobalCharacters);

	return buildDmAvailabilityDashboard({
		weekStart,
		weekEnd,
		slots: worldSlots,
		worldMap,
		charsByUser,
	});
}

export async function loadGlobalAvailability(weekParam: string | null): Promise<AvailabilityDashboardData> {
	const baseDate = weekParam ? new Date(weekParam + 'T00:00:00.000Z') : new Date();
	const { weekStart, weekEnd } = weekBounds(baseDate);

	const [allSlots, allWorlds] = await Promise.all([
		availability.getAll(weekStart, weekEnd),
		worlds.getAll(),
	]);

	const worldMap = Object.fromEntries((allWorlds as any[]).map((w) => [w.id, w.name]));
	const userIds = [...new Set((allSlots as any[]).map((s: any) => s.userId))];
	const charsByUser = await fetchCharsByUser(userIds);

	return buildDmAvailabilityDashboard({
		weekStart,
		weekEnd,
		slots: allSlots as any[],
		worldMap,
		charsByUser,
	});
}
