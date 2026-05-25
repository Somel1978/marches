// apps/discord/src/commands/signup.ts
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { quests, characters, platform } from '@core/database';

export async function handleSignupCommand(interaction: ChatInputCommandInteraction, server: any, linkedUser: any, ephemeral: boolean) {
    await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });
    if (!linkedUser) {
        const settings = await platform.getSettingsMap();
        const siteUrl  = settings['site.url'] ?? 'https://marches.local';
        return interaction.editReply( `❌ Your Discord account is not linked to Marches. Visit ${siteUrl}/settings to connect your account.`);
        return;
    }
    const questName = interaction.options.getString('quest', true);
    const charName  = interaction.options.getString('character', true);

    const all   = await quests.getAll({ status: 'PUBLISHED', page: 1, perPage: 50 });
    const quest = all.items.find((q: any) => q.title.toLowerCase().includes(questName.toLowerCase()));
    if (!quest) return interaction.editReply(`❌ No published quest found matching "${questName}".`);

    const userChars = await characters.getByUserId(linkedUser.id);
    const char      = userChars.find((c: any) => c.name.toLowerCase().includes(charName.toLowerCase()) && c.status === 'ACTIVE');
    if (!char) return interaction.editReply(`❌ No active character found matching "${charName}".`);

    try {
        await quests.signup(quest.id, char.id, linkedUser.id);
        const embed = new EmbedBuilder()
            .setTitle('✅ Signed up!')
            .setColor(0x22c55e)
            .setDescription(`**${char.name}** has been signed up for **${quest.title}**.`);
        return interaction.editReply({ embeds: [embed] });
    } catch (e: any) {
        return interaction.editReply(`❌ Could not sign up: ${e.message}`);
    }
}