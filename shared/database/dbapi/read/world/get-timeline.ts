// shared/database/dbapi/read/world/get-timeline.ts
import { db } from '../../../index.ts';
import { ensureWorldCalendar } from '../../write/world/calendar.ts';
import { formatDate, fromAbsoluteDay, sortedMonths, toAbsoluteDay } from '../../../lib/calendar/index.ts';
import type { PlotQuestStatus, TimelineEventType, TimelineVisibility, WeatherCondition } from '@prisma/client';
import type { WorldCalendarView } from './get-calendar.ts';

export type TimelineEntryKind = 'EVENT' | 'PLOT_QUEST' | 'WEATHER' | 'NPC_SCHEDULE';

export type TimelineEntry = {
	id: string;
	kind: TimelineEntryKind;
	title: string;
	summary: string | null;
	startDay: number;
	endDay: number | null;
	startMinute: number | null;
	endMinute: number | null;
	label: string;
	eventType?: TimelineEventType;
	weatherCondition?: WeatherCondition;
	visibility?: TimelineVisibility;
	plotQuestStatus?: PlotQuestStatus;
	regionId?: string | null;
	regionName?: string | null;
	npcId?: string | null;
	npcName?: string | null;
	hrefKey: string;
};

function rangeAnd(fromDay?: number, toDay?: number): Record<string, unknown>[] {
	const and: Record<string, unknown>[] = [];
	if (toDay != null) and.push({ startDay: { lte: toDay } });
	if (fromDay != null) {
		and.push({
			OR: [
				{ endDay: null, startDay: { gte: fromDay } },
				{ endDay: { gte: fromDay } },
			],
		});
	}
	return and;
}

