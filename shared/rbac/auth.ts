import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { betterAuthDbAdapter } from "@core/database";

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
 */
export function createAuth({ baseURL, secret, github, plugins = [] }: AuthConfig) {
    return betterAuth({
        baseURL,
        secret,
        database: betterAuthDbAdapter,
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
                // Domain fields — defined here so both apps share the same schema
                discordHandle: { type: "string", input: false },
                mobile:        { type: "string", input: false },
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