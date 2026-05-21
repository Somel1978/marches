// apps/admin/src/routes/(app)/world/[id]/regions/[regionId]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { worlds, dms } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'Region', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');
	const [region, allDMs, wiki] = await Promise.all([
		worlds.regions.getById(params.regionId),
		dms.profiles.getAll(),
		worlds.wiki.get('REGION', params.regionId),
	]);
	if (!region) throw error(404, 'Region not found');
	return { region, allDMs, wiki };
};

export const actions: Actions = {
	updateRegion: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Region', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
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

	assignDM: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Region', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const dmProfileId = data.get('dmProfileId')?.toString() ?? '';
		try {
			await worlds.regions.assignDM(params.regionId, dmProfileId, locals.user!.id);
			return { dmSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	removeDM: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Region', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const dmProfileId = data.get('dmProfileId')?.toString() ?? '';
		try {
			await worlds.regions.removeDM(params.regionId, dmProfileId, locals.user!.id);
			return { dmSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	saveWiki: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'WikiPage', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
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
		const can = checkPermission(locals.permissions, { resourceKey: 'Location', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
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
};
