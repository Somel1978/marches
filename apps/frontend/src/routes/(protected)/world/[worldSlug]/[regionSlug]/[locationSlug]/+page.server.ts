// apps/frontend/src/routes/(protected)/world/[worldSlug]/[regionSlug]/[locationSlug]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { worlds, platform, dms } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const world = await worlds.getBySlug(params.worldSlug);
	if (!world) throw error(404, 'World not found');

	const region = world.regions.find(r => r.slug === params.regionSlug);
	if (!region) throw error(404, 'Region not found');

	const location = region.locations.find(l => l.slug === params.locationSlug && l.isActive);
	if (!location) throw error(404, 'Location not found');

	const [wiki, settings, dmProfile] = await Promise.all([
		worlds.wiki.get('LOCATION', location.id),
		platform.getSettingsMap(),
		dms.profiles.getByUserId(locals.user!.id).catch(() => null),
	]);

	const isDMofRegion = dmProfile
		? region.dms.some((d: any) => d.dmProfileId === dmProfile.id)
		: false;

	return {
		world, region, location, wiki,
		showDanger:  settings['world.showDangerRating'] !== 'false',
		showLevel:   settings['world.showLevelRange']   !== 'false',
		canEditWiki: isDMofRegion,
	};
};

export const actions: Actions = {
	saveWiki: async ({ params, request, locals }) => {
		const world = await worlds.getBySlug(params.worldSlug);
		if (!world) return fail(404, { message: 'World not found.' });
		const region = world.regions.find(r => r.slug === params.regionSlug);
		if (!region) return fail(404, { message: 'Region not found.' });
		const location = region.locations.find(l => l.slug === params.locationSlug);
		if (!location) return fail(404, { message: 'Location not found.' });

		const dmProfile = await dms.profiles.getByUserId(locals.user!.id).catch(() => null);
		const isDM = dmProfile ? region.dms.some((d: any) => d.dmProfileId === dmProfile.id) : false;
		if (!isDM) return fail(403, { message: 'You are not assigned to this region.' });

		const data    = await request.formData();
		const title   = data.get('title')?.toString().trim()   ?? '';
		const content = data.get('content')?.toString().trim() ?? '';
		if (!title) return fail(400, { message: 'Title is required.' });

		try {
			await worlds.wiki.upsert('LOCATION', location.id, title, content, locals.user!.id);
			return { wikiSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};