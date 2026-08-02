// apps/frontend/src/routes/(protected)/tools/codex/codex-filter.ts
// Client-side structured filter engine for the D&D 5e Codex.

export type CodexType = 'classes' | 'species' | 'feats' | 'backgrounds' | 'spells';
export type FilterOp = 'contains' | 'equals' | 'gte' | 'lte';
export type FilterJoin = 'and' | 'or';

export type FilterRow = {
	id: number;
	field: string;
	op: FilterOp;
	value: string;
	/** How this row combines with the previous row. Ignored for the first row. */
	join: FilterJoin;
};

export type FieldDef = {
	key: string;
	label: string;
	kind: 'string' | 'number' | 'boolean';
	scope: 'parent' | 'feature' | 'subclass' | 'subclassFeature' | 'trait';
	/** Object property names — a row matches if any prop matches (OR within field). */
	props: string[];
	/** Optional optgroup label in the field picker. */
	group: string;
};

const SHARED_GRANTS: { suffix: string; label: string; props: string[] }[] = [
	{
		suffix: 'skills',
		label: 'Skills',
		props: ['grantsSkills', 'grantsHalfSkills', 'skillChoicePool', 'expertiseChoicePool', 'grantsExpertise'],
	},
	{
		suffix: 'saves',
		label: 'Saves Proficiency',
		props: ['grantsSavingThrows', 'savingThrowChoicePool'],
	},
	{ suffix: 'resistances', label: 'Resistances', props: ['grantsResistances'] },
	{ suffix: 'immunities', label: 'Immunities', props: ['grantsImmunities'] },
	{ suffix: 'vulnerabilities', label: 'Vulnerabilities', props: ['grantsVulnerabilities'] },
	{ suffix: 'spells', label: 'Includes Spells', props: ['grantsInnateSpells'] },
	{ suffix: 'speed', label: 'Speed', props: ['grantsSpeed'] },
	{ suffix: 'senses', label: 'Senses', props: ['grantsSenses'] },
	{ suffix: 'tools', label: 'Tools', props: ['grantsTools', 'toolChoicePool'] },
	{ suffix: 'languages', label: 'Languages', props: ['grantsLanguages', 'languageChoicePool'] },
];

/** Optgroup labels — HTML optgroup is flat, so hierarchy is encoded in the label. */
const G = {
	classes: 'Classes',
	classFeatures: 'Classes › Class features',
	subclasses: 'Classes › Subclasses',
	subclassFeatures: 'Classes › Subclasses › Subclass features',
	species: 'Species',
	traits: 'Species › Traits',
	feats: 'Feats',
	backgrounds: 'Backgrounds',
	spells: 'Spells',
} as const;

function grantFields(
	scope: FieldDef['scope'],
	prefix: string,
	group: string,
	opts?: { excludeSuffixes?: readonly string[] },
): FieldDef[] {
	const exclude = new Set(opts?.excludeSuffixes ?? []);
	return SHARED_GRANTS
		.filter(g => !exclude.has(g.suffix))
		.map(g => ({
			key: `${prefix}.${g.suffix}`,
			label: g.label,
			kind: 'string' as const,
			scope,
			props: g.props,
			group,
		}));
}

function f(
	key: string,
	label: string,
	kind: FieldDef['kind'],
	scope: FieldDef['scope'],
	props: string[],
	group: string,
): FieldDef {
	return { key, label, kind, scope, props, group };
}

