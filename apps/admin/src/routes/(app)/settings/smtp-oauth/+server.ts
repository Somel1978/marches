// apps/admin/src/routes/(app)/settings/smtp-oauth/+server.ts
//
// Starts the Microsoft OAuth2 consent flow for SMTP (XOAUTH2). The admin
// must have already saved smtp.oauth2.tenantId / clientId / clientSecret
// on the settings page before clicking "Connect Microsoft account" — this
// redirects them to Microsoft's consent screen, which redirects back to
// ./smtp-oauth/callback with an authorization code.
import { redirect, error } from '@sveltejs/kit';
import { platform } from '@core/database';
import { checkPermission } from '@core/rbac';
import { buildMicrosoftAuthorizeUrl } from '@core/email';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url, cookies }) => {
    const canUpdate = checkPermission(locals.permissions, { resourceKey: 'System', action: 'update' });
    if (!canUpdate.allowed) throw error(403, 'Forbidden');

    const settings = await platform.getSettingsMap();
    const tenantId = settings['smtp.oauth2.tenantId'];
    const clientId = settings['smtp.oauth2.clientId'];
    if (!tenantId || !clientId) {
        throw error(400, 'Save the Tenant ID and Client ID settings before connecting.');
    }

    const state = randomUUID();
    // Short-lived, this-request-only — just enough to defend the callback
    // against CSRF; not a long-term session artifact.
    cookies.set('smtp_oauth_state', state, {
        path:     '/settings/smtp-oauth',
        httpOnly: true,
        secure:   url.protocol === 'https:',
        sameSite: 'lax',
        maxAge:   600,
    });

    const redirectUri = `${url.origin}/settings/smtp-oauth/callback`;
    const authorizeUrl = buildMicrosoftAuthorizeUrl({ tenantId, clientId, redirectUri, state });
    throw redirect(302, authorizeUrl);
};
