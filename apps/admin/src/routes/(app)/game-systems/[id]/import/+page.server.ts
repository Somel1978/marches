// apps/admin/src/routes/(app)/game-systems/[id]/import/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { gameSystems, dnd5e } from '@core/database';
import { checkPermission } from '@core/rbac';
import type { PageServerLoad, Actions } from './$types';

const toInt = (v: any, fallback = 1) => {
	const n = parseInt(String(v ?? '').replace(/^'+/, '').trim(), 10);
	return isNaN(n) ? fallback : n;
};

export const load: PageServerLoad = async ({ params }) => {
	const system = await gameSystems.getById(params.id);
	if (!system) throw error(404, 'Game system not found');
	return { system };
};

const normalize = (s: any) => (s ?? '').toString().replace(/\s+/g, ' ').trim();
const boolVal   = (v: any) => ['true','yes','1',true,1].includes(typeof v === 'string' ? v.toLowerCase() : v);

export const actions: Actions = {

	// ── Classes ───────────────────────────────────────────────────────────────
	importClasses: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const raw         = data.get('json')?.toString() ?? '';
		const allowUpdate = data.get('allowUpdate') === 'true';
		if (!raw) return fail(400, { message: 'No data provided.' });
		try {
			const rows: any[] = JSON.parse(raw);
			let created = 0; let updated = 0; let skipped = 0;
			const all = await dnd5e.classes.getAll(params.id);
			for (const row of rows) {
				const existing = all.find(c => normalize(c.name).toLowerCase() === normalize(row.name).toLowerCase());
				if (existing) {
					if (!allowUpdate) { skipped++; continue; }
					await dnd5e.classes.update(existing.id, {
						description:          row.description          || null,
						source:               row.source               || null,
						link:                 row.link                 || null,
						hitDice:              Number(row.hitDice)      || null,
						canCastSpells:        boolVal(row.canCastSpells),
						primaryAbilities:     row.primaryAbilities     || null,
						equipmentDescription: row.equipmentDescription || null,
						sortOrder:            Number(row.sortOrder)    || 0,
					}, locals.user!.id);
					updated++;
				} else {
					await dnd5e.classes.create({
						gameSystemId:         params.id,
						name:                 row.name,
						description:          row.description          || undefined,
						source:               row.source               || undefined,
						link:                 row.link                 || undefined,
						hitDice:              Number(row.hitDice)      || undefined,
						canCastSpells:        boolVal(row.canCastSpells),
						primaryAbilities:     row.primaryAbilities     || undefined,
						equipmentDescription: row.equipmentDescription || undefined,
						sortOrder:            Number(row.sortOrder)    || 0,
					}, locals.user!.id);
					created++;
				}
			}
			return { success: true, created, updated, skipped, type: 'classes' };
		} catch (e: any) {
			const isUnique = e.code === 'P2002' || e.message?.includes('Unique constraint');
			const msg = isUnique
				? `A record with that name already exists. Tick "Update existing records" to overwrite, or clear the existing data first.`
				: `Import failed: ${e.message}`;
			return fail(400, { message: msg });
		}
	},

	// ── Class Features ────────────────────────────────────────────────────────
	// Columns: className, name, requiredLevel, description, url
	importClassFeatures: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const raw         = data.get('json')?.toString() ?? '';
		const allowUpdate = data.get('allowUpdate') === 'true';
		if (!raw) return fail(400, { message: 'No data provided.' });
		try {
			const rows: any[] = JSON.parse(raw);
			let created = 0; let updated = 0; let skipped = 0;
			for (const row of rows) {
				const allClasses = await dnd5e.classes.getAll(params.id);
				const cls = allClasses.find(c => normalize(c.name) === normalize(row.className));
				if (!cls) { skipped++; continue; }
				// Match on name + level so same-name features at different levels are distinct
				const existing = cls.features?.find((f: any) =>
					f.name === row.name && f.requiredLevel === toInt(row.requiredLevel)
				);
				if (existing) {
					if (!allowUpdate) { skipped++; continue; }
					await dnd5e.classFeatures.update(existing.id, {
						description:   row.description || null,
						requiredLevel: toInt(row.requiredLevel),
						url:           row.url || null,
					});
					updated++;
				} else {
					await dnd5e.classFeatures.create({
						classId:       cls.id,
						name:          row.name,
						description:   row.description || undefined,
						requiredLevel: toInt(row.requiredLevel),
						url:           row.url || undefined,
					}, locals.user!.id);
					created++;
				}
			}
			return { success: true, created, updated, skipped, type: 'class features' };
		} catch (e: any) {
			const isUnique = e.code === 'P2002' || e.message?.includes('Unique constraint');
			const msg = isUnique
				? `A record with that name already exists. Tick "Update existing records" to overwrite, or clear the existing data first.`
				: `Import failed: ${e.message}`;
			return fail(400, { message: msg });
		}
	},

	// ── Subclasses ────────────────────────────────────────────────────────────
	// Columns: className, name, description, source, link, sortOrder
	importSubclasses: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const raw         = data.get('json')?.toString() ?? '';
		const allowUpdate = data.get('allowUpdate') === 'true';
		if (!raw) return fail(400, { message: 'No data provided.' });
		try {
			const rows: any[] = JSON.parse(raw);
			let created = 0; let updated = 0; let skipped = 0;
			for (const row of rows) {
				const allClasses = await dnd5e.classes.getAll(params.id);
				const cls = allClasses.find(c => normalize(c.name) === normalize(row.className));
				if (!cls) { skipped++; continue; }
				const existing = cls.subclasses?.find((s: any) =>
					normalize(s.name).toLowerCase() === normalize(row.name).toLowerCase()
				);
				if (existing) {
					if (!allowUpdate) { skipped++; continue; }
					await dnd5e.subclasses.update(existing.id, {
						description: row.description || null,
						source:      row.source      || null,
						link:        row.link        || null,
						sortOrder:   Number(row.sortOrder) || 0,
					});
					updated++;
				} else {
					await dnd5e.subclasses.create({
						classId:     cls.id,
						name:        row.name,
						description: row.description || undefined,
						source:      row.source      || undefined,
						link:        row.link        || undefined,
						sortOrder:   Number(row.sortOrder) || 0,
					}, locals.user!.id);
					created++;
				}
			}
			return { success: true, created, updated, skipped, type: 'subclasses' };
		} catch (e: any) {
			const isUnique = e.code === 'P2002' || e.message?.includes('Unique constraint');
			const msg = isUnique
				? `A record with that name already exists. Tick "Update existing records" to overwrite, or clear the existing data first.`
				: `Import failed: ${e.message}`;
			return fail(400, { message: msg });
		}
	},

	// ── Subclass Features ─────────────────────────────────────────────────────
	// Columns: className, subclassName, name, requiredLevel, description, url
	importSubclassFeatures: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const raw         = data.get('json')?.toString() ?? '';
		const allowUpdate = data.get('allowUpdate') === 'true';
		if (!raw) return fail(400, { message: 'No data provided.' });
		try {
			const rows: any[] = JSON.parse(raw);
			let created = 0; let updated = 0; let skipped = 0;
			for (const row of rows) {
				const allClasses = await dnd5e.classes.getAll(params.id);
				const cls = allClasses.find(c => normalize(c.name) === normalize(row.className));
				if (!cls) { skipped++; continue; }
				const sub = cls.subclasses?.find((s: any) => normalize(s.name) === normalize(row.subclassName));
				if (!sub) { skipped++; continue; }
				const existing = sub.features?.find((f: any) =>
					f.name === row.name && f.requiredLevel === toInt(row.requiredLevel)
				);
				if (existing) {
					if (!allowUpdate) { skipped++; continue; }
					await dnd5e.subclassFeatures.update(existing.id, {
						description:   row.description || null,
						requiredLevel: toInt(row.requiredLevel),
						url:           row.url || null,
					});
					updated++;
				} else {
					await dnd5e.subclassFeatures.create({
						subclassId:    sub.id,
						name:          row.name,
						description:   row.description || undefined,
						requiredLevel: toInt(row.requiredLevel),
						url:           row.url || undefined,
					});
					created++;
				}
			}
			return { success: true, created, updated, skipped, type: 'subclass features' };
		} catch (e: any) {
			const isUnique = e.code === 'P2002' || e.message?.includes('Unique constraint');
			const msg = isUnique
				? `A record with that name already exists. Tick "Update existing records" to overwrite, or clear the existing data first.`
				: `Import failed: ${e.message}`;
			return fail(400, { message: msg });
		}
	},

	// ── Species ───────────────────────────────────────────────────────────────
	importSpecies: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const raw         = data.get('json')?.toString() ?? '';
		const allowUpdate = data.get('allowUpdate') === 'true';
		if (!raw) return fail(400, { message: 'No data provided.' });
		try {
			const rows: any[] = JSON.parse(raw);
			let created = 0; let updated = 0; let skipped = 0;
			const all = await dnd5e.species.getAll(params.id);
			for (const row of rows) {
				const existing = all.find(s => normalize(s.name).toLowerCase() === normalize(row.name).toLowerCase());
				if (existing) {
					if (!allowUpdate) { skipped++; continue; }
					await dnd5e.species.update(existing.id, {
						description: row.description || null,
						source:      row.source      || null,
						link:        row.link        || null,
						isSubrace:   boolVal(row.isSubrace),
						isLegacy:    boolVal(row.isLegacy),
						sortOrder:   Number(row.sortOrder) || 0,
					}, locals.user!.id);
					updated++;
				} else {
					await dnd5e.species.create({
						gameSystemId: params.id,
						name:         row.name,
						description:  row.description || undefined,
						source:       row.source      || undefined,
						link:         row.link        || undefined,
						isSubrace:    boolVal(row.isSubrace),
						isLegacy:     boolVal(row.isLegacy),
						sortOrder:    Number(row.sortOrder) || 0,
					}, locals.user!.id);
					created++;
				}
			}
			return { success: true, created, updated, skipped, type: 'species' };
		} catch (e: any) {
			const isUnique = e.code === 'P2002' || e.message?.includes('Unique constraint');
			const msg = isUnique
				? `A record with that name already exists. Tick "Update existing records" to overwrite, or clear the existing data first.`
				: `Import failed: ${e.message}`;
			return fail(400, { message: msg });
		}
	},

	// ── Species Traits ────────────────────────────────────────────────────────
	// Columns: speciesName, name, description, requiredLevel
	importSpeciesTraits: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const raw         = data.get('json')?.toString() ?? '';
		const allowUpdate = data.get('allowUpdate') === 'true';
		if (!raw) return fail(400, { message: 'No data provided.' });
		try {
			const rows: any[] = JSON.parse(raw);
			let created = 0; let updated = 0; let skipped = 0;
			for (const row of rows) {
				const allSpecies = await dnd5e.species.getAll(params.id);
				const sp = allSpecies.find(s => normalize(s.name).toLowerCase() === normalize(row.speciesName).toLowerCase());
				if (!sp) { skipped++; continue; }
				const existing = (sp as any).traits?.find((t: any) => normalize(t.name).toLowerCase() === normalize(row.name).toLowerCase());
				if (existing) {
					if (!allowUpdate) { skipped++; continue; }
					await dnd5e.speciesTraits.update(existing.id, {
						description:   row.description || null,
						requiredLevel: toInt(row.requiredLevel, 0) || null,
					});
					updated++;
				} else {
					await dnd5e.speciesTraits.create({
						speciesId:     sp.id,
						name:          row.name,
						description:   row.description || undefined,
						requiredLevel: toInt(row.requiredLevel, 0) || undefined,
					});
					created++;
				}
			}
			return { success: true, created, updated, skipped, type: 'species traits' };
		} catch (e: any) {
			const isUnique = e.code === 'P2002' || e.message?.includes('Unique constraint');
			const msg = isUnique
				? `A record with that name already exists. Tick "Update existing records" to overwrite, or clear the existing data first.`
				: `Import failed: ${e.message}`;
			return fail(400, { message: msg });
		}
	},

	// ── Backgrounds ───────────────────────────────────────────────────────────
	importBackgrounds: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const raw         = data.get('json')?.toString() ?? '';
		const allowUpdate = data.get('allowUpdate') === 'true';
		if (!raw) return fail(400, { message: 'No data provided.' });
		try {
			const rows: any[] = JSON.parse(raw);
			let created = 0; let updated = 0; let skipped = 0;
			const all = await dnd5e.backgrounds.getAll(params.id);
			for (const row of rows) {
				const existing = all.find(b => normalize(b.name).toLowerCase() === normalize(row.name).toLowerCase());
				if (existing) {
					if (!allowUpdate) { skipped++; continue; }
					await dnd5e.backgrounds.update(existing.id, {
						shortDescription:   row.shortDescription   || null,
						featureName:        row.featureName        || null,
						skillProficiencies: row.skillProficiencies || null,
						toolProficiencies:  row.toolProficiencies  || null,
						languages:          row.languages          || null,
						url:                row.url                || null,
						sortOrder:          Number(row.sortOrder)  || 0,
					}, locals.user!.id);
					updated++;
				} else {
					await dnd5e.backgrounds.create({
						gameSystemId:       params.id,
						name:               row.name,
						shortDescription:   row.shortDescription   || undefined,
						featureName:        row.featureName        || undefined,
						skillProficiencies: row.skillProficiencies || undefined,
						toolProficiencies:  row.toolProficiencies  || undefined,
						languages:          row.languages          || undefined,
						url:                row.url                || undefined,
						sortOrder:          Number(row.sortOrder)  || 0,
					}, locals.user!.id);
					created++;
				}
			}
			return { success: true, created, updated, skipped, type: 'backgrounds' };
		} catch (e: any) {
			const isUnique = e.code === 'P2002' || e.message?.includes('Unique constraint');
			const msg = isUnique
				? `A record with that name already exists. Tick "Update existing records" to overwrite, or clear the existing data first.`
				: `Import failed: ${e.message}`;
			return fail(400, { message: msg });
		}
	},
};