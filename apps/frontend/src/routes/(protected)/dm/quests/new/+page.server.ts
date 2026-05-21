// apps/frontend/src/routes/(protected)/dm/quests/new/+page.server.ts
import { fail, error, redirect } from '@sveltejs/kit';
import { dms, quests, platform, worlds } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'Quest', action: 'create' });
	if (!can.allowed) throw error(403, 'Forbidden');

	const profile = await dms.profiles.getByUserId(locals.user!.id);
	if (!profile) throw error(403, 'DM profile required to create quests.');

	const [settings, allWorlds] = await Promise.all([
		platform.getSettingsMap(),
		worlds.getAll(),
	]);

	return {
		profile,
		allWorlds,
		globalMinCap: Number(settings['quest.minCapacity'] ?? 2),
		globalMaxCap: Number(settings['quest.maxCapacity'] ?? 6),
		dmRules:      profile.rules ?? '',
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const profile = await dms.profiles.getByUserId(locals.user!.id);
		if (!profile) return fail(403, { message: 'DM profile required.' });

		const data        = await request.formData();
		const title       = data.get('title')?.toString().trim()       ?? '';
		const description = data.get('description')?.toString().trim() ?? '';
		const rules       = data.get('rules')?.toString().trim()       ?? '';
		const missionXp   = Number(data.get('missionXp')   ?? 0);
		const minCapacity = Number(data.get('minCapacity') ?? 2);
		const maxCapacity = Number(data.get('maxCapacity') ?? 6);
		const minLevel    = Number(data.get('minLevel')    ?? 1);
		const maxLevel    = Number(data.get('maxLevel')    ?? 20);

		const regionId   = data.get('regionId')?.toString()   || undefined;
		const locationId = data.get('locationId')?.toString() || undefined;

		if (!title) return fail(400, { message: 'Title is required.' });

		// Parse rewards
		const rewardTypes   = data.getAll('rewardType').map(v => v.toString());
		const rewardAmounts = data.getAll('rewardAmount').map(v => Number(v));
		const rewards       = rewardTypes.map((type, i) => ({ type, amount: rewardAmounts[i] ?? 0 })).filter(r => r.type);

		try {
			const quest = await quests.create({
				dmProfileId: profile.id,
				title, description: description || undefined, rules: rules || undefined,
				missionXp, minCapacity, maxCapacity, minLevel, maxLevel, rewards,
				regionId, locationId,
			}, locals.user!.id);
			redirect(302, `/dm/quests/${quest.id}`);
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};