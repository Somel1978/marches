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

// Map display names → enum keys (handles "Sleight of Hand", "SLEIGHT_OF_HAND", "sleight_of_hand")
const SKILL_ENUM: Record<string, string> = {
    'acrobatics':'ACROBATICS','animal handling':'ANIMAL_HANDLING','arcana':'ARCANA',
    'athletics':'ATHLETICS','deception':'DECEPTION','history':'HISTORY','insight':'INSIGHT',
    'intimidation':'INTIMIDATION','investigation':'INVESTIGATION','medicine':'MEDICINE',
    'nature':'NATURE','perception':'PERCEPTION','performance':'PERFORMANCE',
    'persuasion':'PERSUASION','religion':'RELIGION',
    'sleight of hand':'SLEIGHT_OF_HAND','sleight_of_hand':'SLEIGHT_OF_HAND',
    'stealth':'STEALTH','survival':'SURVIVAL',
};
const STAT_ENUM: Record<string, string> = {
    'strength':'STRENGTH','dexterity':'DEXTERITY','constitution':'CONSTITUTION',
    'intelligence':'INTELLIGENCE','wisdom':'WISDOM','charisma':'CHARISMA',
};

// Normalise comma-sep skill display names → enum keys.
// Unrecognised entries are pushed to `warnings` with context so the user can fix their data.
function normalizeSkills(raw: string | null | undefined, warnings: string[], context: string): string | null {
    if (!raw) return null;
    const parts: string[] = [];
    raw.split(',').forEach(s => {
        const k = s.trim().toLowerCase().replace(/_/g, ' ');
        const mapped = SKILL_ENUM[k] ?? null;
        if (mapped) parts.push(mapped);
        else if (s.trim()) warnings.push(`${context} — unrecognised skill: "${s.trim()}"`);
    });
    return parts.length ? parts.join(',') : null;
}

// Normalise comma-sep stat display names → enum keys.
function normalizeStats(raw: string | null | undefined, warnings: string[], context: string): string | null {
    if (!raw) return null;
    const parts: string[] = [];
    raw.split(',').forEach(s => {
        const k = s.trim().toLowerCase();
        const mapped = STAT_ENUM[k] ?? null;
        if (mapped) parts.push(mapped);
        else if (s.trim()) warnings.push(`${context} — unrecognised stat: "${s.trim()}"`);
    });
    return parts.length ? parts.join(',') : null;
}

// Normalise free-text comma-sep strings (tools, languages, damage types) — pass through as-is,
// trimmed and rejoined. No enum mapping needed for these fields.
function normalizeList(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    return parts.length ? parts.join(',') : null;
}

// Parse speeds from a row: expects columns WALK, FLY, SWIM, CLIMB, BURROW (or walk_speed etc.)
// Returns array of { movementType, speed } for non-zero entries.
function parseSpeeds(row: any): { movementType: string; speed: number }[] {
    const MOVE_TYPES = ['WALK','FLY','SWIM','CLIMB','BURROW'];
    const speeds: { movementType: string; speed: number }[] = [];
    for (const mt of MOVE_TYPES) {
        const raw = row[mt] ?? row[mt.toLowerCase()] ?? row[`${mt.toLowerCase()}_speed`] ?? row[`${mt} Speed`] ?? 0;
        const val = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
        if (val > 0) speeds.push({ movementType: mt, speed: val });
    }
    return speeds;
}

