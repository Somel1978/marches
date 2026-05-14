// shared/rbac/access.ts
import { db } from "@core/database";
import type { AccessLevel } from "@core/database";
import { ForbiddenError } from "@core/errors";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

export type PermissionRequest = {
    resourceKey: string;
    action:      PermissionAction;
};

export type PermissionResult =
    | { allowed: false; level: 'NONE' }
    | { allowed: true;  level: 'ALL'  }
    | { allowed: true;  level: 'OWN'  };  // caller must enforce ownership via isOwner()

export type ResolvedPermission = {
    canCreate: AccessLevel;
    canRead:   AccessLevel;
    canUpdate: AccessLevel;
    canDelete: AccessLevel;
};

export type UserPermissions = Map<string, ResolvedPermission>;

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

/**
 * Loads ALL permissions for a user in a single DB query, merging across roles.
 * Call once per request in hooks.server.ts — store in event.locals.permissions.
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
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

    if (!user?.userRoles.length) return new Map();

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

    return resolved;
}

/**
 * Zero-cost permission check against pre-loaded UserPermissions map.
 * Use inside routes after getUserPermissions() ran in hooks.
 */
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

/**
 * Single-shot DB check — for scripts/seeds/background jobs.
 * Prefer getUserPermissions + checkPermission inside request handlers.
 */
export async function getPermissionLevel(
    userId:  string,
    request: PermissionRequest,
): Promise<PermissionResult> {
    const permissions = await getUserPermissions(userId);
    return checkPermission(permissions, request);
}

// ── Ownership ─────────────────────────────────────────────────────────────────

/**
 * Enforces OWN access level. Call when checkPermission returns level === 'OWN'.
 */
export function isOwner(resourceOwnerId: string, requestingUserId: string): boolean {
    return resourceOwnerId === requestingUserId;
}

// ── Guard ─────────────────────────────────────────────────────────────────────

/**
 * Throws ForbiddenError if result is denied.
 * Apps catch and map to error(403).
 */
export function assertPermission(
    result:      PermissionResult,
    resourceKey: string,
    action:      PermissionAction,
): void {
    if (!result.allowed) {
        throw new ForbiddenError(action, resourceKey);
    }
}