// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/timeline/+page.server.ts
import { fail } from '@sveltejs/kit';
import { worlds, factions, db } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

async function assertCanManage(worldId: string, userId: string) {
	const profile = await db.dMProfile.findFirst({ where: { userId }, select: { id: true } });
	if (!profile) return false;
	const a = await db.worldDM.findUnique({
		where: { worldId_dmProfileId: { worldId, dmProfileId: profile.id } },
		select: { canManage: true },
	});
	return a?.canManage === true;
}

export const load: PageServerLoad = async ({ params, parent }) => {
	const { canManage, world } = await parent();
	const [{ calendar, entries }, npcs] = await Promise.all([
		worlds.timeline.listEntries(params.worldId, {
			includeDmOnly: true,
			includeDraftPlotQuests: true,
		}),
		factions.npcs.getByWorld(params.worldId),
	]);
	return {
		world,
		canManage,
		calendar,
		entries,
		npcs: npcs.map((n: { id: string; name: string }) => ({ id: n.id, name: n.name })),
	};
};

function dayOrNull(raw: FormDataEntryValue | null) {
	const s = raw?.toString().trim();
	if (!s) return null;
	return Number(s);
}

export const actions: Actions = {
	createEvent: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		try {
			await worlds.timeline.createEvent(params.worldId, {
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
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
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
			}, locals.user!.id, params.worldId);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	deleteEvent: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id = data.get('eventId')?.toString() ?? '';
		if (!id) return fail(400, { message: 'eventId required' });
		try {
			await worlds.timeline.deleteEvent(id, locals.user!.id, params.worldId);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	createNpcSchedule: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		try {
			await worlds.timeline.createNpcSchedule(params.worldId, {
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
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
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
			}, locals.user!.id, params.worldId);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	deleteNpcSchedule: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id = data.get('scheduleId')?.toString() ?? '';
		if (!id) return fail(400, { message: 'scheduleId required' });
		try {
			await worlds.timeline.deleteNpcSchedule(id, locals.user!.id, params.worldId);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
