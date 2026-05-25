// apps/discord/src/commands/charactersinv.ts
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { characters, platform } from '@core/database';

export async function handleCharsInvCommand(interaction: ChatInputCommandInteraction, linkedUser: any, ephemeral: boolean) {
    await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });
    if (!linkedUser) {
        const settings = await platform.getSettingsMap();
        const siteUrl  = settings['site.url'] ?? 'https://marches.local';
        return interaction.editReply( `❌ Your Discord account is not linked to Marches. Visit ${siteUrl}/settings to connect your account.`);
        return;
    }
    const charName = interaction.options.getString('character', true);
    const chars    = await characters.getByUserId(linkedUser.id);
    const char     = chars.find((c: any) => c.name.toLowerCase().includes(charName.toLowerCase()));
    if (!char) return interaction.editReply(`❌ No character found matching "${charName}".`);

    const inv = await characters.getInventory(char.id);
    if (!inv.length) return interaction.editReply(`${char.name} has no items.`);

    const embed = new EmbedBuilder()
        .setTitle(`🎒 ${char.name}\'s Inventory`)
        .setColor(0xf59e0b)
        .setDescription(inv.slice(0, 20).map((i: any) =>
            `**${i.itemName}** ×${i.quantity} · ${i.liveRarity ?? i.itemRarity ?? '?'}${i.livePrice ? ` · ${i.livePrice.toLocaleString()} GP` : ''}`
        ).join('\n') + (inv.length > 20 ? `\n_...and ${inv.length - 20} more_` : ''));
    return interaction.editReply({ embeds: [embed] });
}