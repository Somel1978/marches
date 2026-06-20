// apps/discord/src/interaction-handler.ts
import { Interaction } from 'discord.js';
import { platform, discord, users } from '@core/database';
import { handleQuestsCommand }     from './commands/quests.js';
import { handleQuestCommand }      from './commands/quest.js';
import { handleSignupCommand }     from './commands/signup.js';
import { handleCharactersCommand } from './commands/characters.js';
import { handleCharsInvCommand }   from './commands/charactersinv.js';
import { handleSpellInfoCommand, handleSpellListCommand } from './commands/spell.js';
import { handleSpellbookListCommand, handleSpellbookSlotsCommand, handleSpellbookPreparedCommand } from './commands/spellbook.js';
import { handleItemCommand }       from './commands/item.js';
import { handleBuyItemCommand }    from './commands/buyitem.js';
import { handleSellItemCommand }    from './commands/sellitem.js';
import { handleCancelSignupCommand } from './commands/cancelsignup.js';
import { handleTavernCommand }       from './commands/tavern.js';
import { handleSetAvailableCommand, handleUnsetAvailableCommand } from './commands/availability.js';

// Channel type required per command
const COMMAND_CHANNEL: Record<string, string> = {
    quests:        'QUESTS',
    quest:         'QUESTS',
    signup:        'QUESTS',
    cancelsignup:  'QUESTS',
    characters:    'CHARACTERS',
    charactersinv: 'CHARACTERS',
    spell:         'CHARACTERS',
    spellbook:     'CHARACTERS',
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

    // Resolve server by channelId — each channel belongs to exactly one server.
    // This allows multiple Marches bots in the same guild as long as they use
    // separate channels (documented requirement in the Discord admin page).
    const allServers = await discord.servers.getAll();
    const allChannels = allServers
        .flatMap((s: any) => s.channels.map((c: any) => ({ ...c, server: s })))
        .filter((c: any) => c.channelId === interaction.channelId && c.server.guildId === interaction.guildId);

    if (!allChannels.length) return; // not a registered channel — silently ignore

    const server      = allChannels[0].server;
    const requiredType = COMMAND_CHANNEL[interaction.commandName];

    // If command requires a specific channel type, prefer the matching one
    const channel = requiredType
        ? (allChannels.find((c: any) => c.type === requiredType) ?? allChannels[0])
        : allChannels[0];

    if (requiredType && channel.type !== requiredType) {
        const correctChannel = server.channels.find((c: any) => c.type === requiredType);
        const mention = correctChannel ? `<#${correctChannel.channelId}>` : `the ${requiredType.toLowerCase()} channel`;
        await interaction.reply({ content: `❌ Please use ${mention} for this command.`, ephemeral: true });
        return;
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
    if (cmd === 'tavern')          return handleTavernCommand(interaction as any);
    if (cmd === 'setavailable')    return handleSetAvailableCommand(interaction as any);
    if (cmd === 'unsetavailable')  return handleUnsetAvailableCommand(interaction as any);

    if (cmd === 'spell') {
        const sub = interaction.options.getSubcommand();
        if (sub === 'info') return handleSpellInfoCommand(interaction, ephemeral);
        if (sub === 'list') return handleSpellListCommand(interaction, ephemeral);
    }
    if (cmd === 'spellbook') {
        const sub = interaction.options.getSubcommand();
        if (sub === 'list')     return handleSpellbookListCommand(interaction, linkedUser);
        if (sub === 'slots')    return handleSpellbookSlotsCommand(interaction, linkedUser);
        if (sub === 'prepared') return handleSpellbookPreparedCommand(interaction, linkedUser);
    }
}

async function getUserByDiscordId(discordId: string) {
    return users.getByDiscordId(discordId);
}