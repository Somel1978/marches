// apps/discord/src/commands/sellitem.ts
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { marketplace, characters, worlds, platform } from '@core/database';

export async function handleSellItemCommand(interaction: ChatInputCommandInteraction, server: any, linkedUser: any, ephemeral: boolean) {
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

    // Determine effective worldId for validation:
    // 1. Server scoped → use it
    // 2. Character world-locked → must use their world
    // 3. Global character + world option → resolve by name
    // 4. Global character + no world → global market
    let requestedWorldId: string | null = null;

    if (server.scope !== 'global') {
        requestedWorldId = server.scope;
    } else if ((char as any).worldId) {
        requestedWorldId = (char as any).worldId;
    } else if (worldName) {
        const allWorlds = await worlds.getAll();
        const found = (allWorlds as any[]).find((w: any) =>
            w.name.toLowerCase().includes(worldName.toLowerCase()) && w.isActive
        );
        if (!found) return interaction.editReply(`❌ No active world found matching "${worldName}".`);
        requestedWorldId = found.id;
    }

    // Validate: world-locked character cannot sell on a different world's market
    if ((char as any).worldId && requestedWorldId && requestedWorldId !== (char as any).worldId) {
        return interaction.editReply(`❌ **${char.name}** is locked to a different world and cannot sell on this market.`);
    }

    // Find inventory slot
    const inv  = await characters.getInventory(char.id);
    const slot = inv.find((i: any) =>
        i.itemName.toLowerCase().includes(itemName.toLowerCase()) && i.canSell !== false
    );
    if (!slot) return interaction.editReply(`❌ No sellable item matching "${itemName}" in ${char.name}'s inventory.`);
    if (slot.quantity < quantity) return interaction.editReply(`❌ **${char.name}** only has ${slot.quantity}×${slot.itemName}.`);

    // Sell price is based on the origin world of the inventory slot (where it was bought),
    // not the requested world — stock restores to the world it came from.
    const originWorldId = (slot as any).worldId ?? null;
    const ctx = slot.itemId
        ? await marketplace.resolveContext(slot.itemId, originWorldId)
        : null;

    const sellPct   = ctx ? ctx.sellPricePercent / 100 : 0.5;
    const basePrice = ctx ? ctx.price : ((slot as any).livePrice ?? (slot as any).purchasePrice ?? 0);
    const expected  = Math.floor(basePrice * sellPct * quantity);

    try {
        await marketplace.transactions.sell(char.id, slot.id, quantity, linkedUser.id);
        const embed = new EmbedBuilder()
            .setTitle('💰 Sell request submitted!')
            .setColor(0x22c55e)
            .setDescription(`**${char.name}** submitted a sell request for **${slot.itemName}**.`)
            .addFields(
                { name: 'Quantity', value: `${quantity}`,                                             inline: true },
                { name: 'Expected', value: expected > 0 ? `${expected.toLocaleString()} GP` : 'TBD', inline: true },
                { name: 'Status',   value: 'Pending admin approval',                                  inline: true },
            );
        return interaction.editReply({ embeds: [embed] });
    } catch (e: any) {
        return interaction.editReply(`❌ Sell failed: ${e.message}`);
    }
}