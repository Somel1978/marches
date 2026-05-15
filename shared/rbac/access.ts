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

export async function getUserPermissions(userId: string): Promise<UserPermissions> {
    const cached = permissionCache.get(userId);
    if (cached) return cached;

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
        permissionCache.set(userId, empty);
        return empty;
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

    permissionCache.set(userId, resolved);
    return resolved;
}

export function invalidateUserPermissions(userId: string): void {
    permissionCache.delete(userId);
}

export async function invalidateRolePermissions(roleId: string): Promise<void> {
    const userRoles = await db.userRole.findMany({
        where:  { roleId },
        select: { userId: true },
    });
    for (const { userId } of userRoles) {
        permissionCache.delete(userId);
    }
}

// ── Core check ────────────────────────────────────────────────────────────────

export function checkPermission(
    permissions: UserPermissions,
    request:     PermissionRequest,
): PermissionResult {
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