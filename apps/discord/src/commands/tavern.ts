// apps/discord/src/commands/tavern.ts
import { ChatInputCommandInteraction } from 'discord.js';
import { tavern, users, db } from '@core/database';

export async function handleTavernCommand(interaction: ChatInputCommandInteraction) {
    const content       = interaction.options.getString('message', true);
    const channelOpt    = interaction.options.getString('channel')  ?? undefined;
    const characterName = interaction.options.getString('character') ?? undefined;
    const discordId     = interaction.user.id;

    // Look up the platform user by discordId
    const user = await db.user.findFirst({
        where:  { discordId },
        select: { id: true, name: true, image: true },
    });

    if (!user) {
        await interaction.reply({ content: '❌ Your Discord account is not linked to a Marches account.', ephemeral: true });
        return;
    }

    // Find the Tavern channel
    const guildId = interaction.guildId;
    const server  = guildId
        ? await db.discordServer.findUnique({ where: { guildId }, select: { worldId: true } })
        : null;

    let channel;

    if (channelOpt === 'global') {
        // Explicitly requested global
        channel = await tavern.channels.getGlobal();
    } else if (channelOpt) {
        // Look up world by name
        const world = await db.world.findFirst({
            where:  { name: { contains: channelOpt, mode: 'insensitive' }, isActive: true },
            select: { id: true, name: true },
        });
        if (!world) {
            await interaction.reply({ content: `❌ No world found matching "${channelOpt}".`, ephemeral: true });
            return;
        }
        await tavern.channels.ensureWorld(world.id, world.name);
        channel = await tavern.channels.getByWorldId(world.id);
    } else if (server?.worldId) {
        // Default to this Discord server's world
        const world = await db.world.findUnique({ where: { id: server.worldId }, select: { name: true } });
        await tavern.channels.ensureWorld(server.worldId, world?.name ?? 'World');
        channel = await tavern.channels.getByWorldId(server.worldId);
    } else {
        // No world associated — fall back to global
        channel = await tavern.channels.getGlobal();
    }

    if (!channel) {
        await interaction.reply({ content: '❌ No Tavern channel found for this server.', ephemeral: true });
        return;
    }

    // Check private channel access
    if (channel.isPrivate && server?.worldId) {
        const hasChar = await db.character.findFirst({
            where: { userId: user.id, worldId: server.worldId, status: { in: ['ACTIVE', 'RESTING', 'PENDING'] } },
            select: { id: true },
        });
        if (!hasChar) {
            await interaction.reply({ content: '❌ This channel is private — you need an active character in this world.', ephemeral: true });
            return;
        }
    }

    await tavern.messages.send({
        channelId:     channel.id,
        authorId:      user.id,
        authorType:    'CHARACTER',
        authorName:    user.name,
        authorAvatar:  user.image ?? undefined,
        characterName: characterName,
        content,
    });

    await interaction.reply({ content: `✅ Message posted to the Tavern!`, ephemeral: true });
}