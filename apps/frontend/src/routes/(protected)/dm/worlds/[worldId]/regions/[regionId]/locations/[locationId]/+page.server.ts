// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/regions/[regionId]/locations/[locationId]/+page.server.ts
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

export const load: PageServerLoad = async ({ params, parent }) => {
	const { canManage } = await parent();
	const [region, wiki] = await Promise.all([
		worlds.regions.getById(params.regionId),
		worlds.wiki.get('LOCATION', params.locationId),
	]);
	if (!region || region.worldId !== params.worldId) throw error(404, 'Region not found');
	const location = region.locations.find((l: any) => l.id === params.locationId) ?? null;
	if (!location) throw error(404, 'Location not found');
	return { location: { ...location, region }, wiki, canManage };
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		try {
			await worlds.locations.update(params.locationId, {
				name:         data.get('name')?.toString().trim()        || undefined,
				description:  data.get('description')?.toString().trim() || null,
				type:         data.get('type')?.toString()               || undefined,
				dangerRating: data.get('dangerRating')?.toString()       || undefined,
				minLevel:     data.get('minLevel') ? Number(data.get('minLevel')) : null,
				maxLevel:     data.get('maxLevel') ? Number(data.get('maxLevel')) : null,
				imageUrl:     data.get('imageUrl')?.toString().trim()    || null,
				isActive:     data.get('isActive') === 'true',
			}, locals.user!.id);
			return { success: true };
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
			await worlds.wiki.upsert('LOCATION', params.locationId, title, content, locals.user!.id);
			return { wikiSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
