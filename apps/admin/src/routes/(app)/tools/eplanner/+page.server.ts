// apps/admin/src/routes/(app)/tools/eplanner/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { gameSystems, dnd5e } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

async function resolveDnd5e() {
	const systems = await gameSystems.getAll();
	const gs = systems.find(s => s.slug === 'dnd5e');
	if (!gs) throw error(404, 'D&D 5e game system not found');
	return gs;
}

export const load: PageServerLoad = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const gs  = await resolveDnd5e();
	const cfg = await dnd5e.encounterPlanner.getConfig(gs.id);
	return { system: { id: gs.id, name: gs.name }, config: cfg };
};

function requireUpdate(locals: App.Locals) {
	const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
	if (!can.allowed) return fail(403, { message: 'Forbidden' });
	return null;
}

export const actions: Actions = {
	// Bulk-save all CR→XP rows (inputs named xp__<cr>)
	saveXp: async ({ request, locals }) => {
		const denied = requireUpdate(locals); if (denied) return denied;
		const gs   = await resolveDnd5e();
		const data = await request.formData();
		try {
			for (const [key, value] of data.entries()) {
				if (!key.startsWith('xp__')) continue;
				const cr = Number(key.slice('xp__'.length));
				const xp = Number(value);
				if (!Number.isFinite(cr) || !Number.isFinite(xp) || xp < 0) continue;
				await dnd5e.encounterPlanner.upsertXp({ gameSystemId: gs.id, cr, xp: Math.round(xp) }, locals.user!.id);
			}
			return { success: true, section: 'xp' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	addXp: async ({ request, locals }) => {
		const denied = requireUpdate(locals); if (denied) return denied;
		const gs   = await resolveDnd5e();
		const data = await request.formData();
		const cr = Number(data.get('cr'));
		const xp = Number(data.get('xp'));
		if (!Number.isFinite(cr) || cr < 0 || !Number.isFinite(xp) || xp < 0) {
			return fail(400, { message: 'CR and XP must be non-negative numbers.' });
		}
		await dnd5e.encounterPlanner.upsertXp({ gameSystemId: gs.id, cr, xp: Math.round(xp) }, locals.user!.id);
		return { success: true, section: 'xp' };
	},

	deleteXp: async ({ request, locals }) => {
		const denied = requireUpdate(locals); if (denied) return denied;
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { message: 'Missing row id.' });
		await dnd5e.encounterPlanner.deleteXp(id, locals.user!.id);
		return { success: true, section: 'xp' };
	},

	// Bulk-save level thresholds (inputs low__<level>, mod__<level>, high__<level>)
	saveThresholds: async ({ request, locals }) => {
		const denied = requireUpdate(locals); if (denied) return denied;
		const gs   = await resolveDnd5e();
		const data = await request.formData();
		try {
			for (let level = 1; level <= 20; level++) {
				const low      = Number(data.get(`low__${level}`));
				const moderate = Number(data.get(`mod__${level}`));
				const high     = Number(data.get(`high__${level}`));
				if (![low, moderate, high].every(n => Number.isFinite(n) && n >= 0)) continue;
				await dnd5e.encounterPlanner.upsertLevelThreshold(
					{ gameSystemId: gs.id, level, low: Math.round(low), moderate: Math.round(moderate), high: Math.round(high) },
					locals.user!.id,
				);
			}
			return { success: true, section: 'thresholds' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	// Bulk-save multipliers (inputs mult__<minCount>)
	saveMultipliers: async ({ request, locals }) => {
		const denied = requireUpdate(locals); if (denied) return denied;
		const gs   = await resolveDnd5e();
		const data = await request.formData();
		try {
			for (const [key, value] of data.entries()) {
				if (!key.startsWith('mult__')) continue;
				const minCount   = Number(key.slice('mult__'.length));
				const multiplier = Number(value);
				if (!Number.isInteger(minCount) || minCount < 1 || !Number.isFinite(multiplier) || multiplier <= 0) continue;
				await dnd5e.encounterPlanner.upsertMultiplier({ gameSystemId: gs.id, minCount, multiplier }, locals.user!.id);
			}
			return { success: true, section: 'multipliers' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	addMultiplier: async ({ request, locals }) => {
		const denied = requireUpdate(locals); if (denied) return denied;
		const gs   = await resolveDnd5e();
		const data = await request.formData();
		const minCount   = Number(data.get('minCount'));
		const multiplier = Number(data.get('multiplier'));
		if (!Number.isInteger(minCount) || minCount < 1 || !Number.isFinite(multiplier) || multiplier <= 0) {
			return fail(400, { message: 'Min count must be a positive integer and multiplier a positive number.' });
		}
		await dnd5e.encounterPlanner.upsertMultiplier({ gameSystemId: gs.id, minCount, multiplier }, locals.user!.id);
		return { success: true, section: 'multipliers' };
	},

	deleteMultiplier: async ({ request, locals }) => {
		const denied = requireUpdate(locals); if (denied) return denied;
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { message: 'Missing row id.' });
		await dnd5e.encounterPlanner.deleteMultiplier(id, locals.user!.id);
		return { success: true, section: 'multipliers' };
	},

	saveConfig: async ({ request, locals }) => {
		const denied = requireUpdate(locals); if (denied) return denied;
		const gs   = await resolveDnd5e();
		const data = await request.formData();
		const num = (key: string) => Number(data.get(key));
		const input = {
			gameSystemId:           gs.id,
			moderateRatio:          num('moderateRatio'),
			highRatio:              num('highRatio'),
			extremeRatio:           num('extremeRatio'),
			rewardGpRate:           num('rewardGpRate'),
			adventureDayMultiplier: num('adventureDayMultiplier'),
		};
		if (!Object.values(input).every(v => typeof v === 'string' || (Number.isFinite(v) && v >= 0))) {
			return fail(400, { message: 'All config values must be non-negative numbers.' });
		}
		await dnd5e.encounterPlanner.updateConfig(input, locals.user!.id);
		return { success: true, section: 'config' };
	},

	reset: async ({ locals }) => {
		const denied = requireUpdate(locals); if (denied) return denied;
		const gs = await resolveDnd5e();
		await dnd5e.encounterPlanner.reset(gs.id, locals.user!.id);
		return { success: true, section: 'reset' };
	},
};
