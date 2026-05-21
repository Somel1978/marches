// apps/admin/src/routes/(app)/notifications/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { notifications } from '@core/database';
import type { Actions } from './$types';

export const actions: Actions = {
	read: async ({ url, locals }) => {
		const id = url.searchParams.get('id') ?? '';
		const to = url.searchParams.get('to')  ?? '';
		if (id) await notifications.markRead(id, locals.user!.id);
		redirect(302, to || '/');
	},

	readAll: async ({ request, locals }) => {
		await notifications.markAllRead(locals.user!.id);
		const referer = request.headers.get('referer') ?? '/';
		redirect(302, referer);
	},
};