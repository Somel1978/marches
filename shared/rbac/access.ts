// shared/rbac/access.ts
import { db } from "@core/database";
import type { AccessLevel } from "@core/database";
import { ForbiddenError } from "@core/errors";
import { permissionCache } from "./cache.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

export type PermissionRequest = {
    resourceKey: string;
    action:      PermissionAction;
};

export type PermissionResult =
    | { allowed: false; level: 'NONE' }
    | { allowed: true;  level: 'ALL'  }
    | { allowed: true;  level: 'OWN'  };

export type ResolvedPermission = {
    canCreate: AccessLevel;
    canRead:   AccessLevel;
    canUpdate: AccessLevel;
    canDelete: AccessLevel;
};

export type UserPermissions = Map<string, ResolvedPermission>;

export type NavVisibility = 'NONE' | 'ANY' | 'ALL';

// ── Helpers ───────────────────────────────────────────────────────────────────

const LEVEL_ORDER: AccessLevel[] = ['NONE', 'OWN', 'ALL'];

function higher(a: AccessLevel, b: AccessLevel): AccessLevel {
    return LEVEL_ORDER.indexOf(a) >= LEVEL_ORDER.indexOf(b) ? a : b;
}

function actionLevel(perm: ResolvedPermission, action: PermissionAction): AccessLevel {
    switch (action) {
        case 'create': return perm.canCreate;
        case 'read':   return perm.canRead;
        case 'update': return perm.canUpdate;
        case 'delete': return perm.canDelete;
    }
}

// ── Core Engine ───────────────────────────────────────────────────────────────

const TIMESTAMP_KEY = 'rbac.permissionsUpdatedAt';

async function getPermissionsTimestamp(): Promise<number> {
    const row = await db.setting.findUnique({ where: { key: TIMESTAMP_KEY } });
    return row?.value ? Number(row.value) : 0;
}

async function bumpPermissionsTimestamp(): Promise<void> {
    const now = String(Date.now());
    await db.setting.upsert({
        where:  { key: TIMESTAMP_KEY },
        update: { value: now },
        create: { key: TIMESTAMP_KEY, value: now, description: 'Last time role permissions were changed — used for cross-process cache invalidation', isSecret: false },
    });
}

export async function getUserPermissions(userId: string): Promise<UserPermissions> {
    // Check DB timestamp first — one cheap SELECT to detect cross-process invalidation
    const dbTimestamp = await getPermissionsTimestamp();
    const cached = permissionCache.get(userId);
    if (cached && cached.cachedAt >= dbTimestamp) return cached.permissions;

    const user = await db.user.findUnique({
        where: { id: userId },
        include: {
            userRoles: {
                include: {
                    role: { include: { permissions: true } },
                },
            },
        },
    });

    if (!user?.userRoles.length) {
        const empty = new Map<string, ResolvedPermission>();
        permissionCache.set(userId, { permissions: empty, cachedAt: Date.now() });
        return empty;
    }

    // SUPERADMIN bypass — exempt from permission checks entirely.
    // Returns a sentinel map that checkPermission recognises as ALL access.
    // New features automatically work for SUPERADMIN with no seed changes needed.
    const isSuperAdmin = user.userRoles.some(ur => ur.role.name === 'SUPERADMIN');
    if (isSuperAdmin) {
        const superMap = new Map<string, ResolvedPermission>();
        superMap.set('__SUPERADMIN__', { canCreate: 'ALL', canRead: 'ALL', canUpdate: 'ALL', canDelete: 'ALL' });
        permissionCache.set(userId, { permissions: superMap, cachedAt: Date.now() });
        return superMap;
    }

    const resolved = new Map<string, ResolvedPermission>();

    for (const { role } of user.userRoles) {
        for (const perm of role.permissions) {
            const existing = resolved.get(perm.resourceKey);
            if (!existing) {
                resolved.set(perm.resourceKey, {
                    canCreate: perm.canCreate,
                    canRead:   perm.canRead,
                    canUpdate: perm.canUpdate,
                    canDelete: perm.canDelete,
                });
            } else {
                resolved.set(perm.resourceKey, {
                    canCreate: higher(existing.canCreate, perm.canCreate),
                    canRead:   higher(existing.canRead,   perm.canRead),
                    canUpdate: higher(existing.canUpdate, perm.canUpdate),
                    canDelete: higher(existing.canDelete, perm.canDelete),
                });
            }
        }
    }

    permissionCache.set(userId, { permissions: resolved, cachedAt: Date.now() });
    return resolved;
}

export function invalidateUserPermissions(userId: string): void {
    permissionCache.delete(userId);
    // Also bump DB timestamp so other processes know to re-fetch
    bumpPermissionsTimestamp().catch(() => {});
}

