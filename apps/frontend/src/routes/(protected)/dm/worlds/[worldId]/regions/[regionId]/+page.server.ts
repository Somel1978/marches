// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/regions/[regionId]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { worlds, db } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

async function assertCanManage(worldId: string, userId: string) {
	const profile = await db.dMProfile.findFirst({ where: { userId }, select: { id: true } });
	if (!profile) return false;
	const a = await db.worldDM.findUnique({
		where: { worldId_dmProfileId: { worldId, dmProfileId: profile.id } },
		select: { canManage: true },
	});
	return a?.canManage === true;
}

function dayOrNull(raw: FormDataEntryValue | null) {
	const s = raw?.toString().trim();
	if (!s) return null;
	return Number(s);
}

export const load: PageServerLoad = async ({ params, parent }) => {
	const { canManage } = await parent();
	const [region, wiki, calendar, weather] = await Promise.all([
		worlds.regions.getById(params.regionId),
		worlds.wiki.get('REGION', params.regionId),
		worlds.calendar.ensure(params.worldId),
		worlds.timeline.listWeather(params.worldId, params.regionId, { includeDmOnly: true }),
	]);
	if (!region) throw error(404, 'Region not found');
	if (region.worldId !== params.worldId) throw error(403, 'Forbidden');
	return { region, wiki, canManage, calendar, weather };
};

export const actions: Actions = {
	updateRegion: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		try {
			await worlds.regions.update(params.regionId, {
				name:         data.get('name')?.toString().trim()        || undefined,
				description:  data.get('description')?.toString().trim() || null,
				color:        data.get('color')?.toString()              || undefined,
				dangerRating: data.get('dangerRating')?.toString()       || undefined,
				minLevel:     data.get('minLevel') ? Number(data.get('minLevel')) : null,
				maxLevel:     data.get('maxLevel') ? Number(data.get('maxLevel')) : null,
				imageUrl:     data.get('imageUrl')?.toString().trim()    || null,
				isActive:     data.get('isActive') === 'true',
			}, locals.user!.id);
			return { regionSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	saveWiki: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data    = await request.formData();
		const title   = data.get('title')?.toString().trim()   ?? '';
		const content = data.get('content')?.toString().trim() ?? '';
		if (!title) return fail(400, { message: 'Title is required.' });
		try {
			await worlds.wiki.upsert('REGION', params.regionId, title, content, locals.user!.id);
			return { wikiSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	addLocation: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { message: 'Location name is required.' });
		try {
			await worlds.locations.create({
				regionId:     params.regionId,
				name,
				type:         data.get('type')?.toString()         || 'Other',
				dangerRating: data.get('dangerRating')?.toString() || 'Safe',
				minLevel:     data.get('minLevel') ? Number(data.get('minLevel')) : undefined,
				maxLevel:     data.get('maxLevel') ? Number(data.get('maxLevel')) : undefined,
			}, locals.user!.id);
			return { locationSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	createWeather: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		try {
			await worlds.timeline.createWeather(params.worldId, {
				regionId: params.regionId,
				condition: data.get('condition')?.toString() ?? 'CLEAR',
				title: data.get('title')?.toString() ?? null,
				summary: data.get('summary')?.toString() ?? null,
				startDay: Number(data.get('startDay')),
				endDay: dayOrNull(data.get('endDay')),
				visibility: data.get('visibility')?.toString() ?? 'PUBLIC',
			}, locals.user!.id);
			return { weatherSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateWeather: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id = data.get('weatherId')?.toString() ?? '';
		if (!id) return fail(400, { message: 'weatherId required' });
		try {
			await worlds.timeline.updateWeather(id, {
				regionId: params.regionId,
				condition: data.get('condition')?.toString(),
				title: data.get('title')?.toString() ?? null,
				summary: data.get('summary')?.toString() ?? null,
				startDay: Number(data.get('startDay')),
				endDay: dayOrNull(data.get('endDay')),
				visibility: data.get('visibility')?.toString(),
			}, locals.user!.id, params.worldId);
			return { weatherSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	deleteWeather: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id = data.get('weatherId')?.toString() ?? '';
		if (!id) return fail(400, { message: 'weatherId required' });
		try {
			await worlds.timeline.deleteWeather(id, locals.user!.id, params.worldId);
			return { weatherSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
