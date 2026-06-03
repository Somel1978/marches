// apps/admin/src/routes/(app)/characters/[id]/+page.server.ts
import { fail, error, redirect } from '@sveltejs/kit';
import { characters, worlds, achievements, users, gameSystems } from '@core/database';
import { loadDnd5eCharacterData } from './_loaders/dnd5e.server.ts';
import { adminDnd5eActions } from './_sheets/dnd5e.actions.server.ts';
import { assertRecordPermission, checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const character = await characters.getById(params.id);
	if (!character) throw error(404, 'Character not found');

	try {
		assertRecordPermission(locals.permissions, 'Character', 'read', character.userId, locals.user!.id);
	} catch (e) {
		if (isMarchesError(e)) throw error(e.statusCode, e.message);
		throw e;
	}

	await characters.checkRest(params.id);

	const [owner, transactions, gameSystem, inventory, charAchievements, allWorlds] = await Promise.all([
		users.getById(character.userId),
		characters.getTransactions(params.id, 50),
		gameSystems.getById(character.gameSystemId),
		characters.getInventory(params.id),
		achievements.getForCharacter(params.id),
		worlds.getAll(),
	]);

	const slug = (gameSystem as any)?.slug ?? '';
	let systemSpecific: Record<string, any> = {};
	if (slug === 'dnd5e') {
		systemSpecific = await loadDnd5eCharacterData(params.id, character.gameSystemId);
	}

	return { character, charAchievements, allWorlds, owner, transactions, gameSystem, inventory, ...systemSpecific };
};

export const actions: Actions = {
	approve: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		try {
			await characters.dispatchApprove(params.id, locals.user!.id);
			return { approveSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	reject: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const note = data.get('note')?.toString().trim() ?? '';
		if (!note) return fail(400, { message: 'Rejection reason is required.' });
		try {
			const { dnd5e } = await import('@core/database');
			await characters.dispatchReject(params.id, note, locals.user!.id);
			return { rejectSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateCharacter: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data         = await request.formData();
		const name         = data.get('name')?.toString().trim()        ?? '';
		const speciesId    = data.get('speciesId')?.toString()           || null;
		const backgroundId = data.get('backgroundId')?.toString()        || null;
		const avatarUrl    = data.get('avatarUrl')?.toString().trim()   || null;
		const portraitUrl  = data.get('portraitUrl')?.toString().trim() || null;
		const description  = data.get('description')?.toString().trim() || null;
		const worldId      = data.get('worldId')?.toString()            || null;
		const isGlobal     = data.get('isGlobal') === 'true';
		if (!name) return fail(400, { message: 'Name is required.' });
		try {
			await characters.update(params.id, { name, avatarUrl, portraitUrl, description, worldId, isGlobal }, locals.user!.id);
			if (speciesId !== undefined || backgroundId !== undefined) {
				const { dnd5e } = await import('@core/database');
				await dnd5e.updateFields(params.id, { speciesId: speciesId ?? undefined, backgroundId: backgroundId ?? undefined }, locals.user!.id);
			}
			return { updateSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},


	updateStatus: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data   = await request.formData();
		const status = data.get('status')?.toString() ?? '';
		const note   = data.get('note')?.toString().trim() ?? '';
		if (!status) return fail(400, { message: 'Status is required.' });
		try {
			await characters.updateStatus(params.id, status as any, 'ADMIN', note || undefined, locals.user!.id);
			return { statusSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	adjustCurrency: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data  = await request.formData();
		const type  = data.get('type')?.toString()  ?? '';
		const delta = Number(data.get('delta') ?? 0);
		const note  = data.get('note')?.toString().trim() ?? '';
		if (!type)       return fail(400, { message: 'Currency type is required.' });
		if (!note)       return fail(400, { message: 'Note is required.' });
		if (delta === 0) return fail(400, { message: 'Delta cannot be zero.' });
		try {
			await characters.adjustCurrency(params.id, type as any, delta, note, locals.user!.id);
			return { currencySuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},


	removeInventory: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const inventoryId = data.get('inventoryId')?.toString() ?? '';
		const quantity    = Number(data.get('quantity') ?? 1);
		try {
			await characters.removeInventory(inventoryId, quantity, locals.user!.id, 'Admin removal');
			return { inventorySuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	deleteCharacter: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		try {
			await characters.delete(params.id, locals.user!.id);
			redirect(302, '/characters');
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	// ── dnd5e direct-save actions ────────────────────────────────────────────
	updateSheet:       adminDnd5eActions.updateSheet,
	addFeat:           adminDnd5eActions.addFeat,
	removeFeat:        adminDnd5eActions.removeFeat,
	saveAbilityScores: adminDnd5eActions.saveAbilityScores,
};