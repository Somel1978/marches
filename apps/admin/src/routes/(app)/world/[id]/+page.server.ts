// apps/admin/src/routes/(app)/world/[id]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { worlds } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');
	const world = await worlds.getById(params.id);
	if (!world) throw error(404, 'World not found');
	return { world };
};

export const actions: Actions = {
	updateWorld: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		try {
			await worlds.update(params.id, {
				name:        data.get('name')?.toString().trim()           || undefined,
				description: data.get('description')?.toString().trim()    || null,
				mapImageUrl: data.get('mapImageUrl')?.toString().trim()    || null,
				isActive:    data.get('isActive') === 'true',
			}, locals.user!.id);
			return { worldSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	addRegion: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Region', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { message: 'Region name is required.' });
		try {
			await worlds.regions.create({
				worldId:      params.id,
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
		const can = checkPermission(locals.permissions, { resourceKey: 'Region', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
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