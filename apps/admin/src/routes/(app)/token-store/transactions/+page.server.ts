// apps/admin/src/routes/(app)/token-store/transactions/+page.server.ts
import { fail, error } from '@sveltejs/kit';
import { tokenStore } from '@core/database';
import { checkPermission } from '@core/rbac';
import { isMarchesError } from '@core/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'read' });
	if (!can.allowed) throw error(403, 'Forbidden');
	const status = url.searchParams.get('status') || undefined;
	const txs = await tokenStore.transactions.getAll({ status });
	return { txs, status };
};

export const actions: Actions = {
	approve: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const id = (await request.formData()).get('id')?.toString() ?? '';
		try {
			await tokenStore.transactions.approve(id, locals.user!.id);
			return { success: true };
		} catch (e: any) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
	reject: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data = await request.formData();
		const id   = data.get('id')?.toString()         ?? '';
		const note = data.get('reviewNote')?.toString() ?? '';
		try {
			await tokenStore.transactions.reject(id, note, locals.user!.id);
			return { success: true };
		} catch (e: any) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
	recalculate: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'update' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const id = (await request.formData()).get('id')?.toString() ?? '';
		try {
			const result = await tokenStore.transactions.recalculate(id, locals.user!.id);
			return { success: true, message: (result as any).message };
		} catch (e: any) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
	revoke: async ({ request, locals }) => {
		const can = checkPermission(locals.permissions, { resourceKey: 'MarketplaceItem', action: 'delete' });
		if (!can.allowed) return fail(403, { message: 'Forbidden' });
		const data    = await request.formData();
		const id      = data.get('id')?.toString()      ?? '';
		const confirm = data.get('confirm')?.toString() === 'true';
		try {
			const result = await tokenStore.transactions.revoke(id, locals.user!.id);
			if (result.warning && !confirm) return { warning: result.warning, id };
			return { success: true };
		} catch (e: any) {
			if (isMarchesError(e)) return fail(e.statusCode, { message: e.message });
			throw e;
		}
	},
};