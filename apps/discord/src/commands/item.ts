// apps/discord/src/commands/item.ts
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { marketplace } from '@core/database';

const RARITY_COLORS: Record<string, number> = {
    Mundane: 0x9ca3af, Common: 0xd1d5db, Uncommon: 0x34d399,
    Rare: 0x60a5fa, Very_Rare: 0xa78bfa, Legendary: 0xfbbf24,
    Artifact: 0xf87171, Unknown: 0x9ca3af,
};

export async function handleItemCommand(interaction: ChatInputCommandInteraction, server: any, ephemeral: boolean) {
    await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });
    const name  = interaction.options.getString('name', true);
    const items = await marketplace.items.getAll({ search: name, page: 1, perPage: 5 });
    const item  = items.items[0];
    if (!item) return interaction.editReply(`❌ No item found matching "${name}".`);

    const embed = new EmbedBuilder()
        .setTitle(`🎒 ${item.name}`)
        .setColor(RARITY_COLORS[item.rarity ?? 'Unknown'] ?? 0x9ca3af)
        .addFields(
            { name: 'Rarity',    value: item.rarity    ?? '—', inline: true },
            { name: 'Category',  value: item.category  ?? '—', inline: true },
            { name: 'Buy Price', value: item.buyPrice ? `${item.buyPrice.toLocaleString()} GP` : '—', inline: true },
        );
    if (item.description) embed.setDescription(item.description.slice(0, 300));
    if (item.link) embed.setURL(item.link);
    return interaction.editReply({ embeds: [embed] });
}