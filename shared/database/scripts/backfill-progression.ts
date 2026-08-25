// shared/database/scripts/backfill-progression.ts
// One-off backfill for the level/earnedLevel split (Session 83).
//
// Before this change `Character.level` was written by two different writers with
// two different meanings. This script separates them permanently:
//   level       = sum of allocated class levels (approved power)
//   earnedLevel = level the progression totals entitle the character to
//
// Run with:  pnpm --filter @core/database backfill:progression
//            pnpm --filter @core/database backfill:progression -- --apply
//
// Without --apply the script only reports what it would change.
import { db } from '../index.ts';
import { resolveEarnedLevel } from '../dbapi/write/characters/progression.ts';

const apply = process.argv.includes('--apply');

async function main() {
    const thresholds = await db.progressionThreshold.findMany({
        orderBy: { xpRequired: 'asc' },
    });
    const bySystem = new Map<string, typeof thresholds>();
    for (const t of thresholds) {
        const list = bySystem.get(t.gameSystemId) ?? [];
        list.push(t);
        bySystem.set(t.gameSystemId, list);
    }

    const characters = await db.character.findMany({
        select: {
            id: true, name: true, gameSystemId: true, level: true, earnedLevel: true,
            totalXp: true, totalMilestones: true, progressionMode: true,
            status: true, statusReason: true,
            classes: { select: { allocatedLevel: true } },
        },
    });

    let changed = 0;
    const pendingMismatch: string[] = [];

    for (const c of characters) {
        const allocated = c.classes.reduce((s, cc) => s + cc.allocatedLevel, 0);
        // Characters with no class rows keep whatever level they already had.
        const approvedLevel = c.classes.length ? allocated : c.level;
        const earned = resolveEarnedLevel(
            c.progressionMode,
            { totalXp: c.totalXp, totalMilestones: c.totalMilestones },
            bySystem.get(c.gameSystemId) ?? [],
        );

        if (approvedLevel === c.level && earned === c.earnedLevel) continue;
        changed++;

        console.log(
            `${c.name.padEnd(28)} level ${c.level} -> ${approvedLevel}   ` +
            `earnedLevel ${c.earnedLevel} -> ${earned}` +
            (c.statusReason ? `   [${c.status}/${c.statusReason}]` : ''),
        );

        if (earned !== approvedLevel) {
            pendingMismatch.push(`${c.name}: earned ${earned} vs approved ${approvedLevel}`);
        }

        if (apply) {
            await db.character.update({
                where: { id: c.id },
                data:  { level: approvedLevel, earnedLevel: earned },
            });
        }
    }

    console.log(`\n${characters.length} characters scanned, ${changed} ${apply ? 'updated' : 'would change'}.`);

    if (pendingMismatch.length) {
        console.log(
            `\n${pendingMismatch.length} character(s) have an unresolved level allocation ` +
            `and will show as level-up/down pending:`,
        );
        for (const m of pendingMismatch) console.log(`  - ${m}`);
    }

    if (!apply) console.log('\nDry run. Re-run with --apply to write these changes.');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => db.$disconnect());
