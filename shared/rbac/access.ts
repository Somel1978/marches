import { db } from "@core/database";
import type { AccessLevel } from "@prisma/client";

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

    let highestLevel: AccessLevel = 'NONE';

    for (const role of user.roles) {
        for (const perm of role.permissions) {
            const currentLevel = 
                request.action === 'create' ? perm.canCreate :
                request.action === 'read' ? perm.canRead :
                request.action === 'update' ? perm.canUpdate :
                perm.canDelete;

            if (currentLevel === 'ALL') {
                highestLevel = 'ALL';
                break;
            }
            if (currentLevel === 'OWN' && highestLevel !== 'ALL') {
                highestLevel = 'OWN';
            }
        }
        if (highestLevel === 'ALL') break;
    }

    return {
        allowed: highestLevel !== 'NONE',
        level: highestLevel
    };
}
