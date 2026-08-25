#!/usr/bin/env tsx
// scripts/docs-check.ts
// Validates doc structure: root stubs, index links, import-guide essentials.
// Run: pnpm docs:check

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

type Stub = { rootFile: string; target: string };

const STUBS: Stub[] = [
	{ rootFile: 'Commands.md', target: 'docs/setup.md' },
	{ rootFile: 'Devenvironmentsetup.md', target: 'docs/dev-environment.md' },
	{ rootFile: 'Dnd5eimportguide.md', target: 'docs/dnd5e/import-guide.md' },
	{ rootFile: 'FeaturesDev-1-Architecture.md', target: 'docs/architecture.md' },
	{ rootFile: 'FeaturesDev-2a-Features-Part1.md', target: 'docs/features/part1-characters-dms.md' },
	{ rootFile: 'FeaturesDev-2b-Features-Part2.md', target: 'docs/features/part2-quests-worlds.md' },
	{ rootFile: 'FeaturesDev-3-Technical.md', target: 'docs/technical.md' },
	{ rootFile: 'FeaturesDev-4a-Changelog-Early.md', target: 'CHANGELOG.md' },
	{ rootFile: 'FeaturesDev-4b-Changelog-Recent.md', target: 'CHANGELOG.md' },
	{ rootFile: 'FeaturesDev-6-UI-System.md', target: 'docs/ui-system.md' },
	{ rootFile: 'Featuresdev-5-dependencymap.md', target: 'docs/dependency-map.md' },
	{ rootFile: 'Improvements.md', target: 'docs/scratchpad.md' },
];

const REQUIRED_DOCS = [
	'docs/README.md',
	'docs/maintenance.md',
	'docs/setup.md',
	'docs/architecture.md',
	'docs/technical.md',
	'docs/ui-system.md',
	'docs/dnd5e/wizard.md',
	'docs/dnd5e/import-guide.md',
	'CHANGELOG.md',
];

let failed = false;

function fail(msg: string) {
	failed = true;
	console.error(`✗ ${msg}`);
}

function ok(msg: string) {
	console.log(`✓ ${msg}`);
}

// Required files exist
for (const rel of REQUIRED_DOCS) {
	const abs = join(ROOT, rel);
	if (!existsSync(abs)) fail(`Missing required doc: ${rel}`);
	else ok(`Found ${rel}`);
}

// Root stubs point at targets
for (const { rootFile, target } of STUBS) {
	const stubPath = join(ROOT, rootFile);
	if (!existsSync(stubPath)) {
		fail(`Missing root stub: ${rootFile}`);
		continue;
	}
	const content = readFileSync(stubPath, 'utf8');
	if (!content.includes(target)) {
		fail(`Stub ${rootFile} does not reference ${target}`);
	} else {
		ok(`Stub ${rootFile} → ${target}`);
	}
	const targetPath = join(ROOT, target);
	if (!existsSync(targetPath)) fail(`Stub target missing: ${target}`);
}

// Parse markdown links from docs/README.md
const indexPath = join(ROOT, 'docs/README.md');
const index = readFileSync(indexPath, 'utf8');
const linkRe = /\]\((\.\.?\/[^)]+)\)/g;
let match: RegExpExecArray | null;
const seen = new Set<string>();
while ((match = linkRe.exec(index)) !== null) {
	const href = match[1].split('#')[0];
	if (!href || href.startsWith('http') || seen.has(href)) continue;
	seen.add(href);
	const resolved = resolve(join(ROOT, 'docs'), href);
	if (!existsSync(resolved)) {
		fail(`Broken link in docs/README.md: ${href}`);
	} else {
		ok(`Link OK: docs/README.md → ${href}`);
	}
}

// Import guide sanity — grant fields documented
const importGuide = readFileSync(join(ROOT, 'docs/dnd5e/import-guide.md'), 'utf8');
for (const field of ['expertiseChoiceCount', 'expertiseChoicePool', 'skillChoiceCount', 'grantsSkills']) {
	if (!importGuide.includes(field)) fail(`import-guide.md missing field: ${field}`);
	else ok(`import-guide.md documents ${field}`);
}

// Dependency map must be auto-generated (run docs:generate-deps after dbapi changes)
const depMap = readFileSync(join(ROOT, 'docs/dependency-map.md'), 'utf8');
if (!depMap.includes('Auto-generated') || !depMap.includes('docs:generate-deps')) {
	fail('docs/dependency-map.md missing auto-generated header — run pnpm docs:generate-deps');
} else {
	ok('dependency-map.md has auto-generated header');
}

// ADR index links to existing files
const adrIndex = readFileSync(join(ROOT, 'docs/decisions/README.md'), 'utf8');
for (const m of adrIndex.matchAll(/\]\(\.\/(00\d-[^)]+)\)/g)) {
	const adrPath = join(ROOT, 'docs/decisions', m[1]);
	if (!existsSync(adrPath)) fail(`ADR link broken: docs/decisions/${m[1]}`);
	else ok(`ADR exists: ${m[1]}`);
}

if (failed) {
	console.error('\ndocs:check FAILED');
	process.exit(1);
}
console.log('\nAll documentation checks passed.');