export async function listTimelineEntries(
	worldId: string,
	opts: {
		fromDay?: number;
		toDay?: number;
		includeDmOnly?: boolean;
		includeDraftPlotQuests?: boolean;
	} = {},
): Promise<{ calendar: Awaited<ReturnType<typeof ensureWorldCalendar>>; entries: TimelineEntry[] }> {
	const calendar = await ensureWorldCalendar(worldId);
	const includeDmOnly = opts.includeDmOnly === true;
	const includeDraft = opts.includeDraftPlotQuests !== false;

	const fromDay = opts.fromDay ?? calendar.timelineStartDay ?? undefined;
	const toDay = opts.toDay ?? calendar.timelineEndDay ?? undefined;

	const eventWhere: Record<string, unknown> = { worldId };
	const weatherWhere: Record<string, unknown> = { worldId };
	const scheduleWhere: Record<string, unknown> = { worldId };
	if (!includeDmOnly) {
		eventWhere.visibility = 'PUBLIC';
		weatherWhere.visibility = 'PUBLIC';
		scheduleWhere.visibility = 'PUBLIC';
	}
	const and = rangeAnd(fromDay, toDay);
	if (and.length) {
		eventWhere.AND = and;
		weatherWhere.AND = and;
		scheduleWhere.AND = and;
	}

	const plotWhere: Record<string, unknown> = {
		worldId,
		deadlineDay: { not: null },
	};
	if (!includeDraft) plotWhere.status = { in: ['ACTIVE', 'COMPLETED'] };
	if (fromDay != null || toDay != null) {
		plotWhere.deadlineDay = {
			not: null,
			...(fromDay != null ? { gte: fromDay } : {}),
			...(toDay != null ? { lte: toDay } : {}),
		};
	}

	const [events, plots, weatherRows, schedules] = await Promise.all([
		db.timelineEvent.findMany({
			where: eventWhere,
			orderBy: [{ startDay: 'asc' }, { title: 'asc' }],
		}),
		db.plotQuest.findMany({
			where: plotWhere,
			orderBy: [{ deadlineDay: 'asc' }, { title: 'asc' }],
			select: { id: true, title: true, summary: true, status: true, deadlineDay: true },
		}),
		db.regionWeather.findMany({
			where: weatherWhere,
			orderBy: [{ startDay: 'asc' }],
		}),
		db.npcSchedule.findMany({
			where: scheduleWhere,
			orderBy: [{ startDay: 'asc' }, { title: 'asc' }],
		}),
	]);

	const regionIds = [...new Set(weatherRows.map(w => w.regionId))];
	const npcIds = [...new Set(schedules.map(s => s.npcId))];
	const [regions, npcs] = await Promise.all([
		regionIds.length
			? db.region.findMany({ where: { id: { in: regionIds } }, select: { id: true, name: true } })
			: [],
		npcIds.length
			? db.npc.findMany({ where: { id: { in: npcIds } }, select: { id: true, name: true } })
			: [],
	]);
	const regionMap = Object.fromEntries(regions.map(r => [r.id, r.name]));
	const npcMap = Object.fromEntries(npcs.map(n => [n.id, n.name]));

	const entries: TimelineEntry[] = [
		...events.map(e => ({
			id: e.id,
			kind: 'EVENT' as const,
			title: e.title,
			summary: e.summary,
			startDay: e.startDay,
			endDay: e.endDay,
			startMinute: e.startMinute,
			endMinute: e.endMinute,
			label: formatDate(calendar, e.startDay),
			eventType: e.eventType,
			visibility: e.visibility,
			regionId: e.regionId,
			hrefKey: e.id,
		})),
		...plots
			.filter(p => p.deadlineDay != null)
			.map(p => ({
				id: `plot:${p.id}`,
				kind: 'PLOT_QUEST' as const,
				title: p.title,
				summary: p.summary,
				startDay: p.deadlineDay!,
				endDay: null as number | null,
				startMinute: null as number | null,
				endMinute: null as number | null,
				label: formatDate(calendar, p.deadlineDay!),
				plotQuestStatus: p.status,
				hrefKey: p.id,
			})),
		...weatherRows.map(w => {
			const regionName = regionMap[w.regionId] ?? 'Region';
			const title = w.title?.trim() || `${w.condition} — ${regionName}`;
			return {
				id: `weather:${w.id}`,
				kind: 'WEATHER' as const,
				title,
				summary: w.summary,
				startDay: w.startDay,
				endDay: w.endDay,
				startMinute: null as number | null,
				endMinute: null as number | null,
				label: formatDate(calendar, w.startDay),
				weatherCondition: w.condition,
				visibility: w.visibility,
				regionId: w.regionId,
				regionName,
				hrefKey: w.id,
			};
		}),
		...schedules.map(s => {
			const npcName = npcMap[s.npcId] ?? 'NPC';
			return {
				id: `npc:${s.id}`,
				kind: 'NPC_SCHEDULE' as const,
				title: s.title,
				summary: s.summary ?? (s.locationNote ? `${npcName} · ${s.locationNote}` : npcName),
				startDay: s.startDay,
				endDay: s.endDay,
				startMinute: s.startMinute,
				endMinute: s.endMinute,
				label: formatDate(calendar, s.startDay),
				visibility: s.visibility,
				npcId: s.npcId,
				npcName,
				hrefKey: s.id,
			};
		}),
	];

	entries.sort((a, b) => a.startDay - b.startDay || a.title.localeCompare(b.title));
	return { calendar, entries };
}

export async function getTimelineEventById(id: string) {
	return db.timelineEvent.findUnique({ where: { id } });
}

/** Weather periods for a single region (managed on the region page). */
export async function listRegionWeather(
	worldId: string,
	regionId: string,
	opts?: { includeDmOnly?: boolean },
) {
	const and: Record<string, unknown>[] = [{ worldId }, { regionId }];
	if (!opts?.includeDmOnly) and.push({ visibility: 'PUBLIC' });
	return db.regionWeather.findMany({
		where: { AND: and },
		orderBy: [{ startDay: 'asc' }, { condition: 'asc' }],
	});
}

export function monthDayRange(calendar: WorldCalendarView, year: number, monthIndex: number) {
	const months = sortedMonths(calendar);
	const m = months[monthIndex];
	if (!m) return { startDay: 0, endDay: 0, dayCount: 0 };
	const startDay = toAbsoluteDay(calendar, { year, monthIndex, day: 1 });
	return { startDay, endDay: startDay + m.dayCount - 1, dayCount: m.dayCount };
}

export { fromAbsoluteDay, formatDate };
