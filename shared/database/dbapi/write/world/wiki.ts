// shared/database/dbapi/write/world/wiki.ts
import { db } from '../../../index.ts';
import { logAudit } from '../audit/log.ts';

export async function upsertWikiPage(
    entityType: string,
    entityId: string,
    title: string,
    content: string,
    actorId: string,
) {
    return db.$transaction(async (tx) => {
        const existing = await tx.wikiPage.findUnique({
            where: { entityType_entityId: { entityType: entityType as any, entityId } },
        });

        let page;
        if (existing) {
            // Save current content as revision before overwriting
            await tx.wikiRevision.create({
                data: { pageId: existing.id, content: existing.content, editedBy: existing.editedBy },
            });
            page = await tx.wikiPage.update({
                where: { id: existing.id },
                data:  { title, content, editedBy: actorId },
            });
        } else {
            page = await tx.wikiPage.create({
                data: { entityType: entityType as any, entityId, title, content, editedBy: actorId },
            });
        }

        await logAudit(tx, {
            actorId,
            action:      existing ? 'UPDATE' : 'CREATE',
            resourceKey: 'WikiPage',
            resourceId:  page.id,
            after:       { entityType, entityId, title },
        });

        return page;
    });
}
