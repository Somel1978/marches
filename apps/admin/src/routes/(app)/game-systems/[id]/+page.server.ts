// apps/admin/src/routes/(app)/game-systems/[id]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { gameSystems } from '@core/database';
import { assertRecordPermission, checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const gs = await gameSystems.getById(params.id);
	if (!gs) throw error(404, 'Game system not found');

	try {
		assertRecordPermission(locals.permissions, 'GameSystem', 'read', gs.id, locals.user!.id);
	} catch (e) {
		if (isMarchesError(e)) throw error(e.statusCode, e.message);
		throw e;
	}

	return { gs };
};

export const actions: Actions = {
	updateSystem: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data        = await request.formData();
		const name        = data.get('name')?.toString().trim()        ?? '';
		const description = data.get('description')?.toString().trim() ?? '';
		const isAvailable = data.get('isAvailable') === 'true';

		if (!name) return fail(400, { message: 'Name is required.' });

		try {
			await gameSystems.update(params.id, { name, description: description || undefined, isAvailable }, locals.user!.id);
			return { systemSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	addClass: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data        = await request.formData();
		const name        = data.get('className')?.toString().trim()        ?? '';
		const description = data.get('classDescription')?.toString().trim() ?? '';
		const source      = data.get('classSource')?.toString().trim()      ?? '';
		const link        = data.get('classLink')?.toString().trim()        ?? '';

		if (!name) return fail(400, { message: 'Class name is required.' });

		try {
			await gameSystems.classes.create({
				gameSystemId: params.id,
				name,
				description: description || undefined,
				source:      source      || undefined,
				link:        link        || undefined,
			}, locals.user!.id);
			return { classSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateClass: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data        = await request.formData();
		const classId     = data.get('classId')?.toString()                ?? '';
		const name        = data.get('className')?.toString().trim()        ?? '';
		const description = data.get('classDescription')?.toString().trim() ?? '';
		const source      = data.get('classSource')?.toString().trim()      ?? '';
		const link        = data.get('classLink')?.toString().trim()        ?? '';
		const isAvailable = data.get('isAvailable') === 'true';

		if (!name) return fail(400, { message: 'Class name is required.' });

		try {
			await gameSystems.classes.update(classId, {
				name,
				description: description || undefined,
				source:      source      || undefined,
				link:        link        || undefined,
				isAvailable,
			}, locals.user!.id);
			return { classSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	deleteClass: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data    = await request.formData();
		const classId = data.get('classId')?.toString() ?? '';

		try {
			await gameSystems.classes.delete(classId, locals.user!.id);
			return { classSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	addSubclass: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data        = await request.formData();
		const classId     = data.get('classId')?.toString()                     ?? '';
		const name        = data.get('subclassName')?.toString().trim()         ?? '';
		const description = data.get('subclassDescription')?.toString().trim()  ?? '';
		const source      = data.get('subclassSource')?.toString().trim()       ?? '';
		const link        = data.get('subclassLink')?.toString().trim()         ?? '';

		if (!name) return fail(400, { message: 'Subclass name is required.' });

		try {
			await gameSystems.subclasses.create({
				classId,
				name,
				description: description || undefined,
				source:      source      || undefined,
				link:        link        || undefined,
			}, locals.user!.id);
			return { subclassSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateSubclass: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data        = await request.formData();
		const subclassId  = data.get('subclassId')?.toString()                  ?? '';
		const name        = data.get('subclassName')?.toString().trim()         ?? '';
		const description = data.get('subclassDescription')?.toString().trim()  ?? '';
		const source      = data.get('subclassSource')?.toString().trim()       ?? '';
		const link        = data.get('subclassLink')?.toString().trim()         ?? '';
		const isAvailable = data.get('isAvailable') === 'true';

		if (!name) return fail(400, { message: 'Subclass name is required.' });

		try {
			await gameSystems.subclasses.update(subclassId, {
				name,
				description: description || undefined,
				source:      source      || undefined,
				link:        link        || undefined,
				isAvailable,
			}, locals.user!.id);
			return { subclassSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	deleteSubclass: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data       = await request.formData();
		const subclassId = data.get('subclassId')?.toString() ?? '';

		try {
			await gameSystems.subclasses.delete(subclassId, locals.user!.id);
			return { subclassSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	addThreshold: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data        = await request.formData();
		const label       = data.get('label')?.toString().trim()              ?? '';
		const xpRequired  = Number(data.get('xpRequired') ?? 0);
		const description = data.get('thresholdDescription')?.toString().trim() ?? '';

		if (!label)            return fail(400, { message: 'Label is required.' });
		if (isNaN(xpRequired)) return fail(400, { message: 'XP required must be a number.' });

		try {
			await gameSystems.progression.create({
				gameSystemId: params.id, label, xpRequired,
				description: description || undefined,
			}, locals.user!.id);
			return { thresholdSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateThreshold: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data        = await request.formData();
		const thresholdId = data.get('thresholdId')?.toString()               ?? '';
		const label       = data.get('label')?.toString().trim()              ?? '';
		const xpRequired  = Number(data.get('xpRequired') ?? 0);
		const description = data.get('thresholdDescription')?.toString().trim() ?? '';

		if (!label)            return fail(400, { message: 'Label is required.' });
		if (isNaN(xpRequired)) return fail(400, { message: 'XP required must be a number.' });

		try {
			await gameSystems.progression.update(thresholdId, {
				label, xpRequired, description: description || undefined,
			}, locals.user!.id);
			return { thresholdSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	deleteThreshold: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data        = await request.formData();
		const thresholdId = data.get('thresholdId')?.toString() ?? '';

		try {
			await gameSystems.progression.delete(thresholdId, locals.user!.id);
			return { thresholdSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	addSpecies: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data        = await request.formData();
		const name        = data.get('speciesName')?.toString().trim()        ?? '';
		const description = data.get('speciesDescription')?.toString().trim() ?? '';
		const source      = data.get('speciesSource')?.toString().trim()      ?? '';
		const link        = data.get('speciesLink')?.toString().trim()        ?? '';

		if (!name) return fail(400, { message: 'Species name is required.' });

		try {
			await gameSystems.species.create({
				gameSystemId: params.id, name,
				description: description || undefined,
				source:      source      || undefined,
				link:        link        || undefined,
			}, locals.user!.id);
			return { speciesSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateSpecies: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data        = await request.formData();
		const speciesId   = data.get('speciesId')?.toString()                  ?? '';
		const name        = data.get('speciesName')?.toString().trim()         ?? '';
		const description = data.get('speciesDescription')?.toString().trim()  ?? '';
		const source      = data.get('speciesSource')?.toString().trim()       ?? '';
		const link        = data.get('speciesLink')?.toString().trim()         ?? '';
		const isAvailable = data.get('isAvailable') === 'true';

		if (!name) return fail(400, { message: 'Species name is required.' });

		try {
			await gameSystems.species.update(speciesId, {
				name, isAvailable,
				description: description || undefined,
				source:      source      || undefined,
				link:        link        || undefined,
			}, locals.user!.id);
			return { speciesSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	deleteSpecies: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		const data      = await request.formData();
		const speciesId = data.get('speciesId')?.toString() ?? '';

		try {
			await gameSystems.species.delete(speciesId, locals.user!.id);
			return { speciesSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	deleteSystem: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });

		try {
			await gameSystems.delete(params.id, locals.user!.id);
			return { deleted: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};