export const FIELD_CATALOG: Record<CodexType, FieldDef[]> = {
	classes: [
		f('class.name', 'Name', 'string', 'parent', ['name'], G.classes),
		f('class.source', 'Source', 'string', 'parent', ['source'], G.classes),
		f('class.description', 'Description', 'string', 'parent', ['description'], G.classes),
		f('class.hitDice', 'Hit Dice', 'number', 'parent', ['hitDice'], G.classes),
		f('class.canCastSpells', 'Can Cast Spells', 'boolean', 'parent', ['canCastSpells'], G.classes),
		f('class.primaryAbilities', 'Primary Abilities', 'string', 'parent', ['primaryAbilities'], G.classes),
		f('class.equipmentDescription', 'Equipment', 'string', 'parent', ['equipmentDescription'], G.classes),
		f('feature.name', 'Name', 'string', 'feature', ['name'], G.classFeatures),
		f('feature.description', 'Description', 'string', 'feature', ['description'], G.classFeatures),
		...grantFields('feature', 'feature', G.classFeatures),
		f('subclass.name', 'Name', 'string', 'subclass', ['name'], G.subclasses),
		f('subclass.source', 'Source', 'string', 'subclass', ['source'], G.subclasses),
		f('subclass.description', 'Description', 'string', 'subclass', ['description'], G.subclasses),
		f('subclass.canCastSpells', 'Can Cast Spells', 'boolean', 'subclass', ['canCastSpells'], G.subclasses),
		f('subclassFeature.name', 'Name', 'string', 'subclassFeature', ['name'], G.subclassFeatures),
		f('subclassFeature.description', 'Description', 'string', 'subclassFeature', ['description'], G.subclassFeatures),
		...grantFields('subclassFeature', 'subclassFeature', G.subclassFeatures),
	],
	species: [
		f('species.name', 'Name', 'string', 'parent', ['name'], G.species),
		f('species.source', 'Source', 'string', 'parent', ['source'], G.species),
		f('species.description', 'Description', 'string', 'parent', ['description'], G.species),
		f('species.isSubrace', 'Is Subrace', 'boolean', 'parent', ['isSubrace'], G.species),
		f('trait.name', 'Name', 'string', 'trait', ['name'], G.traits),
		f('trait.description', 'Description', 'string', 'trait', ['description'], G.traits),
		f('trait.size', 'Size', 'string', 'trait', ['size', 'sizeChoices'], G.traits),
		// Both physical senses text and grant column (OR within field).
		f('trait.senses', 'Senses', 'string', 'trait', ['senses', 'grantsSenses'], G.traits),
		...grantFields('trait', 'trait', G.traits, { excludeSuffixes: ['senses'] }),
	],
	feats: [
		f('feat.name', 'Name', 'string', 'parent', ['name'], G.feats),
		f('feat.source', 'Source', 'string', 'parent', ['source'], G.feats),
		f('feat.description', 'Description', 'string', 'parent', ['description', 'snippet'], G.feats),
		f('feat.categories', 'Categories', 'string', 'parent', ['categories'], G.feats),
		f('feat.prerequisites', 'Prerequisites', 'string', 'parent', ['prerequisites'], G.feats),
		f('feat.isEpicBoon', 'Is Epic Boon', 'boolean', 'parent', ['isEpicBoon'], G.feats),
		f('feat.repeatable', 'Is Repeatable', 'boolean', 'parent', ['repeatable'], G.feats),
		f('feat.grantsAsi', 'Grants ASI', 'string', 'parent', ['asiStatFixed', 'asiStatChoices'], G.feats),
		...grantFields('parent', 'feat', G.feats),
	],
	backgrounds: [
		f('background.name', 'Name', 'string', 'parent', ['name'], G.backgrounds),
		f('background.shortDescription', 'Short Description', 'string', 'parent', ['shortDescription'], G.backgrounds),
		f('background.featureName', 'Feature Name', 'string', 'parent', ['featureName'], G.backgrounds),
		f('background.toolProficiencies', 'Tool Proficiencies', 'string', 'parent', ['toolProficiencies'], G.backgrounds),
		f('background.languages', 'Languages', 'string', 'parent', ['languages'], G.backgrounds),
		f('background.grantsFeatCategory', 'Grants Feat Category', 'string', 'parent', ['grantsFeatCategory'], G.backgrounds),
		...grantFields('parent', 'background', G.backgrounds),
	],
	spells: [
		f('spell.name', 'Name', 'string', 'parent', ['name'], G.spells),
		f('spell.sourceBook', 'Source Book', 'string', 'parent', ['sourceBook'], G.spells),
		f('spell.description', 'Description', 'string', 'parent', ['description'], G.spells),
		f('spell.level', 'Level', 'number', 'parent', ['level'], G.spells),
		f('spell.school', 'School', 'string', 'parent', ['school'], G.spells),
		f('spell.spellList', 'Spell List', 'string', 'parent', ['spellList'], G.spells),
		f('spell.tags', 'Tags', 'string', 'parent', ['tags'], G.spells),
		f('spell.castingTime', 'Casting Time', 'string', 'parent', ['castingTime'], G.spells),
		f('spell.components', 'Components', 'string', 'parent', ['components'], G.spells),
		f('spell.concentration', 'Concentration', 'boolean', 'parent', ['concentration'], G.spells),
		f('spell.ritual', 'Ritual', 'boolean', 'parent', ['ritual'], G.spells),
		f('spell.requiresSavingThrow', 'Requires Saving Throw', 'boolean', 'parent', ['requiresSavingThrow'], G.spells),
		f('spell.savingThrow', 'Required Saving Throw', 'string', 'parent', ['savingThrow'], G.spells),
		f('spell.requiresAttackRoll', 'Requires Attack Roll', 'boolean', 'parent', ['requiresAttackRoll'], G.spells),
		f('spell.rangeOrigin', 'Origin', 'string', 'parent', ['rangeOrigin'], G.spells),
		f('spell.rangeValue', 'Range', 'number', 'parent', ['rangeValue'], G.spells),
		f('spell.aoeType', 'Area of Effect', 'string', 'parent', ['aoeType'], G.spells),
		f('spell.durationType', 'Duration', 'string', 'parent', ['durationType'], G.spells),
		f('spell.spellDamage', 'Damage', 'string', 'parent', ['spellDamage'], G.spells),
	],
};

