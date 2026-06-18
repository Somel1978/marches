// apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/spells/[spellId]/+page.server.ts
import { fail, error, redirect } from '@sveltejs/kit';
import { gameSystems, dnd5e } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const system = await gameSystems.getById(params.id);
	if (!system) throw error(404, 'Game system not found');
	const spell  = await dnd5e.spells.getById(Number(params.spellId));
	if (!spell || spell.gameSystemId !== params.id) throw error(404, 'Spell not found');
	return { system, spell };
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const g    = (k: string) => data.get(k)?.toString().trim() || null;
		const gb   = (k: string) => data.get(k) === 'true';
		const gn   = (k: string) => { const v = data.get(k)?.toString().trim(); return v ? Number(v) : null; };

		await dnd5e.spells.update(Number(params.spellId), {
			name:                    g('name') ?? '',
			link:                    g('link'),
			level:                   Number(data.get('level') ?? 0),
			school:                  g('school') ?? '',
			concentration:           gb('concentration'),
			ritual:                  gb('ritual'),
			isHomebrew:              gb('isHomebrew'),
			isLegacy:                gb('isLegacy'),
			cantripDamage:           g('cantripDamage'),
			cantripDamageLvl5:       g('cantripDamageLvl5'),
			cantripDamageLvl11:      g('cantripDamageLvl11'),
			cantripDamageLvl17:      g('cantripDamageLvl17'),
			spellDamage:             g('spellDamage'),
			spellUpcastPerSlot:      g('spellUpcastPerSlot'),
			spellUpcastEveryTwoSlots: g('spellUpcastEveryTwoSlots'),
			spellProgression:        g('spellProgression'),
			spellProgressionNote:    g('spellProgressionNote'),
			rangeOrigin:             g('rangeOrigin'),
			rangeValue:              gn('rangeValue'),
			aoeType:                 g('aoeType'),
			aoeValue:                gn('aoeValue'),
			durationType:            g('durationType'),
			durationInterval:        gn('durationInterval'),
			durationUnit:            g('durationUnit'),
			requiresSavingThrow:     gb('requiresSavingThrow'),
			savingThrow:      g('savingThrow'),
			requiresAttackRoll:      gb('requiresAttackRoll'),
			canCastAtHigherLevel:    gb('canCastAtHigherLevel'),
			castingTime:             g('castingTime'),
			components:              g('components'),
			description:             g('description'),
			sourceBook:              g('sourceBook'),
			tags:                    g('tags'),
			spellList:               g('spellList'),
		});
		return { success: true };
	},

	delete: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		await dnd5e.spells.delete(Number(params.spellId));
		throw redirect(303, `/game-systems/${params.id}/dnd5e/spells`);
	},
};