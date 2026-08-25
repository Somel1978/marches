// shared/database/dbapi/write/world/timeline-weather-npc.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import type { TimelineVisibility, WeatherCondition } from '@prisma/client';

const VIS: TimelineVisibility[] = ['PUBLIC', 'DM_ONLY'];
const CONDITIONS: WeatherCondition[] = [
	'CLEAR', 'CLOUDY', 'RAIN', 'STORM', 'SNOW', 'FOG', 'HEAT', 'COLD', 'OTHER',
];

function parseVis(raw: string | undefined | null): TimelineVisibility {
	const v = (raw ?? 'PUBLIC').toUpperCase() as TimelineVisibility;
	if (!VIS.includes(v)) throw new ValidationError(`Invalid visibility: ${raw}`);
	return v;
}

function parseCondition(raw: string | undefined | null): WeatherCondition {
	const c = (raw ?? 'CLEAR').toUpperCase() as WeatherCondition;
	if (!CONDITIONS.includes(c)) throw new ValidationError(`Invalid weather condition: ${raw}`);
	return c;
}

function parseDay(raw: unknown, label: string): number {
	const n = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isFinite(n) || !Number.isInteger(n)) throw new ValidationError(`${label} must be an integer day.`);
	return n;
}

async function assertWorld(worldId: string) {
	const world = await db.world.findUnique({ where: { id: worldId }, select: { id: true } });
	if (!world) throw new NotFoundError('World', worldId);
}

async function assertRegionInWorld(worldId: string, regionId: string) {
	const r = await db.region.findFirst({ where: { id: regionId, worldId }, select: { id: true } });
	if (!r) throw new ValidationError('Region not found in this world.');
}

async function assertNpcInWorld(worldId: string, npcId: string) {
	const n = await db.npc.findFirst({ where: { id: npcId, worldId }, select: { id: true } });
	if (!n) throw new ValidationError('NPC not found in this world.');
}

// ── Region weather ───────────────────────────────────────────────────────────

export async function createRegionWeather(
	worldId: string,
	input: {
		regionId: string;
		condition?: string;
		title?: string | null;
		summary?: string | null;
		startDay: number;
		endDay?: number | null;
		visibility?: string;
	},
	actorId: string,
) {
	await assertWorld(worldId);
	const regionId = input.regionId?.trim();
	if (!regionId) throw new ValidationError('regionId is required.');
	await assertRegionInWorld(worldId, regionId);
	const startDay = parseDay(input.startDay, 'startDay');
	const endDay = input.endDay == null || (input.endDay as any) === '' ? null : parseDay(input.endDay, 'endDay');
	if (endDay != null && endDay < startDay) throw new ValidationError('endDay must be on or after startDay.');

	const row = await db.regionWeather.create({
		data: {
			worldId,
			regionId,
			condition: parseCondition(input.condition),
			title: input.title?.trim() || null,
			summary: input.summary?.trim() || null,
			startDay,
			endDay,
			visibility: parseVis(input.visibility),
			createdBy: actorId,
		},
	});
	await logAudit(db, {
		actorId, action: 'CREATE', resourceKey: 'World', resourceId: worldId,
		after: { regionWeather: row }, metadata: { kind: 'region_weather' },
	});
	return row;
}

export async function updateRegionWeather(
	id: string,
	input: {
		regionId?: string;
		condition?: string;
		title?: string | null;
		summary?: string | null;
		startDay?: number;
		endDay?: number | null;
		visibility?: string;
	},
	actorId: string,
	worldId?: string,
) {
	const existing = await db.regionWeather.findUnique({ where: { id } });
	if (!existing) throw new NotFoundError('RegionWeather', id);
	if (worldId && existing.worldId !== worldId) throw new ValidationError('Weather is not in this world.');

	const data: Record<string, unknown> = {};
	if (input.regionId !== undefined) {
		const regionId = input.regionId.trim();
		await assertRegionInWorld(existing.worldId, regionId);
		data.regionId = regionId;
	}
	if (input.condition !== undefined) data.condition = parseCondition(input.condition);
	if (input.title !== undefined) data.title = input.title?.trim() || null;
	if (input.summary !== undefined) data.summary = input.summary?.trim() || null;
	if (input.startDay !== undefined) data.startDay = parseDay(input.startDay, 'startDay');
	if (input.endDay !== undefined) {
		data.endDay = input.endDay == null || (input.endDay as any) === '' ? null : parseDay(input.endDay, 'endDay');
	}
	if (input.visibility !== undefined) data.visibility = parseVis(input.visibility);

	const startDay = (data.startDay as number | undefined) ?? existing.startDay;
	const endDay = data.endDay !== undefined ? (data.endDay as number | null) : existing.endDay;
	if (endDay != null && endDay < startDay) throw new ValidationError('endDay must be on or after startDay.');

	const row = await db.regionWeather.update({ where: { id }, data });
	await logAudit(db, {
		actorId, action: 'UPDATE', resourceKey: 'World', resourceId: existing.worldId,
		before: { regionWeather: existing }, after: { regionWeather: row }, metadata: { kind: 'region_weather' },
	});
	return row;
}

