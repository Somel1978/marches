// shared/email/templates/welcome.ts
import { sendEmail, getSiteConfig } from '../client.ts';

export async function sendWelcomeEmail(to: string, name: string) {
    const { siteUrl, siteName } = await getSiteConfig();

    await sendEmail({
        to,
        subject: `Welcome to ${siteName} — activate your account`,
        html: `
            <h1>Welcome to ${siteName}, ${name}!</h1>
            <p>Your account has been created by an administrator.</p>
            <p>To activate your account and set your own password, click the link below:</p>
            <p style="margin: 1.5rem 0;">
                <a href="${siteUrl}/forgot-password"
                   style="background:#B8734A;color:#fff;padding:0.75rem 1.5rem;border-radius:6px;text-decoration:none;font-weight:600;">
                    Activate account
                </a>
            </p>
            <p style="color:#888;font-size:0.875rem;">
                Enter your email address (<strong>${to}</strong>) to receive a password reset link.
            </p>
            <p style="color:#888;font-size:0.875rem;">
                If you were not expecting this email, you can safely ignore it.
            </p>
        `,
        text: `Welcome to ${siteName}, ${name}! Your account has been created. Activate it at: ${siteUrl}/forgot-password`,
    });
}