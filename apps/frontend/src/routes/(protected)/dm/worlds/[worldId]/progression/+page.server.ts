// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/progression/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { worlds, gameSystems, db } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

async function assertCanManage(worldId: string, userId: string) {
	const profile = await db.dMProfile.findFirst({ where: { userId }, select: { id: true } });
	if (!profile) return false;
	const a = await db.worldDM.findUnique({
		where:  { worldId_dmProfileId: { worldId, dmProfileId: profile.id } },
		select: { canManage: true },
	});
	return a?.canManage === true;
}

export const load: PageServerLoad = async ({ params, parent }) => {
	const { canManage, world } = await parent();
	if (!canManage) throw error(403, 'You do not have management access to this world.');

	const [activeSystems, overrides, homeCharacterCount] = await Promise.all([
		gameSystems.getActive(),
		worlds.progression.getOverrides(params.worldId),
		worlds.progression.countHomeCharacters(params.worldId),
	]);
	const gameSystem = activeSystems[0] ?? null;
	const systemThresholds = ((gameSystem as any)?.progressionThresholds ?? []).slice()
		.sort((a: any, b: any) => a.xpRequired - b.xpRequired);

	return {
		world,
		canManage,
		gameSystem,
		systemThresholds,
		overrides,
		homeCharacterCount,
		progressionMode: (world as any).progressionMode ?? null,
	};
};

export const actions: Actions = {
	saveProgressionOverrides: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) {
			return fail(403, { message: 'Forbidden' });
		}
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
			const result = await worlds.progression.upsertOverrides(
				params.worldId, rows, locals.user!.id,
			);
			return { progressionSuccess: true, ...result };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateProgressionMode: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) {
			return fail(403, { message: 'Forbidden' });
		}
		const data = await request.formData();
		const modeRaw = data.get('progressionMode')?.toString() ?? '';
		try {
			await worlds.update(params.worldId, {
				progressionMode: modeRaw === 'XP' || modeRaw === 'MILESTONE' ? modeRaw : null,
			}, locals.user!.id);
			return { modeSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};
