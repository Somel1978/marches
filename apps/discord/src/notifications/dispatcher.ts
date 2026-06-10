// apps/discord/src/notifications/dispatcher.ts
import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { discord, platform } from '@core/database';

let _client: Client | null = null;

export function setClient(client: Client) { _client = client; }

async function send(scope: string, type: string, embed: EmbedBuilder) {
    if (!_client) return;
    const channels = await discord.channels.getAllForType(scope, type);
    for (const ch of channels) {
        try {
            const channel = await _client.channels.fetch(ch.channelId);
            if (channel instanceof TextChannel) await channel.send({ embeds: [embed] });
        } catch (e: any) {
            console.error(`[Discord] Failed to send to channel ${ch.channelId}:`, e?.message ?? e);
        }
    }
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


// ── DM helpers ────────────────────────────────────────────────────────────────

async function dmAdmins(embed: EmbedBuilder) {
    if (!_client) return;
    const { db } = await import('@core/database');
    const rows = await db.userRole.findMany({
        where: {
            role: {
                OR: [
                    { name: 'SUPERADMIN' },
                    { permissions: { some: { resourceKey: 'User', canRead: 'ALL' } } },
                ],
            },
        },
        select: { userId: true },
    });
    const userIds = [...new Set(rows.map((r: any) => r.userId))];
    if (!userIds.length) return;
    const adminUsers = await db.user.findMany({
        where:  { id: { in: userIds } },
        select: { discordId: true },
    });
    const seen = new Set<string>();
    for (const u of adminUsers) {
        const discordId = (u as any).discordId;
        if (!discordId || seen.has(discordId)) continue;
        seen.add(discordId);
        try {
            const du = await _client.users.fetch(discordId);
            await du.send({ embeds: [embed] });
        } catch (e: any) {
            console.error('[Discord] DM to admin failed:', e?.message ?? e);
        }
    }
}

async function dmWorldDMs(worldId: string, embed: EmbedBuilder) {
    if (!_client) return;
    const { db } = await import('@core/database');
    // WorldDM has no relation to DMProfile — join manually
    const assignments = await db.worldDM.findMany({
        where:  { worldId, canManage: true },
        select: { dmProfileId: true },
    });
    const profileIds = assignments.map((a: any) => a.dmProfileId);
    if (!profileIds.length) return;
    const profiles = await db.dMProfile.findMany({
        where:  { id: { in: profileIds } },
        select: { userId: true },
    });
    const userIds = profiles.map((p: any) => p.userId);
    if (!userIds.length) return;
    const users = await db.user.findMany({
        where:  { id: { in: userIds } },
        select: { discordId: true },
    });
    const seen = new Set<string>();
    for (const a of users) {
        const discordId = (a as any).discordId;
        if (!discordId || seen.has(discordId)) continue;
        seen.add(discordId);
        try {
            const u = await _client.users.fetch(discordId);
            await u.send({ embeds: [embed] });
        } catch (e: any) {
            console.error('[Discord] DM to world DM failed:', e?.message ?? e);
        }
    }
}

export async function notifyCharacterPendingApproval(char: any) {
    const embed = new EmbedBuilder()
        .setTitle(`📋 Character Awaiting Approval: ${char.name}`)
        .setColor(0xf59e0b)
        .setDescription(`**${char.name}** has been submitted for review.`)
        .addFields({ name: 'Reason', value: char.statusReason?.replace(/_/g, ' ') ?? 'New character', inline: true })
        .setTimestamp();
    await send('global', 'APPROVALS', embed);
    if (char.worldId) await send(char.worldId, 'APPROVALS', embed);
    // DM admins and world DMs directly
    await dmAdmins(embed);
    if (char.worldId) await dmWorldDMs(char.worldId, embed);
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
    // DM world DMs directly (and admins as fallback)
    if (worldId) await dmWorldDMs(worldId, embed);
    else await dmAdmins(embed);
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
// ── User registered ───────────────────────────────────────────────────────────
export async function notifyUserRegistered(user: { id: string; name: string; email: string }) {
    if (!_client) return;

    const embed = new EmbedBuilder()
        .setTitle('🆕 New User Registered')
        .setColor(0x5865F2)
        .addFields(
            { name: 'Name',  value: user.name,  inline: true },
            { name: 'Email', value: user.email, inline: true },
        )
        .setTimestamp();

    await dmAdmins(embed);
}

// ── Tavern message mirror ─────────────────────────────────────────────────────
export async function notifyTavernMessage(p: {
    channelId:     string;
    worldId?:      string;
    authorName:    string;
    authorType:    string;
    characterName?: string;
    content:       string;
}) {
    if (!_client) return;

    const typeEmoji: Record<string, string> = { CHARACTER: '🧙', DM: '🎲', ADMIN: '⚙️' };
    const emoji    = typeEmoji[p.authorType] ?? '💬';
    const name     = p.characterName ? `${p.characterName} (${p.authorName})` : p.authorName;

    const embed = new EmbedBuilder()
        .setAuthor({ name: `${emoji} ${name}` })
        .setDescription(p.content.slice(0, 2000))
        .setColor(0x5865F2)
        .setTimestamp();

    // Send to world channel if worldId exists, otherwise global TAVERN channel
    const channelType = p.worldId ? p.worldId : 'global';
    await send(channelType, 'TAVERN', embed);
}