// Common grant fields shared by ClassFeature, SubclassFeature, SpeciesTrait, Background, Feat.
// Returns undefined (not null) for missing values — compatible with both create (undefined) and
// update (null) signatures. Callers spread these directly: ...grantFields(row, warnings, name)
function grantFields(row: any, warnings: string[], context: string) {
    const n = <T>(v: T | null): T | undefined => v ?? undefined;
    return {
        grantsSkills:           n(normalizeSkills(row.grantsSkills, warnings, context)),
        grantsExpertise:        n(normalizeSkills(row.grantsExpertise, warnings, context)),
        grantsHalfSkills:       n(normalizeSkills(row.grantsHalfSkills, warnings, context)),
        grantsSavingThrows:     n(normalizeStats(row.grantsSavingThrows, warnings, context)),
        skillChoiceCount:       row.skillChoiceCount != null && row.skillChoiceCount !== '' ? Number(row.skillChoiceCount) : undefined,
        skillChoicePool:        n(normalizeSkills(row.skillChoicePool, warnings, context)),
        savingThrowChoiceCount: row.savingThrowChoiceCount != null && row.savingThrowChoiceCount !== '' ? Number(row.savingThrowChoiceCount) : undefined,
        savingThrowChoicePool:  n(normalizeStats(row.savingThrowChoicePool, warnings, context)),
        grantsTools:            n(normalizeList(row.grantsTools)),
        toolChoiceCount:        row.toolChoiceCount != null && row.toolChoiceCount !== '' ? Number(row.toolChoiceCount) : undefined,
        toolChoicePool:         n(normalizeList(row.toolChoicePool)),
        grantsLanguages:        n(normalizeList(row.grantsLanguages)),
        languageChoiceCount:    row.languageChoiceCount != null && row.languageChoiceCount !== '' ? Number(row.languageChoiceCount) : undefined,
        languageChoicePool:     n(normalizeList(row.languageChoicePool)),
        grantsResistances:      n(normalizeList(row.grantsResistances)),
        grantsImmunities:       n(normalizeList(row.grantsImmunities)),
        grantsVulnerabilities:  n(normalizeList(row.grantsVulnerabilities)),
        grantsInnateSpells:     normalizeList(row.grantsInnateSpells) ?? undefined,
        grantsSpeed:           normalizeList(row.grantsSpeed)         ?? undefined,
        grantsSenses:          row.grantsSenses ? String(row.grantsSenses).trim() : undefined,
    };
}

