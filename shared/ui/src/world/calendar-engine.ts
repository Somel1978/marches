// shared/ui/src/world/calendar-engine.ts — keep in sync with shared/database/lib/calendar/engine.ts
import type {
	CalendarDef,
	CalendarEraDef,
	CalendarMonthDef,
	CalendarMoonDef,
	CalendarOverviewStats,
	CalendarParts,
	CalendarWeekdayDef,
} from './calendar-types.ts';

export type MoonPhaseInfo = {
	name: string;
	/** 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter */
	phase: number;
	emoji: string;
	illumination: number; // 0–1
};

const PHASE_NAMES: { max: number; name: string; emoji: string }[] = [
	{ max: 0.03, name: 'New Moon', emoji: '🌑' },
	{ max: 0.22, name: 'Waxing Crescent', emoji: '🌒' },
	{ max: 0.28, name: 'First Quarter', emoji: '🌓' },
	{ max: 0.47, name: 'Waxing Gibbous', emoji: '🌔' },
	{ max: 0.53, name: 'Full Moon', emoji: '🌕' },
	{ max: 0.72, name: 'Waning Gibbous', emoji: '🌖' },
	{ max: 0.78, name: 'Last Quarter', emoji: '🌗' },
	{ max: 0.97, name: 'Waning Crescent', emoji: '🌘' },
	{ max: 1.01, name: 'New Moon', emoji: '🌑' },
];

/** Lunar phase for a moon definition on an absolute day. */
export function moonPhase(absoluteDay: number, moon: CalendarMoonDef): MoonPhaseInfo {
	const cycle = Math.max(0.0001, moon.cycleLengthDays);
	const t = (((absoluteDay + moon.offsetDays) % cycle) + cycle) % cycle;
	const phase = t / cycle;
	const illumination = 0.5 * (1 - Math.cos(2 * Math.PI * phase));
	const row = PHASE_NAMES.find(p => phase <= p.max) ?? PHASE_NAMES[PHASE_NAMES.length - 1]!;
	return { name: row.name, phase, emoji: row.emoji, illumination };
}

export function moonsOnDay(cal: CalendarDef, absoluteDay: number): (MoonPhaseInfo & { moonName: string })[] {
	return [...cal.moons]
		.sort((a, b) => a.sortOrder - b.sortOrder)
		.map(m => ({ ...moonPhase(absoluteDay, m), moonName: m.name }));
}

