import { db } from "@core/database";
import type { AccessLevel } from "@core/database";

export type PermissionRequest = {
    resource: string;
    action: 'create' | 'read' | 'update' | 'delete';
};

/**
 * The RBAC Engine: Resolves if a user has the required permission level.
 */
export async function getPermissionLevel(
    userId: string, 
    request: PermissionRequest
): Promise<{ allowed: boolean; level: AccessLevel }> {
    try {
        const user = await db.user.findUnique({
            where: { id: userId },
            include: {
                roles: {
                    include: {
                        permissions: {
                            where: { resource: request.resource }
                        }
                    }
                }
            }
        });

        if (!user || !user.roles.length) {
            return { allowed: false, level: 'NONE' };
        }

        const permissions = user.roles.flatMap(role => role.permissions);

        const getLevelForAction = (perm: (typeof permissions)[0]): AccessLevel => {
            switch (request.action) {
                case 'create': return perm.canCreate;
                case 'read':   return perm.canRead;
                case 'update': return perm.canUpdate;
                case 'delete': return perm.canDelete;
            }
        };

        const levels = permissions.map(getLevelForAction);

        if (levels.includes('ALL')) {
            return { allowed: true, level: 'ALL' };
        }
        if (levels.includes('OWN')) {
            return { allowed: true, level: 'OWN' };
        }

        return { allowed: false, level: 'NONE' };

    } catch (error) {
        console.error("Error getting permission level:", error);
        return { allowed: false, level: 'NONE' };
    }
}
