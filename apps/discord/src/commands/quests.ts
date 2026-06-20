// apps/discord/src/commands/quests.ts
import { ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { quests, platform } from '@core/database';

export async function handleQuestsCommand(interaction: ChatInputCommandInteraction, server: any, ephemeral: boolean) {
    await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });
    const all = await quests.getAll({ status: 'PUBLISHED', page: 1, perPage: 10 });
    if (!all.items.length) return interaction.editReply('No published quests at the moment.');

    const settings = await platform.getSettingsMap();
    const siteUrl  = settings['site.url'] ?? '';

    // One embed + buttons per quest so buttons appear directly below their quest
    const items = all.items as any[];
    for (let i = 0; i < items.length; i++) {
        const q         = items[i];
        const confirmed = q.signups?.filter((s: any) => s.status === 'CONFIRMED').length ?? 0;
        const scheduled = q.scheduledAt ? `\nStarts: <t:${Math.floor(new Date(q.scheduledAt).getTime() / 1000)}:F>` : '';
        const deadline  = q.signupDeadline ? `\nDeadline: <t:${Math.floor(new Date(q.signupDeadline).getTime() / 1000)}:R>` : '';

        const embed = new EmbedBuilder()
            .setTitle(`📜 ${q.title}`)
            .setColor(0xf59e0b)
            .setDescription(`Lv **${q.minLevel}–${q.maxLevel}** · **${confirmed}/${q.maxCapacity}** players · **${q.missionXp.toLocaleString()}** XP${scheduled}${deadline}`);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`quest_detail:${q.id}`)
                .setLabel('Details')
                .setStyle(ButtonStyle.Secondary),
            ...(siteUrl ? [
                new ButtonBuilder()
                    .setLabel('View on site')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`${siteUrl}/quests/${q.id}`)
            ] : [])
        );

        const payload = { embeds: [embed], components: [row] };
        if (i === 0) {
            await interaction.editReply(payload);
        } else {
            await interaction.followUp({ ...payload, flags: ephemeral ? MessageFlags.Ephemeral : undefined });
        }
    }
}