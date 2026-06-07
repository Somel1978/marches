// apps/frontend/src/routes/(protected)/world/[worldSlug]/journal/+page.server.ts
import { error } from '@sveltejs/kit';
import { worlds, news, users } from '@core/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const world = await worlds.getBySlug(params.worldSlug);
	if (!world || !world.isActive) throw error(404, 'World not found');

	const roleIds = locals.user
		? await users.getRoleIds(locals.user.id)
		: [];

	const journals = await news.journals.getForUser(roleIds, [world.id]);

	return { world, journals };
};