export async function deleteRegionWeather(id: string, actorId: string, worldId?: string) {
	const existing = await db.regionWeather.findUnique({ where: { id } });
	if (!existing) throw new NotFoundError('RegionWeather', id);
	if (worldId && existing.worldId !== worldId) throw new ValidationError('Weather is not in this world.');
	await db.regionWeather.delete({ where: { id } });
	await logAudit(db, {
		actorId, action: 'DELETE', resourceKey: 'World', resourceId: existing.worldId,
		before: { regionWeather: existing }, metadata: { kind: 'region_weather' },
	});
	return { ok: true };
}

// ── NPC schedules ────────────────────────────────────────────────────────────

export async function createNpcSchedule(
	worldId: string,
	input: {
		npcId: string;
		title: string;
		summary?: string | null;
		locationNote?: string | null;
		startDay: number;
		endDay?: number | null;
		startMinute?: number | null;
		endMinute?: number | null;
		visibility?: string;
	},
	actorId: string,
) {
	await assertWorld(worldId);
	const npcId = input.npcId?.trim();
	if (!npcId) throw new ValidationError('npcId is required.');
	await assertNpcInWorld(worldId, npcId);
	const title = input.title?.trim();
	if (!title) throw new ValidationError('Title is required.');
	const startDay = parseDay(input.startDay, 'startDay');
	const endDay = input.endDay == null || (input.endDay as any) === '' ? null : parseDay(input.endDay, 'endDay');
	if (endDay != null && endDay < startDay) throw new ValidationError('endDay must be on or after startDay.');

	const row = await db.npcSchedule.create({
		data: {
			worldId,
			npcId,
			title,
			summary: input.summary?.trim() || null,
			locationNote: input.locationNote?.trim() || null,
			startDay,
			endDay,
			startMinute: input.startMinute == null || (input.startMinute as any) === ''
				? null : Math.floor(Number(input.startMinute)),
			endMinute: input.endMinute == null || (input.endMinute as any) === ''
				? null : Math.floor(Number(input.endMinute)),
			visibility: parseVis(input.visibility),
			createdBy: actorId,
		},
	});
	await logAudit(db, {
		actorId, action: 'CREATE', resourceKey: 'World', resourceId: worldId,
		after: { npcSchedule: row }, metadata: { kind: 'npc_schedule' },
	});
	return row;
}

export async function updateNpcSchedule(
	id: string,
	input: {
		npcId?: string;
		title?: string;
		summary?: string | null;
		locationNote?: string | null;
		startDay?: number;
		endDay?: number | null;
		startMinute?: number | null;
		endMinute?: number | null;
		visibility?: string;
	},
	actorId: string,
	worldId?: string,
) {
	const existing = await db.npcSchedule.findUnique({ where: { id } });
	if (!existing) throw new NotFoundError('NpcSchedule', id);
	if (worldId && existing.worldId !== worldId) throw new ValidationError('Schedule is not in this world.');

	const data: Record<string, unknown> = {};
	if (input.npcId !== undefined) {
		const npcId = input.npcId.trim();
		await assertNpcInWorld(existing.worldId, npcId);
		data.npcId = npcId;
	}
	if (input.title !== undefined) {
		const title = input.title.trim();
		if (!title) throw new ValidationError('Title is required.');
		data.title = title;
	}
	if (input.summary !== undefined) data.summary = input.summary?.trim() || null;
	if (input.locationNote !== undefined) data.locationNote = input.locationNote?.trim() || null;
	if (input.startDay !== undefined) data.startDay = parseDay(input.startDay, 'startDay');
	if (input.endDay !== undefined) {
		data.endDay = input.endDay == null || (input.endDay as any) === '' ? null : parseDay(input.endDay, 'endDay');
	}
	if (input.startMinute !== undefined) {
		data.startMinute = input.startMinute == null || (input.startMinute as any) === ''
			? null : Math.floor(Number(input.startMinute));
	}
	if (input.endMinute !== undefined) {
		data.endMinute = input.endMinute == null || (input.endMinute as any) === ''
			? null : Math.floor(Number(input.endMinute));
	}
	if (input.visibility !== undefined) data.visibility = parseVis(input.visibility);

	const startDay = (data.startDay as number | undefined) ?? existing.startDay;
	const endDay = data.endDay !== undefined ? (data.endDay as number | null) : existing.endDay;
	if (endDay != null && endDay < startDay) throw new ValidationError('endDay must be on or after startDay.');

	const row = await db.npcSchedule.update({ where: { id }, data });
	await logAudit(db, {
		actorId, action: 'UPDATE', resourceKey: 'World', resourceId: existing.worldId,
		before: { npcSchedule: existing }, after: { npcSchedule: row }, metadata: { kind: 'npc_schedule' },
	});
	return row;
}

export async function deleteNpcSchedule(id: string, actorId: string, worldId?: string) {
	const existing = await db.npcSchedule.findUnique({ where: { id } });
	if (!existing) throw new NotFoundError('NpcSchedule', id);
	if (worldId && existing.worldId !== worldId) throw new ValidationError('Schedule is not in this world.');
	await db.npcSchedule.delete({ where: { id } });
	await logAudit(db, {
		actorId, action: 'DELETE', resourceKey: 'World', resourceId: existing.worldId,
		before: { npcSchedule: existing }, metadata: { kind: 'npc_schedule' },
	});
	return { ok: true };
}