export function opsForKind(kind: FieldDef['kind']): FilterOp[] {
	if (kind === 'number') return ['equals', 'gte', 'lte'];
	if (kind === 'boolean') return ['equals'];
	return ['contains', 'equals'];
}

export function opLabel(op: FilterOp): string {
	if (op === 'contains') return 'contains';
	if (op === 'equals') return 'equals';
	if (op === 'gte') return '≥';
	return '≤';
}

export function findFieldDef(key: string): FieldDef | undefined {
	for (const list of Object.values(FIELD_CATALOG)) {
		const hit = list.find(f => f.key === key);
		if (hit) return hit;
	}
	return undefined;
}

function matchProp(val: unknown, kind: FieldDef['kind'], op: FilterOp, raw: string): boolean {
	const needle = raw.trim().toLowerCase();

	if (kind === 'boolean' || typeof val === 'boolean') {
		const want = needle === 'true' || needle === '1' || needle === 'yes';
		const wantFalse = needle === 'false' || needle === '0' || needle === 'no';
		if (!want && !wantFalse) return false;
		return op === 'equals' ? val === want : false;
	}
	if (kind === 'number' || typeof val === 'number') {
		const n = Number(raw);
		if (Number.isNaN(n)) return false;
		const num = typeof val === 'number' ? val : Number(val);
		if (Number.isNaN(num)) return false;
		if (op === 'equals') return num === n;
		if (op === 'gte') return num >= n;
		if (op === 'lte') return num <= n;
		return false;
	}
	const s = val == null ? '' : String(val).toLowerCase();
	if (op === 'equals') return s === needle;
	if (op === 'contains') return s.includes(needle);
	return false;
}

/** Match an object against one filter row (any listed prop may match). */
export function matchObj(obj: any, def: FieldDef, op: FilterOp, raw: string): boolean {
	if (!raw.trim() && def.kind !== 'boolean') return true;
	return def.props.some(prop => matchProp(obj?.[prop], def.kind, op, raw));
}

function catalogMap(type: CodexType): Map<string, FieldDef> {
	return new Map(FIELD_CATALOG[type].map(fd => [fd.key, fd]));
}

function activeRows(filters: FilterRow[]): FilterRow[] {
	return filters.filter(r => {
		const def = findFieldDef(r.field);
		if (!def) return false;
		if (def.kind === 'boolean') return r.value.trim() !== '';
		return r.value.trim() !== '';
	});
}

function combineRowResults(oks: boolean[], rows: FilterRow[]): boolean {
	if (!oks.length) return true;
	let acc = oks[0];
	for (let i = 1; i < oks.length; i++) {
		acc = rows[i].join === 'or' ? acc || oks[i] : acc && oks[i];
	}
	return acc;
}

export type MatchedClass = {
	parent: any;
	features: any[];
	subclasses: { parent: any; features: any[] }[];
};

export type MatchedSpecies = {
	parent: any;
	traits: any[];
};

