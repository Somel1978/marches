// apps/discord/src/commands/item.ts
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { marketplace, worlds } from '@core/database';

const RARITY_COLORS: Record<string, number> = {
    Mundane: 0x9ca3af, Common: 0xd1d5db, Uncommon: 0x34d399,
    Rare: 0x60a5fa, Very_Rare: 0xa78bfa, Legendary: 0xfbbf24,
    Artifact: 0xf87171, Unknown: 0x9ca3af,
};

export async function handleItemCommand(interaction: ChatInputCommandInteraction, server: any, ephemeral: boolean) {
    await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });

    const name      = interaction.options.getString('name',  true);
    const worldName = interaction.options.getString('world') ?? null;

    const items = await marketplace.items.getAll({ search: name, page: 1, perPage: 5 });
    const item  = items.items[0];
    if (!item) return interaction.editReply(`❌ No item found matching "${name}".`);

    // Resolve worldId: server scope → world option → null (global)
    let worldId: string | null = null;
    if (server.scope !== 'global') {
        worldId = server.scope;
    } else if (worldName) {
        const allWorlds = await worlds.getAll();
        const found = (allWorlds as any[]).find((w: any) =>
            w.name.toLowerCase().includes(worldName.toLowerCase()) && w.isActive
        );
        if (!found) return interaction.editReply(`❌ No active world found matching "${worldName}".`);
        worldId = found.id;
    }

    const ctx         = await marketplace.resolveContext(item.id, worldId);
    const sellPrice   = Math.floor(ctx.price * ctx.sellPricePercent / 100);
    const isOverridden = worldId && ctx.price !== item.buyPrice;

    const embed = new EmbedBuilder()
        .setTitle(`🎒 ${item.name}`)
        .setColor(RARITY_COLORS[item.rarity ?? 'Unknown'] ?? 0x9ca3af)
        .addFields(
            { name: 'Rarity',     value: item.rarity   ?? '—',                               inline: true },
            { name: 'Category',   value: item.category ?? '—',                               inline: true },
            { name: 'Buy Price',  value: ctx.price ? `${ctx.price.toLocaleString()} GP` + (isOverridden ? ` *(global: ${item.buyPrice.toLocaleString()} GP)*` : '') : '—', inline: true },
            { name: 'Sell Price', value: sellPrice > 0 ? `${sellPrice.toLocaleString()} GP` : '—', inline: true },
        );

    if (ctx.stockEnabled && ctx.stock !== null)
        embed.addFields({ name: 'Stock', value: `${ctx.stock} remaining`, inline: true });
    if (!ctx.isAvailable)
        embed.addFields({ name: '⚠️ Availability', value: worldId ? 'Not available in this world' : 'Not available', inline: false });
    if (item.description)
        embed.setDescription(item.description.slice(0, 300));
    if (item.link)
        embed.setURL(item.link);

    return interaction.editReply({ embeds: [embed] });
}