export function sortedMonths(cal: CalendarDef): CalendarMonthDef[] {
	return [...cal.months].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function sortedWeekdays(cal: CalendarDef): CalendarWeekdayDef[] {
	return [...cal.weekdays].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function sortedEras(cal: CalendarDef): CalendarEraDef[] {
	return [...cal.eras].sort((a, b) => a.sortOrder - b.sortOrder || a.startDay - b.startDay);
}

export function daysInYear(cal: CalendarDef): number {
	return sortedMonths(cal).reduce((sum, m) => sum + Math.max(0, m.dayCount), 0);
}

export function validateCalendarShape(cal: CalendarDef): string[] {
	const errors: string[] = [];
	if (cal.hoursPerDay < 1 || cal.hoursPerDay > 240) errors.push('hoursPerDay must be 1–240.');
	if (cal.minutesPerHour < 1 || cal.minutesPerHour > 600) errors.push('minutesPerHour must be 1–600.');
	const months = sortedMonths(cal);
	if (!months.length) errors.push('At least one month is required.');
	for (const m of months) {
		if (!m.name.trim()) errors.push('Month name is required.');
		if (!Number.isInteger(m.dayCount) || m.dayCount < 1) errors.push(`Month “${m.name}” needs dayCount ≥ 1.`);
	}
	const weekdays = sortedWeekdays(cal);
	if (!weekdays.length) errors.push('At least one weekday is required.');
	if (cal.epochWeekdayIndex < 0 || (weekdays.length && cal.epochWeekdayIndex >= weekdays.length)) {
		errors.push('epochWeekdayIndex is out of range.');
	}
	const diy = daysInYear(cal);
	if (diy < 1) errors.push('Year length must be at least 1 day.');
	return errors;
}

/** Convert era-year / month / day → absolute day (epoch day 0 = first day of year 0 or 1). */
export function toAbsoluteDay(
	cal: CalendarDef,
	input: { year: number; monthIndex: number; day: number },
): number {
	const months = sortedMonths(cal);
	const diy = daysInYear(cal);
	if (!months.length || diy < 1) return 0;

	const monthIndex = Math.max(0, Math.min(months.length - 1, input.monthIndex));
	const month = months[monthIndex]!;
	const day = Math.max(1, Math.min(month.dayCount, Math.floor(input.day)));

	const firstYear = cal.erasStartOnZero ? 0 : 1;
	const yearOffset = Math.floor(input.year) - firstYear;
	let dayOfYear = 0;
	for (let i = 0; i < monthIndex; i++) dayOfYear += months[i]!.dayCount;
	dayOfYear += day - 1;

	return yearOffset * diy + dayOfYear;
}

function resolveEra(cal: CalendarDef, absoluteDay: number): { era: CalendarEraDef | null; eraYear: number; year: number } {
	const eras = sortedEras(cal).filter(e => e.direction === 'FORWARD');
	const diy = daysInYear(cal) || 1;
	const firstYear = cal.erasStartOnZero ? 0 : 1;

	// Global year from epoch (independent of era labels)
	const yearIndex = Math.floor(absoluteDay / diy);
	const year = firstYear + yearIndex;

	if (!eras.length) {
		return { era: null, eraYear: year, year };
	}

	// Active era = latest forward era whose startDay <= absoluteDay
	let active: CalendarEraDef | null = null;
	for (const e of eras) {
		if (e.startDay <= absoluteDay) active = e;
	}
	if (!active) active = eras[0] ?? null;

	if (!active) return { era: null, eraYear: year, year };

	const eraStartYearIndex = Math.floor(active.startDay / diy);
	const yearsSinceEra = yearIndex - eraStartYearIndex;
	const eraYear = firstYear + yearsSinceEra;
	return { era: active, eraYear, year };
}

export function fromAbsoluteDay(cal: CalendarDef, absoluteDay: number): CalendarParts {
	const months = sortedMonths(cal);
	const weekdays = sortedWeekdays(cal);
	const diy = daysInYear(cal) || 1;
	const day = Math.floor(absoluteDay);

	const { era, eraYear, year } = resolveEra(cal, day);

	let dayOfYear = ((day % diy) + diy) % diy;
	let monthIndex = 0;
	for (let i = 0; i < months.length; i++) {
		const len = months[i]!.dayCount;
		if (dayOfYear < len) {
			monthIndex = i;
			break;
		}
		dayOfYear -= len;
		if (i === months.length - 1) monthIndex = i;
	}
	const month = months[monthIndex] ?? { name: '?', dayCount: 1, sortOrder: 0 };
	const dayOfMonth = dayOfYear + 1;

	let weekdayIndex = 0;
	if (weekdays.length) {
		if (cal.weekdaysResetEachMonth) {
			weekdayIndex = (dayOfMonth - 1 + cal.epochWeekdayIndex) % weekdays.length;
		} else {
			weekdayIndex = (((day + cal.epochWeekdayIndex) % weekdays.length) + weekdays.length) % weekdays.length;
		}
	}

	return {
		absoluteDay: day,
		year,
		monthIndex,
		day: dayOfMonth,
		weekdayIndex,
		era,
		eraYear,
		month,
		weekday: weekdays[weekdayIndex] ?? null,
	};
}

function ordinal(n: number): string {
	const v = Math.abs(n) % 100;
	if (v >= 11 && v <= 13) return 'th';
	switch (Math.abs(n) % 10) {
		case 1: return 'st';
		case 2: return 'nd';
		case 3: return 'rd';
		default: return 'th';
	}
}

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

/** Format an absolute day (and optional minute-of-day) with the calendar's token language. */
export function formatDate(
	cal: CalendarDef,
	absoluteDay: number,
	opts?: { format?: string; minuteOfDay?: number | null },
): string {
	const fmt = opts?.format ?? cal.dateFormat;
	const parts = fromAbsoluteDay(cal, absoluteDay);
	const month = parts.month;
	const weekday = parts.weekday;
	const era = parts.era;

	const minutesPerDay = cal.hoursPerDay * cal.minutesPerHour;
	let minuteOfDay = opts?.minuteOfDay ?? null;
	if (minuteOfDay != null) {
		minuteOfDay = ((minuteOfDay % minutesPerDay) + minutesPerDay) % minutesPerDay;
	}
	const hour = minuteOfDay == null ? 0 : Math.floor(minuteOfDay / cal.minutesPerHour);
	const minute = minuteOfDay == null ? 0 : minuteOfDay % cal.minutesPerHour;

	const tokens: Record<string, string> = {
		EE: era?.name ?? '',
		E: era?.abbreviation ?? '',
		SYYYY: String(parts.eraYear),
		YYYY: String(Math.abs(parts.eraYear)).padStart(4, '0'),
		YY: String(Math.abs(parts.eraYear)).slice(-2).padStart(2, '0'),
		YBIG: String(parts.eraYear),
		MMMM: month.name,
		MMM: (month.abbreviation || month.name).slice(0, 3),
		MM: pad2(parts.monthIndex + 1),
		M: String(parts.monthIndex + 1),
		DDDD: weekday?.name ?? '',
		DDD: (weekday?.abbreviation || weekday?.name || '').slice(0, 3),
		DD: pad2(parts.day),
		D: String(parts.day),
		HH: pad2(hour),
		H: String(hour),
		mm: pad2(minute),
		m: String(minute),
	};

	// Replace [literal] segments first (do not tokenize inside them)
	const literals: string[] = [];
	let out = fmt.replace(/\[([^\]]*)\]/g, (_, lit: string) => {
		literals.push(lit);
		return `\u0000${literals.length - 1}\u0000`;
	});

	// One-pass longest-token replace so values like "May" / "November" are not
	// re-scanned (split/join used to turn May→5ay and November→Nove0ber).
	out = out.replace(
		/SYYYY|YYYY|YBIG|MMMM|DDDD|MMM|DDD|EE|MM|DD|HH|mm|YY|E|M|D|H|m/g,
		(key) => tokens[key] ?? key,
	);

	// Ordinal marker after a number: D^ → 17th
	out = out.replace(/(\d+)\^/g, (_, n: string) => `${n}${ordinal(Number(n))}`);
	out = out.replace(/\^/g, '');

	return out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => literals[Number(i)] ?? '');
}

