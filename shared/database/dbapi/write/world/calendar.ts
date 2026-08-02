// shared/database/dbapi/write/world/calendar.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';
import { NotFoundError, ValidationError } from '@core/errors';
import {
	gregorianCalendarTemplate,
	validateCalendarShape,
	type CalendarDef,
} from '../../../lib/calendar/index.ts';
import { getWorldCalendar, toCalendarDef, type WorldCalendarView } from '../../read/world/get-calendar.ts';

async function assertWorld(worldId: string) {
	const world = await db.world.findUnique({ where: { id: worldId }, select: { id: true } });
	if (!world) throw new NotFoundError('World', worldId);
}

/** Ensure a Gregorian calendar exists; return it. */
export async function ensureWorldCalendar(worldId: string, actorId?: string): Promise<WorldCalendarView> {
	await assertWorld(worldId);
	const existing = await getWorldCalendar(worldId);
	if (existing) return existing;

	const tpl = gregorianCalendarTemplate();
	const created = await db.worldCalendar.create({
		data: {
			worldId,
			hoursPerDay: tpl.hoursPerDay,
			minutesPerHour: tpl.minutesPerHour,
			epochWeekdayIndex: tpl.epochWeekdayIndex,
			weekdaysResetEachMonth: tpl.weekdaysResetEachMonth,
			erasStartOnZero: tpl.erasStartOnZero,
			dateFormat: tpl.dateFormat,
			timeFormat: tpl.timeFormat,
			enableListView: tpl.enableListView,
			enableCalendarView: tpl.enableCalendarView,
			enableGanttView: tpl.enableGanttView,
			defaultView: tpl.defaultView,
			currentDay: tpl.currentDay,
			timelineStartDay: tpl.timelineStartDay,
			timelineEndDay: tpl.timelineEndDay,
			months: {
				create: tpl.months.map(m => ({
					name: m.name,
					abbreviation: m.abbreviation ?? null,
					dayCount: m.dayCount,
					sortOrder: m.sortOrder,
				})),
			},
			weekdays: {
				create: tpl.weekdays.map(w => ({
					name: w.name,
					abbreviation: w.abbreviation ?? null,
					sortOrder: w.sortOrder,
				})),
			},
			eras: {
				create: tpl.eras.map(e => ({
					name: e.name,
					abbreviation: e.abbreviation,
					direction: e.direction,
					startDay: e.startDay,
					sortOrder: e.sortOrder,
				})),
			},
			moons: {
				create: tpl.moons.map(m => ({
					name: m.name,
					cycleLengthDays: m.cycleLengthDays,
					offsetDays: m.offsetDays,
					sortOrder: m.sortOrder,
				})),
			},
		},
		include: {
			months: { orderBy: { sortOrder: 'asc' } },
			weekdays: { orderBy: { sortOrder: 'asc' } },
			eras: { orderBy: { sortOrder: 'asc' } },
			moons: { orderBy: { sortOrder: 'asc' } },
		},
	});

	if (actorId) {
		await logAudit(db, {
			actorId,
			action: 'CREATE',
			resourceKey: 'World',
			resourceId: worldId,
			after: { calendarId: created.id },
			metadata: { kind: 'world_calendar_seed' },
		});
	}

	const def = toCalendarDef(created);
	return { id: created.id, worldId: created.worldId, ...def };
}