function rowOkClass(cls: any, row: FilterRow, map: Map<string, FieldDef>): boolean {
	const def = map.get(row.field);
	if (!def) return false;
	if (def.scope === 'parent') return matchObj(cls, def, row.op, row.value);
	if (def.scope === 'feature') {
		return (cls.features ?? []).some((ft: any) => matchObj(ft, def, row.op, row.value));
	}
	if (def.scope === 'subclass') {
		return (cls.subclasses ?? []).some((sc: any) => matchObj(sc, def, row.op, row.value));
	}
	if (def.scope === 'subclassFeature') {
		return (cls.subclasses ?? []).some((sc: any) =>
			(sc.features ?? []).some((ft: any) => matchObj(ft, def, row.op, row.value)),
		);
	}
	return false;
}

export function filterClasses(classes: any[], filters: FilterRow[]): MatchedClass[] {
	const rows = activeRows(filters);
	const map = catalogMap('classes');
	const out: MatchedClass[] = [];

	const featureRows = rows.filter(r => map.get(r.field)?.scope === 'feature');
	const subclassRows = rows.filter(r => map.get(r.field)?.scope === 'subclass');
	const scFeatureRows = rows.filter(r => map.get(r.field)?.scope === 'subclassFeature');

	for (const cls of classes) {
		const oks = rows.map(r => rowOkClass(cls, r, map));
		if (!combineRowResults(oks, rows)) continue;

		const matchedFeatures = (cls.features ?? []).filter((ft: any) =>
			featureRows.some(r => {
				const def = map.get(r.field)!;
				return matchObj(ft, def, r.op, r.value);
			}),
		);
		const features = !featureRows.length
			? (cls.features ?? [])
			: matchedFeatures.length
				? matchedFeatures
				: (cls.features ?? []);

		const subclasses: MatchedClass['subclasses'] = [];
		for (const sc of cls.subclasses ?? []) {
			const scMatch = subclassRows.length
				? subclassRows.some(r => matchObj(sc, map.get(r.field)!, r.op, r.value))
				: false;
			const matchedScFeatures = (sc.features ?? []).filter((ft: any) =>
				scFeatureRows.some(r => matchObj(ft, map.get(r.field)!, r.op, r.value)),
			);
			const hasScFeatureHit = matchedScFeatures.length > 0;

			if (subclassRows.length || scFeatureRows.length) {
				if (!scMatch && !hasScFeatureHit) {
					// Keep full tree only when class matched via a non-subclass OR branch
					continue;
				}
			}

			const scFeatures = !scFeatureRows.length
				? (sc.features ?? [])
				: matchedScFeatures.length
					? matchedScFeatures
					: (sc.features ?? []);

			subclasses.push({ parent: sc, features: scFeatures });
		}

		const subclassesOut = !(subclassRows.length || scFeatureRows.length)
			? (cls.subclasses ?? []).map((sc: any) => ({ parent: sc, features: sc.features ?? [] }))
			: subclasses.length
				? subclasses
				: (cls.subclasses ?? []).map((sc: any) => ({ parent: sc, features: sc.features ?? [] }));

		out.push({ parent: cls, features, subclasses: subclassesOut });
	}
	return out;
}

export function filterSpecies(species: any[], filters: FilterRow[]): MatchedSpecies[] {
	const rows = activeRows(filters);
	const map = catalogMap('species');
	const out: MatchedSpecies[] = [];
	const traitRows = rows.filter(r => map.get(r.field)?.scope === 'trait');

	for (const sp of species) {
		const oks = rows.map(r => {
			const def = map.get(r.field);
			if (!def) return false;
			if (def.scope === 'parent') return matchObj(sp, def, r.op, r.value);
			return (sp.traits ?? []).some((t: any) => matchObj(t, def, r.op, r.value));
		});
		if (!combineRowResults(oks, rows)) continue;

		const matchedTraits = (sp.traits ?? []).filter((t: any) =>
			traitRows.some(r => matchObj(t, map.get(r.field)!, r.op, r.value)),
		);
		const traits = !traitRows.length
			? (sp.traits ?? [])
			: matchedTraits.length
				? matchedTraits
				: (sp.traits ?? []);

		out.push({ parent: sp, traits });
	}
	return out;
}

export function filterFlat(items: any[], type: CodexType, filters: FilterRow[]): any[] {
	const rows = activeRows(filters);
	if (!rows.length) return items;
	const map = catalogMap(type);
	return items.filter(item => {
		const oks = rows.map(r => {
			const def = map.get(r.field);
			if (!def) return false;
			return matchObj(item, def, r.op, r.value);
		});
		return combineRowResults(oks, rows);
	});
}
