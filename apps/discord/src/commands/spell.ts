// apps/discord/src/commands/spell.ts
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { gameSystems, dnd5e } from '@core/database';

const DMG_EMOJI: Record<string, string> = {
    acid:'🟢', bludgeoning:'⚫', cold:'🔵', fire:'🔴', force:'🟣',
    lightning:'🟡', necrotic:'💜', piercing:'⚫', poison:'🟤',
    psychic:'🩷', radiant:'⭐', slashing:'⚫', thunder:'💙',
};

function dmgEmoji(type: string) { return DMG_EMOJI[type.toLowerCase()] ?? '⚪'; }

function ordinal(n: number) { return `${n}${n===1?'st':n===2?'nd':n===3?'rd':'th'}`; }

function levelLabel(n: number) { return n === 0 ? 'Cantrip' : `${ordinal(n)} level`; }

async function getGameSystemId(): Promise<string | null> {
    const systems = await gameSystems.getActive();
    return systems[0]?.id ?? null;
}

export async function handleSpellInfoCommand(interaction: ChatInputCommandInteraction, ephemeral: boolean) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const name = interaction.options.getString('name', true).toLowerCase();

    const gameSystemId = await getGameSystemId();
    if (!gameSystemId) return interaction.editReply('❌ No active game system found.');

    const all   = await dnd5e.spells.getAll(gameSystemId);
    const spell = all.find((s: any) => s.name.toLowerCase() === name)
               ?? all.find((s: any) => s.name.toLowerCase().includes(name));

    if (!spell) return interaction.editReply(`❌ No spell found matching "${name}".`);

    const embed = new EmbedBuilder()
        .setTitle(`✨ ${spell.name}`)
        .setColor(0x8b5cf6)
        .setDescription([
            `**${levelLabel(spell.level)}** · ${spell.school}`,
            spell.concentration ? '🔵 Concentration' : null,
            spell.ritual        ? '📖 Ritual'        : null,
        ].filter(Boolean).join(' · ') || null);

    const props: string[] = [];
    if (spell.castingTime) props.push(`⚡ **Casting Time:** ${spell.castingTime}`);
    if (spell.rangeOrigin || spell.rangeValue) {
        const range = spell.rangeOrigin === 'Self' ? 'Self'
            : [spell.rangeOrigin, spell.rangeValue ? `${spell.rangeValue} ft` : ''].filter(Boolean).join(' ');
        props.push(`📏 **Range:** ${range}`);
    }
    if (spell.durationType) {
        const dur = [spell.durationInterval, spell.durationUnit, spell.durationType !== 'Timed' ? spell.durationType : ''].filter(Boolean).join(' ');
        props.push(`⏳ **Duration:** ${dur}`);
    }
    if (spell.components) props.push(`✦ **Components:** ${spell.components}`);
    if (spell.aoeType && spell.aoeValue) props.push(`💥 **Area:** ${spell.aoeValue} ft ${spell.aoeType}`);
    if (spell.requiresSavingThrow && spell.savingThrow) props.push(`🎲 **Saving Throw:** ${spell.savingThrow}`);
    if (spell.requiresAttackRoll) props.push(`⚔ **Attack Roll**`);

    if (props.length) embed.addFields({ name: 'Properties', value: props.join('\n'), inline: false });

    const dmgRaw = spell.level === 0 ? spell.cantripDamage : spell.spellDamage;
    if (dmgRaw) {
        const parts = dmgRaw.split('+').map((p: string) => {
            const m = p.trim().match(/^([\dd\s]+)\s+(.+)$/i);
            return m ? `${dmgEmoji(m[2].trim())} **${m[1].trim()}** ${m[2].trim()}` : p.trim();
        });
        embed.addFields({ name: '💥 Damage', value: parts.join(' + '), inline: false });

        if (spell.level === 0) {
            const scaling = [
                spell.cantripDamageLvl5  ? `Lv 5: ${spell.cantripDamageLvl5}`  : null,
                spell.cantripDamageLvl11 ? `Lv 11: ${spell.cantripDamageLvl11}` : null,
                spell.cantripDamageLvl17 ? `Lv 17: ${spell.cantripDamageLvl17}` : null,
            ].filter(Boolean).join(' · ');
            if (scaling) embed.addFields({ name: 'Cantrip Scaling', value: scaling, inline: false });
        }
    }

    if (spell.canCastAtHigherLevel) {
        let upcast = '';
        if (spell.spellUpcastPerSlot)        upcast = `${spell.spellUpcastPerSlot} for each slot level above ${ordinal(spell.level)}.`;
        else if (spell.spellUpcastEveryTwoSlots) upcast = `${spell.spellUpcastEveryTwoSlots} for every two slot levels above ${ordinal(spell.level)}.`;
        else if (spell.spellProgressionNote) upcast = spell.spellProgressionNote;
        else if (spell.spellProgression)     upcast = spell.spellProgression;
        if (upcast) embed.addFields({ name: '⬆ At Higher Levels', value: upcast, inline: false });
    }

    if (spell.sourceBook) embed.setFooter({ text: `📖 ${spell.sourceBook}` });
    if (spell.link)       embed.setURL(spell.link);

    return interaction.editReply({ embeds: [embed] });
}

export async function handleSpellListCommand(interaction: ChatInputCommandInteraction, ephemeral: boolean) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const className  = interaction.options.getString('class', true);
    const levelInput = interaction.options.getString('level', true).toLowerCase();

    const level = levelInput === 'cantrip' ? 0 : Number(levelInput);
    if (isNaN(level) || level < 0 || level > 9) return interaction.editReply('❌ Level must be cantrip or 1–9.');

    const gameSystemId = await getGameSystemId();
    if (!gameSystemId) return interaction.editReply('❌ No active game system found.');

    const all = await dnd5e.spells.getAll(gameSystemId);
    const spells = all.filter((s: any) => {
        if (s.level !== level) return false;
        if (!s.spellList) return false;
        const list = s.spellList.split(',').map((n: string) => n.trim().toLowerCase());
        return list.includes(className.toLowerCase());
    });

    if (!spells.length) return interaction.editReply(`❌ No ${levelLabel(level)} spells found for ${className}.`);

    const lines = spells.map((s: any) => {
        const badges = [
            s.concentration ? 'Conc' : null,
            s.ritual        ? 'Ritual' : null,
        ].filter(Boolean).join(', ');
        const dmg = (s.level === 0 ? s.cantripDamage : s.spellDamage) ?? '';
        return `**${s.name}** · ${s.school}${badges ? ` · *${badges}*` : ''}${dmg ? ` · ${dmg}` : ''}`;
    });

    // Discord embed description limit is 4096 chars — paginate if needed
    const chunks: string[][] = [[]];
    for (const line of lines) {
        const current = chunks[chunks.length - 1];
        if ((current.join('\n') + '\n' + line).length > 4000) chunks.push([line]);
        else current.push(line);
    }

    const embed = new EmbedBuilder()
        .setTitle(`📚 ${className} — ${levelLabel(level)} spells (${spells.length})`)
        .setColor(0x8b5cf6)
        .setDescription(chunks[0].join('\n'));

    if (chunks.length > 1) embed.setFooter({ text: `Showing ${chunks[0].length} of ${spells.length} spells` });

    return interaction.editReply({ embeds: [embed] });
}