export const actions: Actions = {

	// ── Lookup helpers ────────────────────────────────────────────────────────
	// When row.id is present (re-export → re-import flow), look up by UUID for
	// exact match. Fall back to case-insensitive name match for first-time imports
	// from the parser tool (which has no platform UUIDs yet).

	// ── Classes ───────────────────────────────────────────────────────────────
	importClasses: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const raw         = data.get('json')?.toString() ?? '';
		const allowUpdate = data.get('allowUpdate') === 'true';
		if (!raw) return fail(400, { message: 'No data provided.' });
		try {
			const { db } = await import('@core/database');
			const rows: any[] = JSON.parse(raw);
			const warnings: string[] = [];
			let created = 0; let updated = 0; let skipped = 0;
			const all = await dnd5e.classes.getAll(params.id);
			for (const row of rows) {
				const sal = toInt(row.subclassAvailableAtLevel, 3);
				const existing = row.id
					? all.find(c => c.id === row.id)
					: all.find(c => normalize(c.name).toLowerCase() === normalize(row.name).toLowerCase());
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
						skillChoiceCount:         row.skillChoiceCount != null && row.skillChoiceCount !== '' ? toInt(row.skillChoiceCount, 2) : null,
					}, locals.user!.id);
					// Upsert saving throws (grantsSavingThrows column — comma-sep e.g. "STRENGTH,CONSTITUTION")
					const saves = (normalizeStats(row.grantsSavingThrows, warnings, row.name) ?? '').split(',').filter(Boolean);
					if (saves.length && existing) {
						await db.dnd5eClassSavingThrow.deleteMany({ where: { classId: existing.id } });
						for (const stat of saves) await db.dnd5eClassSavingThrow.create({ data: { classId: existing.id, stat } });
					}
					// Upsert skill options (SkillPool column — comma-separated)
					const pool = (row.skillPool || '').split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
					if (pool.length && existing) {
						await db.dnd5eClassSkillOption.deleteMany({ where: { classId: existing.id } });
						for (const skill of pool) await db.dnd5eClassSkillOption.create({ data: { classId: existing.id, skill: skill as any } });
					}
					updated++;
				} else {
					const newClass = await dnd5e.classes.create({
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
						skillChoiceCount:         row.skillChoiceCount != null && row.skillChoiceCount !== '' ? toInt(row.skillChoiceCount, 2) : undefined,
					}, locals.user!.id);
					// Insert saving throws (grantsSavingThrows column — comma-sep)
					const saves = (normalizeStats(row.grantsSavingThrows, warnings, row.name) ?? '').split(',').filter(Boolean);
					for (const stat of saves) await db.dnd5eClassSavingThrow.create({ data: { classId: newClass.id, stat } });
					// Insert skill options
					const pool = (row.skillPool || '').split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
					for (const skill of pool) await db.dnd5eClassSkillOption.create({ data: { classId: newClass.id, skill: skill as any } });
					created++;
				}
			}
			dnd5e.invalidateSystemCache(params.id);
			return { success: true, created, updated, skipped, type: 'classes', warnings };
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
			const warnings: string[] = [];
			let created = 0; let updated = 0; let skipped = 0;
			const allClasses = await dnd5e.classes.getAll(params.id);
			for (const row of rows) {
				const cls = row.classId
					? allClasses.find(c => c.id === row.classId)
					: allClasses.find(c => normalize(c.name).toLowerCase() === normalize(row.className).toLowerCase());
				if (!cls) { skipped++; continue; }
				// Match on name + level so same-name features at different levels are distinct
				const existing = row.id
					? cls.features?.find((f: any) => f.id === row.id)
					: cls.features?.find((f: any) =>
						f.name === row.name && f.requiredLevel === toInt(row.requiredLevel)
					);
				if (existing) {
					if (!allowUpdate) { skipped++; continue; }
					await dnd5e.classFeatures.update(existing.id, {
						description:   row.description || null,
						requiredLevel: toInt(row.requiredLevel),
						url:           row.url         || null,
						...grantFields(row, warnings, row.name),
					});
					updated++;
				} else {
					await dnd5e.classFeatures.create({
						classId:       cls.id,
						name:          row.name,
						description:   row.description || undefined,
						requiredLevel: toInt(row.requiredLevel),
						url:           row.url         || undefined,
						...grantFields(row, warnings, row.name),
					}, locals.user!.id);
					created++;
				}
			}
			dnd5e.invalidateSystemCache(params.id);
			return { success: true, created, updated, skipped, type: 'classFeatures', warnings };
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
			const warnings: string[] = [];
			let created = 0; let updated = 0; let skipped = 0;
			const allClasses = await dnd5e.classes.getAll(params.id);
			for (const row of rows) {
				const cls = row.classId
					? allClasses.find(c => c.id === row.classId)
					: allClasses.find(c => normalize(c.name).toLowerCase() === normalize(row.className).toLowerCase());
				if (!cls) { skipped++; continue; }
				const existing = row.id
					? cls.subclasses?.find((s: any) => s.id === row.id)
					: cls.subclasses?.find((s: any) =>
						normalize(s.name).toLowerCase() === normalize(row.name).toLowerCase()
					);
				if (existing) {
					if (!allowUpdate) { skipped++; continue; }
					await dnd5e.subclasses.update(existing.id, {
						description:  row.description || null,
						source:       row.source      || null,
						link:         row.link        || null,
						sortOrder:    Number(row.sortOrder) || 0,
					});
					// Update canCastSpells separately if column is present
					if (row.canCastSpells !== undefined && row.canCastSpells !== '') {
						await dnd5e.subclasses.updateSpellcasting(existing.id, { canCastSpells: boolVal(row.canCastSpells) });
					}
					updated++;
				} else {
					await dnd5e.subclasses.create({
						classId:      cls.id,
						name:         row.name,
						description:  row.description || undefined,
						source:       row.source      || undefined,
						link:         row.link        || undefined,
						sortOrder:    Number(row.sortOrder) || 0,
					}, locals.user!.id);
					// canCastSpells set after create since create doesn't support it yet
					if (boolVal(row.canCastSpells)) {
						const fresh = (await dnd5e.classes.getAll(params.id))
							.flatMap((c: any) => c.subclasses ?? [])
							.find((s: any) => s.classId === cls.id && s.name === row.name);
						if (fresh) await dnd5e.subclasses.updateSpellcasting(fresh.id, { canCastSpells: true });
					}
					created++;
				}
			}
			dnd5e.invalidateSystemCache(params.id);
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
			const warnings: string[] = [];
			let created = 0; let updated = 0; let skipped = 0;
			const skipReasons: string[] = [];
			// Fetch all classes once outside the loop (N+1 fix)
			const allClasses = await dnd5e.classes.getAll(params.id);
			for (const row of rows) {
				const cls = row.classId
					? allClasses.find(c => c.id === row.classId)
					: allClasses.find(c => normalize(c.name).toLowerCase() === normalize(row.className).toLowerCase());
				if (!cls) {
					skipReasons.push(`Class not found: '${row.className}'`);
					skipped++; continue;
				}
				const sub = row.subclassId
					? cls.subclasses?.find((s: any) => s.id === row.subclassId)
					: cls.subclasses?.find((s: any) => normalize(s.name).toLowerCase() === normalize(row.subclassName).toLowerCase());
				if (!sub) {
					skipReasons.push(`Subclass not found: '${row.subclassName}' (class: '${row.className}')`);
					skipped++; continue;
				}
				const existing = row.id
					? sub.features?.find((f: any) => f.id === row.id)
					: sub.features?.find((f: any) =>
						f.name === row.name && f.requiredLevel === toInt(row.requiredLevel)
					);
				if (existing) {
					if (!allowUpdate) { skipped++; continue; }
					await dnd5e.subclassFeatures.update(existing.id, {
						description:   row.description || null,
						requiredLevel: toInt(row.requiredLevel),
						url:           row.url         || null,
						...grantFields(row, warnings, row.name),
					});
					updated++;
				} else {
					await dnd5e.subclassFeatures.create({
						subclassId:    sub.id,
						name:          row.name,
						description:   row.description || undefined,
						requiredLevel: toInt(row.requiredLevel),
						url:           row.url         || undefined,
						...grantFields(row, warnings, row.name),
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
			const warnings: string[] = [];
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
				const existing = row.id
					? await db.dnd5eSpecies.findUnique({ where: { id: row.id } })
					: await db.dnd5eSpecies.findFirst({
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
			const warnings: string[] = [];
			let created = 0; let updated = 0; let skipped = 0;
			const skipReasons: string[] = [];
			// Fetch all species once outside the loop (N+1 fix)
			const allSpecies = await dnd5e.species.getAll(params.id);
			for (const row of rows) {
				const traitName = normalize(row.name);
				if (!traitName) { skipped++; continue; }
				const sp = row.speciesId
					? allSpecies.find(s => s.id === row.speciesId)
					: allSpecies.find(s => normalize(s.name).toLowerCase() === normalize(row.speciesName).toLowerCase());
				if (!sp) {
					skipReasons.push(`Species not found: '${row.speciesName}'`);
					skipped++; continue;
				}
				const traitData = {
					description:   row.description || null,
					requiredLevel: toInt(row.requiredLevel, 0) || undefined,
					size:        normalize(row.size)        || null,
					sizeChoices: normalize(row.sizeChoices) || null,
					senses:      normalize(row.senses)      || null,
					...grantFields(row, warnings, row.name),
				};
				const existing = row.id
					? await db.dnd5eSpeciesTrait.findUnique({ where: { id: row.id }, select: { id: true } })
					: await db.dnd5eSpeciesTrait.findFirst({
						where: { speciesId: sp.id, name: { equals: traitName, mode: 'insensitive' } },
						select: { id: true },
					});
				if (existing) {
					if (!allowUpdate) { skipped++; continue; }
					await db.dnd5eSpeciesTrait.update({ where: { id: existing.id }, data: traitData });
					const speeds = parseSpeeds(row);
					await dnd5e.speciesTraits.updateSpeeds(existing.id, speeds);
					updated++;
				} else {
					const newTrait = await dnd5e.speciesTraits.create({ speciesId: sp.id, name: traitName, ...traitData });
					const speeds = parseSpeeds(row);
					if (speeds.length) await dnd5e.speciesTraits.updateSpeeds(newTrait.id, speeds);
					created++;
				}
			}
			const uniqueReasons = [...new Set(skipReasons)].slice(0, 20);
			return { success: true, created, updated, skipped, type: 'speciesTraits', skipReasons: uniqueReasons, warnings };
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
			const warnings: string[] = [];
			let created = 0; let updated = 0; let skipped = 0;
			const all = await dnd5e.feats.getAllForAdmin(params.id);
			for (const row of rows) {
				const existing = row.id
					? all.find((f: any) => f.id === row.id)
					: all.find((f: any) => normalize(f.name).toLowerCase() === normalize(row.name).toLowerCase());
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
						...grantFields(row, warnings, row.name),
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
						...grantFields(row, warnings, row.name),
					}, locals.user!.id);
					created++;
				}
			}
			dnd5e.invalidateSystemCache(params.id);
			return { success: true, created, updated, skipped, type: 'feats', warnings };
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
			const { db } = await import('@core/database');
			const rows: any[] = JSON.parse(raw);
			const warnings: string[] = [];
			let created = 0; let updated = 0; let skipped = 0;
			const all = await dnd5e.backgrounds.getAll(params.id);
			for (const row of rows) {
				const existing = row.id
					? all.find(b => b.id === row.id)
					: all.find(b => normalize(b.name).toLowerCase() === normalize(row.name).toLowerCase());

			if (existing) {
					if (!allowUpdate) { skipped++; continue; }
					await dnd5e.backgrounds.update(existing.id, {
						shortDescription:   row.shortDescription   || null,
						featureName:        row.featureName        || null,
						grantsFeatCategory: row.grantsFeatCategory || null,
						grantsFeatId:       row.grantsFeatId       || null,
						url:                row.url                || null,
						sortOrder:          Number(row.sortOrder)  || 0,
						toolProficiencies:  normalizeList(row.grantsTools ?? row.toolProficiencies),
						languages:          normalizeList(row.grantsLanguages ?? row.languages),
						...grantFields(row, warnings, row.name),
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
						url:                row.url                || undefined,
						sortOrder:          Number(row.sortOrder)  || 0,
						toolProficiencies:  normalizeList(row.grantsTools ?? row.toolProficiencies) ?? undefined,
						languages:          normalizeList(row.grantsLanguages ?? row.languages) ?? undefined,
						...grantFields(row, warnings, row.name),
					}, locals.user!.id);
					created++;
				}
			}
			dnd5e.invalidateSystemCache(params.id);
			return { success: true, created, updated, skipped, type: 'backgrounds', warnings };
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

	importSpells: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data        = await request.formData();
		const raw         = data.get('json')?.toString() ?? '';
		if (!raw) return fail(400, { message: 'No data provided.' });
		let rows: any[];
		try { rows = JSON.parse(raw); } catch { return fail(400, { message: 'Invalid JSON.' }); }

		const { dnd5e } = await import('@core/database');
		let imported = 0; const errors: string[] = [];

		for (const r of rows) {
			try {
				const levelRaw = normalize(r['Level'] ?? r['level'] ?? '');
				const level    = levelRaw.toLowerCase() === 'cantrip' ? 0 : parseInt(levelRaw, 10) || 0;
				const bool     = (k: string) => boolVal(r[k] ?? r[k.toLowerCase()]);
				const str      = (k: string) => normalize(r[k] ?? r[k.toLowerCase()] ?? '') || null;
				const num      = (k: string) => { const v = r[k] ?? r[k.toLowerCase()]; return v !== '' && v != null ? Number(v) : null; };

				await dnd5e.spells.upsert({
					gameSystemId:            params.id,
					spellId:                 Number(r['Spell ID'] ?? r['spellId'] ?? 0),
					name:                    normalize(r['Name'] ?? r['name'] ?? ''),
					link:                    str('Link') ?? str('link'),
					level,
					school:                  normalize(r['School'] ?? r['school'] ?? ''),
					concentration:           bool('Concentration'),
					ritual:                  bool('Ritual'),
					isHomebrew:              bool('Is Homebrew'),
					isLegacy:                bool('Is Legacy'),
					cantripDamage:           str('Cantrip Damage'),
					cantripDamageLvl5:       str('Cantrip Dmg Lvl 5'),
					cantripDamageLvl11:      str('Cantrip Dmg Lvl 11'),
					cantripDamageLvl17:      str('Cantrip Dmg Lvl 17'),
					spellDamage:             str('Spell Damage'),
					spellUpcastPerSlot:      str('Upcast Per Slot'),
					spellUpcastEveryTwoSlots: str('Upcast Every 2 Slots'),
					spellProgression:        str('Spell Progression'),
					spellProgressionNote:    str('Progression Note'),
					rangeOrigin:             str('Range Origin'),
					rangeValue:              num('Range Value (ft)'),
					aoeType:                 str('AoE Type'),
					aoeValue:                num('AoE Value (ft)'),
					durationType:            str('Duration Type'),
					durationInterval:        num('Duration Interval'),
					durationUnit:            str('Duration Unit'),
					requiresSavingThrow:     bool('Requires Saving Throw'),
					savingThrow:      str('Saving Throw'),
					requiresAttackRoll:      bool('Requires Attack Roll'),
					canCastAtHigherLevel:    bool('Can Cast Higher Level'),
					castingTime:             str('Casting Time'),
					components:              str('Components'),
					description:             str('Description'),
					sourceBook:              str('Source Book'),
					tags:                    str('Tags'),
					spellList:               str('Spell List'),
				});
				imported++;
			} catch (e: any) { errors.push(`${r['Name'] ?? '?'}: ${e.message}`); }
		}
		return { success: true, imported, skipped: errors.length, errors, type: 'spells' };
	},

	deleteSpells: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const { db } = await import('@core/database');
		const { count } = await db.dnd5eSpell.deleteMany({ where: { gameSystemId: params.id } });
		return { deleteSuccess: true, deleted: count, type: 'spells' };
	},

	importSpellSlots: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const raw  = data.get('json')?.toString() ?? '';
		if (!raw) return fail(400, { message: 'No data provided.' });
		let rows: any[];
		try { rows = JSON.parse(raw); } catch { return fail(400, { message: 'Invalid JSON.' }); }
		const { dnd5e } = await import('@core/database');

		// Resolve class/subclass IDs by name — IDs are system-specific and not portable
		const classes = await dnd5e.classes.getAll(params.id);
		const classByName = new Map(classes.map((c: any) => [c.name.toLowerCase(), c]));

		let imported = 0; const errors: string[] = [];
		for (const r of rows) {
			try {
				const className    = normalize(r['Class Name']    ?? r['className']    ?? '');
				const subclassName = normalize(r['Subclass Name'] ?? r['subclassName'] ?? '');
				const cls          = classByName.get(className.toLowerCase());
				if (!cls) { errors.push(`Class "${className}" not found in this game system.`); continue; }

				let subclassId = '';
				if (subclassName) {
					const sub = (cls.subclasses ?? []).find((s: any) => s.name.toLowerCase() === subclassName.toLowerCase());
					if (!sub) { errors.push(`Subclass "${subclassName}" not found under "${className}".`); continue; }
					subclassId = sub.id;
				}

				await dnd5e.spellSlots.upsert({
					gameSystemId: params.id,
					classId:      cls.id,
					className:    cls.name,
					subclassId,
					subclassName,
					casterType:   normalize(r['Caster Type'] ?? r['casterType'] ?? '').toUpperCase(),
					classLevel:   Number(r['Level'] ?? r['classLevel'] ?? 0),
					slot1: Number(r['Slot 1'] ?? r['slot1'] ?? 0),
					slot2: Number(r['Slot 2'] ?? r['slot2'] ?? 0),
					slot3: Number(r['Slot 3'] ?? r['slot3'] ?? 0),
					slot4: Number(r['Slot 4'] ?? r['slot4'] ?? 0),
					slot5: Number(r['Slot 5'] ?? r['slot5'] ?? 0),
					slot6: Number(r['Slot 6'] ?? r['slot6'] ?? 0),
					slot7: Number(r['Slot 7'] ?? r['slot7'] ?? 0),
					slot8: Number(r['Slot 8'] ?? r['slot8'] ?? 0),
					slot9: Number(r['Slot 9'] ?? r['slot9'] ?? 0),
				});
				imported++;
			} catch (e: any) { errors.push(`Row ${r['Class Name'] ?? '?'} Lv${r['Level'] ?? '?'}: ${e.message}`); }
		}
		return { success: true, imported, skipped: errors.length, errors, type: 'spell slots' };
	},

	deleteSpellSlots: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const { db } = await import('@core/database');
		const { count } = await db.dnd5eSpellSlotProgression.deleteMany({ where: { gameSystemId: params.id } });
		return { deleteSuccess: true, deleted: count, type: 'spell slots' };
	},

	importSpellsKnown: async ({ params, request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'create' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const raw  = data.get('json')?.toString() ?? '';
		if (!raw) return fail(400, { message: 'No data provided.' });
		let rows: any[];
		try { rows = JSON.parse(raw); } catch { return fail(400, { message: 'Invalid JSON.' }); }
		const { dnd5e } = await import('@core/database');

		// Resolve class/subclass IDs by name — IDs are system-specific and not portable
		const classes = await dnd5e.classes.getAll(params.id);
		const classByName = new Map(classes.map((c: any) => [c.name.toLowerCase(), c]));

		const gn = (v: any) => (v !== '' && v != null) ? Number(v) : null;
		let imported = 0; const errors: string[] = [];
		for (const r of rows) {
			try {
				const className    = normalize(r['Class Name']    ?? r['className']    ?? '');
				const subclassName = normalize(r['Subclass Name'] ?? r['subclassName'] ?? '');
				const cls          = classByName.get(className.toLowerCase());
				if (!cls) { errors.push(`Class "${className}" not found in this game system.`); continue; }

				let subclassId = '';
				if (subclassName) {
					const sub = (cls.subclasses ?? []).find((s: any) => s.name.toLowerCase() === subclassName.toLowerCase());
					if (!sub) { errors.push(`Subclass "${subclassName}" not found under "${className}".`); continue; }
					subclassId = sub.id;
				}

				await dnd5e.spellsKnown.upsert({
					gameSystemId: params.id,
					classId:      cls.id,
					className:    cls.name,
					subclassId,
					subclassName,
					classLevel:   Number(r['Level'] ?? r['classLevel'] ?? 0),
					cantrips:     gn(r['Cantrips']   ?? r['cantrips']),
					prepared:     gn(r['Prepared']   ?? r['prepared']),
					additional:   gn(r['Additional'] ?? r['additional']),
					note:         normalize(r['Note'] ?? r['note'] ?? '') || null,
				});
				imported++;
			} catch (e: any) { errors.push(`Row ${r['Class Name'] ?? '?'} Lv${r['Level'] ?? '?'}: ${e.message}`); }
		}
		return { success: true, imported, skipped: errors.length, errors, type: 'spells known' };
	},

	deleteSpellsKnown: async ({ params, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'GameSystem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const { db } = await import('@core/database');
		const { count } = await db.dnd5eSpellsKnownProgression.deleteMany({ where: { gameSystemId: params.id } });
		return { deleteSuccess: true, deleted: count, type: 'spells known' };
	},
};