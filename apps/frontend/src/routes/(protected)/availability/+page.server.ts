// apps/frontend/src/routes/(protected)/availability/+page.server.ts
import { fail } from '@sveltejs/kit';
import { availability, worlds } from '@core/database';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const weekParam = url.searchParams.get('week');
	const baseDate  = weekParam ? new Date(weekParam) : new Date();
	const dow  = baseDate.getDay();
	const diff = dow === 0 ? -6 : 1 - dow;
	const weekStart = new Date(baseDate);
	weekStart.setDate(baseDate.getDate() + diff);
	weekStart.setHours(0, 0, 0, 0);
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekStart.getDate() + 6);
	weekEnd.setHours(23, 59, 59, 999);

	const [slots, allWorlds] = await Promise.all([
		availability.getForUser(locals.user!.id, weekStart, weekEnd),
		worlds.getAll(),
	]);

	return { slots, allWorlds, weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString() };
};

export const actions: Actions = {
	// Save or update a single slot
	setSlot: async ({ request, locals }) => {
		const data     = await request.formData();
		const dateStr  = data.get('date')?.toString() ?? '';
		const slot     = Number(data.get('slot') ?? -1);
		const scope    = (data.get('scope')?.toString() ?? 'GLOBAL') as 'GLOBAL' | 'WORLD';
		const worldIds = data.getAll('worldIds').map(v => v.toString());

		if (!dateStr || slot < 0 || slot > 47) return fail(400, { message: 'Invalid slot.' });
		if (scope === 'WORLD' && !worldIds.length) return fail(400, { message: 'Select at least one world.' });

		await availability.setSlots(locals.user!.id, new Date(dateStr), [slot], scope, worldIds);
		return { success: true };
	},

	// Remove a single slot
	clearSlot: async ({ request, locals }) => {
		const data    = await request.formData();
		const dateStr = data.get('date')?.toString() ?? '';
		const slot    = Number(data.get('slot') ?? -1);
		if (!dateStr || slot < 0) return fail(400, { message: 'Invalid slot.' });
		await availability.clearSlot(locals.user!.id, new Date(dateStr), slot);
		return { success: true };
	},

	// Clear entire day
	clearDay: async ({ request, locals }) => {
		const data    = await request.formData();
		const dateStr = data.get('date')?.toString() ?? '';
		if (!dateStr) return fail(400, { message: 'Date required.' });
		await availability.clearDay(locals.user!.id, new Date(dateStr));
		return { success: true };
	},
};