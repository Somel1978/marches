// apps/discord/src/commands/buyitem.ts
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { marketplace, characters, platform } from '@core/database';

export async function handleBuyItemCommand(interaction: ChatInputCommandInteraction, server: any, linkedUser: any, ephemeral: boolean) {
    await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });
    if (!linkedUser) {
        const settings = await platform.getSettingsMap();
        const siteUrl  = settings['site.url'] ?? 'https://marches.local';
        return interaction.editReply(`❌ Your Discord account is not linked. Visit ${siteUrl}/profile to connect.`);
    }

    const charName = interaction.options.getString('character', true);
    const itemName = interaction.options.getString('item',      true);
    const quantity = interaction.options.getInteger('quantity') ?? 1;

    const chars = await characters.getByUserId(linkedUser.id);
    // Fix: operator precedence — wrap both status checks
    const char  = chars.find((c: any) =>
        c.name.toLowerCase().includes(charName.toLowerCase()) &&
        (c.status === 'ACTIVE' || c.status === 'RESTING')
    );
    if (!char) return interaction.editReply(`❌ No active character found matching "${charName}".`);

    const result = await marketplace.items.getAll({ search: itemName, available: true, page: 1, perPage: 10 });
    const item   = result.items?.[0];
    if (!item) return interaction.editReply(`❌ No available item found matching "${itemName}".`);

    // Resolve world context from character
    const worldId = (char as any).worldId ?? null;
    const ctx     = await marketplace.resolveContext(item.id, worldId);

    if (!ctx.isAvailable) return interaction.editReply(`❌ **${item.name}** is not available in your world.`);

    const totalCost = ctx.price * quantity;
    if (ctx.stockEnabled && ctx.stock !== null && ctx.stock < quantity)
        return interaction.editReply(`❌ Only ${ctx.stock} in stock.`);

    if ((char as any).totalGold < totalCost)
        return interaction.editReply(`❌ **${char.name}** needs ${totalCost.toLocaleString()} GP but has ${(char as any).totalGold.toLocaleString()} GP.`);

    // Level restrictions
    try {
        await marketplace.transactions.buy(char.id, item.id, quantity, linkedUser.id, worldId);
        const embed = new EmbedBuilder()
            .setTitle('🛒 Purchase submitted!')
            .setColor(0x22c55e)
            .setDescription(`**${char.name}** submitted a purchase request for **${item.name}**.`)
            .addFields(
                { name: 'Quantity', value: `${quantity}`,                      inline: true },
                { name: 'Price',    value: `${totalCost.toLocaleString()} GP`, inline: true },
                { name: 'Status',   value: 'Pending admin approval',           inline: true },
            );
        return interaction.editReply({ embeds: [embed] });
    } catch (e: any) {
        return interaction.editReply(`❌ Purchase failed: ${e.message}`);
    }
}