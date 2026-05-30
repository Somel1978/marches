// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/edit/+page.server.ts
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
	if (!canManage) throw error(403, 'You do not have management access to this world.');
	return {};
};

export const actions: Actions = {
	updateWorld: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		try {
			await worlds.update(params.worldId, {
				name:                    data.get('name')?.toString().trim()        || undefined,
				description:             data.get('description')?.toString().trim() || null,
				mapImageUrl:             data.get('mapImageUrl')?.toString().trim() || null,
				isActive:                data.get('isActive') === 'true',
				acceptsGlobalCharacters: data.get('acceptsGlobalCharacters') === 'true',
			}, locals.user!.id);
			return { worldSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	addRegion: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { message: 'Region name is required.' });
		try {
			await worlds.regions.create({
				worldId:      params.worldId,
				name,
				description:  data.get('description')?.toString().trim() || undefined,
				color:        data.get('color')?.toString()              || '#6366f1',
				dangerRating: data.get('dangerRating')?.toString()       || 'Safe',
				minLevel:     data.get('minLevel') ? Number(data.get('minLevel')) : undefined,
				maxLevel:     data.get('maxLevel') ? Number(data.get('maxLevel')) : undefined,
			}, locals.user!.id);
			return { regionSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateMarker: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data     = await request.formData();
		const regionId = data.get('regionId')?.toString() ?? '';
		const mapX     = Number(data.get('mapX'));
		const mapY     = Number(data.get('mapY'));
		try {
			await worlds.regions.update(regionId, { mapX, mapY }, locals.user!.id);
			return { markerSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
