// apps/frontend/src/routes/(protected)/characters/[id]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { dnd5e, characters, achievements, gameSystems, marketplace, platform, worlds } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const character = await characters.getById(params.id);
	if (!character) throw error(404, 'Character not found');
	if (character.userId !== locals.user!.id) throw error(403, 'Forbidden');

	// Lazy rest check
	await characters.checkRest(params.id);

	const [transactions] = await Promise.all([
		characters.getTransactions(params.id, 10),
	]);

	// Load game system with classes and subclasses for class allocation UI
	const [gameSystem, systemData] = await Promise.all([
		gameSystems.getById(character.gameSystemId),
		dnd5e.getSystemData(character.gameSystemId),
	]);

	const [inventory, pendingTx, settings] = await Promise.all([
		characters.getInventory(params.id),
		marketplace.transactions.getAll({ characterId: params.id, status: 'PENDING' }),
		platform.getSettingsMap(),
	]);
	const pendingBuys  = pendingTx.items.filter((t: any) => t.type === 'BUY');
	const pendingSells = pendingTx.items.filter((t: any) => t.type === 'SELL');
	const sellPct = Number(settings['marketplace.sellPricePercent'] ?? 50);
	const charAchievements = await achievements.getForCharacter(params.id);
	// Load world name if character is world-specific
	const worldId = (character as any).worldId ?? null;
	const worldName = worldId ? await worlds.getById(worldId).then((w: any) => w?.name ?? null) : null;

	return { character, charAchievements, transactions, gameSystem, systemData, inventory, pendingBuys, pendingSells, sellPct, worldName };
};

export const actions: Actions = {
	// Free fields — saves immediately
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

	// Structural changes — triggers PENDING_APPROVAL
	submitChanges: async ({ params, request, locals }) => {
		const character = await characters.getById(params.id);
		if (!character) return fail(404, { message: 'Character not found.' });
		if (character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		if (!['ACTIVE', 'RESTING'].includes(character.status)) return fail(400, { message: 'Cannot edit a character that is pending approval or rejected.' });

		const data = await request.formData();
		const speciesId    = data.get('speciesId')?.toString()    || undefined;
		const backgroundId = data.get('backgroundId')?.toString() || undefined;

		const classIds    = data.getAll('classId').map(v => v.toString()).filter(Boolean);
		const subclassIds = data.getAll('subclassId').map(v => v.toString());
		const levels      = data.getAll('allocatedLevel').map(v => Number(v));
		const classes     = classIds.map((classId, i) => ({
			classId,
			subclassId:     subclassIds[i] || null,
			allocatedLevel: levels[i] ?? 1,
		}));

		try {
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

		const data = await request.formData();
		const raw  = data.get('classes')?.toString();
		if (!raw) return fail(400, { message: 'No class data provided.' });

		try {
			const classes = JSON.parse(raw);
			await characters.updateClasses(params.id, classes, locals.user!.id);
			// Set character to PENDING for admin approval
			await characters.updateStatus(params.id, 'PENDING', null, 'Level-up allocation submitted', locals.user!.id);
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