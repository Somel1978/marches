// apps/discord/src/commands/charactersinv.ts
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { characters, platform } from '@core/database';

export async function handleCharsInvCommand(interaction: ChatInputCommandInteraction, linkedUser: any, ephemeral: boolean) {
    await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });
    if (!linkedUser) {
        const settings = await platform.getSettingsMap();
        const siteUrl  = settings['site.url'] ?? 'https://marches.local';
        return interaction.editReply(`❌ Your Discord account is not linked. Visit ${siteUrl}/profile to connect.`);
    }

    const charName = interaction.options.getString('character', true);
    const chars    = await characters.getByUserId(linkedUser.id);
    const char     = chars.find((c: any) => c.name.toLowerCase().includes(charName.toLowerCase()));
    if (!char) return interaction.editReply(`❌ No character found matching "${charName}".`);

    const inv = await characters.getInventory(char.id);
    if (!inv.length) return interaction.editReply(`${char.name} has no items.`);

    const lines = inv.slice(0, 20).map((i: any) => {
        const rarity = i.itemRarity ?? '?';
        const world  = (i as any).worldId ? ' 🌍' : '';
        return `**${i.itemName}** ×${i.quantity} · ${rarity}${world}`;
    });
    if (inv.length > 20) lines.push(`_...and ${inv.length - 20} more_`);

    const embed = new EmbedBuilder()
        .setTitle(`🎒 ${char.name}'s Inventory`)
        .setColor(0xf59e0b)
        .setDescription(lines.join('\n'));

    return interaction.editReply({ embeds: [embed] });
}