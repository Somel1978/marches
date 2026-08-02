// shared/database/dbapi/read/dnd5e/get-codex.ts
// Available-only D&D 5e reference corpus for the Community Codex tool.
import { db } from '../../../index.ts';
import { getDnd5eClasses, getDnd5eSpecies, getDnd5eBackgrounds } from './get-classes.ts';
import { getDnd5eFeats } from './get-feats.ts';

export async function getDnd5eCodexData(gameSystemId: string) {
    const [classes, species, backgrounds, feats, spells] = await Promise.all([
        getDnd5eClasses(gameSystemId),
        getDnd5eSpecies(gameSystemId),
        getDnd5eBackgrounds(gameSystemId),
        getDnd5eFeats(gameSystemId),
        db.dnd5eSpell.findMany({
            where:   { gameSystemId, isLegacy: false },
            orderBy: [{ level: 'asc' }, { name: 'asc' }],
        }),
    ]);

    return { classes, species, backgrounds, feats, spells };
}
