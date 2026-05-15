// shared/rbac/cache.ts

// Permission Cache 
// Caches the resolved UserPermissions map per user to avoid a DB query on
// every request. The interface is designed to be swappable ‚Äî replace the
// LruPermissionCache with a RedisPermissionCache when horizontal scaling
// or cross-process invalidation is needed, without changing any callers.
//
// Invalidation responsibility:
//   - setUserRoles  invalidate the affected user directly
//   - updatePermissions  invalidate all users with that role
//   Both are called from SvelteKit actions (app layer) AFTER the dbapi write,
//   keeping @core/database free of any dependency on @core/rbac.
//
// TTL: 5 minutes as a safety net. Explicit invalidation is the primary
// mechanism  TTL only covers edge cases (e.g. direct DB edits).
//

import { LRUCache } from 'lru-cache';
import type { UserPermissions } from './access.ts';

// ‚Interface  swap this for Redis without changing callers

export interface PermissionCacheStore {
    get(userId: string): UserPermissions | undefined;
    set(userId: string, permissions: UserPermissions): void;
    delete(userId: string): void;
    clear(): void;
}

// LRU implementation

const TTL_MS      = 5 * 60 * 1000;  // 5 minutes
const MAX_ENTRIES = 5_000;           // max concurrent cached users

class LruPermissionCache implements PermissionCacheStore {
    private cache = new LRUCache<string, UserPermissions>({
        max: MAX_ENTRIES,
        ttl: TTL_MS,
    });

    get(userId: string): UserPermissions | undefined {
        return this.cache.get(userId);
    }

    set(userId: string, permissions: UserPermissions): void {
        this.cache.set(userId, permissions);
    }

    delete(userId: string): void {
        this.cache.delete(userId);
    }

    clear(): void {
        this.cache.clear();
    }
}

// ‚Singleton replace with RedisPermissionCache when ready
// To switch to Redis:
//   1. Implement RedisPermissionCache satisfying PermissionCacheStore
//   2. Replace the line below: export const permissionCache = new RedisPermissionCache(redisClient);
//   3. No other files need to change.

export const permissionCache: PermissionCacheStore = new LruPermissionCache();
