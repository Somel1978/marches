// apps/admin/src/routes/(app)/world/[id]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { worlds, dms, tavern, gameSystems } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');
	const [world, allDMs, activeSystems, overrides, homeCharacterCount] = await Promise.all([
		worlds.getById(params.id),
		dms.profiles.getAll(),
		gameSystems.getActive(),
		worlds.progression.getOverrides(params.id),
		worlds.progression.countHomeCharacters(params.id),
	]);
	if (!world) throw error(404, 'World not found');
	// Ensure tavern channel exists — creates it for worlds that pre-date the tavern feature
	await tavern.channels.ensureWorld(params.id, world.name);
	const tavernChannel = await tavern.channels.getByWorldId(params.id);
	const gameSystem = activeSystems[0] ?? null;
	const systemThresholds = ((gameSystem as any)?.progressionThresholds ?? []).slice()
		.sort((a: any, b: any) => a.xpRequired - b.xpRequired);
	return {
		world, allDMs, tavernChannel,
		gameSystem, systemThresholds, overrides, homeCharacterCount,
	};
};

export const actions: Actions = {
	updateWorld: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const modeRaw = data.get('progressionMode')?.toString() ?? '';
		try {
			await worlds.update(params.id, {
				name:                    data.get('name')?.toString().trim()        || undefined,
				description:             data.get('description')?.toString().trim() || null,
				mapImageUrl:             data.get('mapImageUrl')?.toString().trim() || null,
				isActive:                data.get('isActive') === 'true',
				acceptsGlobalCharacters: data.get('acceptsGlobalCharacters') !== 'false',
				progressionMode:         modeRaw === 'XP' || modeRaw === 'MILESTONE' ? modeRaw : null,
			}, locals.user!.id);
			return { worldSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	assignDM: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const dmProfileId = data.get('dmProfileId')?.toString() ?? '';
		const canManage   = data.get('canManage') === 'true';
		try {
			await worlds.assignDM(params.id, dmProfileId, locals.user!.id, canManage);
			return { dmSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateDMPermission: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const dmProfileId = data.get('dmProfileId')?.toString() ?? '';
		const canManage   = data.get('canManage') === 'true';
		try {
			await worlds.updateDMPermission(params.id, dmProfileId, canManage);
			return { dmSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	removeDM: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const dmProfileId = data.get('dmProfileId')?.toString() ?? '';
		try {
			await worlds.removeDM(params.id, dmProfileId, locals.user!.id);
			return { dmSuccess: true };
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

	saveProgressionOverrides: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const ids = data.getAll('thresholdId').map(String);
		const xps = data.getAll('xpRequired').map(v => v.toString().trim());
		const mss = data.getAll('milestoneRequired').map(v => v.toString().trim());
		const rows = ids.map((thresholdId, i) => ({
			thresholdId,
			xpRequired:        xps[i] === '' ? null : Number(xps[i]),
			milestoneRequired: mss[i] === '' ? null : Number(mss[i]),
		}));
		try {
			const result = await worlds.progression.upsertOverrides(params.id, rows, locals.user!.id);
			return { progressionSuccess: true, ...result };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateTavernChannel: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data      = await request.formData();
		const isPrivate = data.get('isPrivate') === 'true';
		const channel   = await tavern.channels.getByWorldId(params.id);
		if (!channel) {
			const world = await worlds.getById(params.id);
			await tavern.channels.ensureWorld(params.id, world?.name ?? 'World');
		}
		const ch = await tavern.channels.getByWorldId(params.id);
		if (ch) await tavern.channels.update(ch.id, { isPrivate });
		return { tavernSuccess: true };
	},
};