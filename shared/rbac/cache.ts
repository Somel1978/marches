// shared/rbac/cache.ts

// Permission Cache
// Stores resolved UserPermissions per user alongside the time they were cached.
// On every read, the caller compares cachedAt against the global
// `rbac.permissionsUpdatedAt` DB setting — if the DB timestamp is newer the
// entry is stale and must be re-fetched. This makes invalidation cross-process:
// any process (admin, frontend) that bumps the DB timestamp will cause all
// other processes to re-fetch on the next request, with only one cheap DB
// read per request (the timestamp SELECT) rather than a full permission query.
//
// TTL: 60 minutes safety net for edge cases (e.g. direct DB edits).
// Explicit DB-timestamp invalidation is the primary mechanism.

import { LRUCache } from 'lru-cache';
import type { UserPermissions } from './access.ts';

export interface CachedEntry {
    permissions: UserPermissions;
    cachedAt:    number;   // Date.now() when stored
}

export interface PermissionCacheStore {
    get(userId: string): CachedEntry | undefined;
    set(userId: string, entry: CachedEntry): void;
    delete(userId: string): void;
    clear(): void;
}

const TTL_MS      = 60 * 60 * 1000; // 60 minutes safety net
const MAX_ENTRIES = 5_000;

class LruPermissionCache implements PermissionCacheStore {
    private cache = new LRUCache<string, CachedEntry>({
        max: MAX_ENTRIES,
        ttl: TTL_MS,
    });
    get(userId: string)                     { return this.cache.get(userId); }
    set(userId: string, entry: CachedEntry) { this.cache.set(userId, entry); }
    delete(userId: string)                  { this.cache.delete(userId); }
    clear()                                 { this.cache.clear(); }
}

export const permissionCache: PermissionCacheStore = new LruPermissionCache();