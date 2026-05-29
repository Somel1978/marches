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

	const [mySlots, allSlots, allWorlds] = await Promise.all([
		availability.getForUser(locals.user!.id, weekStart, weekEnd),
		availability.getAll(weekStart, weekEnd),
		worlds.getAll(),
	]);

	// Aggregate heatmap: "dayIdx:slotIdx" -> count  (Mon=0 … Sun=6)
	const heatmapData: Record<string, number> = {};
	const uniquePlayers = new Set<string>();

	for (const s of allSlots) {
		const d   = new Date(s.date);
		const dow = d.getDay();
		const dayIdx = dow === 0 ? 6 : dow - 1;
		const key = `${dayIdx}:${s.slot}`;
		heatmapData[key] = (heatmapData[key] ?? 0) + 1;
		uniquePlayers.add(s.userId);
	}

	// User's own slots: "dayIdx:slotIdx" -> { date, scope, worldIds }
	const mySlotMap: Record<string, { date: string; scope: string; worldIds: string[] }> = {};
	for (const s of mySlots) {
		const d   = new Date(s.date);
		const dow = d.getDay();
		const dayIdx = dow === 0 ? 6 : dow - 1;
		mySlotMap[`${dayIdx}:${s.slot}`] = {
			date:     d.toISOString().split('T')[0],
			scope:    s.scope,
			worldIds: s.worldIds as string[],
		};
	}

	return {
		heatmapData,
		mySlotMap,
		totalPlayers: uniquePlayers.size,
		allWorlds,
		weekStart: weekStart.toISOString(),
		weekEnd:   weekEnd.toISOString(),
	};
};

export const actions: Actions = {
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
	clearSlot: async ({ request, locals }) => {
		const data    = await request.formData();
		const dateStr = data.get('date')?.toString() ?? '';
		const slot    = Number(data.get('slot') ?? -1);
		if (!dateStr || slot < 0) return fail(400, { message: 'Invalid slot.' });
		await availability.clearSlot(locals.user!.id, new Date(dateStr), slot);
		return { success: true };
	},
	setSlots: async ({ request, locals }) => {
		const data     = await request.formData();
		const dates    = data.getAll('dates').map(v => v.toString());
		const slots    = data.getAll('slots').map(v => Number(v));
		const scope    = (data.get('scope')?.toString() ?? 'GLOBAL') as 'GLOBAL' | 'WORLD';
		const worldIds = data.getAll('worldIds').map(v => v.toString());
		if (!dates.length) return fail(400, { message: 'No slots provided.' });
		if (scope === 'WORLD' && !worldIds.length) return fail(400, { message: 'Select at least one world.' });
		// Group by date
		const byDate: Record<string, number[]> = {};
		for (let i = 0; i < dates.length; i++) {
			const d = dates[i];
			if (!byDate[d]) byDate[d] = [];
			byDate[d].push(slots[i]);
		}
		for (const [date, slotArr] of Object.entries(byDate)) {
			await availability.setSlots(locals.user!.id, new Date(date), slotArr, scope, worldIds);
		}
		return { success: true };
	},
	clearDay: async ({ request, locals }) => {
		const data    = await request.formData();
		const dateStr = data.get('date')?.toString() ?? '';
		if (!dateStr) return fail(400, { message: 'Date required.' });
		await availability.clearDay(locals.user!.id, new Date(dateStr));
		return { success: true };
	},
};