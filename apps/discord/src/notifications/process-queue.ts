// apps/discord/src/notifications/process-queue.ts
import { Client } from 'discord.js';
import { discord } from '@core/database';
import {
    notifyQuestPublished, notifyQuestResult, notifyAnnouncement,
    notifyInvite, notifyItemPurchased, notifyItemSold, notifyCharacterApproved,
} from './dispatcher.js';

export async function processQueue(client: Client) {
    const pending = await discord.notifications.getPending(20);

    for (const item of pending) {
        try {
            const p = item.payload as any;
            switch (item.type) {
                case 'QUEST_PUBLISHED':   await notifyQuestPublished(p);              break;
                case 'QUEST_RESULT':      await notifyQuestResult({ id: p.questId, title: p.questTitle, worldId: p.worldId }, p.chars); break;
                case 'ANNOUNCEMENT':      await notifyAnnouncement(p);                break;
                case 'QUEST_INVITE':      await notifyInvite(p.discordId, p.quest);   break;
                case 'ITEM_PURCHASED':    await notifyItemPurchased(p.char, p.item);  break;
                case 'ITEM_SOLD':         await notifyItemSold(p.char, p.item, p.price); break;
                case 'CHAR_APPROVED':     await notifyCharacterApproved(p.char);      break;
            }
            await discord.notifications.markProcessed(item.id);
        } catch (e) {
            console.error(`[Discord] Failed to process notification ${item.id}:`, e);
        }
    }
}