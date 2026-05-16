// shared/email/templates/change-email.ts
import { sendEmail, getSiteConfig } from '../client.ts';

export async function sendEmailChangeEmail(
    currentEmail: string,
    name:         string,
    newEmail:     string,
    url:          string,
) {
    const { siteName } = await getSiteConfig();

    await sendEmail({
        to:      newEmail,  // sent to the NEW address
        subject: `Verify your new email — ${siteName}`,
        html: `
            <h1>Verify your new email address</h1>
            <p>Hi ${name}, you recently requested to change your ${siteName} email address.</p>
            <p>Your new email: <strong>${newEmail}</strong></p>
            <p style="margin: 1.5rem 0;">
                <a href="${url}"
                   style="background:#B8734A;color:#fff;padding:0.75rem 1.5rem;border-radius:6px;text-decoration:none;font-weight:600;">
                    Verify new email
                </a>
            </p>
            <p style="color:#888;font-size:0.875rem;">
                If you did not request this change, your account may be compromised.
                Please <a href="${url.split('/api')[0]}/forgot-password">reset your password</a> immediately.
            </p>
        `,
        text: `Hi ${name}, verify your new ${siteName} email (${newEmail}): ${url}`,
    });
}
