// shared/email/templates/verify-email.ts
import { sendEmail, getSiteConfig } from '../client.ts';

export async function sendVerificationEmail(to: string, name: string, url: string) {
    const { siteName } = await getSiteConfig();

    await sendEmail({
        to,
        subject: `Verify your email — ${siteName}`,
        html: `
            <h1>Verify your email address</h1>
            <p>Hi ${name}, please verify your email address for ${siteName}.</p>
            <p><a href="${url}">Verify email address</a></p>
            <p>This link expires in 24 hours. If you did not create an account, ignore this email.</p>
        `,
        text: `Hi ${name}, verify your email for ${siteName}: ${url}`,
    });
}
