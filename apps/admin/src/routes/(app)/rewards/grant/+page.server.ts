// apps/admin/src/routes/(app)/rewards/grant/+page.server.ts
import { fail } from '@sveltejs/kit';
import { achievements, db, notifications } from '@core/database';
import { isMarchesError } from '@core/errors';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad, Actions } from './$types';

const ITEM_RARITIES  = ['Mundane','Common','Uncommon','Rare','Very_Rare','Legendary','Artifact','Unknown'];
const ITEM_CATEGORIES = ['Combat','Consumable','Utility','Destroyable'];

export const load: PageServerLoad = async () => {
	const [allChars, allAchs] = await Promise.all([
		db.character.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true, userId: true }, orderBy: { name: 'asc' } }),
		achievements.getAll(true),
	]);
	return { allChars, allAchs, itemRarities: ITEM_RARITIES, itemCategories: ITEM_CATEGORIES };
};

export const actions: Actions = {
	grantXp: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const characterId = data.get('characterId')?.toString() ?? '';
		const amount      = Number(data.get('amount') ?? 0);
		const type        = data.get('type')?.toString() ?? 'XP';
		const note        = data.get('note')?.toString().trim() || 'Admin grant';
		if (!characterId || amount <= 0) return fail(400, { message: 'Character and positive amount required.' });
		const char = await db.character.findUnique({ where: { id: characterId } });
		if (!char) return fail(404, { message: 'Character not found.' });
		const field = type === 'XP' ? 'totalXp' : type === 'GOLD' ? 'totalGold' : 'totalTokens';
		await db.$transaction(async (tx) => {
			await tx.character.update({ where: { id: characterId }, data: { [field]: { increment: amount } } });
			await tx.characterTransaction.create({ data: {
				characterId, type: type as any, delta: amount,
				sourceType: 'ADMIN', note, createdBy: locals.user!.id,
			}});
		});
		await notifications.create(char.userId, 'ADMIN_GRANT', `${type} granted`,
			`An admin granted you ${amount} ${type}. Note: ${note}`, `/characters/${characterId}`);
		return { grantSuccess: true, tab: 'xp' };
	},

	grantAchievement: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Achievement', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data          = await request.formData();
		const characterId   = data.get('characterId')?.toString() ?? '';
		const achievementId = data.get('achievementId')?.toString() ?? '';
		const note          = data.get('note')?.toString().trim() || undefined;
		if (!characterId || !achievementId) return fail(400, { message: 'Character and achievement required.' });
		try {
			await achievements.grant(characterId, achievementId, note, locals.user!.id);
			const char = await db.character.findUnique({ where: { id: characterId }, select: { userId: true } });
			const ach  = await db.achievement.findUnique({ where: { id: achievementId } });
			// Write to character history
			await db.characterTransaction.create({ data: {
				characterId,
				type:       'REWARD',
				delta:      0,
				sourceType: 'ADMIN',
				note:       `Achievement granted: ${ach?.name ?? achievementId}. ${note ?? ''}`.trim(),
				createdBy:  locals.user!.id,
			}});
			if (char && ach) await notifications.create(char.userId, 'ACHIEVEMENT_GRANTED',
				'Achievement unlocked! 🏆', `You earned the "${ach.name}" achievement!`, `/characters/${characterId}`);
			return { grantSuccess: true, tab: 'achievement' };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	searchItems: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data     = await request.formData();
		const query    = data.get('query')?.toString().trim() || '';
		const rarity   = data.get('rarity')?.toString() || undefined;
		const category = data.get('category')?.toString() || undefined;
		const maxValue = Number(data.get('maxValue') ?? 0) || undefined;
		const where: any = { isAvailable: true };
		if (query)    where.name     = { contains: query, mode: 'insensitive' };
		if (rarity)   where.rarity   = rarity as any;
		if (category) where.category = category as any;
		if (maxValue) where.buyPrice = { lte: maxValue };
		const items = await db.marketplaceItem.findMany({ where, select: { id: true, name: true, rarity: true, category: true, buyPrice: true }, take: 20, orderBy: { name: 'asc' } });
		return { searchResults: items, tab: 'item' };
	},

	randomizeItem: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data     = await request.formData();
		const rarity   = data.get('rarity')?.toString() || undefined;
		const category = data.get('category')?.toString() || undefined;
		const maxValue = Number(data.get('maxValue') ?? 0) || undefined;
		const where: any = { isAvailable: true };
		if (rarity)   where.rarity   = rarity as any;
		if (category) where.category = category as any;
		if (maxValue) where.buyPrice = { lte: maxValue };
		const items = await db.marketplaceItem.findMany({ where, select: { id: true, name: true, rarity: true, category: true, buyPrice: true } });
		if (!items.length) return fail(400, { message: 'No items match those filters.' });
		const pick = items[Math.floor(Math.random() * items.length)];
		return { randomizedItem: pick, tab: 'item' };
	},

	grantItem: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Character', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const characterId = data.get('characterId')?.toString() ?? '';
		const itemId      = data.get('itemId')?.toString() ?? '';
		const note        = data.get('note')?.toString().trim() || 'Admin item grant';
		if (!characterId || !itemId) return fail(400, { message: 'Character and item required.' });
		const char = await db.character.findUnique({ where: { id: characterId }, select: { userId: true } });
		const item = await db.marketplaceItem.findUnique({ where: { id: itemId } });
		if (!char || !item) return fail(404, { message: 'Character or item not found.' });
		await db.$transaction(async (tx) => {
			const existing = await tx.characterInventory.findFirst({ where: { characterId, itemId } });
			if (existing) {
				await tx.characterInventory.update({ where: { id: existing.id }, data: { quantity: { increment: 1 } } });
			} else {
				await tx.characterInventory.create({ data: {
					characterId,
					itemId,
					itemName:      item.name,
					quantity:      1,
					purchasePrice: 0,
					canSell:       false,
					sourceType:    'ADMIN',
					sourceId:      locals.user!.id,
					itemCategory:  item.category as any ?? null,
					itemRarity:    (item as any).rarity ?? null,
				}});
			}
			// Write to character history
			await tx.characterTransaction.create({ data: {
				characterId,
				type:       'REWARD',
				delta:      1,
				sourceType: 'ADMIN',
				note:       `Item granted: ${item.name}. ${note}`,
				createdBy:  locals.user!.id,
			}});
		});
		await notifications.create(char.userId, 'ITEM_GRANTED', 'Item received! 🎁',
			`You received "${item.name}". Note: ${note}`, `/characters/${characterId}`);
		return { grantSuccess: true, tab: 'item' };
	},
};