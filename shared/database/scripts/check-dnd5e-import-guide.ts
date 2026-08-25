// shared/database/scripts/check-dnd5e-import-guide.ts
// Validates docs/dnd5e/import-guide.md columns match admin import TABS.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');

const IMPORT_SVELTE = join(
	repoRoot,
	'apps/admin/src/routes/(app)/game-systems/[id]/data/import/dnd5e/+page.svelte',
);
const IMPORT_GUIDE = join(repoRoot, 'docs/dnd5e/import-guide.md');

/** Tab key → import-guide ## heading suffix */
const TAB_SECTIONS: Record<string, string> = {
	classes: '1. Classes',
	classFeatures: '2. Class Features',
	subclasses: '3. Subclasses',
	subclassFeatures: '4. Subclass Features',
	species: '5. Species',
	speciesTraits: '6. Species Traits',
	backgrounds: '7. Backgrounds',
	feats: '8. Feats',
	spells: '9. Spells',
	spellSlots: '10. Spell Slots',
	spellsKnown: '11. Spells Known',
};

const OPTIONAL_COLS = new Set([
	'id', 'uploadId', 'classId', 'classUploadId', 'subclassId', 'subclassUploadId',
	'Class Upload ID', 'Subclass Upload ID',
]);

type TabDef = { key: string; columns: string[] };

function parseTabs(source: string): TabDef[] {
	const tabs: TabDef[] = [];
	const block = source.match(/const TABS:[\s\S]*?\n\t];/);
	if (!block) throw new Error('Could not parse TABS from import +page.svelte');

	for (const m of block[0].matchAll(/key:\s*'(\w+)'[\s\S]*?columns:\s*\[([^\]]+)\]/g)) {
		const cols = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
		tabs.push({ key: m[1], columns: cols });
	}
	return tabs;
}

function parseCommonGrantFields(guide: string): Set<string> {
	const start = guide.indexOf('## Common Grant Fields');
	const end = guide.indexOf('\n---\n', start);
	const section = guide.slice(start, end === -1 ? undefined : end);
	const fields = new Set<string>();
	for (const m of section.matchAll(/\|\s*`([^`]+)`\s*\|/g)) {
		if (m[1] !== 'Field') fields.add(m[1]);
	}
	return fields;
}

function parseSectionFields(guide: string, heading: string): Set<string> {
	const re = new RegExp(`## ${heading.replace('.', '\\.')}[\\s\\S]*?(?=\\n## \\d+\\.|\\n## Format|$)`);
	const match = guide.match(re);
	if (!match) return new Set();
	const fields = new Set<string>();
	for (const m of match[0].matchAll(/\|\s*`([^`]+)`\s*\|/g)) {
		const name = m[1];
		if (name !== 'Field') fields.add(name);
	}
	return fields;
}

function sectionUsesCommonGrants(guide: string, heading: string): boolean {
	const re = new RegExp(`## ${heading.replace('.', '\\.')}[\\s\\S]*?(?=\\n## \\d+\\.|\\n## Format|$)`);
	const match = guide.match(re);
	return !!match && match[0].includes('Common Grant Fields');
}

export function checkDnd5eImportGuide(): boolean {
	let failed = false;
	const fail = (msg: string) => {
		failed = true;
		console.error(`✗ ${msg}`);
	};
	const ok = (msg: string) => console.log(`✓ ${msg}`);

	const svelte = readFileSync(IMPORT_SVELTE, 'utf8');
	const guide = readFileSync(IMPORT_GUIDE, 'utf8');
	const tabs = parseTabs(svelte);
	const common = parseCommonGrantFields(guide);

	ok(`Parsed ${tabs.length} import tabs from admin UI`);
	ok(`Parsed ${common.size} common grant fields from import-guide`);

	for (const tab of tabs) {
		const heading = TAB_SECTIONS[tab.key];
		if (!heading) {
			fail(`No TAB_SECTIONS mapping for tab "${tab.key}"`);
			continue;
		}

		let documented = parseSectionFields(guide, heading);
		if (sectionUsesCommonGrants(guide, heading)) {
			documented = new Set([...documented, ...common]);
		}

		const required = tab.columns.filter((c) => !OPTIONAL_COLS.has(c));
		const missingInGuide = required.filter((c) => !documented.has(c));
		const extraInGuide = [...documented].filter(
			(c) => !tab.columns.includes(c) && !OPTIONAL_COLS.has(c) && !common.has(c),
		);

		if (missingInGuide.length) {
			fail(`Tab "${tab.key}": columns in admin UI but not import-guide: ${missingInGuide.join(', ')}`);
		} else {
			ok(`Tab "${tab.key}": all ${required.length} required columns documented`);
		}

		// Warn-only for doc fields not in UI (legacy docs) — don't fail
		if (extraInGuide.length) {
			console.warn(`  ⚠ Tab "${tab.key}": documented but not in admin TABS: ${extraInGuide.join(', ')}`);
		}
	}

	if (failed) {
		console.error('\nimport-guide sync check FAILED');
		return false;
	}
	console.log('\nimport-guide is in sync with admin import TABS');
	return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	process.exit(checkDnd5eImportGuide() ? 0 : 1);
}
