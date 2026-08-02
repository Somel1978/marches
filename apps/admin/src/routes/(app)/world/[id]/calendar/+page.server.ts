// apps/admin/src/routes/(app)/world/[id]/calendar/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { worlds } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const world = await worlds.getById(params.id);
	if (!world) throw error(404, 'World not found');
	const calendar = await worlds.calendar.ensure(params.id);
	return { world, calendar, canEdit: true };
};

export const actions: Actions = {
	save: async ({ params, request, locals }) => {
		const data = await request.formData();
		const raw = data.get('payload')?.toString();
		if (!raw) return fail(400, { message: 'Missing calendar payload.' });
		try {
			const payload = JSON.parse(raw);
			await worlds.calendar.save(params.id, payload, locals.user!.id);
			return { ok: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
