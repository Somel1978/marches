// shared/database/dbapi/write/discord/dispatcher.ts
// Discord notification queue — stores pending notifications for the bot to process
import { db } from '../../../index.ts';

export async function queueDiscordNotification(type: string, payload: Record<string, any>) {
    try {
        await db.discordNotificationQueue.create({ data: { type, payload } });
    } catch {
        // Table may not exist yet — fail silently
    }
}
