// apps/admin/src/routes/api/theme/+server.ts
// Persists the current admin user's theme choice. Called from
// $lib/components/ThemeToggle.svelte, which applies the theme
// client-side immediately and fires this in the background.
import { json, error } from '@sveltejs/kit';
import { users } from '@core/database';
import { isMarchesError } from '@core/errors';
import { validateTheme } from '$lib/themes';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, cookies, url }) => {
    if (!locals.user) throw error(401, 'Unauthorized');

    const form = await request.formData();
    const raw  = form.get('theme')?.toString() ?? '';
    const theme = validateTheme(raw);

    try {
        await users.updateTheme(locals.user.id, theme);
    } catch (e) {
        if (isMarchesError(e)) throw error(e.statusCode, e.message);
        throw e;
    }

    cookies.set('adminTheme', theme, {
        path:     '/',
        maxAge:   60 * 60 * 24 * 365,
        httpOnly: false,
        sameSite: 'lax',
        secure:   url.protocol === 'https:',
    });

    return json({ success: true, theme });
};
