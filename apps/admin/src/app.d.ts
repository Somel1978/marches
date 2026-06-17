// apps/admin/src/app.d.ts
import type { User, Session } from 'better-auth/minimal';
import type { UserPermissions } from '@core/rbac';

declare global {
	namespace App {
		interface Locals {
			user?:        User;
			session?:     Session;
			permissions:  UserPermissions;
		}
	}

	interface Window {
		// Set by ConfirmModal (mounted in admin layout) inside onMount — browser only.
		confirmModal: (title: string, message: string) => Promise<boolean>;
	}
}

export {};