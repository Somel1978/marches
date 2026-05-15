// apps/frontend/src/routes/api/auth/[...auth]/+server.ts
// Better-auth HTTP endpoint handler.
// Handles all auth API routes: sign-in, sign-out, session refresh,
// OAuth callbacks, and any better-auth plugin endpoints.
// svelteKitHandler is for hooks.server.ts — in route files use auth.handler directly.
import { auth } from '$lib/server/auth';

export const GET  = (event) => auth.handler(event.request);
export const POST = (event) => auth.handler(event.request);