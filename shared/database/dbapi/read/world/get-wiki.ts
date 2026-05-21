// shared/database/dbapi/read/world/get-wiki.ts
import { db } from '../../../index.ts';

export async function getWikiPage(entityType: string, entityId: string) {
    return db.wikiPage.findUnique({
        where:   { entityType_entityId: { entityType: entityType as any, entityId } },
        include: { revisions: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
}
