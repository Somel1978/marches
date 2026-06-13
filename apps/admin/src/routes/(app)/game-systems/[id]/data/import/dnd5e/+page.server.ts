// apps/admin/src/routes/(app)/game-systems/[id]/data/import/dnd5e/+page.server.ts
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
				const sal = toInt(row.subclassAvailableAtLevel, 3);
				const existing = all.find(c => normalize(c.name).toLowerCase() === normalize(row.name).toLowerCase());
				if (existing) {
					if (!allowUpdate) { skipped++; continue; }
					await dnd5e.classes.update(existing.id, {
						description:              row.description              || null,
						source:                   row.source                   || null,
						link:                     row.link                     || null,
						hitDice:                  toInt(row.hitDice, 0)        || null,
						canCastSpells:            boolVal(row.canCastSpells),
						primaryAbilities:         row.primaryAbilities         || null,
						equipmentDescription:     row.equipmentDescription     || null,
						subclassAvailableAtLevel: sal,
						sortOrder:                toInt(row.sortOrder, 0),
					}, locals.user!.id);
					updated++;
				} else {
					await dnd5e.classes.create({
						gameSystemId:             params.id,
						name:                     row.name,
						description:              row.description              || undefined,
						source:                   row.source                   || undefined,
						link:                     row.link                     || undefined,
						hitDice:                  toInt(row.hitDice, 0)        || undefined,
						canCastSpells:            boolVal(row.canCastSpells),
						primaryAbilities:         row.primaryAbilities         || undefined,
						equipmentDescription:     row.equipmentDescription     || undefined,
						subclassAvailableAtLevel: sal,
						sortOrder:                toInt(row.sortOrder, 0),
					}, locals.user!.id);
					created++;
				}
			}
			return { success: true, created, updated, skipped, type: 'classes' };
		} catch (e: any) {
			const isUnique = e.code === 'P2002' || e.message?.includes('Unique constraint');
			return fail(400, { message: isUnique ? 'A record with that name already exists. Tick "Update existing records" to overwrite.' : `Import failed: ${e.message}` });
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
			const allClasses = await dnd5e.classes.getAll(params.id);
			for (const row of rows) {
				const cls = allClasses.find(c => normalize(c.name).toLowerCase() === normalize(row.className).toLowerCase());
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
			const allClasses = await dnd5e.classes.getAll(params.id);
			for (const row of rows) {
				const cls = allClasses.find(c => normalize(c.name).toLowerCase() === normalize(row.className).toLowerCase());
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
			const skipReasons: string[] = [];
			// Fetch all classes once outside the loop (N+1 fix)
			const allClasses = await dnd5e.classes.getAll(params.id);
			for (const row of rows) {
				const cls = allClasses.find(c => normalize(c.name).toLowerCase() === normalize(row.className).toLowerCase());
				if (!cls) {
					skipReasons.push(`Class not found: '${row.className}'`);
					skipped++; continue;
				}
				const sub = cls.subclasses?.find((s: any) => normalize(s.name).toLowerCase() === normalize(row.subclassName).toLowerCase());
				if (!sub) {
					skipReasons.push(`Subclass not found: '${row.subclassName}' (class: '${row.className}')`);
					skipped++; continue;
				}
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
			// Deduplicate skip reasons for the response
			const uniqueReasons = [...new Set(skipReasons)].slice(0, 20);
			return { success: true, created, updated, skipped, type: 'subclass features', skipReasons: uniqueReasons };
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
			const { db } = await import('@core/database');
			const rows: any[] = JSON.parse(raw);
			let created = 0; let updated = 0; let skipped = 0;
			const skipReasons: string[] = [];
			for (const row of rows) {
				const name = normalize(row.name);
				if (!name) { skipReasons.push('Empty name'); skipped++; continue; }
				// Use upsert keyed on @@unique([gameSystemId, name]) to avoid race conditions
				const updateData = {
					description: row.description || null,
					source:      row.source      || null,
					link:        row.link        || null,
					isSubrace:   boolVal(row.isSubrace),
					isLegacy:    boolVal(row.isLegacy),
					sortOrder:   Number(row.sortOrder) || 0,
				};
				const existing = await db.dnd5eSpecies.findFirst({
					where: { gameSystemId: params.id, name: { equals: name, mode: 'insensitive' } },
				});
				if (existing) {
					if (!allowUpdate) { skipReasons.push(`Already exists (tick Update to overwrite): '${name}'`); skipped++; continue; }
					await db.dnd5eSpecies.update({ where: { id: existing.id }, data: updateData });
					updated++;
				} else {
					await db.dnd5eSpecies.create({ data: { gameSystemId: params.id, name, ...updateData } });
					created++;
				}
			}
			const uniqueReasons = [...new Set(skipReasons)].slice(0, 20);
			return { success: true, created, updated, skipped, type: 'species', skipReasons: uniqueReasons };
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
			const { db } = await import('@core/database');
			const rows: any[] = JSON.parse(raw);
			let created = 0; let updated = 0; let skipped = 0;
			const skipReasons: string[] = [];
			// Fetch all species once outside the loop (N+1 fix)
			const allSpecies = await dnd5e.species.getAll(params.id);
			for (const row of rows) {
				const traitName = normalize(row.name);
				if (!traitName) { skipped++; continue; }
				const sp = allSpecies.find(s => normalize(s.name).toLowerCase() === normalize(row.speciesName).toLowerCase());
				if (!sp) {
					skipReasons.push(`Species not found: '${row.speciesName}'`);
					skipped++; continue;
				}
				const traitData = {
					description:   row.description   || null,
					requiredLevel: toInt(row.requiredLevel, 0) || null,
				};
				// Use DB upsert keyed on @@unique([speciesId, name]) — avoids stale in-memory cache issues
				const existing = await db.dnd5eSpeciesTrait.findFirst({
					where: { speciesId: sp.id, name: { equals: traitName, mode: 'insensitive' } },
					select: { id: true },
				});
				if (existing) {
					if (!allowUpdate) { skipped++; continue; }
					await db.dnd5eSpeciesTrait.update({ where: { id: existing.id }, data: traitData });
					updated++;
				} else {
					await db.dnd5eSpeciesTrait.create({ data: { speciesId: sp.id, name: traitName, ...traitData } });
					created++;
				}
			}
			const uniqueReasons = [...new Set(skipReasons)].slice(0, 20);
			return { success: true, created, updated, skipped, type: 'species traits', skipReasons: uniqueReasons };
		} catch (e: any) {
			const isUnique = e.code === 'P2002' || e.message?.includes('Unique constraint');
			const msg = isUnique
				? `A record with that name already exists. Tick "Update existing records" to overwrite, or clear the existing data first.`
				: `Import failed: ${e.message}`;
			return fail(400, { message: msg });
		}
	},

	// ── Backgrounds ───────────────────────────────────────────────────────────
	importFeats: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const raw         = data.get('json')?.toString() ?? '';
		const allowUpdate = data.get('allowUpdate') === 'true';
		if (!raw) return fail(400, { message: 'No data provided.' });
		try {
			const rows: any[] = JSON.parse(raw);
			let created = 0; let updated = 0; let skipped = 0;
			const all = await dnd5e.feats.getAllForAdmin(params.id);
			for (const row of rows) {
				const existing = all.find((f: any) => normalize(f.name).toLowerCase() === normalize(row.name).toLowerCase());
				if (existing) {
					if (!allowUpdate) { skipped++; continue; }
					await dnd5e.feats.update(existing.id, {
						description:    row.description   || null,
						snippet:        row.snippet        || null,
						repeatable:     String(row.repeatable).toLowerCase() === 'true',
						categories:     row.categories     || null,
						prerequisites:  row.prerequisites  || null,
						detailsUrl:     row.detailsUrl      || null,
						isEpicBoon:     String(row.isEpicBoon).toLowerCase() === 'true',
						asiAmount:      row.asiAmount != null && row.asiAmount !== '' ? Number(row.asiAmount) : null,
						asiStatFixed:   row.asiStatFixed   || null,
						asiStatChoices: row.asiStatChoices || null,
						sortOrder:      Number(row.sortOrder) || 0,
					}, locals.user!.id);
					updated++;
				} else {
					await dnd5e.feats.create({
						gameSystemId:   params.id,
						name:           row.name,
						description:    row.description   || undefined,
						snippet:        row.snippet        || undefined,
						repeatable:     String(row.repeatable).toLowerCase() === 'true',
						categories:     row.categories     || undefined,
						prerequisites:  row.prerequisites  || undefined,
						detailsUrl:     row.detailsUrl      || undefined,
						isEpicBoon:     String(row.isEpicBoon).toLowerCase() === 'true',
						asiAmount:      row.asiAmount != null && row.asiAmount !== '' ? Number(row.asiAmount) : undefined,
						asiStatFixed:   row.asiStatFixed   || undefined,
						asiStatChoices: row.asiStatChoices || undefined,
						sortOrder:      Number(row.sortOrder) || 0,
					}, locals.user!.id);
					created++;
				}
			}
			return { success: true, created, updated, skipped, type: 'feats' };
		} catch (e: any) {
			const isUnique = e.code === 'P2002' || e.message?.includes('Unique constraint');
			return fail(400, { message: isUnique ? 'A record with that name already exists. Tick "Update existing records" to overwrite.' : `Import failed: ${e.message}` });
		}
	},

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
						grantsFeatCategory: row.grantsFeatCategory || null,
						grantsFeatId:       row.grantsFeatId       || null,
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
						grantsFeatCategory: row.grantsFeatCategory || undefined,
						grantsFeatId:       row.grantsFeatId       || undefined,
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

	debugSpeciesTraits: async ({ params, request }) => {
		const { db } = await import('@core/database');
		const data = await request.formData();
		const raw  = data.get('json')?.toString() ?? '';
		const rows: any[] = raw ? JSON.parse(raw) : [];

		// Get all DB species names for this gameSystem
		const dbSpecies = await db.dnd5eSpecies.findMany({
			where: { gameSystemId: params.id },
			select: { name: true },
			orderBy: { name: 'asc' },
		});
		const dbNames = dbSpecies.map(s => s.name);

		// Get unique speciesNames from uploaded file
		const fileNames = [...new Set(rows.map((r: any) => r.speciesName))].sort();

		// Find mismatches
		const dbSet   = new Set(dbNames.map(n => n.toLowerCase().trim()));
		const missing = fileNames.filter((n: string) => !dbSet.has(n.toLowerCase().trim()));

		return {
			dbCount:   dbNames.length,
			fileCount: fileNames.length,
			missing,
			dbSample:  dbNames.slice(0, 10),
			fileSample: fileNames.slice(0, 10),
		};
	},
	// ── Bulk delete by category ──────────────────────────────────────────────
	deleteClasses: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const { db } = await import('@core/database');
		const { count } = await db.dnd5eClass.deleteMany({ where: { gameSystemId: params.id } });
		return { deleteSuccess: true, deleted: count, type: 'classes' };
	},

	deleteClassFeatures: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const { db } = await import('@core/database');
		const classes = await db.dnd5eClass.findMany({ where: { gameSystemId: params.id }, select: { id: true } });
		const classIds = classes.map(c => c.id);
		const { count } = await db.dnd5eClassFeature.deleteMany({ where: { classId: { in: classIds } } });
		return { deleteSuccess: true, deleted: count, type: 'class features' };
	},

	deleteSubclasses: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const { db } = await import('@core/database');
		const classes = await db.dnd5eClass.findMany({ where: { gameSystemId: params.id }, select: { id: true } });
		const classIds = classes.map(c => c.id);
		const { count } = await db.dnd5eSubclass.deleteMany({ where: { classId: { in: classIds } } });
		return { deleteSuccess: true, deleted: count, type: 'subclasses' };
	},

	deleteSubclassFeatures: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const { db } = await import('@core/database');
		const classes = await db.dnd5eClass.findMany({ where: { gameSystemId: params.id }, select: { id: true } });
		const classIds = classes.map(c => c.id);
		const subs = await db.dnd5eSubclass.findMany({ where: { classId: { in: classIds } }, select: { id: true } });
		const subIds = subs.map(s => s.id);
		const { count } = await db.dnd5eSubclassFeature.deleteMany({ where: { subclassId: { in: subIds } } });
		return { deleteSuccess: true, deleted: count, type: 'subclass features' };
	},

	deleteSpecies: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const { db } = await import('@core/database');
		const { count } = await db.dnd5eSpecies.deleteMany({ where: { gameSystemId: params.id } });
		return { deleteSuccess: true, deleted: count, type: 'species' };
	},

	deleteSpeciesTraits: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const { db } = await import('@core/database');
		const species = await db.dnd5eSpecies.findMany({ where: { gameSystemId: params.id }, select: { id: true } });
		const ids = species.map(s => s.id);
		const { count } = await db.dnd5eSpeciesTrait.deleteMany({ where: { speciesId: { in: ids } } });
		return { deleteSuccess: true, deleted: count, type: 'species traits' };
	},

	deleteBackgrounds: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const { db } = await import('@core/database');
		const { count } = await db.dnd5eBackground.deleteMany({ where: { gameSystemId: params.id } });
		return { deleteSuccess: true, deleted: count, type: 'backgrounds' };
	},

	deleteFeats: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const { db } = await import('@core/database');
		const { count } = await db.dnd5eFeat.deleteMany({ where: { gameSystemId: params.id } });
		return { deleteSuccess: true, deleted: count, type: 'feats' };
	},
};