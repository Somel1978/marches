// apps/discord/src/commands/characters.ts
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { characters, platform } from '@core/database';

export async function handleCharactersCommand(interaction: ChatInputCommandInteraction, linkedUser: any, ephemeral: boolean) {
    await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });
    if (!linkedUser) {
        const settings = await platform.getSettingsMap();
        const siteUrl  = settings['site.url'] ?? 'https://marches.local';
        return interaction.editReply( `❌ Your Discord account is not linked to Marches. Visit ${siteUrl}/settings to connect your account.`);
        return;
    }
    const chars = await characters.getByUserId(linkedUser.id);
    if (!chars.length) return interaction.editReply('You have no characters.');

    const embed = new EmbedBuilder()
        .setTitle(`🧙 ${linkedUser.name}\'s Characters`)
        .setColor(0x8b5cf6)
        .setDescription(chars.map((c: any) =>
            `**${c.name}** · Lv ${c.totalLevel ?? '?'} · ${c.status} · ${c.totalGold.toLocaleString()} GP`
        ).join('\n'));
    return interaction.editReply({ embeds: [embed] });
}