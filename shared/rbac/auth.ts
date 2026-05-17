// shared/rbac/auth.ts
import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@core/database";

export type AuthConfig = {
    baseURL:         string;
    secret:          string;
    trustedOrigins?: string[];
    frontendURL?:    string;
    github?: {
        clientId:     string;
        clientSecret: string;
    };
    emailSender?: {
        sendWelcome:       (to: string, name: string) => Promise<void>;
        sendVerification:  (to: string, name: string, url: string) => Promise<void>;
        sendReset:         (to: string, name: string, url: string) => Promise<void>;
        sendEmailChange:   (to: string, name: string, newEmail: string, url: string) => Promise<void>;
    };
    plugins?: BetterAuthPlugin[];
};

function rebaseUrl(url: string, newBase: string): string {
    try {
        const parsed  = new URL(url);
        const base    = new URL(newBase);
        parsed.protocol = base.protocol;
        parsed.host     = base.host;
        return parsed.toString();
    } catch {
        return url;
    }
}

// For change-email tokens, route through /change-email page
// which ensures the user is logged in before better-auth processes the token.
function rebaseChangeEmailUrl(url: string, newBase: string): string {
    try {
        const parsed    = new URL(url);
        const base      = new URL(newBase);
        const token     = parsed.searchParams.get('token');
        const callback  = parsed.searchParams.get('callbackURL') ?? '/profile';
        const redirect  = new URL('/change-email', base);
        if (token) redirect.searchParams.set('token', token);
        redirect.searchParams.set('callbackURL', callback);
        return redirect.toString();
    } catch {
        return url;
    }
}

export function createAuth({
    baseURL,
    secret,
    trustedOrigins,
    frontendURL,
    github,
    emailSender,
    plugins = [],
}: AuthConfig) {
    return betterAuth({
        baseURL,
        secret,
        trustedOrigins: trustedOrigins ?? [],
        database: prismaAdapter(db, { provider: "postgresql" }),
        emailAndPassword: {
            enabled:                  true,
            autoSignIn:               false,
            requireEmailVerification: true,
            sendResetPassword: emailSender
                ? async ({ user, url }) => {
                    const link = frontendURL ? rebaseUrl(url, frontendURL) : url;
                    await emailSender.sendReset(user.email, user.name, link);
                  }
                : undefined,
        },
        emailVerification: emailSender
            ? {
                sendOnSignUp:                true,
                autoSignInAfterVerification: true,
                sendVerificationEmail: async ({ user, url }) => {
                    const link = frontendURL ? rebaseUrl(url, frontendURL) : url;
                    await emailSender.sendVerification(user.email, user.name, link);
                },
                // Fix better-auth bug: changeEmail sets emailVerified=false after
                // clicking the verification link. Re-verify the user here.
                afterEmailVerification: async (user) => {
                    await db.user.update({
                        where: { id: user.id },
                        data:  { emailVerified: true },
                    });
                },
              }
            : undefined,
        user: {
            changeEmail: {
                enabled: true,
                // No sendChangeEmailConfirmation — use the simpler single-step flow.
                // better-auth sends verification directly to the new email via
                // emailVerification.sendVerificationEmail. Email only updates
                // after the user clicks the verification link.
            },
            additionalFields: {
                discordHandle: { type: "string", input: false, fieldName: "discord_handle" },
                mobile:        { type: "string", input: false, fieldName: "mobile" },
            },
        },
        ...(github && {
            socialProviders: {
                github: { clientId: github.clientId, clientSecret: github.clientSecret },
            },
        }),
        session: {
            cookieCache: { enabled: true, maxAge: 300 },
        },
        plugins,
    });
}

export type Auth = ReturnType<typeof createAuth>;