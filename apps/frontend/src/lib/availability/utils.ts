/** Shared slot / calendar helpers for the availability dashboard. */

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const SLOTS_PER_DAY = 48;

export type AvailBlock = {
	dayIdx: number;
	date: string;
	startSlot: number;
	endSlot: number;
	scope: string;
	worldIds: string[];
};

export function dayIdxFromUtcDate(d: Date): number {
	const dow = d.getUTCDay();
	return dow === 0 ? 6 : dow - 1;
}

export function slotToTime(slot: number): string {
	const h = Math.floor(slot / 2);
	const m = slot % 2 === 0 ? '00' : '30';
	return `${h.toString().padStart(2, '0')}:${m}`;
}

export function timeToSlot(time: string): number | null {
	const m = time.match(/^(\d{1,2}):(\d{2})$/);
	if (!m) return null;
	const h = Number(m[1]);
	const min = Number(m[2]);
	if (h < 0 || h > 23 || (min !== 0 && min !== 30)) return null;
	return h * 2 + (min >= 30 ? 1 : 0);
}

/** Inclusive end slot for a time range (end time is exclusive, matching Discord bot). */
export function rangeToSlots(startTime: string, endTime: string): number[] | null {
	const start = timeToSlot(startTime);
	const endExclusive = timeToSlot(endTime);
	if (start === null || endExclusive === null) return null;
	if (endExclusive <= start) return null;
	const end = endExclusive - 1;
	const out: number[] = [];
	for (let s = start; s <= end; s++) out.push(s);
	return out;
}

export function blockTimeLabel(startSlot: number, endSlot: number): string {
	return `${slotToTime(startSlot)} – ${slotToTime(endSlot + 1)}`;
}

function worldKey(ids: string[]): string {
	return [...ids].sort().join(',');
}

/** Merge half-hour slots on the same day with identical scope/worlds. */
export function mergeSlotsToBlocks(
	entries: { date: Date; slot: number; scope: string; worldIds: string[] }[],
): AvailBlock[] {
	const groups = new Map<string, { date: Date; slots: number[]; scope: string; worldIds: string[] }>();

	for (const e of entries) {
		const dateStr = e.date.toISOString().split('T')[0];
		const key = `${dateStr}:${e.scope}:${worldKey(e.worldIds as string[])}`;
		if (!groups.has(key)) {
			groups.set(key, { date: e.date, slots: [], scope: e.scope, worldIds: e.worldIds as string[] });
		}
		groups.get(key)!.slots.push(e.slot);
	}

	const blocks: AvailBlock[] = [];
	for (const g of groups.values()) {
		const sorted = [...new Set(g.slots)].sort((a, b) => a - b);
		let start = sorted[0];
		let prev = sorted[0];
		for (let i = 1; i <= sorted.length; i++) {
			const cur = sorted[i];
			if (cur === prev + 1) {
				prev = cur;
				continue;
			}
			blocks.push({
				dayIdx: dayIdxFromUtcDate(g.date),
				date: g.date.toISOString().split('T')[0],
				startSlot: start,
				endSlot: prev,
				scope: g.scope,
				worldIds: g.worldIds,
			});
			if (cur !== undefined) {
				start = cur;
				prev = cur;
			}
		}
	}

	return blocks.sort((a, b) => a.dayIdx - b.dayIdx || a.startSlot - b.startSlot);
}

/** Stable accent hue per user for timeline blocks. */
export function userAccent(userId: string, isMe = false): string {
	if (isMe) return 'var(--brand-accent, #B8734A)';
	let hash = 0;
	for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
	const hues = [28, 38, 48, 200, 260, 310, 170];
	return `hsl(${hues[Math.abs(hash) % hues.length]} 55% 48%)`;
}

export function blockStyle(startSlot: number, endSlot: number): string {
	const left = (startSlot / SLOTS_PER_DAY) * 100;
	const width = ((endSlot - startSlot + 1) / SLOTS_PER_DAY) * 100;
	return `left:${left}%;width:${width}%;`;
}

export function weekBounds(baseDate: Date) {
	const dow = baseDate.getUTCDay();
	const diff = dow === 0 ? -6 : 1 - dow;
	const weekStart = new Date(baseDate);
	weekStart.setUTCDate(baseDate.getUTCDate() + diff);
	weekStart.setUTCHours(0, 0, 0, 0);
	const weekEnd = new Date(weekStart);
	weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
	weekEnd.setUTCHours(23, 59, 59, 999);
	return { weekStart, weekEnd };
}
