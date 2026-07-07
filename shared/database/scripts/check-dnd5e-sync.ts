// shared/database/scripts/check-dnd5e-sync.ts
// Verifies dnd5e duplicated logic AND import-guide ↔ admin import TABS.
//
// Run with: pnpm --filter @core/database check:dnd5e-sync
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { checkDnd5eImportGuide } from './check-dnd5e-import-guide.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot  = join(__dirname, '..', '..', '..');

type Pair = { a: string; b: string; symbols: string[] };

const PAIRS: Pair[] = [
    {
        a: 'shared/database/dbapi/read/dnd5e/skills.ts',
        b: 'shared/ui/src/gamesystems/dnd5e/skills.ts',
        symbols: ['SKILL_ABILITY', 'ALL_SKILLS', 'ALL_STATS', 'proficiencyBonus', 'abilityModifier'],
    },
    {
        a: 'shared/database/dbapi/read/dnd5e/feature-names.ts',
        b: 'shared/ui/src/gamesystems/dnd5e/feature-names.ts',
        symbols: ['normalizeFeatureName', 'isAsiFeatureName', 'isEpicBoonFeatureName'],
    },
];

function stripTypeOnlySyntax(source: string): string {
    return source
        .replace(/\sas const/g, '')
        .replace(/\sas \([^)]*\)\[\]/g, '')
        .replace(/:\s*Record<string,\s*string>/g, '')
        .replace(/\s+/g, '')
        .trim();
}

function extractSymbol(source: string, name: string): string | null {
    const re    = new RegExp(`export (?:const|function) ${name}\\b`);
    const match = re.exec(source);
    if (!match) return null;
    const start = match.index;
    const rest  = source.slice(start + match[0].length);
    const nextExportIdx = rest.search(/\n\s*export (?:const|function)\b/);
    const block = nextExportIdx === -1 ? rest : rest.slice(0, nextExportIdx);
    return stripTypeOnlySyntax(match[0] + block);
}

let failed = false;

console.log('── Duplicated @core/database ↔ @core/ui logic ──\n');

for (const { a, b, symbols } of PAIRS) {
    const aSource = readFileSync(join(repoRoot, a), 'utf8');
    const bSource = readFileSync(join(repoRoot, b), 'utf8');

    for (const symbol of symbols) {
        const aBlock = extractSymbol(aSource, symbol);
        const bBlock = extractSymbol(bSource, symbol);
        if (aBlock === null || bBlock === null) {
            failed = true;
            console.error(`✗ Missing export "${symbol}" in one of:\n    ${a}\n    ${b}`);
            continue;
        }
        if (aBlock !== bBlock) {
            failed = true;
            console.error(`✗ "${symbol}" differs between:\n    ${a}\n    ${b}`);
        } else {
            console.log(`✓ "${symbol}" in sync (${a.split('/').pop()} <-> ${b.split('/').pop()})`);
        }
    }
}

console.log('\n── Import guide ↔ admin import TABS ──\n');

if (!checkDnd5eImportGuide()) failed = true;

if (failed) {
    console.error('\ndnd5e sync check FAILED — see above.');
    process.exit(1);
}
console.log('\nAll dnd5e sync checks passed.');
