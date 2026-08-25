// shared/database/dbapi/write/world/timeline.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import type { TimelineEventType, TimelineVisibility } from '@prisma/client';

const EVENT_TYPES: TimelineEventType[] = ['WAR', 'FESTIVAL', 'DISASTER', 'POLITICAL', 'OTHER'];
const VIS: TimelineVisibility[] = ['PUBLIC', 'DM_ONLY'];

function parseType(raw: string | undefined | null): TimelineEventType {
	const t = (raw ?? 'OTHER').toUpperCase() as TimelineEventType;
	if (!EVENT_TYPES.includes(t)) throw new ValidationError(`Invalid event type: ${raw}`);
	return t;
}

function parseVis(raw: string | undefined | null): TimelineVisibility {
	const v = (raw ?? 'PUBLIC').toUpperCase() as TimelineVisibility;
	if (!VIS.includes(v)) throw new ValidationError(`Invalid visibility: ${raw}`);
	return v;
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

export async function createTimelineEvent(
	worldId: string,
	input: {
		title: string;
		summary?: string | null;
		description?: string | null;
		eventType?: string;
		startDay: number;
		endDay?: number | null;
		startMinute?: number | null;
		endMinute?: number | null;
		visibility?: string;
		regionId?: string | null;
		factionId?: string | null;
	},
	actorId: string,
) {
	await assertWorld(worldId);
	const title = input.title?.trim();
	if (!title) throw new ValidationError('Title is required.');
	const startDay = parseDay(input.startDay, 'startDay');
	const endDay = input.endDay == null || input.endDay === ('' as any) ? null : parseDay(input.endDay, 'endDay');
	if (endDay != null && endDay < startDay) throw new ValidationError('endDay must be on or after startDay.');

	const event = await db.timelineEvent.create({
		data: {
			worldId,
			title,
			summary: input.summary?.trim() || null,
			description: input.description?.trim() || null,
			eventType: parseType(input.eventType),
			startDay,
			endDay,
			startMinute: input.startMinute == null || input.startMinute === ('' as any)
				? null
				: Math.floor(Number(input.startMinute)),
			endMinute: input.endMinute == null || input.endMinute === ('' as any)
				? null
				: Math.floor(Number(input.endMinute)),
			visibility: parseVis(input.visibility),
			regionId: input.regionId?.trim() || null,
			factionId: input.factionId?.trim() || null,
			createdBy: actorId,
		},
	});
	await logAudit(db, {
		actorId,
		action: 'CREATE',
		resourceKey: 'World',
		resourceId: worldId,
		after: { timelineEvent: event },
		metadata: { kind: 'timeline_event' },
	});
	return event;
}

export async function updateTimelineEvent(
	id: string,
	input: {
		title?: string;
		summary?: string | null;
		description?: string | null;
		eventType?: string;
		startDay?: number;
		endDay?: number | null;
		startMinute?: number | null;
		endMinute?: number | null;
		visibility?: string;
		regionId?: string | null;
		factionId?: string | null;
	},
	actorId: string,
	worldId?: string,
) {
	const existing = await db.timelineEvent.findUnique({ where: { id } });
	if (!existing) throw new NotFoundError('TimelineEvent', id);
	if (worldId && existing.worldId !== worldId) throw new ValidationError('Event is not in this world.');

	const data: Record<string, unknown> = {};
	if (input.title !== undefined) {
		const title = input.title.trim();
		if (!title) throw new ValidationError('Title is required.');
		data.title = title;
	}
	if (input.summary !== undefined) data.summary = input.summary?.trim() || null;
	if (input.description !== undefined) data.description = input.description?.trim() || null;
	if (input.eventType !== undefined) data.eventType = parseType(input.eventType);
	if (input.startDay !== undefined) data.startDay = parseDay(input.startDay, 'startDay');
	if (input.endDay !== undefined) {
		data.endDay = input.endDay == null || (input.endDay as any) === ''
			? null
			: parseDay(input.endDay, 'endDay');
	}
	if (input.startMinute !== undefined) {
		data.startMinute = input.startMinute == null || (input.startMinute as any) === ''
			? null
			: Math.floor(Number(input.startMinute));
	}
	if (input.endMinute !== undefined) {
		data.endMinute = input.endMinute == null || (input.endMinute as any) === ''
			? null
			: Math.floor(Number(input.endMinute));
	}
	if (input.visibility !== undefined) data.visibility = parseVis(input.visibility);
	if (input.regionId !== undefined) data.regionId = input.regionId?.trim() || null;
	if (input.factionId !== undefined) data.factionId = input.factionId?.trim() || null;

	const startDay = (data.startDay as number | undefined) ?? existing.startDay;
	const endDay = data.endDay !== undefined ? (data.endDay as number | null) : existing.endDay;
	if (endDay != null && endDay < startDay) throw new ValidationError('endDay must be on or after startDay.');

	const event = await db.timelineEvent.update({ where: { id }, data });
	await logAudit(db, {
		actorId,
		action: 'UPDATE',
		resourceKey: 'World',
		resourceId: existing.worldId,
		before: { timelineEvent: existing },
		after: { timelineEvent: event },
		metadata: { kind: 'timeline_event' },
	});
	return event;
}

export async function deleteTimelineEvent(id: string, actorId: string, worldId?: string) {
	const existing = await db.timelineEvent.findUnique({ where: { id } });
	if (!existing) throw new NotFoundError('TimelineEvent', id);
	if (worldId && existing.worldId !== worldId) throw new ValidationError('Event is not in this world.');

	await db.timelineEvent.delete({ where: { id } });
	await logAudit(db, {
		actorId,
		action: 'DELETE',
		resourceKey: 'World',
		resourceId: existing.worldId,
		before: { timelineEvent: existing },
		metadata: { kind: 'timeline_event' },
	});
	return { ok: true };
}