export async function invalidateRolePermissions(roleId: string): Promise<void> {
    const userRoles = await db.userRole.findMany({
        where:  { roleId },
        select: { userId: true },
    });
    for (const { userId } of userRoles) {
        permissionCache.delete(userId);
    }
    // Bump DB timestamp so other processes (admin ↔ frontend) immediately see the change
    await bumpPermissionsTimestamp();
}

// ── Core check ────────────────────────────────────────────────────────────────

export function checkPermission(
    permissions: UserPermissions,
    request:     PermissionRequest,
): PermissionResult {
    // SUPERADMIN sentinel — ALL access to everything
    if (permissions.has('__SUPERADMIN__')) {
        return { allowed: true, level: 'ALL' };
    }

    const perm  = permissions.get(request.resourceKey);
    if (!perm) return { allowed: false, level: 'NONE' };

    const level = actionLevel(perm, request.action);
    if (level === 'NONE') return { allowed: false, level: 'NONE' };

    return { allowed: true, level };
}

export async function getPermissionLevel(
    userId:  string,
    request: PermissionRequest,
): Promise<PermissionResult> {
    const permissions = await getUserPermissions(userId);
    return checkPermission(permissions, request);
}

// ── Nav visibility ────────────────────────────────────────────────────────────

/**
 * Determines if a nav item should be shown based on the resource's
 * navVisibility setting and the user's permission level.
 *
 *   NONE — never show (internal/door-key resources)
 *   ANY  — show if user has OWN or ALL
 *   ALL  — show only if user has ALL
 */
export function canNavigate(
    permissions:   UserPermissions,
    resourceKey:   string,
    navVisibility: NavVisibility,
): boolean {
    if (navVisibility === 'NONE') return false;

    // SUPERADMIN sees all navigable items regardless of navVisibility
    if (permissions.has('__SUPERADMIN__')) return true;

    const result = checkPermission(permissions, { resourceKey, action: 'read' });
    if (!result.allowed) return false;

    if (navVisibility === 'ALL') return result.level === 'ALL';
    return true; // ANY — OWN or ALL both pass
}

// ── Route guards ──────────────────────────────────────────────────────────────

/**
 * List routes — requires ALL.
 * OWN never grants access to a list of all records.
 * Throws ForbiddenError if denied.
 */
export function assertListPermission(
    permissions: UserPermissions,
    resourceKey: string,
    action:      PermissionAction = 'read',
): void {
    const result = checkPermission(permissions, { resourceKey, action });
    if (!result.allowed || result.level !== 'ALL') {
        throw new ForbiddenError(action, resourceKey);
    }
}

/**
 * Single record routes — ALL always passes, OWN passes only if owner.
 * Throws ForbiddenError if denied.
 */
export function assertRecordPermission(
    permissions:      UserPermissions,
    resourceKey:      string,
    action:           PermissionAction,
    resourceOwnerId:  string,
    requestingUserId: string,
): void {
    const result = checkPermission(permissions, { resourceKey, action });
    if (!result.allowed) throw new ForbiddenError(action, resourceKey);
    if (result.level === 'OWN' && resourceOwnerId !== requestingUserId) {
        throw new ForbiddenError(action, resourceKey);
    }
}

/**
 * Write routes — ALL always passes, OWN passes only if operating on own record.
 * For operations with no owner concept (create), only ALL passes.
 * Throws ForbiddenError if denied.
 */
export function assertWritePermission(
    permissions:       UserPermissions,
    resourceKey:       string,
    action:            PermissionAction,
    resourceOwnerId?:  string,
    requestingUserId?: string,
): void {
    const result = checkPermission(permissions, { resourceKey, action });
    if (!result.allowed) throw new ForbiddenError(action, resourceKey);

    if (result.level === 'OWN') {
        // OWN requires an owner context — if none provided, deny
        if (!resourceOwnerId || !requestingUserId) {
            throw new ForbiddenError(action, resourceKey);
        }
        if (resourceOwnerId !== requestingUserId) {
            throw new ForbiddenError(action, resourceKey);
        }
    }
}

// ── Ownership ─────────────────────────────────────────────────────────────────

export function isOwner(resourceOwnerId: string, requestingUserId: string): boolean {
    return resourceOwnerId === requestingUserId;
}

// ── Legacy guard (kept for compatibility) ─────────────────────────────────────

export function assertPermission(
    result:      PermissionResult,
    resourceKey: string,
    action:      PermissionAction,
): void {
    if (!result.allowed) {
        throw new ForbiddenError(action, resourceKey);
    }
}