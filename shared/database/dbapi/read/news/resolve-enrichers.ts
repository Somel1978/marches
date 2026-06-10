// shared/database/dbapi/read/news/resolve-enrichers.ts
// Parses [[type:id]] tokens from markdown content and resolves them to rich data.
import { db } from '../../../index.ts';

export type EnricherToken = {
    raw:    string;   // [[quest:abc123]]
    type:   string;   // quest
    id:     string;   // abc123
    label:  string;   // resolved display name
    href:   string;   // link target
    badge?: string;   // optional badge text (e.g. status, rarity)
};

const TOKEN_RE = /\[\[(\w+):([a-f0-9-]{36})\]\]/g;

export async function resolveEnrichers(content: string): Promise<{ content: string; tokens: EnricherToken[] }> {
    const matches = [...content.matchAll(TOKEN_RE)];
    if (!matches.length) return { content, tokens: [] };

    // Group by type to batch DB queries
    const byType: Record<string, string[]> = {};
    for (const m of matches) {
        const [, type, id] = m;
        if (!byType[type]) byType[type] = [];
        if (!byType[type].includes(id)) byType[type].push(id);
    }

    const resolved: Record<string, EnricherToken> = {};

    await Promise.all(Object.entries(byType).map(async ([type, ids]) => {
        switch (type) {
            case 'quest': {
                const rows = await db.quest.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, status: true } });
                for (const r of rows) resolved[`quest:${r.id}`] = { raw: `[[quest:${r.id}]]`, type, id: r.id, label: r.title, href: `/quests/${r.id}`, badge: r.status };
                break;
            }
            case 'item': {
                const rows = await db.marketplaceItem.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, rarity: true } });
                for (const r of rows) resolved[`item:${r.id}`] = { raw: `[[item:${r.id}]]`, type, id: r.id, label: r.name, href: `/marketplace/${r.id}`, badge: r.rarity ?? undefined };
                break;
            }
            case 'character': {
                const rows = await db.character.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, totalXp: true } });
                for (const r of rows) resolved[`character:${r.id}`] = { raw: `[[character:${r.id}]]`, type, id: r.id, label: r.name, href: `/characters/public/${r.id}` };
                break;
            }
            case 'world': {
                const rows = await db.world.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, slug: true } });
                for (const r of rows) resolved[`world:${r.id}`] = { raw: `[[world:${r.id}]]`, type, id: r.id, label: r.name, href: `/world/${r.slug}` };
                break;
            }
            case 'region': {
                const rows = await db.region.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, slug: true, worldId: true }, include: { world: { select: { slug: true } } } } as any);
                for (const r of rows as any[]) resolved[`region:${r.id}`] = { raw: `[[region:${r.id}]]`, type, id: r.id, label: r.name, href: `/world/${r.world?.slug}/${r.slug}` };
                break;
            }
            case 'location': {
                const rows = await db.location.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, slug: true }, include: { region: { include: { world: { select: { slug: true } } } } } } as any);
                for (const r of rows as any[]) resolved[`location:${r.id}`] = { raw: `[[location:${r.id}]]`, type, id: r.id, label: r.name, href: `/world/${r.region?.world?.slug}/${r.region?.slug}/${r.slug}` };
                break;
            }
            case 'user': {
                const rows = await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
                for (const r of rows) resolved[`user:${r.id}`] = { raw: `[[user:${r.id}]]`, type, id: r.id, label: r.name, href: '' };
                break;
            }
        }
    }));

    const tokens = Object.values(resolved);
    return { content, tokens };
}

// Search all enrichable entities by name query
export async function searchEnrichablesbyName(query: string, limit = 8) {
    const q = query.toLowerCase();
    const [quests, items, characters, worlds, regions, locations, users] = await Promise.all([
        db.quest.findMany({ where: { title: { contains: q, mode: 'insensitive' } }, select: { id: true, title: true, status: true }, take: limit }),
        db.marketplaceItem.findMany({ where: { name: { contains: q, mode: 'insensitive' } }, select: { id: true, name: true, rarity: true }, take: limit }),
        db.character.findMany({ where: { name: { contains: q, mode: 'insensitive' } }, select: { id: true, name: true }, take: limit }),
        db.world.findMany({ where: { name: { contains: q, mode: 'insensitive' } }, select: { id: true, name: true }, take: limit }),
        db.region.findMany({ where: { name: { contains: q, mode: 'insensitive' } }, select: { id: true, name: true }, take: limit }),
        db.location.findMany({ where: { name: { contains: q, mode: 'insensitive' } }, select: { id: true, name: true }, take: limit }),
        db.user.findMany({ where: { name: { contains: q, mode: 'insensitive' } }, select: { id: true, name: true }, take: limit }),
    ]);

    return [
        ...quests.map(r => ({ type: 'quest',     id: r.id, label: r.title,    badge: r.status })),
        ...items.map(r =>  ({ type: 'item',      id: r.id, label: r.name,     badge: r.rarity })),
        ...characters.map(r => ({ type: 'character', id: r.id, label: r.name })),
        ...worlds.map(r => ({ type: 'world',    id: r.id, label: r.name })),
        ...regions.map(r => ({ type: 'region',   id: r.id, label: r.name })),
        ...locations.map(r => ({ type: 'location', id: r.id, label: r.name })),
        ...users.map(r =>  ({ type: 'user',      id: r.id, label: r.name })),
    ];
}