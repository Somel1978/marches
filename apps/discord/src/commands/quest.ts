// apps/discord/src/commands/quest.ts
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, ButtonInteraction } from 'discord.js';
import { quests, platform } from '@core/database';

export async function handleQuestCommand(interaction: ChatInputCommandInteraction, server: any, ephemeral: boolean) {
    await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });
    const name    = interaction.options.getString('name', true);
    const all     = await quests.getAll({ status: 'PUBLISHED', page: 1, perPage: 50 });
    const quest   = all.items.find((q: any) => q.title.toLowerCase().includes(name.toLowerCase()));
    if (!quest) return interaction.editReply(`❌ No published quest found matching "${name}".`);

    const settings = await platform.getSettingsMap();
    const siteUrl  = settings['site.url'] ?? '';
    const confirmed = quest.signups?.filter((s: any) => s.status === 'CONFIRMED').length ?? 0;

    const embed = new EmbedBuilder()
        .setTitle(`⚔ ${quest.title}`)
        .setColor(0x6366f1)
        .addFields(
            { name: 'Level', value: `${quest.minLevel}–${quest.maxLevel}`, inline: true },
            { name: 'Players', value: `${confirmed}/${quest.maxCapacity}`, inline: true },
            { name: 'XP', value: quest.missionXp.toLocaleString(), inline: true },
        )
;

    if (quest.description) embed.setDescription(quest.description.slice(0, 300));
    return interaction.editReply({ embeds: [embed] });
}


export async function handleQuestDetailButton(interaction: ButtonInteraction, questId: string) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const { quests, platform } = await import('@core/database');
    const result = await quests.getAll({ page: 1, perPage: 100 });
    const quest  = (result.items as any[]).find((q: any) => q.id === questId);
    if (!quest) return interaction.editReply('Quest not found.');

    const settings = await platform.getSettingsMap();
    const siteUrl  = settings['site.url'] ?? '';
    const confirmed = quest.signups?.filter((s: any) => s.status === 'CONFIRMED').length ?? 0;

    const embed = new EmbedBuilder()
        .setTitle(`⚔ ${quest.title}`)
        .setColor(0x6366f1)
        .addFields(
            { name: 'Level',   value: `${quest.minLevel}–${quest.maxLevel}`,         inline: true },
            { name: 'Players', value: `${confirmed}/${quest.maxCapacity}`,             inline: true },
            { name: 'XP',      value: quest.missionXp.toLocaleString(),                inline: true },
        )
;

    if (quest.description) embed.setDescription(quest.description.slice(0, 400));
    if (siteUrl) embed.setURL(`${siteUrl}/quests/${quest.id}`);
    if (quest.scheduledAt) embed.addFields({ name: 'Scheduled', value: `<t:${Math.floor(new Date(quest.scheduledAt).getTime() / 1000)}:F>`, inline: true });
    if (quest.signupDeadline) embed.addFields({ name: 'Signup deadline', value: `<t:${Math.floor(new Date(quest.signupDeadline).getTime() / 1000)}:R>`, inline: true });

    return interaction.editReply({ embeds: [embed] });
}