export async function saveWorldCalendar(
	worldId: string,
	input: CalendarDef,
	actorId: string,
): Promise<WorldCalendarView> {
	await assertWorld(worldId);
	const errors = validateCalendarShape(input);
	if (errors.length) throw new ValidationError(errors[0]!);

	const existing = await db.worldCalendar.findUnique({ where: { worldId } });

	const result = await db.$transaction(async (tx) => {
		let calendarId: string;
		if (!existing) {
			const row = await tx.worldCalendar.create({
				data: {
					worldId,
					hoursPerDay: input.hoursPerDay,
					minutesPerHour: input.minutesPerHour,
					epochWeekdayIndex: input.epochWeekdayIndex,
					weekdaysResetEachMonth: input.weekdaysResetEachMonth,
					erasStartOnZero: input.erasStartOnZero,
					dateFormat: input.dateFormat.trim() || 'MMMM D^, YYYY E',
					timeFormat: input.timeFormat,
					enableListView: input.enableListView,
					enableCalendarView: input.enableCalendarView,
					enableGanttView: input.enableGanttView,
					defaultView: input.defaultView,
					currentDay: Number.isInteger(input.currentDay) ? input.currentDay : 0,
					timelineStartDay: input.timelineStartDay,
					timelineEndDay: input.timelineEndDay,
				},
			});
			calendarId = row.id;
		} else {
			calendarId = existing.id;
			await tx.worldCalendar.update({
				where: { id: calendarId },
				data: {
					hoursPerDay: input.hoursPerDay,
					minutesPerHour: input.minutesPerHour,
					epochWeekdayIndex: input.epochWeekdayIndex,
					weekdaysResetEachMonth: input.weekdaysResetEachMonth,
					erasStartOnZero: input.erasStartOnZero,
					dateFormat: input.dateFormat.trim() || 'MMMM D^, YYYY E',
					timeFormat: input.timeFormat,
					enableListView: input.enableListView,
					enableCalendarView: input.enableCalendarView,
					enableGanttView: input.enableGanttView,
					defaultView: input.defaultView,
					currentDay: Number.isInteger(input.currentDay) ? input.currentDay : 0,
					timelineStartDay: input.timelineStartDay,
					timelineEndDay: input.timelineEndDay,
				},
			});
			await tx.worldCalendarMonth.deleteMany({ where: { calendarId } });
			await tx.worldCalendarWeekday.deleteMany({ where: { calendarId } });
			await tx.worldCalendarEra.deleteMany({ where: { calendarId } });
			await tx.worldCalendarMoon.deleteMany({ where: { calendarId } });
		}

		await tx.worldCalendarMonth.createMany({
			data: input.months.map((m, i) => ({
				calendarId,
				name: m.name.trim(),
				abbreviation: m.abbreviation?.trim() || null,
				dayCount: m.dayCount,
				sortOrder: Number.isFinite(m.sortOrder) ? m.sortOrder : i,
			})),
		});
		await tx.worldCalendarWeekday.createMany({
			data: input.weekdays.map((w, i) => ({
				calendarId,
				name: w.name.trim(),
				abbreviation: w.abbreviation?.trim() || null,
				sortOrder: Number.isFinite(w.sortOrder) ? w.sortOrder : i,
			})),
		});
		await tx.worldCalendarEra.createMany({
			data: input.eras.map((e, i) => ({
				calendarId,
				name: e.name.trim(),
				abbreviation: e.abbreviation.trim() || e.name.trim().slice(0, 3),
				direction: e.direction,
				startDay: e.startDay,
				sortOrder: Number.isFinite(e.sortOrder) ? e.sortOrder : i,
			})),
		});
		if (input.moons.length) {
			await tx.worldCalendarMoon.createMany({
				data: input.moons.map((m, i) => ({
					calendarId,
					name: m.name.trim(),
					cycleLengthDays: m.cycleLengthDays,
					offsetDays: m.offsetDays,
					sortOrder: Number.isFinite(m.sortOrder) ? m.sortOrder : i,
				})),
			});
		}

		return tx.worldCalendar.findUniqueOrThrow({
			where: { id: calendarId },
			include: {
				months: { orderBy: { sortOrder: 'asc' } },
				weekdays: { orderBy: { sortOrder: 'asc' } },
				eras: { orderBy: { sortOrder: 'asc' } },
				moons: { orderBy: { sortOrder: 'asc' } },
			},
		});
	});

	await logAudit(db, {
		actorId,
		action: existing ? 'UPDATE' : 'CREATE',
		resourceKey: 'World',
		resourceId: worldId,
		after: { calendarId: result.id },
		metadata: { kind: 'world_calendar' },
	});

	const def = toCalendarDef(result);
	return { id: result.id, worldId: result.worldId, ...def };
}
