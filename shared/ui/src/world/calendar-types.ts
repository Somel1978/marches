// shared/ui/src/world/calendar-types.ts
/** Client-side calendar shapes (mirrors @core/database lib/calendar). */

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
	id?: string;
	worldId?: string;
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

export type TimelineEntryView = {
	id: string;
	kind: 'EVENT' | 'PLOT_QUEST' | 'WEATHER' | 'NPC_SCHEDULE';
	title: string;
	summary: string | null;
	startDay: number;
	endDay: number | null;
	label: string;
	eventType?: string;
	weatherCondition?: string;
	visibility?: string;
	plotQuestStatus?: string;
	regionId?: string | null;
	regionName?: string | null;
	npcId?: string | null;
	npcName?: string | null;
	hrefKey: string;
};

/** Weather period managed on a region page. */
export type RegionWeatherRow = {
	id: string;
	condition: string;
	title: string | null;
	summary: string | null;
	startDay: number;
	endDay: number | null;
	visibility: string;
};

export type CalendarParts = {
	absoluteDay: number;
	year: number;
	monthIndex: number;
	day: number;
	weekdayIndex: number;
	era: CalendarEraDef | null;
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
