// shared/database/dbapi/read/world/get-calendar.ts
import { db } from '../../../index.ts';
import type { CalendarDef } from '../../../lib/calendar/types.ts';
import { overviewStats } from '../../../lib/calendar/engine.ts';

export type WorldCalendarView = CalendarDef & {
	id: string;
	worldId: string;
};

export function toCalendarDef(row: {
	hoursPerDay: number;
	minutesPerHour: number;
	epochWeekdayIndex: number;
	weekdaysResetEachMonth: boolean;
	erasStartOnZero: boolean;
	dateFormat: string;
	timeFormat: 'H24' | 'H12';
	enableListView: boolean;
	enableCalendarView: boolean;
	enableGanttView: boolean;
	defaultView: 'LIST' | 'CALENDAR' | 'GANTT';
	currentDay: number;
	timelineStartDay: number | null;
	timelineEndDay: number | null;
	months: { id: string; name: string; abbreviation: string | null; dayCount: number; sortOrder: number }[];
	weekdays: { id: string; name: string; abbreviation: string | null; sortOrder: number }[];
	eras: { id: string; name: string; abbreviation: string; direction: 'FORWARD' | 'BACKWARD'; startDay: number; sortOrder: number }[];
	moons: { id: string; name: string; cycleLengthDays: number; offsetDays: number; sortOrder: number }[];
}): CalendarDef {
	return {
		hoursPerDay: row.hoursPerDay,
		minutesPerHour: row.minutesPerHour,
		epochWeekdayIndex: row.epochWeekdayIndex,
		weekdaysResetEachMonth: row.weekdaysResetEachMonth,
		erasStartOnZero: row.erasStartOnZero,
		dateFormat: row.dateFormat,
		timeFormat: row.timeFormat,
		enableListView: row.enableListView,
		enableCalendarView: row.enableCalendarView,
		enableGanttView: row.enableGanttView,
		defaultView: row.defaultView,
		currentDay: row.currentDay ?? 0,
		timelineStartDay: row.timelineStartDay,
		timelineEndDay: row.timelineEndDay,
		months: row.months.map(m => ({
			id: m.id,
			name: m.name,
			abbreviation: m.abbreviation,
			dayCount: m.dayCount,
			sortOrder: m.sortOrder,
		})),
		weekdays: row.weekdays.map(w => ({
			id: w.id,
			name: w.name,
			abbreviation: w.abbreviation,
			sortOrder: w.sortOrder,
		})),
		eras: row.eras.map(e => ({
			id: e.id,
			name: e.name,
			abbreviation: e.abbreviation,
			direction: e.direction,
			startDay: e.startDay,
			sortOrder: e.sortOrder,
		})),
		moons: row.moons.map(m => ({
			id: m.id,
			name: m.name,
			cycleLengthDays: m.cycleLengthDays,
			offsetDays: m.offsetDays,
			sortOrder: m.sortOrder,
		})),
	};
}

const includeAll = {
	months: { orderBy: { sortOrder: 'asc' as const } },
	weekdays: { orderBy: { sortOrder: 'asc' as const } },
	eras: { orderBy: { sortOrder: 'asc' as const } },
	moons: { orderBy: { sortOrder: 'asc' as const } },
};

export async function getWorldCalendar(worldId: string): Promise<WorldCalendarView | null> {
	const row = await db.worldCalendar.findUnique({
		where: { worldId },
		include: includeAll,
	});
	if (!row) return null;
	const def = toCalendarDef(row);
	return { id: row.id, worldId: row.worldId, ...def };
}

export async function getWorldCalendarOverview(worldId: string) {
	const cal = await getWorldCalendar(worldId);
	if (!cal) return null;
	return { calendar: cal, stats: overviewStats(cal) };
}
