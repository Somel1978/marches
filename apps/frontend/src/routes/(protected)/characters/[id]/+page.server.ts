// apps/frontend/src/routes/(protected)/characters/[id]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { characters, db, achievements, gameSystems, marketplace, platform, worlds } from '@core/database';
import { isMarchesError } from '@core/errors';
import { checkPermission } from '@core/rbac';
import { loadDnd5eCharacterData } from './_loaders/dnd5e.server.ts';
import { dnd5eActions } from './_sheets/dnd5e.actions.server.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const character = await characters.getById(params.id);
	if (!character) throw error(404, 'Character not found.');
	if (character.userId !== locals.user!.id) throw error(403, 'Forbidden');

	const worldId    = (character as any).worldId ?? null;
	const slug       = (character as any).gameSystemSlug ?? '';
	const gameSystemId = character.gameSystemId;

	const [
		, // checkRest — side effect only
		transactions,
		gameSystem,
		inventory,
		pendingTx,
		settings,
		charAchievements,
		boostTxs,
		worldBundle,
		systemSpecificData,
	] = await Promise.all([
		characters.checkRest(params.id),
		characters.getTransactions(params.id, 10),
		gameSystems.getById(gameSystemId),
		characters.getInventory(params.id),
		marketplace.transactions.getAll({ characterId: params.id, status: 'PENDING' }),
		platform.getSettingsMap(),
		achievements.getForCharacter(params.id),
		db.characterTransaction.findMany({
			where:   { characterId: params.id, sourceType: 'REWARD', note: { contains: 'Token boost' } },
			select:  { type: true, delta: true, note: true },
		}),
		// World name + marketplace settings in one shot
		worldId ? Promise.all([
			worlds.getById(worldId),
			marketplace.worldSettings.get(worldId),
			marketplace.worldItems.getAll(worldId),
		]) : Promise.resolve(null),
		// System-specific data (cached) — start immediately, don't wait for first batch
		(character as any).gameSystemSlug === 'dnd5e' || true
			? loadDnd5eCharacterData(params.id, gameSystemId)
			: Promise.resolve({}),
	]);

	// Unpack world bundle
	const worldName    = worldBundle ? (worldBundle[0] as any)?.name ?? null : null;
	const worldSetting = worldBundle ? worldBundle[1] : null;
	const worldItems   = worldBundle ? (worldBundle[2] as any[]) : [];

	const pendingBuys   = pendingTx.items.filter((t: any) => t.type === 'BUY');
	const pendingSells  = pendingTx.items.filter((t: any) => t.type === 'SELL');
	const globalSellPct = Number(settings['marketplace.sellPricePercent'] ?? 50);
	const progressionThresholds = (gameSystem as any)?.progressionThresholds ?? [];

	let worldSellPct = globalSellPct;
	let worldItemMap: Record<string, any> = {};
	if (worldSetting?.sellPricePercent != null) worldSellPct = worldSetting.sellPricePercent;
	for (const wi of worldItems) worldItemMap[wi.itemId] = wi;

	const inventoryWithSellPrice = (inventory as any[]).map((slot: any) => {
		if (!slot.itemId || slot.livePrice == null) return { ...slot, effectiveSellPrice: null };
		const wi             = worldItemMap[slot.itemId];
		const effectivePrice = (wi?.priceOverride != null ? wi.priceOverride : slot.livePrice) as number;
		return { ...slot, effectiveSellPrice: Math.floor(effectivePrice * worldSellPct / 100) };
	});

	// Only include dnd5e data when appropriate
	const systemSpecific = (gameSystem as any)?.slug === 'dnd5e' ? systemSpecificData : {};

	const canViewDescriptions = checkPermission(locals.permissions, { resourceKey: 'dnd5eDescriptions', action: 'read' }).allowed;

	return {
		character, charAchievements, transactions, boostTxs, gameSystem, progressionThresholds,
		inventory: inventoryWithSellPrice, pendingBuys, pendingSells, sellPct: globalSellPct, worldName,
		canViewDescriptions,
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
	createSpellbook:   dnd5eActions.createSpellbook,
	renameSpellbook:   dnd5eActions.renameSpellbook,
	deleteSpellbook:   dnd5eActions.deleteSpellbook,
	addSpellbookEntry:    dnd5eActions.addSpellbookEntry,
	removeSpellbookEntry: dnd5eActions.removeSpellbookEntry,
	toggleSpellPrepared:  dnd5eActions.toggleSpellPrepared,
	saveMood:             dnd5eActions.saveMood,
	saveSkills:           dnd5eActions.saveSkills,
	saveSavingThrow:      dnd5eActions.saveSavingThrow,
	saveSize:             dnd5eActions.saveSize,
	saveTool:             dnd5eActions.saveTool,
	saveLanguage:         dnd5eActions.saveLanguage,
	saveDamageModifier:   dnd5eActions.saveDamageModifier,
	saveDetails:          dnd5eActions.saveDetails,
};