// apps/frontend/src/routes/(protected)/characters/[id]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { dnd5e, characters, achievements, gameSystems, marketplace, platform, worlds } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const character = await characters.getById(params.id);
	if (!character) throw error(404, 'Character not found.');
	if (character.userId !== locals.user!.id) throw error(403, 'Forbidden');

	await characters.checkRest(params.id);

	const [transactions, gameSystem, systemData, inventory, pendingTx, settings, charAchievements] = await Promise.all([
		characters.getTransactions(params.id, 10),
		gameSystems.getById(character.gameSystemId),
		dnd5e.getSystemData(character.gameSystemId),
		characters.getInventory(params.id),
		marketplace.transactions.getAll({ characterId: params.id, status: 'PENDING' }),
		platform.getSettingsMap(),
		achievements.getForCharacter(params.id),
	]);

	const pendingBuys  = pendingTx.items.filter((t: any) => t.type === 'BUY');
	const pendingSells = pendingTx.items.filter((t: any) => t.type === 'SELL');
	const sellPct      = Number(settings['marketplace.sellPricePercent'] ?? 50);
	const worldId      = (character as any).worldId ?? null;
	const worldName    = worldId ? await worlds.getById(worldId).then((w: any) => w?.name ?? null) : null;

	// Progression thresholds from game system (already included in getById)
	const progressionThresholds = (gameSystem as any)?.progressionThresholds ?? [];

	return {
		character, charAchievements, transactions, gameSystem, systemData,
		inventory, pendingBuys, pendingSells, sellPct, worldName,
		progressionThresholds,
	};
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		const character = await characters.getById(params.id);
		if (!character) return fail(404, { message: 'Character not found.' });
		if (character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });

		const data        = await request.formData();
		const name        = data.get('name')?.toString().trim()        ?? '';
		const avatarUrl   = data.get('avatarUrl')?.toString().trim()   || null;
		const portraitUrl = data.get('portraitUrl')?.toString().trim() || null;
		const description = data.get('description')?.toString().trim() || null;

		if (!name) return fail(400, { message: 'Name is required.' });
		try {
			await characters.updateFreeFields(params.id, { name, avatarUrl, portraitUrl, description }, locals.user!.id);
			return { updateSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	submitChanges: async ({ params, request, locals }) => {
		const character = await characters.getById(params.id);
		if (!character) return fail(404, { message: 'Character not found.' });
		if (character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		if (!['ACTIVE', 'RESTING', 'REJECTED'].includes(character.status)) return fail(400, { message: 'Cannot edit a character that is pending approval.' });

		const data        = await request.formData();
		const speciesId    = data.get('speciesId')?.toString()    || undefined;
		const backgroundId = data.get('backgroundId')?.toString() || undefined;
		const classIds    = data.getAll('classId').map(v => v.toString()).filter(Boolean);
		const subclassIds = data.getAll('subclassId').map(v => v.toString());
		const levels      = data.getAll('allocatedLevel').map(v => Number(v));
		const classes     = classIds.map((classId, i) => ({
			classId,
			subclassId:     subclassIds[i]?.trim() || null,  // empty string → null
			allocatedLevel: levels[i] ?? 1,
		}));

		try {
			if (character.status === 'REJECTED') {
				// For rejected characters: save directly, resubmit button sets PENDING
				await characters.update(params.id, { speciesId, backgroundId }, locals.user!.id);
				if (classes.length) await characters.updateClasses(params.id, classes, locals.user!.id);
				return { changesSubmitted: true };
			}
			await characters.submitChanges(params.id, { speciesId, backgroundId, classes }, locals.user!.id);
			return { changesSubmitted: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	submitLevelUp: async ({ params, request, locals }) => {
		const character = await characters.getById(params.id);
		if (!character) return fail(404, { message: 'Character not found.' });
		if (character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		if (!['ACTIVE','RESTING','PENDING'].includes(character.status)) return fail(400, { message: 'Cannot submit level-up at this time.' });

		const data        = await request.formData();
		const classIds    = data.getAll('classId').map(v => v.toString()).filter(Boolean);
		const subclassIds = data.getAll('subclassId').map(v => v.toString());
		const levels      = data.getAll('allocatedLevel').map(v => Number(v));
		const classes     = classIds.map((classId, i) => ({
			classId,
			subclassId:     subclassIds[i]?.trim() || null,  // empty string → null
			allocatedLevel: levels[i] ?? 1,
		}));
		if (!classes.length) return fail(400, { message: 'No class data provided.' });

		try {
			await characters.submitChanges(params.id, { classes }, locals.user!.id);
			return { levelUpSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	cancel: async ({ request, locals }) => {
		const data = await request.formData();
		const txId = data.get('txId')?.toString() ?? '';
		try {
			await marketplace.transactions.cancel(txId, locals.user!.id);
			return { cancelSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	sell: async ({ params, request, locals }) => {
		const data        = await request.formData();
		const inventoryId = data.get('inventoryId')?.toString() ?? '';
		const quantity    = Number(data.get('quantity') ?? 1);
		try {
			await marketplace.transactions.sell(params.id, inventoryId, quantity, locals.user!.id);
			return { sellSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	resubmit: async ({ params, request, locals }) => {
		const character = await characters.getById(params.id);
		if (!character) return fail(404, { message: 'Character not found.' });
		if (character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		if (character.status !== 'REJECTED') return fail(400, { message: 'Only rejected characters can be resubmitted.' });

		const data        = await request.formData();
		const name        = data.get('name')?.toString().trim()        ?? character.name;
		const avatarUrl   = data.get('avatarUrl')?.toString().trim()   || null;
		const portraitUrl = data.get('portraitUrl')?.toString().trim() || null;
		const description = data.get('description')?.toString().trim() || null;

		try {
			// Update free fields first
			await characters.updateFreeFields(params.id, { name, avatarUrl, portraitUrl, description }, locals.user!.id);
			// Set back to PENDING
			await characters.updateStatus(params.id, 'PENDING', 'NEW_CHARACTER', 'Resubmitted by player', locals.user!.id);
			return { resubmitSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	retire: async ({ params, locals }) => {
		const character = await characters.getById(params.id);
		if (!character) return fail(404, { message: 'Character not found.' });
		if (character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		try {
			await characters.updateStatus(params.id, 'RETIRED', 'ADMIN', 'Retired by player', locals.user!.id);
			return { retireSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};