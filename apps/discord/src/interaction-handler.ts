// apps/discord/src/interaction-handler.ts
import { Interaction } from 'discord.js';
import { platform, discord, users } from '@core/database';
import { handleQuestsCommand }     from './commands/quests.js';
import { handleQuestCommand }      from './commands/quest.js';
import { handleSignupCommand }     from './commands/signup.js';
import { handleCharactersCommand } from './commands/characters.js';
import { handleCharsInvCommand }   from './commands/charactersinv.js';
import { handleItemCommand }       from './commands/item.js';
import { handleBuyItemCommand }    from './commands/buyitem.js';
import { handleSellItemCommand }    from './commands/sellitem.js';
import { handleCancelSignupCommand } from './commands/cancelsignup.js';

// Channel type required per command
const COMMAND_CHANNEL: Record<string, string> = {
    quests:        'QUESTS',
    quest:         'QUESTS',
    signup:        'QUESTS',
    cancelsignup:  'QUESTS',
    characters:    'CHARACTERS',
    charactersinv: 'CHARACTERS',
    item:          'MARKET',
    buyitem:       'MARKET',
    sellitem:      'MARKET',
};

export async function handleInteraction(interaction: Interaction) {
    // Handle quest detail buttons
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('quest_detail:')) {
            const questId = interaction.customId.split(':')[1];
            const { handleQuestDetailButton } = await import('./commands/quest.js');
            return handleQuestDetailButton(interaction, questId);
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const settings     = await platform.getSettingsMap();
    const ephemeral    = settings['discord.responseMode'] !== 'public';

    // Find which server scope this guild belongs to
    const allServers   = await discord.servers.getAll();
    const server       = allServers.find(s => s.guildId === interaction.guildId);
    if (!server) {
        await interaction.reply({ content: '❌ This server is not linked to Marches.', ephemeral: true });
        return;
    }

    // Verify correct channel
    const requiredType = COMMAND_CHANNEL[interaction.commandName];
    if (requiredType) {
        const channel = server.channels.find(c => c.type === requiredType);
        if (channel && channel.channelId !== interaction.channelId) {
            const mention = `<#${channel.channelId}>`;
            await interaction.reply({ content: `❌ Please use ${mention} for this command.`, ephemeral: true });
            return;
        }
    }

    // Verify user is linked
    const linkedUser = await getUserByDiscordId(interaction.user.id);

    // Route commands
    const cmd = interaction.commandName;
    if (cmd === 'quests')        return handleQuestsCommand(interaction, server, ephemeral);
    if (cmd === 'quest')         return handleQuestCommand(interaction, server, ephemeral);
    if (cmd === 'signup')        return handleSignupCommand(interaction, server, linkedUser, ephemeral);
    if (cmd === 'characters')    return handleCharactersCommand(interaction, linkedUser, ephemeral);
    if (cmd === 'charactersinv') return handleCharsInvCommand(interaction, linkedUser, ephemeral);
    if (cmd === 'item')          return handleItemCommand(interaction, server, ephemeral);
    if (cmd === 'buyitem')       return handleBuyItemCommand(interaction, server, linkedUser, ephemeral);
    if (cmd === 'sellitem')       return handleSellItemCommand(interaction, server, linkedUser, ephemeral);
    if (cmd === 'cancelsignup')   return handleCancelSignupCommand(interaction, server, linkedUser, ephemeral);
}

async function getUserByDiscordId(discordId: string) {
    return users.getByDiscordId(discordId);
}