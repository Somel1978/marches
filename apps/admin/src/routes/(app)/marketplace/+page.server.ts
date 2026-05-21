// apps/admin/src/routes/(app)/marketplace/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async () => { redirect(302, '/marketplace/items'); };
