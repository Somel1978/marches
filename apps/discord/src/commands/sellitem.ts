// apps/discord/src/commands/sellitem.ts
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { marketplace, characters, platform } from '@core/database';

export async function handleSellItemCommand(interaction: ChatInputCommandInteraction, server: any, linkedUser: any, ephemeral: boolean) {
    await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });
    if (!linkedUser) {
        const settings = await platform.getSettingsMap();
        const siteUrl  = settings['site.url'] ?? 'https://marches.local';
        await interaction.editReply(`❌ Your Discord account is not linked to Marches. Visit ${siteUrl}/profile to connect your account.`);
        return;
    }

    const charName = interaction.options.getString('character', true);
    const itemName = interaction.options.getString('item',      true);
    const quantity = interaction.options.getInteger('quantity') ?? 1;

    const chars = await characters.getByUserId(linkedUser.id);
    const char  = chars.find((c: any) => c.name.toLowerCase().includes(charName.toLowerCase()) && c.status === 'ACTIVE' || c.status === 'RESTING');
    if (!char) return interaction.editReply(`❌ No active character found matching "${charName}".`);

    const inv  = await characters.getInventory(char.id);
    const slot = inv.find((i: any) => i.itemName.toLowerCase().includes(itemName.toLowerCase()) && i.canSell !== false);
    if (!slot) return interaction.editReply(`❌ No sellable item matching "${itemName}" in ${char.name}'s inventory.`);

    if (slot.quantity < quantity) {
        return interaction.editReply(`❌ **${char.name}** only has ${slot.quantity}×${slot.itemName}, cannot sell ${quantity}.`);
    }

    const settings  = await platform.getSettingsMap();
    const sellPct   = parseFloat(settings['marketplace.sellPricePercent'] ?? '50') / 100;
    const unitPrice = slot.livePrice ?? 0;
    const expected  = Math.floor(unitPrice * sellPct * quantity);

    try {
        await marketplace.transactions.sell(char.id, slot.id, quantity, linkedUser.id);
        const embed = new EmbedBuilder()
            .setTitle('💰 Sell request submitted!')
            .setColor(0x22c55e)
            .setDescription(`**${char.name}** submitted a sell request for **${slot.itemName}**.`)
            .addFields(
                { name: 'Quantity', value: `${quantity}`,                                                   inline: true },
                { name: 'Expected', value: expected > 0 ? `${expected.toLocaleString()} GP` : 'TBD',        inline: true },
                { name: 'Status',   value: 'Pending admin approval',                                         inline: true },
            );
        return interaction.editReply({ embeds: [embed] });
    } catch (e: any) {
        return interaction.editReply(`❌ Sell failed: ${e.message}`);
    }
}