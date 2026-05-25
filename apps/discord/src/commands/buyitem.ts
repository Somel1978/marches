// apps/discord/src/commands/buyitem.ts
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { marketplace, characters, platform } from '@core/database';

export async function handleBuyItemCommand(interaction: ChatInputCommandInteraction, server: any, linkedUser: any, ephemeral: boolean) {
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

    const result = await marketplace.items.getAll({ search: itemName, page: 1, perPage: 10 });
    const item   = result.items.find((i: any) => i.isAvailable);
    if (!item) return interaction.editReply(`❌ No available item found matching "${itemName}".`);

    const totalCost = (item.buyPrice ?? 0) * quantity;
    if (char.totalGold < totalCost) {
        return interaction.editReply(`❌ **${char.name}** has insufficient gold. Needs ${totalCost.toLocaleString()} GP (${quantity}×${item.buyPrice?.toLocaleString()}), has ${char.totalGold.toLocaleString()} GP.`);
    }

    try {
        // createBuyTransaction(characterId, itemId, quantity, requestedBy)
        await marketplace.transactions.buy(char.id, item.id, quantity, linkedUser.id);
        const embed = new EmbedBuilder()
            .setTitle('🛒 Purchase submitted!')
            .setColor(0x22c55e)
            .setDescription(`**${char.name}** submitted a purchase request for **${item.name}**.`)
            .addFields(
                { name: 'Quantity', value: `${quantity}`,                               inline: true },
                { name: 'Price',    value: `${totalCost.toLocaleString()} GP`,          inline: true },
                { name: 'Status',   value: 'Pending admin approval',                    inline: true },
            );
        return interaction.editReply({ embeds: [embed] });
    } catch (e: any) {
        return interaction.editReply(`❌ Purchase failed: ${e.message}`);
    }
}