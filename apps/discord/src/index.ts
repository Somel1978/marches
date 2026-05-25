// apps/discord/src/index.ts
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { platform, discord } from '@core/database';
import { handleInteraction } from './interaction-handler.js';
import { setClient } from './notifications/dispatcher.js';
import { processQueue } from './notifications/process-queue.js';
import { commands } from './register-commands.js';

async function main() {
    const settings = await platform.getSettingsMap();
    const token    = settings['discord.botToken'];
    const clientId = settings['discord.clientId'];

    if (!token || !clientId) {
        console.error('[Discord] Bot token or client ID not set in platform settings.');
        process.exit(1);
    }

    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    });

    client.once('clientReady', async (c) => {
        console.log(`[Discord] Logged in as ${c.user.tag}`);
        setClient(client);

        // Register slash commands
        const rest = new REST().setToken(token);
        try {
            // Clear global commands to avoid duplicates
            await rest.put(Routes.applicationCommands(clientId), { body: [] });

            // Register per-guild for instant propagation
            const allServers = await discord.servers.getAll();
            if (allServers.length) {
                for (const server of allServers) {
                    await rest.put(Routes.applicationGuildCommands(clientId, server.guildId), {
                        body: commands.map(c => c.data.toJSON()),
                    });
                    console.log(`[Discord] Commands registered for guild: ${server.name}`);
                }
            } else {
                await rest.put(Routes.applicationCommands(clientId), {
                    body: commands.map(c => c.data.toJSON()),
                });
                console.log('[Discord] Slash commands registered globally.');
            }
        } catch (e) {
            console.error('[Discord] Failed to register commands:', e);
        }

        // Poll notification queue every 10 seconds
        setInterval(() => processQueue(client), 10_000);
    });

    client.on('interactionCreate', (interaction) => handleInteraction(interaction));
    await client.login(token);
}

main();