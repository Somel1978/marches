import { db } from "@core/database";
import type { AccessLevel } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

export type PermissionRequest = {
    resource: string;
    action: PermissionAction;
};

export type PermissionResult =
    | { allowed: false; level: 'NONE' }
    | { allowed: true;  level: 'ALL'  }
    | { allowed: true;  level: 'OWN'  }; // caller must enforce ownership via isOwner()

/** Resolved flat permissions for one resource, after merging all roles. */
export type ResolvedPermission = {
    canCreate: AccessLevel;
    canRead:   AccessLevel;
    canUpdate: AccessLevel;
    canDelete: AccessLevel;
};

/** Full permission map for a user: resource → resolved CRUD levels. */
export type UserPermissions = Map<string, ResolvedPermission>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Core Engine ─────────────────────────────────────────────────────────────

/**
 * Loads ALL permissions for a user in a single DB query, merging across roles.
 *
 * Use this in hooks.server.ts to populate locals.permissions once per request.
 * Then use checkPermission() for zero-cost in-request checks.
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
    const user = await db.user.findUnique({
        where: { id: userId },
        include: {
            userRoles: {
                include: {
                    role: {
                        include: { permissions: true },
                    },
                },
            },
        },
    });

    if (!user?.userRoles.length) return new Map();

    const resolved = new Map<string, ResolvedPermission>();

    for (const { role } of user.userRoles) {
        for (const perm of role.permissions) {
            const existing = resolved.get(perm.resource);
            if (!existing) {
                resolved.set(perm.resource, {
                    canCreate: perm.canCreate,
                    canRead:   perm.canRead,
                    canUpdate: perm.canUpdate,
                    canDelete: perm.canDelete,
                });
            } else {
                resolved.set(perm.resource, {
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
 * Zero-cost permission check against a pre-loaded UserPermissions map.
 * Use this inside route load functions after getUserPermissions() ran in hooks.
 *
 * For level === 'OWN': you must still verify ownership with isOwner().
 */
export function checkPermission(
    permissions: UserPermissions,
    request: PermissionRequest
): PermissionResult {
    const perm = permissions.get(request.resource);
    if (!perm) return { allowed: false, level: 'NONE' };

    const level = actionLevel(perm, request.action);
    if (level === 'NONE') return { allowed: false, level: 'NONE' };

    return { allowed: true, level };
}

/**
 * Single-shot DB check. Useful outside of a request context
 * (scripts, seeds, background jobs).
 * Prefer getUserPermissions + checkPermission inside request handlers.
 */
export async function getPermissionLevel(
    userId: string,
    request: PermissionRequest
): Promise<PermissionResult> {
    const permissions = await getUserPermissions(userId);
    return checkPermission(permissions, request);
}

// ─── Ownership ───────────────────────────────────────────────────────────────

/**
 * Enforces the OWN access level.
 * Call this when checkPermission() returns level === 'OWN'.
 *
 * @example
 * const result = checkPermission(permissions, { resource: 'Quest', action: 'update' });
 * if (result.level === 'OWN' && !isOwner(quest.createdBy, userId)) {
 *     throw error(403, 'Forbidden');
 * }
 */
export function isOwner(resourceOwnerId: string, requestingUserId: string): boolean {
    return resourceOwnerId === requestingUserId;
}

// ─── Guard ───────────────────────────────────────────────────────────────────

/**
 * Throws a plain Error if the result is denied.
 * Framework-agnostic: apps catch this and map to their own HTTP error.
 *
 * @example — SvelteKit:
 * try {
 *   assertPermission(result, 'Quest', 'create');
 * } catch {
 *   throw error(403, 'Forbidden');
 * }
 */
export function assertPermission(
    result: PermissionResult,
    resource: string,
    action: PermissionAction
): void {
    if (!result.allowed) {
        throw new Error(`Forbidden: cannot ${action} ${resource}`);
    }
}