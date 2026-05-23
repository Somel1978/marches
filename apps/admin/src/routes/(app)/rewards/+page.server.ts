// apps/admin/src/routes/(app)/rewards/+page.server.ts
import { db, achievements } from '@core/database';
import { fail } from '@sveltejs/kit';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const recentGrants = await db.characterAchievement.findMany({ orderBy: { grantedAt: 'desc' }, take: 10 });
	const pendingItemUsages: any[] = [];

	const charIds = [...new Set(recentGrants.map(g => g.characterId))];
	const chars   = charIds.length ? await db.character.findMany({ where: { id: { in: charIds } }, select: { id: true, name: true } }) : [];
	const charMap = Object.fromEntries(chars.map(c => [c.id, c.name]));

	const achIds  = [...new Set(recentGrants.map(g => g.achievementId))];
	const achs    = achIds.length ? await db.achievement.findMany({ where: { id: { in: achIds } } }) : [];
	const achMap  = Object.fromEntries(achs.map(a => [a.id, a]));

	const questIds = [...new Set(pendingItemUsages.map(u => u.questId))];
	const questTitles = questIds.length ? await db.quest.findMany({ where: { id: { in: questIds } }, select: { id: true, title: true } }) : [];
	const questMap = Object.fromEntries(questTitles.map(q => [q.id, q.title]));

	const usageCharIds = [...new Set(pendingItemUsages.map(u => u.characterId))];
	const usageChars   = usageCharIds.length ? await db.character.findMany({ where: { id: { in: usageCharIds } }, select: { id: true, name: true } }) : [];
	const usageCharMap = Object.fromEntries(usageChars.map(c => [c.id, c.name]));

	return {
		recentGrants: recentGrants.map(g => ({ ...g, characterName: charMap[g.characterId] ?? g.characterId, achievement: achMap[g.achievementId] ?? null })),
		pendingItemUsages: pendingItemUsages.map(u => ({ ...u, characterName: usageCharMap[u.characterId] ?? u.characterId, questTitle: questMap[u.questId] ?? u.questId })),
	};
};

export const actions: Actions = {
	revokeAchievement: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'Achievement', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data          = await request.formData();
		const characterId   = data.get('characterId')?.toString() ?? '';
		const achievementId = data.get('achievementId')?.toString() ?? '';
		try {
			await achievements.revoke(characterId, achievementId, locals.user!.id);
			return { success: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};