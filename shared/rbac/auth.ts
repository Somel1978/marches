import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@core/database";
import type { BetterAuthOptions } from "better-auth";

export function createAuth(options: Partial<BetterAuthOptions>) {
    return betterAuth({
        database: prismaAdapter(db, {
            provider: "postgresql",
        }),
        emailAndPassword: {
            enabled: true,
            autoSignIn: false,
        },
        user: {
            additionalFields: {
                discordHandle: {
                    type: "string",
                    input: false,
                },
                mobile: {
                    type: "string",
                    input: false,
                }
            }
        },
        session: {
            cookieCache: {
                enabled: true,
                maxAge: 86400, // 24 hours
            }
        },
        ...options,
    });
}
