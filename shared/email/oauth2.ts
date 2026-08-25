// shared/email/oauth2.ts
//
// XOAUTH2 support for SMTP providers that have disabled basic auth
// (Microsoft 365 / Outlook.com is the common case — see the 535 5.7.139
// "SmtpClientAuthentication is disabled" error). Basic username/password
// SMTP AUTH cannot be re-enabled for most modern mailboxes; this module
// exchanges a stored refresh token for a short-lived access token before
// each send, which is what nodemailer's XOAUTH2 mechanism requires.
//
// Currently supports Microsoft identity platform (Entra ID / Azure AD).
// Extending to Google Workspace would follow the same shape with a
// different token endpoint and scope.

export type Oauth2Settings = {
    provider:     'microsoft';
    tenantId:     string;   // Entra ID tenant GUID, or 'common' / 'consumers'
    clientId:     string;
    clientSecret: string;
    refreshToken: string;
};

type CachedToken = { accessToken: string; expiresAt: number };

// In-memory cache — access tokens are valid ~1h; avoids a token fetch on
// every single email when several are sent in a short window. Cleared on
// process restart, which is fine since a fresh fetch just re-populates it.
let cached: CachedToken | null = null;

const MICROSOFT_SCOPE = 'https://outlook.office365.com/.default offline_access';

/**
 * Exchanges the stored refresh token for a fresh access token.
 * Throws with a descriptive message on failure — callers (client.ts)
 * already wrap all send attempts so this never escapes to the request
 * that triggered the email.
 */
export async function getAccessToken(settings: Oauth2Settings): Promise<string> {
    const now = Date.now();
    if (cached && cached.expiresAt > now + 60_000) return cached.accessToken;

    if (settings.provider !== 'microsoft') {
        throw new Error(`Unsupported OAuth2 provider: ${settings.provider}`);
    }

    const tokenUrl = `https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
        client_id:     settings.clientId,
        client_secret: settings.clientSecret,
        refresh_token: settings.refreshToken,
        grant_type:    'refresh_token',
        scope:         MICROSOFT_SCOPE,
    });

    const res = await fetch(tokenUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`OAuth2 token refresh failed (${res.status}): ${detail.slice(0, 300)}`);
    }

    const json = await res.json() as { access_token?: string; expires_in?: number; refresh_token?: string };
    if (!json.access_token) throw new Error('OAuth2 token refresh returned no access_token.');

    cached = {
        accessToken: json.access_token,
        expiresAt:   now + (json.expires_in ?? 3600) * 1000,
    };

    // Microsoft rotates refresh tokens on use. If a new one came back,
    // the caller (client.ts) is responsible for persisting it — otherwise
    // the old refresh token may eventually stop working.
    if (json.refresh_token && json.refresh_token !== settings.refreshToken) {
        return json.access_token + '\u0000ROTATED\u0000' + json.refresh_token;
    }

    return json.access_token;
}

/** Builds the Microsoft authorize URL for the one-time consent step (admin settings "Connect" button). */
export function buildMicrosoftAuthorizeUrl(opts: {
    tenantId: string;
    clientId: string;
    redirectUri: string;
    state: string;
}): string {
    const url = new URL(`https://login.microsoftonline.com/${opts.tenantId}/oauth2/v2.0/authorize`);
    url.searchParams.set('client_id', opts.clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', opts.redirectUri);
    url.searchParams.set('response_mode', 'query');
    url.searchParams.set('scope', MICROSOFT_SCOPE);
    url.searchParams.set('state', opts.state);
    return url.toString();
}

/** Exchanges an authorization code (from the consent redirect) for the initial refresh token. */
export async function exchangeMicrosoftCode(opts: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
}): Promise<{ refreshToken: string; accessToken: string }> {
    const tokenUrl = `https://login.microsoftonline.com/${opts.tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
        client_id:     opts.clientId,
        client_secret: opts.clientSecret,
        code:          opts.code,
        redirect_uri:  opts.redirectUri,
        grant_type:    'authorization_code',
        scope:         MICROSOFT_SCOPE,
    });

    const res = await fetch(tokenUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`OAuth2 code exchange failed (${res.status}): ${detail.slice(0, 300)}`);
    }

    const json = await res.json() as { access_token?: string; refresh_token?: string };
    if (!json.access_token || !json.refresh_token) {
        throw new Error('OAuth2 code exchange did not return both access_token and refresh_token. Ensure "offline_access" scope was granted.');
    }

    return { accessToken: json.access_token, refreshToken: json.refresh_token };
}
