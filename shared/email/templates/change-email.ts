// shared/email/templates/change-email.ts
import { sendEmail, getSiteConfig } from '../client.ts';

// Sent to the CURRENT email address to approve the change.
// better-auth 1.4 uses sendChangeEmailConfirmation (not sendChangeEmailVerification).
// After the user clicks approve, better-auth sends a standard verification
// email to the new address via emailVerification.sendVerificationEmail.
export async function sendEmailChangeEmail(
    currentEmail: string,
    name:         string,
    newEmail:     string,
    url:          string,
) {
    const { siteName } = await getSiteConfig();

    await sendEmail({
        to:      currentEmail,  // sent to CURRENT address for approval
        subject: `Approve email change — ${siteName}`,
        html: `
            <h1>Email change request</h1>
            <p>Hi ${name}, you recently requested to change your ${siteName} email address.</p>
            <p>New email requested: <strong>${newEmail}</strong></p>
            <p style="margin: 1.5rem 0;">
                <a href="${url}"
                   style="background:#B8734A;color:#fff;padding:0.75rem 1.5rem;border-radius:6px;text-decoration:none;font-weight:600;">
                    Approve email change
                </a>
            </p>
            <p style="color:#888;font-size:0.875rem;">
                After approving, a verification email will be sent to <strong>${newEmail}</strong>.
                Your email will only change after you verify the new address.
            </p>
            <p style="color:#888;font-size:0.875rem;">
                If you did not request this change, you can safely ignore this email.
            </p>
        `,
        text: `Hi ${name}, approve your ${siteName} email change to ${newEmail}: ${url}`,
    });
}