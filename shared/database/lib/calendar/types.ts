// shared/database/lib/calendar/types.ts
/** Pure calendar types (no Prisma). */

export type CalendarMonthDef = {
	id?: string;
	name: string;
	abbreviation?: string | null;
	dayCount: number;
	sortOrder: number;
};

export type CalendarWeekdayDef = {
	id?: string;
	name: string;
	abbreviation?: string | null;
	sortOrder: number;
};

export type CalendarEraDef = {
	id?: string;
	name: string;
	abbreviation: string;
	direction: 'FORWARD' | 'BACKWARD';
	startDay: number;
	sortOrder: number;
};

export type CalendarMoonDef = {
	id?: string;
	name: string;
	cycleLengthDays: number;
	offsetDays: number;
	sortOrder: number;
};

export type CalendarDef = {
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
	/** World “today” (absolute day). */
	currentDay: number;
	timelineStartDay: number | null;
	timelineEndDay: number | null;
	months: CalendarMonthDef[];
	weekdays: CalendarWeekdayDef[];
	eras: CalendarEraDef[];
	moons: CalendarMoonDef[];
};

export type CalendarParts = {
	absoluteDay: number;
	year: number;
	/** 0-based month index into sorted months */
	monthIndex: number;
	day: number; // 1-based within month
	weekdayIndex: number;
	era: CalendarEraDef | null;
	/** Year within the active era (display year) */
	eraYear: number;
	month: CalendarMonthDef;
	weekday: CalendarWeekdayDef | null;
};

export type CalendarOverviewStats = {
	hoursPerDay: number;
	daysPerWeek: number;
	monthsPerYear: number;
	minutesPerHour: number;
	hoursPerWeek: number;
	daysPerYear: number;
	avgDaysPerMonth: number;
	avgHoursPerMonth: number;
	currentLabel: string;
	earliestLabel: string | null;
	latestLabel: string | null;
};
