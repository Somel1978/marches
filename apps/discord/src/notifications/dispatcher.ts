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
    } catch (e: any) {
        console.error(`[Discord] Failed to fetch channel ${ch.channelId}:`, e?.message ?? e);
        return null;
    }
}

async function send(scope: string, type: string, embed: EmbedBuilder) {
    const channel = await getChannel(scope, type);
    if (channel) await channel.send({ embeds: [embed] });
}

async function getSettings() {
    return platform.getSettingsMap();
}

// ── Quest notifications ───────────────────────────────────────────────────────

export async function notifyQuestPublished(quest: any) {
    const settings = await getSettings();
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
    if (quest.scheduledAt) embed.addFields({ name: 'Scheduled', value: new Date(quest.scheduledAt).toLocaleString(), inline: true });

    await send('global', 'QUESTS', embed);
    if (quest.worldId) await send(quest.worldId, 'QUESTS', embed);
}

export async function notifyQuestStarted(quest: any) {
    const settings = await getSettings();
    const siteUrl  = settings['site.url'] ?? '';
    const embed = new EmbedBuilder()
        .setTitle(`⚔ Quest Started: ${quest.title}`)
        .setColor(0x6366f1)
        .setDescription('This quest is now in progress. Good luck adventurers!')
        .setURL(`${siteUrl}/quests/${quest.id}`)
        .setTimestamp();
    await send('global', 'QUESTS', embed);
    if (quest.worldId) await send(quest.worldId, 'QUESTS', embed);
}

export async function notifyQuestPendingApproval(quest: any) {
    const settings = await getSettings();
    const siteUrl  = settings['site.url'] ?? '';
    const embed = new EmbedBuilder()
        .setTitle(`📋 Quest Awaiting Approval: ${quest.title}`)
        .setColor(0xf59e0b)
        .setDescription(`Submitted by **${quest.dmName ?? 'DM'}** — needs review before publishing.`)
        .addFields(
            { name: 'Level', value: `${quest.minLevel}–${quest.maxLevel}`, inline: true },
            { name: 'XP',    value: quest.missionXp?.toLocaleString() ?? '0', inline: true },
        )
        .setURL(`${siteUrl}/quests/${quest.id}`)
        .setTimestamp();
    await send('global', 'APPROVALS', embed);
    if (quest.worldId) await send(quest.worldId, 'APPROVALS', embed);
}

export async function notifyQuestResultPending(quest: any) {
    const settings = await getSettings();
    const siteUrl  = settings['site.url'] ?? '';
    const embed = new EmbedBuilder()
        .setTitle(`📋 Quest Result Awaiting Approval: ${quest.title}`)
        .setColor(0xf59e0b)
        .setDescription('Quest result has been submitted and needs review.')
        .setURL(`${siteUrl}/quests/${quest.id}`)
        .setTimestamp();
    await send('global', 'APPROVALS', embed);
    if (quest.worldId) await send(quest.worldId, 'APPROVALS', embed);
}

export async function notifyQuestResult(quest: any, resultChars: any[]) {
    const settings = await getSettings();
    const siteUrl  = settings['site.url'] ?? '';
    const embed = new EmbedBuilder()
        .setTitle(`✅ Quest Completed: ${quest.title ?? 'Unknown Quest'}`)
        .setColor(0x22c55e)
        .setDescription('Rewards have been distributed!')
        .addFields(
            resultChars
                .filter(rc => rc.characterName)
                .map(rc => ({
                    name:   String(rc.characterName),
                    value:  `XP: ${rc.xpAwarded?.toLocaleString() ?? 0} · Gold: ${rc.goldAwarded?.toLocaleString() ?? 0}${rc.tokensAwarded ? ` · Tokens: ${rc.tokensAwarded}` : ''}${rc.itemGrantedName ? ` · 🎒 ${rc.itemGrantedName}` : ''}`,
                    inline: false,
                }))
        )
        .setURL(`${siteUrl}/quests/${quest.id}`)
        .setTimestamp();

    await send('global', 'QUESTS', embed);
    if (quest.worldId) await send(quest.worldId, 'QUESTS', embed);
}

