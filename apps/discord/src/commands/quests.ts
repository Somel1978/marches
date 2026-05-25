// apps/discord/src/commands/quests.ts
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { quests, platform } from '@core/database';

export async function handleQuestsCommand(interaction: ChatInputCommandInteraction, server: any, ephemeral: boolean) {
    await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });
    const all = await quests.getAll({ status: 'PUBLISHED', page: 1, perPage: 10 });
    if (!all.items.length) return interaction.editReply('No published quests at the moment.');

    const settings = await platform.getSettingsMap();
    const siteUrl  = settings['site.url'] ?? '';

    const embed = new EmbedBuilder()
        .setTitle('📜 Published Quests')
        .setColor(0xf59e0b);

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];

    for (const q of all.items as any[]) {
        const confirmed = q.signups?.filter((s: any) => s.status === 'CONFIRMED').length ?? 0;
        const scheduled = q.scheduledAt ? `\nStarts: <t:${Math.floor(new Date(q.scheduledAt).getTime() / 1000)}:F>` : '';
        const deadline  = q.signupDeadline ? `\nDeadline: <t:${Math.floor(new Date(q.signupDeadline).getTime() / 1000)}:R>` : '';
        embed.addFields({
            name:   q.title,
            value:  `Lv **${q.minLevel}–${q.maxLevel}** · **${confirmed}/${q.maxCapacity}** players · **${q.missionXp.toLocaleString()}** XP${scheduled}${deadline}`,
            inline: false,
        });

        // One button row per quest (max 5 quests with buttons due to Discord limits)
        if (rows.length < 5) {
            rows.push(
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`quest_detail:${q.id}`)
                        .setLabel(`Details: ${q.title.slice(0, 30)}`)
                        .setStyle(ButtonStyle.Secondary),
                    ...(siteUrl ? [
                        new ButtonBuilder()
                            .setLabel('View on site')
                            .setStyle(ButtonStyle.Link)
                            .setURL(`${siteUrl}/quests/${q.id}`)
                    ] : [])
                )
            );
        }
    }

    return interaction.editReply({ embeds: [embed], components: rows });
}