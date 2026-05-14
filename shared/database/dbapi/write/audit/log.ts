// shared/database/dbapi/write/audit/log.ts
import type { PrismaClient, AuditAction } from '@prisma/client';

export type AuditLogInput = {
    actorId?:    string;
    action:      AuditAction;
    resourceKey: string;
    resourceId:  string;
    before?:     unknown;
    after?:      unknown;
    metadata?:   Record<string, unknown>;
};

// Always called inside an existing transaction (tx) so the audit entry
// is atomic with the change that triggered it.
export async function logAudit(tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>, input: AuditLogInput) {
    return tx.auditLog.create({
        data: {
            actorId:     input.actorId,
            action:      input.action,
            resourceKey: input.resourceKey,
            resourceId:  input.resourceId,
            before:      input.before     ? JSON.parse(JSON.stringify(input.before))     : undefined,
            after:       input.after      ? JSON.parse(JSON.stringify(input.after))      : undefined,
            metadata:    input.metadata   ? JSON.parse(JSON.stringify(input.metadata))   : undefined,
        },
    });
}
