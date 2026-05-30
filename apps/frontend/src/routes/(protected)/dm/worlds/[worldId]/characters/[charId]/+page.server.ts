// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { characters, users, gameSystems, dnd5e, db } from '@core/database';
import { isMarchesError } from '@core/errors';
import type { PageServerLoad, Actions } from './$types';

async function assertCanManage(worldId: string, userId: string) {
	const profile = await db.dMProfile.findFirst({ where: { userId }, select: { id: true } });
	if (!profile) return false;
	const a = await db.worldDM.findUnique({
		where: { worldId_dmProfileId: { worldId, dmProfileId: profile.id } },
		select: { canManage: true },
	});
	return a?.canManage === true;
}

export const load: PageServerLoad = async ({ params, parent }) => {
	const { canManage } = await parent();

	const character = await characters.getById(params.charId);
	if (!character) throw error(404, 'Character not found');

	// Guard: character must belong to this world
	if ((character as any).worldId !== params.worldId) throw error(403, 'This character does not belong to your world.');

	const [owner, gameSystem, systemData, inventory] = await Promise.all([
		users.getById(character.userId),
		gameSystems.getById(character.gameSystemId),
		dnd5e.getSystemData(character.gameSystemId),
		characters.getInventory(params.charId),
	]);

	return { character, owner, gameSystem, systemData, inventory, canManage };
};

export const actions: Actions = {
	approve: async ({ params, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		try {
			await characters.approve(params.charId, locals.user!.id);
			return { approveSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	reject: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const note = data.get('note')?.toString().trim() ?? '';
		if (!note) return fail(400, { message: 'Rejection reason is required.' });
		try {
			await characters.reject(params.charId, note, locals.user!.id);
			return { rejectSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};