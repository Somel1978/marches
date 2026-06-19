// apps/discord/src/commands/spellbook.ts
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { characters, dnd5e, gameSystems } from '@core/database';

function ordinal(n: number) { return `${n}${n===1?'st':n===2?'nd':n===3?'rd':'th'}`; }

async function resolveCharacter(linkedUser: any, charName: string) {
    const chars = await characters.getByUserId(linkedUser.id);
    return chars.find((c: any) => c.name.toLowerCase() === charName.toLowerCase())
        ?? chars.find((c: any) => c.name.toLowerCase().includes(charName.toLowerCase()));
}

async function getGameSystemId(): Promise<string | null> {
    const systems = await gameSystems.getAll();
    const dnd5eSystem = systems.find((s: any) => s.slug === 'dnd5e');
    return dnd5eSystem?.id ?? null;
}

export async function handleSpellbookListCommand(interaction: ChatInputCommandInteraction, linkedUser: any) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!linkedUser) return interaction.editReply('❌ Your Discord account is not linked. Visit /profile to connect.');

    const charName  = interaction.options.getString('character', true);
    const bookName  = interaction.options.getString('spellbook', true).toLowerCase();
    const char      = await resolveCharacter(linkedUser, charName);
    if (!char) return interaction.editReply(`❌ Character "${charName}" not found.`);

    const books = await dnd5e.spellbooks.getForCharacter(char.id);
    const book  = books.find((b: any) => b.name.toLowerCase() === bookName)
               ?? books.find((b: any) => b.name.toLowerCase().includes(bookName));
    if (!book) return interaction.editReply(`❌ No spellbook matching "${bookName}" found for ${char.name}.`);

    const gameSystemId = await getGameSystemId();
    const allSpells    = gameSystemId ? await dnd5e.spells.getAll(gameSystemId) : [];
    const spellById    = new Map(allSpells.map((s: any) => [s.spellId, s]));

    const entries = book.entries ?? [];
    if (!entries.length) return interaction.editReply(`📖 **${book.name}** is empty.`);

    // Group by level
    const byLevel = new Map<number, any[]>();
    for (const e of entries) {
        const sp = spellById.get(e.spellId);
        if (!sp) continue;
        if (!byLevel.has(sp.level)) byLevel.set(sp.level, []);
        byLevel.get(sp.level)!.push({ sp, prepared: e.prepared });
    }

    const lines: string[] = [];
    for (const [lvl, items] of [...byLevel.entries()].sort((a,b) => a[0]-b[0])) {
        lines.push(`**— ${lvl === 0 ? 'Cantrips' : `${ordinal(lvl)} Level`} —**`);
        for (const { sp, prepared } of items) {
            const prep = lvl > 0 ? (prepared ? '✅' : '⬜') : '✨';
            lines.push(`${prep} ${sp.name} · *${sp.school}*`);
        }
    }

    const embed = new EmbedBuilder()
        .setTitle(`📖 ${char.name} — ${book.name}`)
        .setColor(0x8b5cf6)
        .setDescription(lines.join('\n').slice(0, 4096));

    return interaction.editReply({ embeds: [embed] });
}

export async function handleSpellbookSlotsCommand(interaction: ChatInputCommandInteraction, linkedUser: any) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!linkedUser) return interaction.editReply('❌ Your Discord account is not linked. Visit /profile to connect.');

    const charName = interaction.options.getString('character', true);
    const char     = await resolveCharacter(linkedUser, charName);
    if (!char) return interaction.editReply(`❌ Character "${charName}" not found.`);

    const gameSystemId = await getGameSystemId();
    if (!gameSystemId) return interaction.editReply('❌ No active game system found.');

    const slotProgressions = await dnd5e.spellSlots.getAll(gameSystemId);
    const charClasses      = (char as any).classes ?? [];

    // Compute combined caster level
    let combinedLevel = 0;
    const pactRow: any = null;
    const slotFields: string[] = [];

    for (const cc of charClasses) {
        const row = slotProgressions.find((r: any) =>
            r.classId === cc.classId && (!r.subclassId || r.subclassId === '') && r.classLevel === cc.allocatedLevel
        );
        if (!row) continue;
        if (row.casterType === 'FULL')  combinedLevel += cc.allocatedLevel;
        if (row.casterType === 'HALF')  combinedLevel += Math.floor(cc.allocatedLevel / 2);
        if (row.casterType === 'THIRD') combinedLevel += Math.floor(cc.allocatedLevel / 3);
    }

    const fullTable = slotProgressions.filter((r: any) => r.casterType === 'FULL' && (!r.subclassId || r.subclassId === ''));
    const lookupRow = fullTable.find((r: any) => r.classLevel === Math.min(combinedLevel, 20));

    if (!lookupRow && !pactRow) return interaction.editReply(`❌ ${char.name} has no spellcasting progression set up.`);

    const slotLines: string[] = [];
    if (lookupRow) {
        for (let s = 1; s <= 9; s++) {
            const count = (lookupRow as any)[`slot${s}`] ?? 0;
            if (count > 0) slotLines.push(`${ordinal(s)}: **${count}**`);
        }
    }

    const embed = new EmbedBuilder()
        .setTitle(`🔮 ${char.name} — Spell Slots`)
        .setColor(0x8b5cf6);

    if (slotLines.length) {
        embed.addFields({ name: `Spell Slots (caster level ${combinedLevel})`, value: slotLines.join(' · '), inline: false });
    }

    return interaction.editReply({ embeds: [embed] });
}

