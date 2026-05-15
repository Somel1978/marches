// shared/email/templates/reset-password.ts
import { sendEmail, getSiteConfig } from '../client.ts';

export async function sendPasswordResetEmail(to: string, name: string, url: string) {
    const { siteName } = await getSiteConfig();

    await sendEmail({
        to,
        subject: `Reset your password — ${siteName}`,
        html: `
            <h1>Reset your password</h1>
            <p>Hi ${name}, we received a request to reset your ${siteName} password.</p>
            <p><a href="${url}">Reset password</a></p>
            <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
        `,
        text: `Hi ${name}, reset your ${siteName} password: ${url}. Link expires in 1 hour.`,
    });
}
