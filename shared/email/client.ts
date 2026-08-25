// shared/email/client.ts

// Reads SMTP config from platform.settings at send time — not at startup.
// This means settings can be changed in the admin UI without restarting the server.

import nodemailer from 'nodemailer';
import { platform } from '@core/database';
import { getAccessToken, type Oauth2Settings } from './oauth2.ts';

export type SendEmailInput = {
    to:      string;
    subject: string;
    html:    string;
    text?:   string;
};

export type SendEmailResult =
    | { ok: true }
    | { ok: false; reason: 'not_configured' }
    | { ok: false; reason: 'send_failed'; message: string; code?: string };

async function buildTransporter() {
    const settings = await platform.getSettingsMap();
    const authMode = settings['smtp.authMode'] === 'oauth2' ? 'oauth2' : 'password';
    const host     = settings['smtp.host'];
    const user     = settings['smtp.user'];

    if (!host || !user) return { transporter: null, settings } as const;

    const baseOptions = {
        host,
        port:   Number(settings['smtp.port'] ?? 587),
        secure: settings['smtp.secure'] === 'true',
        // Fail fast instead of hanging the request that triggered the email —
        // a dead/unreachable SMTP host must never block signup, reset, etc.
        connectionTimeout: 10_000,
        greetingTimeout:   10_000,
        socketTimeout:     10_000,
    };

    if (authMode === 'oauth2') {
        const oauth2: Oauth2Settings = {
            provider:     'microsoft',
            tenantId:     settings['smtp.oauth2.tenantId']     ?? '',
            clientId:     settings['smtp.oauth2.clientId']     ?? '',
            clientSecret: settings['smtp.oauth2.clientSecret'] ?? '',
            refreshToken: settings['smtp.oauth2.refreshToken'] ?? '',
        };
        if (!oauth2.tenantId || !oauth2.clientId || !oauth2.clientSecret || !oauth2.refreshToken) {
            return { transporter: null, settings } as const;
        }

        let raw: string;
        try {
            raw = await getAccessToken(oauth2);
        } catch (e) {
            // Surfaced by the caller as a send_failed result — token refresh
            // failures (expired/revoked consent, bad client secret, etc.)
            // need the same visibility as a basic-auth rejection.
            throw new Error(`oauth2_token_error: ${e instanceof Error ? e.message : String(e)}`);
        }

        // getAccessToken() encodes a rotated refresh token in-band (see oauth2.ts)
        // since it has no direct access to the settings writer. Persist it here
        // so the next refresh uses the current token — Microsoft invalidates the
        // old one once a new one has been issued.
        let accessToken = raw;
        const rotateMarker = '\u0000ROTATED\u0000';
        if (raw.includes(rotateMarker)) {
            const [token, newRefreshToken] = raw.split(rotateMarker);
            accessToken = token;
            platform.updateSettings([{ key: 'smtp.oauth2.refreshToken', value: newRefreshToken }])
                .catch(err => console.error('[email] failed to persist rotated OAuth2 refresh token —', err));
        }

        const transporter = nodemailer.createTransport({
            ...baseOptions,
            auth: { type: 'OAuth2', user, accessToken },
        });
        return { transporter, settings } as const;
    }

    const pass = settings['smtp.pass'];
    if (!pass) return { transporter: null, settings } as const;

    const transporter = nodemailer.createTransport({
        ...baseOptions,
        auth: { user, pass },
    });

    return { transporter, settings } as const;
}

/**
 * Sends an email. NEVER throws — email delivery is always a side effect of some
 * other action (signup, password reset, notification) and a dead SMTP provider
 * must not fail that action. Callers that need to know whether the send actually
 * succeeded should inspect the returned result; callers that don't care (fire-and-
 * forget notifications) can safely ignore it.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    let transporter: nodemailer.Transporter | null;
    let settings: Record<string, string | undefined>;

    try {
        const built = await buildTransporter();
        transporter = built.transporter;
        settings    = built.settings;
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('[email] failed to prepare SMTP transporter —', message);
        return { ok: false, reason: 'send_failed', message };
    }

    if (!transporter) {
        console.warn('[email] SMTP not configured — skipping send to', input.to);
        return { ok: false, reason: 'not_configured' };
    }

    try {
        await transporter.sendMail({
            from:    `"${settings['email.fromName'] ?? 'Marches'}" <${settings['email.from'] ?? 'noreply@marches.local'}>`,
            to:      input.to,
            subject: input.subject,
            html:    input.html,
            text:    input.text,
        });
        return { ok: true };
    } catch (e) {
        // Surface enough to diagnose (auth rejected, host unreachable, etc.)
        // without ever throwing back into the caller's request flow.
        const code    = (e as { code?: string; responseCode?: number })?.code
            ?? String((e as { responseCode?: number })?.responseCode ?? '');
        const message = e instanceof Error ? e.message : String(e);
        console.error(`[email] send to ${input.to} failed (subject: "${input.subject}") — ${code ? `[${code}] ` : ''}${message}`);
        return { ok: false, reason: 'send_failed', message, code: code || undefined };
    }
}

/** Sends a test email using the currently saved SMTP settings. Used by the admin settings page's "Test connection" action. */
export async function sendTestEmail(to: string): Promise<SendEmailResult> {
    return sendEmail({
        to,
        subject: 'Marches — SMTP test email',
        html:    '<p>This is a test email from your Marches admin settings. If you received this, your SMTP configuration is working.</p>',
        text:    'This is a test email from your Marches admin settings. If you received this, your SMTP configuration is working.',
    });
}

// Convenience: get site config for use in templates
export async function getSiteConfig() {
    const settings = await platform.getSettingsMap();
    return {
        siteUrl:  settings['site.url']  ?? 'http://localhost:5173',
        siteName: settings['site.name'] ?? 'Marches',
        fromName: settings['email.fromName'] ?? 'Marches',
    };
}