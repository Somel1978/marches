// apps/admin/src/routes/(app)/world/[id]/timeline/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { worlds, factions } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

function dayOrNull(raw: FormDataEntryValue | null) {
	const s = raw?.toString().trim();
	if (!s) return null;
	return Number(s);
}

export const load: PageServerLoad = async ({ params }) => {
	const world = await worlds.getById(params.id);
	if (!world) throw error(404, 'World not found');
	const [{ calendar, entries }, npcs] = await Promise.all([
		worlds.timeline.listEntries(params.id, {
			includeDmOnly: true,
			includeDraftPlotQuests: true,
		}),
		factions.npcs.getByWorld(params.id),
	]);
	return {
		world,
		calendar,
		entries,
		npcs: npcs.map((n: { id: string; name: string }) => ({ id: n.id, name: n.name })),
		canEdit: true,
	};
};

export const actions: Actions = {
	createEvent: async ({ params, request, locals }) => {
		const data = await request.formData();
		try {
			await worlds.timeline.createEvent(params.id, {
				title: data.get('title')?.toString() ?? '',
				summary: data.get('summary')?.toString() ?? null,
				eventType: data.get('eventType')?.toString() ?? 'OTHER',
				startDay: Number(data.get('startDay')),
				endDay: dayOrNull(data.get('endDay')),
				visibility: data.get('visibility')?.toString() ?? 'PUBLIC',
			}, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
	updateEvent: async ({ params, request, locals }) => {
		const data = await request.formData();
		const id = data.get('eventId')?.toString() ?? '';
		if (!id) return fail(400, { message: 'eventId required' });
		try {
			await worlds.timeline.updateEvent(id, {
				title: data.get('title')?.toString(),
				summary: data.get('summary')?.toString() ?? null,
				eventType: data.get('eventType')?.toString(),
				startDay: Number(data.get('startDay')),
				endDay: dayOrNull(data.get('endDay')),
				visibility: data.get('visibility')?.toString(),
			}, locals.user!.id, params.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
	deleteEvent: async ({ params, request, locals }) => {
		const data = await request.formData();
		const id = data.get('eventId')?.toString() ?? '';
		if (!id) return fail(400, { message: 'eventId required' });
		try {
			await worlds.timeline.deleteEvent(id, locals.user!.id, params.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
	createNpcSchedule: async ({ params, request, locals }) => {
		const data = await request.formData();
		try {
			await worlds.timeline.createNpcSchedule(params.id, {
				npcId: data.get('npcId')?.toString() ?? '',
				title: data.get('title')?.toString() ?? '',
				summary: data.get('summary')?.toString() ?? null,
				locationNote: data.get('locationNote')?.toString() ?? null,
				startDay: Number(data.get('startDay')),
				endDay: dayOrNull(data.get('endDay')),
				visibility: data.get('visibility')?.toString() ?? 'PUBLIC',
			}, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
	updateNpcSchedule: async ({ params, request, locals }) => {
		const data = await request.formData();
		const id = data.get('scheduleId')?.toString() ?? '';
		if (!id) return fail(400, { message: 'scheduleId required' });
		try {
			await worlds.timeline.updateNpcSchedule(id, {
				npcId: data.get('npcId')?.toString(),
				title: data.get('title')?.toString(),
				summary: data.get('summary')?.toString() ?? null,
				locationNote: data.get('locationNote')?.toString() ?? null,
				startDay: Number(data.get('startDay')),
				endDay: dayOrNull(data.get('endDay')),
				visibility: data.get('visibility')?.toString(),
			}, locals.user!.id, params.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
	deleteNpcSchedule: async ({ params, request, locals }) => {
		const data = await request.formData();
		const id = data.get('scheduleId')?.toString() ?? '';
		if (!id) return fail(400, { message: 'scheduleId required' });
		try {
			await worlds.timeline.deleteNpcSchedule(id, locals.user!.id, params.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
