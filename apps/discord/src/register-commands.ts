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