// shared/rbac/auth.ts
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@core/database";
import { roles, notifications, queueDiscordNotification } from "@core/database";
import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmailSender = {
    sendWelcome:      (to: string, name: string) => Promise<void>;
    sendVerification: (to: string, name: string, url: string) => Promise<void>;
    sendReset:        (to: string, name: string, url: string) => Promise<void>;
    sendEmailChange:  (to: string, name: string, newEmail: string, url: string) => Promise<void>;
};

export type BaseAuthConfigInput = {
    // Comma-separated hostnames (no protocol/port) for dynamic baseURL resolution.
    // Better Auth 1.5 resolves baseURL per-request from the host header.
    // e.g. "10.0.0.183,www.binderbrew.quest,admin.binderbrew.quest"
    allowedHosts:   string;

    // Canonical public URL used as fallback when Better Auth cannot determine
    // the host from the request (e.g. email verification clicks through tracking
    // redirects). Should be the primary public-facing domain.
    // e.g. "https://www.binderbrew.quest"
    publicURL:      string;

    // Comma-separated full origins for CSRF trusted origins validation.
    // e.g. "http://10.0.0.183:5173,https://www.binderbrew.quest"
    trustedOrigins: string;

    secret:         string;

    emailSender?:   EmailSender;

    github?: {
        clientId:     string;
        clientSecret: string;
    };

    // App-specific plugins (e.g. sveltekitCookies)
    plugins?: BetterAuthPlugin[];
};

// ─── Base config factory ──────────────────────────────────────────────────────

/**
 * Returns a plain Better Auth config object.
 * Each app spreads this and calls betterAuth() itself.
 *
 * Key design decisions:
 * - baseURL uses allowedHosts (Better Auth 1.5+) so the URL is derived
 *   dynamically from each incoming request. Works for IP, domain, and
 *   subdomain access without any per-request hacks or URL rebasing.
 * - Email verification URLs are built by Better Auth using the resolved
 *   baseURL — no frontendURL or rebaseUrl needed.
 * - useSecureCookies: false — traffic is HTTP internally (Cloudflare
 *   Tunnel handles HTTPS externally). Correct, not a workaround.
 * - The shared package never calls betterAuth() — each app owns its instance.
 */
export function getBaseAuthConfig({
    allowedHosts,
    publicURL,
    trustedOrigins,
    secret,
    emailSender,
    github,
    plugins = [],
}: BaseAuthConfigInput): BetterAuthOptions {
    const hosts   = allowedHosts.split(',').map(h => h.trim()).filter(Boolean);
    const origins = trustedOrigins.split(',').map(o => o.trim()).filter(Boolean);

    return {
        baseURL: {
            allowedHosts: hosts,
            fallback:     publicURL,
        },
        secret,
        trustedOrigins: origins,
        database: prismaAdapter(db, { provider: "postgresql" }),

        emailAndPassword: {
            enabled:                  true,
            autoSignIn:               false,
            requireEmailVerification: true,
            sendResetPassword: emailSender
                ? async ({ user, url }) => {
                    await emailSender.sendReset(user.email, user.name, url);
                  }
                : undefined,
        },

        emailVerification: emailSender
            ? {
                sendOnSignUp:                true,
                autoSignInAfterVerification: true,
                sendVerificationEmail: async ({ user, url }) => {
                    // url is built by Better Auth from the incoming request's host
                    // via allowedHosts — no rebasing needed.
                    await emailSender.sendVerification(user.email, user.name, url);
                },
                afterEmailVerification: async (user) => {
                    // Assign PLAYER role on first verification.
                    // This is the correct place — user is confirmed real.
                    try {
                        const allRoles   = await roles.getAll();
                        const playerRole = allRoles.find((r: any) => r.name === 'PLAYER');
                        if (playerRole) {
                            const current = await db.userRole.findFirst({
                                where: { userId: user.id, roleId: playerRole.id },
                            });
                            if (!current) {
                                await db.userRole.create({
                                    data: { userId: user.id, roleId: playerRole.id },
                                });
                            }
                        }
                    } catch (e) {
                        console.error('[auth] afterEmailVerification role assignment failed:', e);
                    }
                },
              }
            : undefined,

        user: {
            changeEmail: {
                enabled: true,
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

        advanced: {
            // HTTP internally — Cloudflare Tunnel handles HTTPS externally.
            useSecureCookies: false,
            // Trust x-forwarded-host from Cloudflare Tunnel so Better Auth
            // resolves baseURL from the public domain, not the internal IP.
            trustedProxyHeaders: true,
        },

        plugins,
    };
}

// Auth type for consumers
import { betterAuth } from "better-auth";
export type Auth = ReturnType<typeof betterAuth>;