// shared/errors/index.ts

//  Domain Error Hierarchy
// No runtime dependencies safe to import from any package without circular refs.
//
// Usage in dbapi:
//   throw new NotFoundError('Role', id);
//   throw new ForbiddenError('delete', 'SUPERADMIN');
//
// Usage in SvelteKit routes:
//   import { NotFoundError, ForbiddenError } from '@core/errors';
//   try { ... } catch (e) {
//     if (e instanceof NotFoundError) throw error(404, e.message);
//     if (e instanceof ForbiddenError) throw error(403, e.message);
//     throw error(500, 'Unexpected error');
//   }
//

export class MarchesError extends Error {
    constructor(
        public readonly code:       string,
        message:                    string,
        public readonly statusCode: number = 500,
    ) {
        super(message);
        this.name = this.constructor.name;
        // Maintains proper stack trace in V8
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/** 404 entity does not exist */
export class NotFoundError extends MarchesError {
    constructor(resource: string, id: string) {
        super('NOT_FOUND', `${resource} not found: ${id}`, 404);
    }
}

/** 403 entity is authenticated but not permitted */
export class ForbiddenError extends MarchesError {
    constructor(action: string, resource: string) {
        super('FORBIDDEN', `Cannot ${action} ${resource}`, 403);
    }
}

/** 409 conflict with existing state */
export class ConflictError extends MarchesError {
    constructor(message: string) {
        super('CONFLICT', message, 409);
    }
}

/** 400 caller supplied invalid input */
export class ValidationError extends MarchesError {
    constructor(message: string) {
        super('VALIDATION_ERROR', message, 400);
    }
}

/** 500 unexpected database or infrastructure error */
export class DatabaseError extends MarchesError {
    constructor(message: string, public readonly cause?: unknown) {
        super('DATABASE_ERROR', message, 500);
    }
}

/** Type guard narrows unknown to MarchesError */
export function isMarchesError(e: unknown): e is MarchesError {
    return e instanceof MarchesError;
}

/** Maps a MarchesError to its HTTP status code. Falls back to 500. */
export function toStatusCode(e: unknown): number {
    return e instanceof MarchesError ? e.statusCode : 500;
}
