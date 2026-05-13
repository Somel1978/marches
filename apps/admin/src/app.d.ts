import type { User, Session } from 'better-auth/minimal';
import type { UserPermissions } from '@core/rbac';

declare global {
	namespace App {
		interface Locals {
			user?: User;
			session?: Session;
			// Populated by hooks.server.ts after session hydration.
			// Empty Map when unauthenticated — public routes still work,
			// checkPermission() will return { allowed: false } for everything.
			permissions: UserPermissions;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};