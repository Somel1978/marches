#!/usr/bin/env tsx
// scripts/generate-dependency-map.ts
// Scans shared/database/dbapi and finds importers across the monorepo.
// Run: pnpm docs:generate-deps

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'docs/dependency-map.md');

const SCAN_ROOTS = [
	'shared/database',
	'shared/rbac',
	'shared/email',
	'shared/ui/src',
	'shared/errors',
	'apps/admin/src',
	'apps/frontend/src',
	'apps/discord/src',
];

const SKIP = new Set(['node_modules', '.svelte-kit', 'build', 'dist']);

function walk(dir: string): string[] {
	const out: string[] = [];
	for (const name of readdirSync(dir)) {
		if (SKIP.has(name)) continue;
		const abs = join(dir, name);
		const st = statSync(abs);
		if (st.isDirectory()) out.push(...walk(abs));
		else if (/\.(ts|svelte)$/.test(name)) out.push(abs);
	}
	return out;
}

function extractExports(source: string): string[] {
	const names = new Set<string>();
	for (const m of source.matchAll(/^export\s+(?:async\s+)?function\s+(\w+)/gm)) names.add(m[1]);
	for (const m of source.matchAll(/^export\s+(?:type|interface)\s+(\w+)/gm)) names.add(m[1]);
	for (const m of source.matchAll(/^export\s+const\s+(\w+)/gm)) names.add(m[1]);
	const block = source.match(/^export\s*\{([^}]+)\}/m);
	if (block) {
		for (const part of block[1].split(',')) {
			const name = part.trim().split(/\s+as\s+/).pop()?.trim();
			if (name && /^\w+$/.test(name)) names.add(name);
		}
	}
	return [...names].sort();
}

function parseIndexSymbolMap(indexSource: string): Map<string, string> {
	const map = new Map<string, string>();
	for (const m of indexSource.matchAll(
		/import\s*\{([^}]+)\}\s*from\s*['"]\.\/dbapi\/([^'"]+)['"]/g,
	)) {
		const file = `shared/database/dbapi/${m[2].replace(/\.ts$/, '')}.ts`;
		for (const part of m[1].split(',')) {
			const bits = part.trim().split(/\s+as\s+/);
			const local = bits[bits.length - 1].trim();
			if (local) map.set(local, file);
		}
	}
	return map;
}

function sectionTitle(relPath: string): string {
	const parts = relPath.split('/');
	const dbapiIdx = parts.indexOf('dbapi');
	const segment = parts[dbapiIdx + 1] ?? 'other';

	let kindLabel: string;
	let domain: string;

	if (segment === 'read' || segment === 'write') {
		kindLabel = segment === 'read' ? 'DB Read' : 'DB Write';
		domain = parts[dbapiIdx + 2] ?? 'misc';
	} else if (segment === 'analytics') {
		kindLabel = 'DB Analytics';
		domain = 'analytics';
	} else if (segment === 'transactions') {
		kindLabel = 'DB Transactions';
		domain = 'transactions';
	} else {
		kindLabel = 'DB Other';
		domain = segment;
	}

	const domainLabel = domain.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	return `${kindLabel} — ${domainLabel}`;
}

function findCallers(
	fileRel: string,
	exports: string[],
	symbolToFile: Map<string, string>,
	allSources: Map<string, string>,
): string[] {
	const callers = new Set<string>();
	const base = fileRel.split('/').pop() ?? fileRel;
	const pathNeedle = fileRel.replace(/^shared\/database\//, '');

	for (const [abs, source] of allSources) {
		if (abs.endsWith(fileRel)) continue;
		const rel = relative(ROOT, abs);

		if (source.includes(pathNeedle) || source.includes(base)) {
			callers.add(rel);
			continue;
		}

		for (const sym of exports) {
			if (symbolToFile.get(sym) === fileRel && new RegExp(`\\b${sym}\\b`).test(source)) {
				callers.add(rel);
				break;
			}
		}
	}

	return [...callers].sort();
}

function main() {
	const dbapiRoot = join(ROOT, 'shared/database/dbapi');
	const dbapiFiles = walk(dbapiRoot)
		.map((abs) => relative(ROOT, abs))
		.filter((p) => p.endsWith('.ts'))
		.sort();

	const allPaths = SCAN_ROOTS.flatMap((r) => walk(join(ROOT, r)));
	const allSources = new Map<string, string>();
	for (const abs of allPaths) {
		allSources.set(abs, readFileSync(abs, 'utf8'));
	}

	const indexSource = readFileSync(join(ROOT, 'shared/database/index.ts'), 'utf8');
	const symbolToFile = parseIndexSymbolMap(indexSource);

	const sections = new Map<string, { file: string; exports: string[]; callers: string[] }[]>();

	for (const fileRel of dbapiFiles) {
		const source = readFileSync(join(ROOT, fileRel), 'utf8');
		const exports = extractExports(source);
		const callers = findCallers(fileRel, exports, symbolToFile, allSources);
		const title = sectionTitle(fileRel);
		if (!sections.has(title)) sections.set(title, []);
		sections.get(title)!.push({ file: fileRel, exports, callers });
	}

	const generatedAt = new Date().toISOString().slice(0, 10);
	const lines: string[] = [
		'# Marches — Codebase Dependency Map',
		'',
		'> **Auto-generated** by `pnpm docs:generate-deps`. Do not edit by hand.',
		`> Generated: ${generatedAt}`,
		'> See [maintenance.md](./maintenance.md).',
		'',
	];

	const sortedSections = [...sections.keys()].sort();
	for (const title of sortedSections) {
		lines.push(`## ${title}`, '');
		for (const { file, exports, callers } of sections.get(title)!) {
			lines.push(`### \`${file}\``);
			if (exports.length) lines.push(`**Exports:** ${exports.join(', ')}`);
			lines.push('');
			if (callers.length) {
				lines.push('**Called by:**');
				for (const c of callers) lines.push(`- \`${c}\``);
			} else {
				lines.push('**Called by:** *(no direct importers found — may be used via index re-export only)*');
			}
			lines.push('');
		}
	}

	writeFileSync(OUT, lines.join('\n'));
	console.log(`Wrote ${relative(ROOT, OUT)} (${dbapiFiles.length} dbapi files, ${sortedSections.length} sections)`);
}

main();
