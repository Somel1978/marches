// apps/admin/src/routes/(app)/characters/[id]/+page.server.ts
import { fail, error, redirect } from '@sveltejs/kit';
import { characters, worlds, achievements, users, gameSystems, dnd5e } from '@core/database';
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

	const [owner, transactions, gameSystem, systemData, inventory, charAchievements, allWorlds] = await Promise.all([
		users.getById(character.userId),
		characters.getTransactions(params.id, 50),
		gameSystems.getById(character.gameSystemId),
		dnd5e.getSystemData(character.gameSystemId),
		characters.getInventory(params.id),
		achievements.getForCharacter(params.id),
		worlds.getAll(),
	]);

	return { character, charAchievements, allWorlds, owner, transactions, gameSystem, systemData, inventory };
};

export const actions: Actions = {
	approve: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		try {
			await characters.approve(params.id, locals.user!.id);
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
			await characters.reject(params.id, note, locals.user!.id);
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
			await characters.update(params.id, { name, speciesId, backgroundId, avatarUrl, portraitUrl, description, worldId, isGlobal }, locals.user!.id);
			return { updateSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateClasses: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data     = await request.formData();
		const classIds    = data.getAll('classId').map(v => v.toString());
		const subclassIds = data.getAll('subclassId').map(v => v.toString());
		const levels      = data.getAll('allocatedLevel').map(v => Number(v));
		const classes     = classIds.map((classId, i) => ({
			classId,
			subclassId:     subclassIds[i]?.trim() || null,
			allocatedLevel: levels[i] ?? 1,
		})).filter(c => c.classId);
		if (!classes.length) return fail(400, { message: 'At least one class is required.' });
		try {
			await characters.updateClasses(params.id, classes, locals.user!.id);
			return { classesSuccess: true };
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
		if (!type)   return fail(400, { message: 'Currency type is required.' });
		if (!note)   return fail(400, { message: 'Note is required.' });
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
};