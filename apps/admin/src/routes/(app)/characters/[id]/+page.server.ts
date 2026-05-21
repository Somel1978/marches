// apps/admin/src/routes/(app)/characters/[id]/+page.server.ts
import { fail, error, redirect } from '@sveltejs/kit';
import { characters, users, gameSystems } from '@core/database';
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

	const [owner, transactions, gameSystem] = await Promise.all([
		users.getById(character.userId),
		characters.getTransactions(params.id, 20),
		gameSystems.getById(character.gameSystemId),
	]);

	const inventory = await characters.getInventory(params.id);
	return { character, owner, transactions, gameSystem, inventory };
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
		const data    = await request.formData();
		const note    = data.get('note')?.toString().trim() ?? '';
		if (!note) return fail(400, { message: 'Rejection reason is required.' });
		try {
			const character = await characters.getById(params.id);
			const isLevelUp = character?.statusReason === 'LEVEL_UP_PENDING';
			await characters.reject(params.id, note, locals.user!.id);
			return { rejectSuccess: true, isLevelUp };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateCharacter: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data        = await request.formData();
		const name        = data.get('name')?.toString().trim()        ?? '';
		const speciesId   = data.get('speciesId')?.toString()          ?? '';
		const avatarUrl   = data.get('avatarUrl')?.toString().trim()   ?? '';
		const portraitUrl = data.get('portraitUrl')?.toString().trim() ?? '';

		if (!name) return fail(400, { message: 'Name is required.' });

		try {
			await characters.update(params.id, {
				name,
				speciesId:   speciesId   || null,
				avatarUrl:   avatarUrl   || undefined,
				portraitUrl: portraitUrl || undefined,
			}, locals.user!.id);
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
		const raw      = data.get('classes')?.toString();
		if (!raw) return fail(400, { message: 'No class data provided.' });

		try {
			const classes = JSON.parse(raw);
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

		if (!type)  return fail(400, { message: 'Currency type is required.' });
		if (!note)  return fail(400, { message: 'Note is required.' });
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