export function overviewStats(cal: CalendarDef): CalendarOverviewStats {
	const diy = daysInYear(cal);
	const months = sortedMonths(cal);
	const weekdays = sortedWeekdays(cal);
	const daysPerWeek = weekdays.length || 7;
	const avgDays = months.length ? diy / months.length : 0;

	const earliest = cal.timelineStartDay != null ? formatDate(cal, cal.timelineStartDay) : null;
	const latest = cal.timelineEndDay != null ? formatDate(cal, cal.timelineEndDay) : null;

	return {
		hoursPerDay: cal.hoursPerDay,
		daysPerWeek,
		monthsPerYear: months.length,
		minutesPerHour: cal.minutesPerHour,
		hoursPerWeek: cal.hoursPerDay * daysPerWeek,
		daysPerYear: diy,
		avgDaysPerMonth: Math.round(avgDays * 100) / 100,
		avgHoursPerMonth: Math.round(avgDays * cal.hoursPerDay * 100) / 100,
		currentLabel: formatDate(cal, cal.currentDay ?? 0),
		earliestLabel: earliest,
		latestLabel: latest,
	};
}

/** Gregorian-like default used when a world has no calendar yet. */
export function gregorianCalendarTemplate(): CalendarDef {
	const monthLens = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	const monthNames = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December',
	];
	const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

	return {
		hoursPerDay: 24,
		minutesPerHour: 60,
		epochWeekdayIndex: 0,
		weekdaysResetEachMonth: false,
		erasStartOnZero: false,
		dateFormat: 'MMMM D^, YYYY E',
		timeFormat: 'H24',
		enableListView: true,
		enableCalendarView: true,
		enableGanttView: true,
		defaultView: 'LIST',
		currentDay: 0,
		timelineStartDay: 0,
		timelineEndDay: null,
		months: monthNames.map((name, i) => ({
			name,
			abbreviation: name.slice(0, 3),
			dayCount: monthLens[i]!,
			sortOrder: i,
		})),
		weekdays: weekdayNames.map((name, i) => ({
			name,
			abbreviation: name.slice(0, 3),
			sortOrder: i,
		})),
		eras: [{
			name: 'Common Era',
			abbreviation: 'CE',
			direction: 'FORWARD',
			startDay: 0,
			sortOrder: 0,
		}],
		moons: [],
	};
}
