// apps/discord/src/index.ts
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { platform, discord } from '@core/database';
import { handleInteraction } from './interaction-handler.js';
import { setClient } from './notifications/dispatcher.js';
import { processQueue } from './notifications/process-queue.js';
import { commands } from './register-commands.js';

process.on('uncaughtException',  (e) => console.error('[Discord] Uncaught exception:',  e?.message ?? e, e?.stack));
process.on('unhandledRejection', (e) => console.error('[Discord] Unhandled rejection:', e));

async function main() {
    console.log('[Discord] Starting bot...');

    const settings = await platform.getSettingsMap();
    const token    = settings['discord.botToken']?.trim();
    const clientId = settings['discord.clientId']?.trim();

    console.log(`[Discord] token set:    ${!!token}`);
    console.log(`[Discord] clientId set: ${!!clientId}`);
    console.log(`[Discord] token length: ${token?.length ?? 0}`);

    if (!token || !clientId) {
        console.error('[Discord] Bot token or client ID not set in platform settings.');
        process.exit(1);
    }

    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    });

    client.once('clientReady', async (c) => {
        console.log(`[Discord] Logged in as ${c.user.tag}`);
        console.log(`[Discord] Bot application ID: ${c.application.id}`);
        console.log(`[Discord] clientId from settings: ${clientId}`);
        console.log(`[Discord] clientId match: ${c.application.id === clientId}`);
        setClient(client);

        const rest = new REST().setToken(token);
        try {
            const allServers = await discord.servers.getAll();
            console.log(`[Discord] Configured servers in DB: ${allServers.length}`);

            if (allServers.length) {
                // Clear global commands first to avoid duplicates with guild commands
                await rest.put(Routes.applicationCommands(clientId), { body: [] });
                console.log('[Discord] Cleared global commands.');

                for (const server of allServers) {
                    console.log(`[Discord] Registering commands for guild: ${server.name} (${server.guildId})`);
                    try {
                        await rest.put(Routes.applicationGuildCommands(clientId, server.guildId), {
                            body: commands.map(c => c.data.toJSON()),
                        });
                        console.log(`[Discord] ✓ Commands registered for: ${server.name}`);
                    } catch (guildErr: any) {
                        console.error(`[Discord] ✗ Failed for guild ${server.name}:`, guildErr?.message ?? guildErr);
                        console.error(`[Discord]   Status: ${guildErr?.status}  Code: ${guildErr?.code}`);
                    }
                }
            } else {
                console.log('[Discord] No servers configured — registering globally');
                await rest.put(Routes.applicationCommands(clientId), {
                    body: commands.map(c => c.data.toJSON()),
                });
                console.log('[Discord] Slash commands registered globally.');
            }
        } catch (e: any) {
            console.error('[Discord] Command registration error:', e?.message ?? e);
            console.error('[Discord] Stack:', e?.stack);
        }

        // Poll notification queue every 30 seconds
        setInterval(() => processQueue(client).catch((e: any) => {
            console.error('[Discord] Queue error:', e?.message ?? e);
        }), 30_000);

        // Expire stale PENDING_CONFIRMATION signups every 15 minutes
        setInterval(async () => {
            try {
                const { quests } = await import('@core/database');
                await quests.expireStalePromotions();
            } catch (e: any) {
                console.error('[Discord] Signup expiry error:', e?.message ?? e);
            }
        }, 15 * 60 * 1000);
    });

    client.on('error', (e) => console.error('[Discord] Client error:', e?.message ?? e));
    client.on('interactionCreate', (interaction) => handleInteraction(interaction));

    console.log('[Discord] Attempting login...');
    await client.login(token);
}

main().catch((e) => {
    console.error('[Discord] Fatal startup error:', e?.message ?? e);
    process.exit(1);
});