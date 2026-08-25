// apps/admin/src/routes/(app)/settings/smtp-oauth/callback/+server.ts
//
// Microsoft redirects here with an authorization code after the admin
// grants consent. Exchanges it for a refresh token and stores that — the
// refresh token (not the short-lived access token) is what lets the app
// send mail indefinitely via smtp.oauth2.refreshToken.
import { redirect, error } from '@sveltejs/kit';
import { platform } from '@core/database';
import { checkPermission } from '@core/rbac';
import { exchangeMicrosoftCode } from '@core/email';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url, cookies }) => {
    const canUpdate = checkPermission(locals.permissions, { resourceKey: 'System', action: 'update' });
    if (!canUpdate.allowed) throw error(403, 'Forbidden');

    const expectedState = cookies.get('smtp_oauth_state');
    cookies.delete('smtp_oauth_state', { path: '/settings/smtp-oauth' });

    const state       = url.searchParams.get('state');
    const code        = url.searchParams.get('code');
    const providerErr = url.searchParams.get('error_description') ?? url.searchParams.get('error');

    if (providerErr) {
        throw redirect(302, `/settings?smtpOauth=error&message=${encodeURIComponent(providerErr)}`);
    }
    if (!code || !state || !expectedState || state !== expectedState) {
        throw redirect(302, '/settings?smtpOauth=error&message=' + encodeURIComponent('Invalid or expired authorization response — please try connecting again.'));
    }

    const settings = await platform.getSettingsMap();
    const tenantId     = settings['smtp.oauth2.tenantId'];
    const clientId     = settings['smtp.oauth2.clientId'];
    const clientSecret = settings['smtp.oauth2.clientSecret'];
    if (!tenantId || !clientId || !clientSecret) {
        throw redirect(302, '/settings?smtpOauth=error&message=' + encodeURIComponent('SMTP OAuth2 settings changed mid-flow — please try again.'));
    }

    try {
        const redirectUri = `${url.origin}/settings/smtp-oauth/callback`;
        const { refreshToken } = await exchangeMicrosoftCode({ tenantId, clientId, clientSecret, redirectUri, code });

        await platform.updateSettings([
            { key: 'smtp.oauth2.refreshToken', value: refreshToken },
            { key: 'smtp.authMode',            value: 'oauth2' },
        ], locals.user!.id);
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        throw redirect(302, `/settings?smtpOauth=error&message=${encodeURIComponent(message)}`);
    }

    throw redirect(302, '/settings?smtpOauth=connected');
};
