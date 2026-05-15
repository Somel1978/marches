// apps/admin/src/app.d.ts
import type { User, Session } from 'better-auth/minimal';
import type { UserPermissions } from '@core/rbac';

declare global {
	namespace App {
		interface Locals {
			user?:        User;
			session?:     Session;
			// Populated by hooks.server.ts for every authenticated request.
			// Always a Map — empty Map for unauthenticated requests.
			permissions:  UserPermissions;
		}
	}
}

export {};