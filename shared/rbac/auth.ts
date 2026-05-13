import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@core/database";
 
export type AuthConfig = {
    baseURL: string;
    secret: string;
    github?: {
        clientId: string;
        clientSecret: string;
    };
    /**
     * Framework-specific plugins (e.g. sveltekitCookies).
     * Pass these from the app layer so this package stays framework-agnostic.
     */
    plugins?: BetterAuthPlugin[];
};
 
/**
 * Factory for the single shared auth instance.
 * Apps call this once, injecting their env vars and framework plugins.
 *
 * Dependency flow: apps → @core/rbac → @core/database
 * better-auth is a dependency of @core/rbac, not @core/database.
 * prismaAdapter lives here, not in @core/database.
 */
export function createAuth({ baseURL, secret, github, plugins = [] }: AuthConfig) {
    return betterAuth({
        baseURL,
        secret,
        database: prismaAdapter(db, { provider: "postgresql" }),
        emailAndPassword: {
            enabled: true,
            autoSignIn: false,
        },
        ...(github && {
            socialProviders: {
                github: {
                    clientId: github.clientId,
                    clientSecret: github.clientSecret,
                },
            },
        }),
        user: {
            additionalFields: {
                discordHandle: {
                    type:      "string",
                    input:     false,
                    fieldName: "discord_handle",
                },
                mobile: {
                    type:      "string",
                    input:     false,
                    fieldName: "mobile",
                },
            },
        },
        session: {
            cookieCache: {
                enabled: true,
                maxAge: 300, // 5 minutes
            },
        },
        plugins,
    });
}
 
export type Auth = ReturnType<typeof createAuth>;