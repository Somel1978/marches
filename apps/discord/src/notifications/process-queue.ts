// apps/discord/src/notifications/process-queue.ts
import { Client } from 'discord.js';
import { discord } from '@core/database';
import {
    notifyQuestPublished, notifyQuestResult, notifyQuestStarted,
    notifyQuestPendingApproval, notifyQuestResultPending,
    notifyAnnouncement, notifyInvite,
    notifyItemPurchased, notifyItemSold, notifyMarketplacePending,
    notifyCharacterApproved, notifyCharacterRejected, notifyCharacterPendingApproval,
} from './dispatcher.js';

export async function processQueue(client: Client) {
    const pending = await discord.notifications.getPending(20);

    for (const item of pending) {
        try {
            const p = item.payload as any;
            switch (item.type) {
                // Quest
                case 'QUEST_PUBLISHED':         await notifyQuestPublished(p);                                                    break;
                case 'QUEST_STARTED':           await notifyQuestStarted(p);                                                      break;
                case 'QUEST_PENDING_APPROVAL':  await notifyQuestPendingApproval(p);                                              break;
                case 'QUEST_RESULT_PENDING':    await notifyQuestResultPending(p);                                                 break;
                case 'QUEST_RESULT':            await notifyQuestResult({ id: p.questId, title: p.questTitle, worldId: p.worldId }, p.chars); break;
                // Character
                case 'CHAR_PENDING_APPROVAL':   await notifyCharacterPendingApproval(p.char);                                     break;
                case 'CHAR_APPROVED':           await notifyCharacterApproved(p.char);                                            break;
                case 'CHAR_REJECTED':           await notifyCharacterRejected(p.char, p.note);                                    break;
                // Marketplace
                case 'MARKET_PENDING':          await notifyMarketplacePending(p.char, p.item, p.txType, p.worldId);              break;
                case 'ITEM_PURCHASED':          await notifyItemPurchased(p.char, p.item, p.worldId);                             break;
                case 'ITEM_SOLD':               await notifyItemSold(p.char, p.item, p.price, p.worldId);                         break;
                // Other
                case 'ANNOUNCEMENT':            await notifyAnnouncement(p);                                                      break;
                case 'QUEST_INVITE':            await notifyInvite(p.discordId, p.quest);                                         break;
            }
        } catch (e) {
            console.error(`[Discord] Failed to process notification ${item.id}:`, e);
        }
        // Always mark processed — even on failure — to prevent infinite retry loop
        await discord.notifications.markProcessed(item.id);
    }
}