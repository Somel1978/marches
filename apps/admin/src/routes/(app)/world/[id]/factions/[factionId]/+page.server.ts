// apps/admin/src/routes/(app)/world/[id]/factions/[factionId]/+page.server.ts
import { fail, error, redirect } from '@sveltejs/kit';
import { factions, worlds, characters } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

function str(data: FormData, key: string): string | null {
	const v = data.get(key)?.toString().trim();
	return v ? v : null;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const [world, faction, allFactions, allCharacters, worldPlotQuests] = await Promise.all([
		worlds.getById(params.id),
		factions.getById(params.factionId),
		factions.getByWorld(params.id),
		characters.getAll({ perPage: 500 }),
		worlds.plotQuests.listByWorld(params.id),
	]);
	if (!world) throw error(404, 'World not found');
	if (!faction || faction.worldId !== params.id) throw error(404, 'Faction not found');

	return {
		world,
		faction,
		otherFactions: (allFactions as any[]).filter((f) => f.id !== faction.id),
		allCharacters: (allCharacters as any).items ?? [],
		worldPlotQuests,
	};
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		try {
			await factions.update(params.factionId, {
				name:           data.get('name')?.toString().trim() || undefined,
				designation:    str(data, 'designation'),
				heraldryUrl:    str(data, 'heraldryUrl'),
				primaryColors:  str(data, 'primaryColors'),
				motto:          str(data, 'motto'),
				powerTier:      data.get('powerTier')?.toString() || undefined,
				lore:           str(data, 'lore'),
				ideals:         str(data, 'ideals'),
				taboos:         str(data, 'taboos'),
				inductionHooks: str(data, 'inductionHooks'),
				secrets:        str(data, 'secrets'),
				bounties:       str(data, 'bounties'),
				isVisible:      data.get('isVisible') === 'true',
			}, locals.user!.id);
			return { updateSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	delete: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		try {
			await factions.delete(params.factionId, locals.user!.id);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
		throw redirect(303, `/world/${params.id}/factions`);
	},

	// ── Ranks ──────────────────────────────────────────────────────────────
	createRank: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const name = data.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { message: 'Rank name is required.' });
		const renownRequired = data.get('renownRequired')?.toString();
		try {
			await factions.ranks.create(params.factionId, {
				name,
				level:          Number(data.get('level')?.toString() || '1'),
				description:    str(data, 'description'),
				renownRequired: renownRequired ? Number(renownRequired) : null,
			}, locals.user!.id);
			return { rankSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateRank: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data   = await request.formData();
		const rankId = data.get('rankId')?.toString() ?? '';
		if (!rankId) return fail(400, { message: 'Rank required.' });
		const renownRequired = data.get('renownRequired')?.toString();
		try {
			await factions.ranks.update(rankId, {
				name:           data.get('name')?.toString().trim() || undefined,
				level:          Number(data.get('level')?.toString() || '1'),
				description:    str(data, 'description'),
				renownRequired: renownRequired ? Number(renownRequired) : null,
			}, locals.user!.id);
			return { rankSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	deleteRank: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data   = await request.formData();
		const rankId = data.get('rankId')?.toString() ?? '';
		if (!rankId) return fail(400, { message: 'Rank required.' });
		try {
			await factions.ranks.delete(rankId, locals.user!.id);
			return { rankSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	// ── Territories ────────────────────────────────────────────────────────
	addTerritory: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		// value format: "REGION:id" or "LOCATION:id"
		const target = data.get('target')?.toString() ?? '';
		const [entityType, entityId] = target.split(':');
		if (entityType !== 'REGION' && entityType !== 'LOCATION') return fail(400, { message: 'Territory required.' });
		if (!entityId) return fail(400, { message: 'Territory required.' });
		try {
			await factions.territories.add(params.factionId, {
				entityType: entityType as 'REGION' | 'LOCATION',
				entityId,
				notes: str(data, 'notes'),
			}, locals.user!.id);
			return { territorySuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	removeTerritory: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const territoryId = data.get('territoryId')?.toString() ?? '';
		if (!territoryId) return fail(400, { message: 'Territory required.' });
		try {
			await factions.territories.remove(territoryId, locals.user!.id);
			return { territorySuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	// ── Relations ──────────────────────────────────────────────────────────
	setRelation: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data            = await request.formData();
		const targetFactionId = data.get('targetFactionId')?.toString() ?? '';
		const type            = data.get('type')?.toString() ?? '';
		if (!targetFactionId) return fail(400, { message: 'Target faction required.' });
		if (type !== 'RIVAL' && type !== 'ALLY') return fail(400, { message: 'Relation type required.' });
		try {
			await factions.relations.set(params.factionId, targetFactionId, {
				type: type as 'RIVAL' | 'ALLY',
				notes: str(data, 'notes'),
			}, locals.user!.id);
			return { relationSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	removeRelation: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data       = await request.formData();
		const relationId = data.get('relationId')?.toString() ?? '';
		if (!relationId) return fail(400, { message: 'Relation required.' });
		try {
			await factions.relations.remove(relationId, locals.user!.id);
			return { relationSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	// ── Renown ─────────────────────────────────────────────────────────────
	setRenown: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const characterId = data.get('characterId')?.toString() ?? '';
		const value       = Number(data.get('value')?.toString() ?? '');
		if (!characterId) return fail(400, { message: 'Character required.' });
		if (!Number.isFinite(value)) return fail(400, { message: 'Renown value required.' });
		try {
			await factions.renown.set(params.factionId, characterId, value, str(data, 'note'), locals.user!.id);
			return { renownSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	removeRenown: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const characterId = data.get('characterId')?.toString() ?? '';
		if (!characterId) return fail(400, { message: 'Character required.' });
		try {
			await factions.renown.remove(params.factionId, characterId, locals.user!.id);
			return { renownSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	// ── Plot quest links ───────────────────────────────────────────────────
	addQuest: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const plotQuestId = data.get('plotQuestId')?.toString() ?? '';
		if (!plotQuestId) return fail(400, { message: 'Plot quest required.' });
		try {
			await factions.questLinks.add(params.factionId, plotQuestId, locals.user!.id);
			return { questSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	removeQuest: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'World', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data   = await request.formData();
		const linkId = data.get('linkId')?.toString() ?? '';
		if (!linkId) return fail(400, { message: 'Plot quest link required.' });
		try {
			await factions.questLinks.remove(linkId, locals.user!.id);
			return { questSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