// ── Character notifications ───────────────────────────────────────────────────

export async function notifyCharacterPendingApproval(char: any) {
    const embed = new EmbedBuilder()
        .setTitle(`📋 Character Awaiting Approval: ${char.name}`)
        .setColor(0xf59e0b)
        .setDescription(`**${char.name}** has been submitted for review.`)
        .addFields({ name: 'Reason', value: char.statusReason?.replace(/_/g, ' ') ?? 'New character', inline: true })
        .setTimestamp();
    await send('global', 'APPROVALS', embed);
    if (char.worldId) await send(char.worldId, 'APPROVALS', embed);
}

export async function notifyCharacterApproved(char: any) {
    const embed = new EmbedBuilder()
        .setTitle('🧙 Character Approved')
        .setColor(0x8b5cf6)
        .setDescription(`**${char.name}** has been approved and is now active!`)
        .setTimestamp();
    await send('global', 'CHARACTERS', embed);
    if (char.worldId) await send(char.worldId, 'CHARACTERS', embed);
}

export async function notifyCharacterRejected(char: any, note: string) {
    const embed = new EmbedBuilder()
        .setTitle('❌ Character Rejected')
        .setColor(0xef4444)
        .setDescription(`**${char.name}** was rejected.`)
        .addFields({ name: 'Reason', value: note, inline: false })
        .setTimestamp();
    await send('global', 'CHARACTERS', embed);
    if (char.worldId) await send(char.worldId, 'CHARACTERS', embed);
}

// ── Marketplace notifications ─────────────────────────────────────────────────

export async function notifyMarketplacePending(char: any, item: any, type: 'BUY' | 'SELL', worldId?: string) {
    const embed = new EmbedBuilder()
        .setTitle(`📋 Marketplace ${type === 'BUY' ? 'Purchase' : 'Sale'} Pending`)
        .setColor(0xf59e0b)
        .setDescription(`**${char.name}** wants to ${type === 'BUY' ? 'buy' : 'sell'} **${item.name}** — awaiting approval.`)
        .addFields({ name: 'Value', value: `${item.price?.toLocaleString() ?? '?'} GP`, inline: true })
        .setTimestamp();
    await send('global', 'APPROVALS', embed);
    if (worldId) await send(worldId, 'APPROVALS', embed);
}

export async function notifyItemPurchased(char: any, item: any, worldId?: string) {
    const embed = new EmbedBuilder()
        .setTitle('🛒 Purchase Approved')
        .setColor(0x22c55e)
        .setDescription(`**${char.name}** purchased **${item.name}**`)
        .addFields({ name: 'Price', value: `${item.buyPrice?.toLocaleString() ?? '?'} GP`, inline: true })
        .setTimestamp();
    await send('global', 'MARKET', embed);
    if (worldId) await send(worldId, 'MARKET', embed);
}

export async function notifyItemSold(char: any, item: any, price: number, worldId?: string) {
    const embed = new EmbedBuilder()
        .setTitle('💰 Sale Approved')
        .setColor(0x22c55e)
        .setDescription(`**${char.name}** sold **${item.name}**`)
        .addFields({ name: 'Received', value: `${price.toLocaleString()} GP`, inline: true })
        .setTimestamp();
    await send('global', 'MARKET', embed);
    if (worldId) await send(worldId, 'MARKET', embed);
}

// ── Announcements ─────────────────────────────────────────────────────────────

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

// ── DM invite ─────────────────────────────────────────────────────────────────

export async function notifyInvite(discordId: string, quest: any) {
    if (!_client) return;
    const settings = await getSettings();
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
        if (quest.scheduledAt) embed.addFields({ name: 'Scheduled', value: new Date(quest.scheduledAt).toLocaleString(), inline: true });
        await user.send({ embeds: [embed] });
    } catch { /* user has DMs disabled */ }
}