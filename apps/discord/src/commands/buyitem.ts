// apps/discord/src/commands/buyitem.ts
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { marketplace, characters, worlds, platform } from '@core/database';

export async function handleBuyItemCommand(interaction: ChatInputCommandInteraction, server: any, linkedUser: any, ephemeral: boolean) {
    await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });
    if (!linkedUser) {
        const settings = await platform.getSettingsMap();
        const siteUrl  = settings['site.url'] ?? 'https://marches.local';
        return interaction.editReply(`❌ Your Discord account is not linked. Visit ${siteUrl}/profile to connect.`);
    }

    const charName  = interaction.options.getString('character', true);
    const itemName  = interaction.options.getString('item',      true);
    const quantity  = interaction.options.getInteger('quantity') ?? 1;
    const worldName = interaction.options.getString('world')     ?? null;

    // Resolve character
    const chars = await characters.getByUserId(linkedUser.id);
    const char  = chars.find((c: any) =>
        c.name.toLowerCase().includes(charName.toLowerCase()) &&
        (c.status === 'ACTIVE' || c.status === 'RESTING')
    );
    if (!char) return interaction.editReply(`❌ No active character found matching "${charName}".`);

    // Determine effective worldId:
    // 1. Server is scoped to a world → use it
    // 2. Character is world-locked → must use their world
    // 3. Global character + world option provided → resolve by name
    // 4. Global character + no world option → global market
    let worldId: string | null = null;

    if (server.scope !== 'global') {
        worldId = server.scope;
    } else if ((char as any).worldId) {
        worldId = (char as any).worldId;
    } else if (worldName) {
        const allWorlds = await worlds.getAll();
        const found = (allWorlds as any[]).find((w: any) =>
            w.name.toLowerCase().includes(worldName.toLowerCase()) && w.isActive
        );
        if (!found) return interaction.editReply(`❌ No active world found matching "${worldName}".`);
        worldId = found.id;
    }

    // Validate: world-locked character cannot buy from a different world
    if ((char as any).worldId && worldId && worldId !== (char as any).worldId) {
        return interaction.editReply(`❌ **${char.name}** is locked to a different world and cannot buy from this market.`);
    }

    // Find item
    const result = await marketplace.items.getAll({ search: itemName, available: true, page: 1, perPage: 10 });
    const item   = result.items?.[0];
    if (!item) return interaction.editReply(`❌ No available item found matching "${itemName}".`);

    // Resolve world context
    const ctx = await marketplace.resolveContext(item.id, worldId);

    if (!ctx.isAvailable) return interaction.editReply(`❌ **${item.name}** is not available${worldId ? ' in this world' : ''}.`);
    if (ctx.stockEnabled && ctx.stock !== null && ctx.stock < quantity)
        return interaction.editReply(`❌ Only ${ctx.stock} in stock.`);

    const totalCost = ctx.price * quantity;
    if ((char as any).totalGold < totalCost)
        return interaction.editReply(`❌ **${char.name}** needs ${totalCost.toLocaleString()} GP but has ${(char as any).totalGold.toLocaleString()} GP.`);

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