export async function handleSpellbookPreparedCommand(interaction: ChatInputCommandInteraction, linkedUser: any) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!linkedUser) return interaction.editReply('❌ Your Discord account is not linked. Visit /profile to connect.');

    const charName = interaction.options.getString('character', true);
    const char     = await resolveCharacter(linkedUser, charName);
    if (!char) return interaction.editReply(`❌ Character "${charName}" not found.`);

    const gameSystemId = await getGameSystemId();
    if (!gameSystemId) return interaction.editReply('❌ No active game system found.');

    const [books, allSpells, slotProgressions, knownProgressions] = await Promise.all([
        dnd5e.spellbooks.getForCharacter(char.id),
        dnd5e.spells.getAll(gameSystemId),
        dnd5e.spellSlots.getAll(gameSystemId),
        dnd5e.spellsKnown.getAll(gameSystemId),
    ]);

    const spellById = new Map(allSpells.map((s: any) => [s.spellId, s]));
    const allEntries = books.flatMap((b: any) => b.entries ?? []);

    const cantrips  = allEntries.filter((e: any) => spellById.get(e.spellId)?.level === 0);
    const prepared  = allEntries.filter((e: any) => e.prepared && (spellById.get(e.spellId)?.level ?? 0) > 0);

    // Get max spell level
    const charClasses = (char as any).classes ?? [];
    let maxLevel = 0;
    for (const cc of charClasses) {
        const row = slotProgressions.find((r: any) =>
            r.classId === cc.classId && (!r.subclassId || r.subclassId === '') && r.classLevel === cc.allocatedLevel
        );
        if (!row) continue;
        for (let s = 9; s >= 1; s--) { if (((row as any)[`slot${s}`] ?? 0) > 0) { maxLevel = Math.max(maxLevel, s); break; } }

        // Limits per class
        const known = knownProgressions.find((r: any) =>
            r.classId === cc.classId && (!r.subclassId || r.subclassId === '') && r.classLevel === cc.allocatedLevel
        );
        if (known) {
            cc._cantripsLimit = known.cantrips;
            cc._preparedLimit = known.prepared;
        }
    }

    const cantripLimit  = charClasses.reduce((m: number, cc: any) => Math.max(m, cc._cantripsLimit ?? 0), 0);
    const preparedLimit = charClasses.reduce((m: number, cc: any) => Math.max(m, cc._preparedLimit ?? 0), 0);

    const embed = new EmbedBuilder()
        .setTitle(`✅ ${char.name} — Prepared Spells`)
        .setColor(0x8b5cf6);

    // Limits line
    const limitParts: string[] = [];
    if (cantripLimit > 0)  limitParts.push(`Cantrips: **${cantrips.length}/${cantripLimit}**`);
    if (preparedLimit > 0) limitParts.push(`Prepared: **${prepared.length}/${preparedLimit}**`);
    if (maxLevel > 0)      limitParts.push(`Max Spell Level: **${ordinal(maxLevel)}**`);
    if (limitParts.length) embed.setDescription(limitParts.join(' · '));

    if (cantrips.length) {
        embed.addFields({
            name: '✨ Cantrips',
            value: cantrips.map((e: any) => spellById.get(e.spellId)?.name ?? '?').join(', '),
            inline: false,
        });
    }

    if (prepared.length) {
        const byLevel = new Map<number, string[]>();
        for (const e of prepared) {
            const sp = spellById.get(e.spellId);
            if (!sp) continue;
            if (!byLevel.has(sp.level)) byLevel.set(sp.level, []);
            byLevel.get(sp.level)!.push(sp.name);
        }
        const lines = [...byLevel.entries()].sort((a,b) => a[0]-b[0])
            .map(([lvl, names]) => `**${ordinal(lvl)}:** ${names.join(', ')}`);
        embed.addFields({ name: '📖 Prepared', value: lines.join('\n'), inline: false });
    } else {
        embed.addFields({ name: '📖 Prepared', value: 'No spells prepared.', inline: false });
    }

    return interaction.editReply({ embeds: [embed] });
}