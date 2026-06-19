// apps/discord/src/register-commands.ts
import { SlashCommandBuilder } from 'discord.js';

export const commands = [
    // ── Quests ────────────────────────────────────────────────────────────────
    {
        data: new SlashCommandBuilder()
            .setName('quests')
            .setDescription('List currently published quests'),
    },
    {
        data: new SlashCommandBuilder()
            .setName('quest')
            .setDescription('Show details for a quest')
            .addStringOption(o => o.setName('name').setDescription('Quest name or partial name').setRequired(true)),
    },
    {
        data: new SlashCommandBuilder()
            .setName('signup')
            .setDescription('Sign up a character for a quest')
            .addStringOption(o => o.setName('quest').setDescription('Quest name').setRequired(true))
            .addStringOption(o => o.setName('character').setDescription('Character name').setRequired(true)),
    },

    // ── Tavern ───────────────────────────────────────────────────────────────────
    {
        data: new SlashCommandBuilder()
            .setName('tavern')
            .setDescription('Post a message to the Tavern from Discord')
            .addStringOption(o => o.setName('message').setDescription('Your message').setRequired(true))
            .addStringOption(o => o.setName('channel').setDescription('Channel: global or a world name. Defaults to this server world').setRequired(false))
            .addStringOption(o => o.setName('character').setDescription('Post as this character name (optional)').setRequired(false)),
    },

    // ── Availability ──────────────────────────────────────────────────────────
    {
        data: new SlashCommandBuilder()
            .setName('setavailable')
            .setDescription('Set your availability for quests')
            .addStringOption(o => o.setName('start_date').setDescription('Start date (YYYY-MM-DD or DD/MM/YYYY)').setRequired(true))
            .addStringOption(o => o.setName('start_time').setDescription('Start time (HH:MM, 24h)').setRequired(true))
            .addStringOption(o => o.setName('end_date').setDescription('End date (YYYY-MM-DD or DD/MM/YYYY)').setRequired(true))
            .addStringOption(o => o.setName('end_time').setDescription('End time (HH:MM, 24h)').setRequired(true))
            .addStringOption(o => o.setName('scope').setDescription('global or a world name (default: global)').setRequired(false)),
    },

    {
        data: new SlashCommandBuilder()
            .setName('unsetavailable')
            .setDescription('Remove your availability for a time range')
            .addStringOption(o => o.setName('start_date').setDescription('Start date (YYYY-MM-DD or DD/MM/YYYY)').setRequired(true))
            .addStringOption(o => o.setName('start_time').setDescription('Start time (HH:MM, 24h)').setRequired(true))
            .addStringOption(o => o.setName('end_date').setDescription('End date (YYYY-MM-DD or DD/MM/YYYY)').setRequired(true))
            .addStringOption(o => o.setName('end_time').setDescription('End time (HH:MM, 24h)').setRequired(true)),
    },

    // ── Spells ────────────────────────────────────────────────────────────────
    {
        data: new SlashCommandBuilder()
            .setName('spell')
            .setDescription('Spell reference commands')
            .addSubcommand(sub => sub
                .setName('info')
                .setDescription('Show spell details')
                .addStringOption(o => o.setName('name').setDescription('Spell name').setRequired(true))
            )
            .addSubcommand(sub => sub
                .setName('list')
                .setDescription('List all spells for a class at a given level')
                .addStringOption(o => o.setName('class').setDescription('Class name (e.g. Wizard)').setRequired(true))
                .addStringOption(o => o.setName('level').setDescription('cantrip or 1–9').setRequired(true))
            ),
    },
    {
        data: new SlashCommandBuilder()
            .setName('spellbook')
            .setDescription('Character spellbook commands')
            .addSubcommand(sub => sub
                .setName('list')
                .setDescription('List spells in a spellbook')
                .addStringOption(o => o.setName('character').setDescription('Character name').setRequired(true))
                .addStringOption(o => o.setName('spellbook').setDescription('Spellbook name').setRequired(true))
            )
            .addSubcommand(sub => sub
                .setName('slots')
                .setDescription('Show spell slots for a character')
                .addStringOption(o => o.setName('character').setDescription('Character name').setRequired(true))
            )
            .addSubcommand(sub => sub
                .setName('prepared')
                .setDescription('Show all prepared spells and limits')
                .addStringOption(o => o.setName('character').setDescription('Character name').setRequired(true))
            ),
    },

    // ── Characters ────────────────────────────────────────────────────────────
    {
        data: new SlashCommandBuilder()
            .setName('characters')
            .setDescription('List all your characters'),
    },
    {
        data: new SlashCommandBuilder()
            .setName('charactersinv')
            .setDescription('List a character\'s inventory')
            .addStringOption(o => o.setName('character').setDescription('Character name').setRequired(true)),
    },

    // ── Market ────────────────────────────────────────────────────────────────
    {
        data: new SlashCommandBuilder()
            .setName('item')
            .setDescription('Show item details and live price')
            .addStringOption(o => o.setName('name').setDescription('Item name').setRequired(true))
            .addStringOption(o => o.setName('world').setDescription('Show world-specific pricing').setRequired(false)),
    },
    {
        data: new SlashCommandBuilder()
            .setName('buyitem')
            .setDescription('Purchase an item from the marketplace')
            .addStringOption(o => o.setName('character').setDescription('Character name').setRequired(true))
            .addStringOption(o => o.setName('item').setDescription('Item name').setRequired(true))
            .addIntegerOption(o => o.setName('quantity').setDescription('Quantity to buy').setMinValue(1).setRequired(false))
            .addStringOption(o => o.setName('world').setDescription('World market to buy from (global characters only)').setRequired(false)),
    },
    {
        data: new SlashCommandBuilder()
            .setName('sellitem')
            .setDescription('Sell an item from a character\'s inventory')
            .addStringOption(o => o.setName('character').setDescription('Character name').setRequired(true))
            .addStringOption(o => o.setName('item').setDescription('Item name').setRequired(true))
            .addIntegerOption(o => o.setName('quantity').setDescription('Quantity to sell').setMinValue(1).setRequired(false))
            .addStringOption(o => o.setName('world').setDescription('World market to sell on (global characters only)').setRequired(false)),
    },
    {
        data: new SlashCommandBuilder()
            .setName('cancelsignup')
            .setDescription('Cancel a character\'s signup for a quest')
            .addStringOption(o => o.setName('quest').setDescription('Quest name').setRequired(true))
            .addStringOption(o => o.setName('character').setDescription('Character name').setRequired(true)),
    },
];