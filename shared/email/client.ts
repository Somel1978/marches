// shared/email/client.ts

// Reads SMTP config from platform.settings at send time — not at startup.
// This means settings can be changed in the admin UI without restarting the server.

import nodemailer from 'nodemailer';
import { platform } from '@core/database';

export type SendEmailInput = {
    to:      string;
    subject: string;
    html:    string;
    text?:   string;
};

export async function sendEmail(input: SendEmailInput): Promise<void> {
    const settings = await platform.getSettingsMap();

    const host = settings['smtp.host'];
    const user = settings['smtp.user'];
    const pass = settings['smtp.pass'];

    if (!host || !user || !pass) {
        console.warn('[email] SMTP not configured — skipping send to', input.to);
        return;
    }

    const transporter = nodemailer.createTransport({
        host,
        port:   Number(settings['smtp.port']   ?? 587),
        secure: settings['smtp.secure'] === 'true',
        auth:   { user, pass },
    });

    await transporter.sendMail({
        from:    `"${settings['email.fromName'] ?? 'Marches'}" <${settings['email.from'] ?? 'noreply@marches.local'}>`,
        to:      input.to,
        subject: input.subject,
        html:    input.html,
        text:    input.text,
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
