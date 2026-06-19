// apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { characters, users, gameSystems, db } from '@core/database';
import { isMarchesError } from '@core/errors';
import { checkPermission } from '@core/rbac';
import { loadDnd5eCharacterData } from './_loaders/dnd5e.server.ts';
import { dmDnd5eActions } from './_sheets/dnd5e.actions.server.ts';
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

export const load: PageServerLoad = async ({ params, parent, locals }) => {
	const { canManage } = await parent();

	const character = await characters.getById(params.charId);
	if (!character) throw error(404, 'Character not found');
	if ((character as any).worldId !== params.worldId) throw error(403, 'This character does not belong to your world.');

	const [owner, gameSystem, inventory] = await Promise.all([
		users.getById(character.userId),
		gameSystems.getById(character.gameSystemId),
		characters.getInventory(params.charId),
	]);

	const slug = (gameSystem as any)?.slug ?? '';
	let systemSpecific: Record<string, any> = {};
	if (slug === 'dnd5e') {
		systemSpecific = await loadDnd5eCharacterData(params.charId, character.gameSystemId);
	}

	const canViewDescriptions = checkPermission(locals.permissions, { resourceKey: 'dnd5eDescriptions', action: 'read' }).allowed;
	return { character, owner, gameSystem, inventory, canManage, canViewDescriptions, ...systemSpecific };
};

export const actions: Actions = {
	// ── Universal: approve / reject ──────────────────────────────────────────
	approve: async ({ params, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		try {
			await characters.dispatchApprove(params.charId, locals.user!.id);
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
			await characters.dispatchReject(params.charId, note, locals.user!.id);
			return { rejectSuccess: true };
		} catch (e) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	updateStatus: async ({ params, request, locals }) => {
		if (!await assertCanManage(params.worldId, locals.user!.id)) return fail(403, { message: 'Forbidden' });
		const data   = await request.formData();
		const status = data.get('status')?.toString();
		const note   = data.get('note')?.toString() || undefined;
		if (!status) return fail(400, { message: 'Status is required.' });
		try {
			await characters.updateStatus(params.charId, status as any, null, note, locals.user!.id);
			return { statusSuccess: true };
		} catch (e: any) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},

	// ── dnd5e direct-save actions (canManage DMs only) ───────────────────────
	updateSheet:        dmDnd5eActions.updateSheet,
	addFeat:            dmDnd5eActions.addFeat,
	removeFeat:         dmDnd5eActions.removeFeat,
	saveAbilityScores:  dmDnd5eActions.saveAbilityScores,
	manualScoreAdjust:  dmDnd5eActions.manualScoreAdjust,
};