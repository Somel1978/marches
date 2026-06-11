// apps/frontend/src/routes/(protected)/characters/[id]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { characters, db, achievements, gameSystems, marketplace, platform, worlds } from '@core/database';
import { isMarchesError } from '@core/errors';
import { loadDnd5eCharacterData } from './_loaders/dnd5e.server.ts';
import { dnd5eActions } from './_sheets/dnd5e.actions.server.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const character = await characters.getById(params.id);
	if (!character) throw error(404, 'Character not found.');
	if (character.userId !== locals.user!.id) throw error(403, 'Forbidden');

	await characters.checkRest(params.id);

	const [transactions, gameSystem, inventory, pendingTx, settings, charAchievements, boostTxs] = await Promise.all([
		characters.getTransactions(params.id, 10),
		gameSystems.getById(character.gameSystemId),
		characters.getInventory(params.id),
		marketplace.transactions.getAll({ characterId: params.id, status: 'PENDING' }),
		platform.getSettingsMap(),
		achievements.getForCharacter(params.id),
		db.characterTransaction.findMany({
			where:   { characterId: params.id, sourceType: 'REWARD', note: { contains: 'Token boost' } },
			select:  { type: true, delta: true, note: true },
		}),
	]);

	const pendingBuys   = pendingTx.items.filter((t: any) => t.type === 'BUY');
	const pendingSells  = pendingTx.items.filter((t: any) => t.type === 'SELL');
	const globalSellPct = Number(settings['marketplace.sellPricePercent'] ?? 50);
	const worldId       = (character as any).worldId ?? null;
	const worldName     = worldId ? await worlds.getById(worldId).then((w: any) => w?.name ?? null) : null;
	const progressionThresholds = (gameSystem as any)?.progressionThresholds ?? [];

	let worldSellPct = globalSellPct;
	let worldItemMap: Record<string, any> = {};
	if (worldId) {
		const [worldSetting, worldItems] = await Promise.all([
			marketplace.worldSettings.get(worldId),
			marketplace.worldItems.getAll(worldId),
		]);
		if (worldSetting?.sellPricePercent != null) worldSellPct = worldSetting.sellPricePercent;
		for (const wi of (worldItems as any[])) worldItemMap[wi.itemId] = wi;
	}

	const inventoryWithSellPrice = (inventory as any[]).map((slot: any) => {
		if (!slot.itemId || slot.livePrice == null) return { ...slot, effectiveSellPrice: null };
		const wi             = worldItemMap[slot.itemId];
		const effectivePrice = (wi?.priceOverride != null ? wi.priceOverride : slot.livePrice) as number;
		return { ...slot, effectiveSellPrice: Math.floor(effectivePrice * worldSellPct / 100) };
	});

	// Load system-specific data conditionally
	const slug = (gameSystem as any)?.slug ?? '';
	let systemSpecific: Record<string, any> = {};
	if (slug === 'dnd5e') {
		systemSpecific = await loadDnd5eCharacterData(params.id, character.gameSystemId);
	}

	return {
		character, charAchievements, transactions, boostTxs, gameSystem, progressionThresholds,
		inventory: inventoryWithSellPrice, pendingBuys, pendingSells, sellPct: globalSellPct, worldName,
		...systemSpecific,
	};
};

export const actions: Actions = {
	// ── Universal actions ─────────────────────────────────────────────────────

	update: async ({ params, request, locals }) => {
		const character = await characters.getById(params.id);
		if (!character) return fail(404, { message: 'Character not found.' });
		if (character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		const data        = await request.formData();
		const name        = data.get('name')?.toString().trim()        ?? '';
		const avatarUrl   = data.get('avatarUrl')?.toString().trim()   || null;
		const portraitUrl = data.get('portraitUrl')?.toString().trim() || null;
		if (!name) return fail(400, { message: 'Name is required.' });
		try {
			await characters.updateFreeFields(params.id, { name, avatarUrl, portraitUrl, description: null }, locals.user!.id);
			return { updateSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	saveBackstory: async ({ params, request, locals }) => {
		const character = await characters.getById(params.id);
		if (!character) return fail(404, { message: 'Character not found.' });
		if (character.userId !== locals.user!.id) return fail(403, { message: 'Forbidden.' });
		const data        = await request.formData();
		const description = data.get('description')?.toString().trim() || null;
		try {
			await characters.updateFreeFields(params.id, {
				name:        character.name,
				avatarUrl:   (character as any).avatarUrl   ?? null,
				portraitUrl: (character as any).portraitUrl ?? null,
				description,
			}, locals.user!.id);
			return { backstorySuccess: true };
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
		try {
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

	// ── dnd5e actions — dispatched from _sheets/dnd5e.actions.server.ts ──────
	submitChanges:    dnd5eActions.submitChanges,
	submitLevelUp:    dnd5eActions.submitLevelUp,
	addFeat:          dnd5eActions.addFeat,
	removeFeat:       dnd5eActions.removeFeat,
	saveAbilityScores: dnd5eActions.saveAbilityScores,
};