// apps/discord/src/commands/cancelsignup.ts
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { quests, characters, platform } from '@core/database';

export async function handleCancelSignupCommand(interaction: ChatInputCommandInteraction, server: any, linkedUser: any, ephemeral: boolean) {
    await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });

    if (!linkedUser) {
        const settings = await platform.getSettingsMap();
        const siteUrl  = settings['site.url'] ?? 'https://marches.local';
        return interaction.editReply(`❌ Your Discord account is not linked to Marches. Visit ${siteUrl}/profile to connect your account.`);
    }

    const questName = interaction.options.getString('quest',      true);
    const charName  = interaction.options.getString('character',  true);

    // Find character
    const chars = await characters.getByUserId(linkedUser.id);
    const char  = chars.find((c: any) => c.name.toLowerCase().includes(charName.toLowerCase()));
    if (!char) return interaction.editReply(`❌ No character found matching "${charName}".`);

    // Find published quest
    const all   = await quests.getAll({ status: 'PUBLISHED', page: 1, perPage: 50 });
    const quest = all.items.find((q: any) => q.title.toLowerCase().includes(questName.toLowerCase()));
    if (!quest) return interaction.editReply(`❌ No published quest found matching "${questName}".`);

    // Find active signup for this character on this quest
    const signup = (quest as any).signups?.find((s: any) =>
        s.characterId === char.id &&
        ['CONFIRMED', 'WAITLIST', 'PENDING_CONFIRMATION'].includes(s.status)
    );
    if (!signup) return interaction.editReply(`❌ **${char.name}** is not signed up for **${quest.title}**.`);

    // Check quest hasn't started yet
    if (['IN_PROGRESS', 'COMPLETED', 'PENDING_RESULT', 'PENDING_RESULT_APPROVAL'].includes((quest as any).status)) {
        return interaction.editReply(`❌ Cannot cancel — **${quest.title}** is already in progress or completed.`);
    }

    try {
        await quests.cancelSignup(signup.id, 'Cancelled via Discord', linkedUser.id);
        const embed = new EmbedBuilder()
            .setTitle('✅ Signup cancelled')
            .setColor(0xf59e0b)
            .setDescription(`**${char.name}** has been removed from **${quest.title}**.`);
        return interaction.editReply({ embeds: [embed] });
    } catch (e: any) {
        return interaction.editReply(`❌ Could not cancel: ${e.message}`);
    }
}
