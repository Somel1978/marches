// apps/discord/src/notifications/dispatcher.ts
import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { discord, platform } from '@core/database';

let _client: Client | null = null;

export function setClient(client: Client) { _client = client; }

async function getChannel(scope: string, type: string): Promise<TextChannel | null> {
    if (!_client) return null;
    const ch = await discord.channels.getForType(scope, type);
    if (!ch) return null;
    try {
        const channel = await _client.channels.fetch(ch.channelId);
        return channel instanceof TextChannel ? channel : null;
    } catch { return null; }
}

async function send(scope: string, type: string, embed: EmbedBuilder) {
    const channel = await getChannel(scope, type);
    if (channel) await channel.send({ embeds: [embed] });
}

// ── Notification dispatchers ──────────────────────────────────────────────────

export async function notifyQuestPublished(quest: any) {
    const settings = await platform.getSettingsMap();
    const siteUrl  = settings['site.url'] ?? '';
    const embed = new EmbedBuilder()
        .setTitle(`⚔ New Quest: ${quest.title}`)
        .setColor(0x6366f1)
        .setDescription(quest.description?.slice(0, 200) ?? '')
        .addFields(
            { name: 'Level',   value: `${quest.minLevel}–${quest.maxLevel}`, inline: true },
            { name: 'Players', value: `0/${quest.maxCapacity}`,              inline: true },
            { name: 'XP',      value: quest.missionXp.toLocaleString(),      inline: true },
        )
        .setURL(`${siteUrl}/quests/${quest.id}`)
        .setTimestamp();

    // Post to global quests channel + world-specific if quest has a world
    await send('global', 'QUESTS', embed);
    if (quest.worldId) await send(quest.worldId, 'QUESTS', embed);
}

export async function notifyQuestResult(quest: any, resultChars: any[]) {
    const settings = await platform.getSettingsMap();
    const siteUrl  = settings['site.url'] ?? '';
    const embed = new EmbedBuilder()
        .setTitle(`✅ Quest Completed: ${quest.title}`)
        .setColor(0x22c55e)
        .setDescription('Rewards have been distributed!')
        .addFields(
            resultChars.map(rc => ({
                name:   rc.characterName,
                value:  `XP: ${rc.xpAwarded?.toLocaleString() ?? 0} · Gold: ${rc.goldAwarded?.toLocaleString() ?? 0}${rc.itemGrantedName ? ` · Item: ${rc.itemGrantedName}` : ''}`,
                inline: false,
            }))
        )
        .setURL(`${siteUrl}/quests/${quest.id}`)
        .setTimestamp();

    await send('global', 'QUESTS', embed);
    if (quest.worldId) await send(quest.worldId, 'QUESTS', embed);
}

export async function notifyAnnouncement(announcement: any) {
    const embed = new EmbedBuilder()
        .setTitle(announcement.title)
        .setColor(
            announcement.type === 'EVENT'   ? 0x6366f1 :
            announcement.type === 'WARNING' ? 0xf59e0b :
            announcement.type === 'STATUS'  ? 0x22c55e : 0x9ca3af
        )
        .setDescription(announcement.content.slice(0, 400))
        .addFields({ name: 'Type', value: announcement.type, inline: true })
        .setTimestamp();

    if (announcement.scheduledAt) {
        embed.addFields({ name: 'Event time', value: new Date(announcement.scheduledAt).toLocaleString(), inline: true });
    }

    await send('global', 'ANNOUNCEMENTS', embed);
}

export async function notifyItemPurchased(char: any, item: any) {
    const embed = new EmbedBuilder()
        .setTitle('🛒 Purchase Approved')
        .setColor(0x22c55e)
        .setDescription(`**${char.name}** purchased **${item.name}**`)
        .addFields({ name: 'Price', value: `${item.buyPrice?.toLocaleString() ?? '?'} GP`, inline: true })
        .setTimestamp();

    await send('global', 'MARKET', embed);
}

export async function notifyItemSold(char: any, item: any, price: number) {
    const embed = new EmbedBuilder()
        .setTitle('💰 Sale Approved')
        .setColor(0x22c55e)
        .setDescription(`**${char.name}** sold **${item.name}**`)
        .addFields({ name: 'Received', value: `${price.toLocaleString()} GP`, inline: true })
        .setTimestamp();

    await send('global', 'MARKET', embed);
}

export async function notifyCharacterApproved(char: any) {
    const embed = new EmbedBuilder()
        .setTitle('🧙 Character Approved')
        .setColor(0x8b5cf6)
        .setDescription(`**${char.name}** has been approved and is now active!`)
        .setTimestamp();

    await send('global', 'CHARACTERS', embed);
}

export async function notifyInvite(discordId: string, quest: any) {
    if (!_client) return;
    const settings = await platform.getSettingsMap();
    const siteUrl  = settings['site.url'] ?? '';
    try {
        const user = await _client.users.fetch(discordId);
        const embed = new EmbedBuilder()
            .setTitle(`⚔ Quest Invite: ${quest.title}`)
            .setColor(0xf59e0b)
            .setDescription(`You've been invited to join **${quest.title}**. Visit the quest page to sign up.`)
            .addFields(
                { name: 'Level', value: `${quest.minLevel}–${quest.maxLevel}`, inline: true },
                { name: 'XP',   value: quest.missionXp.toLocaleString(),       inline: true },
            )
            .setURL(`${siteUrl}/quests/${quest.id}`)
            .setTimestamp();
        await user.send({ embeds: [embed] });
    } catch { /* user has DMs disabled */ }
}
