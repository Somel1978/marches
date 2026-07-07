# Marches

A geo-localized quest platform for tabletop RPG communities. Players discover and complete quests on a real-world map, manage characters, and interact through Discord integration.

**Documentation:** [docs/README.md](docs/README.md) · [Setup & commands](docs/setup.md) · [Changelog](CHANGELOG.md)

---

## Architecture

Marches is a **pnpm monorepo** powered by **Turborepo**. The codebase is divided into shared packages consumed by two SvelteKit applications.

```
marches/
├── apps/
│   ├── admin/      — Management interface (admin panel)
│   ├── frontend/   — Player-facing application
│   └── discord/    — Discord bot (slash commands, notifications)
└── shared/
    ├── database/   — @core/database
    ├── rbac/       — @core/rbac
    ├── email/      — @core/email
    ├── ui/         — @core/ui
    └── errors/     — @core/errors
```

### Dependency chain

```
apps (admin / frontend)
  └── @core/rbac          auth factory, RBAC engine
        └── @core/database  Prisma client, dbapi, types
              └── PostgreSQL

apps (admin / frontend)
  └── @core/email         SMTP client, email templates
        └── @core/database  reads SMTP settings at send time

apps (admin / frontend)
  └── @core/ui            design tokens, components, mobile-first CSS
```

`@core/database` is the only package that touches Prisma or PostgreSQL directly. Everything above it consumes typed functions — never raw Prisma queries.

---

## Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5.x |
| Frontend framework | SvelteKit 2.x + Svelte 5 |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (multi-schema) |
| ORM | Prisma v7 (prismaSchemaFolder) |
| Auth | better-auth ~1.5.0 |
| Monorepo | pnpm workspaces + Turborepo |
| Runtime | Node.js v24 |

---

## Shared Packages

### `@core/database`

The data platform. The only layer allowed to import from `@prisma/client` or write SQL. All other packages and apps consume its exported API.

**PostgreSQL schema order** (dependency chain — never reorder):

| Order | Schema | Purpose |
|---|---|---|
| 01 | `platform` | Resource/Module registry + runtime Settings — no dependencies, foundation for everything |
| 02 | `users` | User, Role, UserRole, RolePermission — cross-schema FK to `platform.Resource.key` |
| 03 | `auth` | Session, Account, Verification — owned by better-auth, FKs to `users.User` |
| 04 | `audit` | AuditLog — append-only, FKs to `users.User` |
| 05+ | feature schemas | quests, characters, etc. — FK to `platform.Resource.key` |

**Structure:**

```
shared/database/
  prisma/
    base.prisma         generator + datasource (schemas array)
    platform.prisma     Module, Resource models
    users.prisma        User, Role, UserRole, RolePermission, AccessLevel
    auth.prisma         Session, Account, Verification (better-auth owned)
    audit.prisma        AuditLog (append-only audit trail)
  dbapi/
    read/
      users/            get-all.ts, get-by-id.ts
      roles/            get-all.ts, get-with-permissions.ts
      platform/         get-resources.ts, get-settings.ts
      audit/            get-logs.ts
    write/
      platform/         update-setting.ts
    write/
      audit/            log.ts (called inside transactions, never standalone)
      users/            create.ts, update.ts, delete.ts, set-password.ts
      roles/            create.ts, update-permissions.ts, delete.ts
    transactions/       register-user.ts (user + roles + account atomically)
    analytics/          get-platform-metrics.ts, get-user-growth.ts
  seeds/
    01-platform.seed.ts
    02-roles.seed.ts
    03-users.seed.ts
  index.ts              exports db + namespaced dbapi
  seed.ts               seed entry point
  prisma.config.ts      Prisma v7 config (connection URL)
```

**Usage:**

```typescript
import { users, roles, platform, analytics, transactions } from '@core/database';

const user       = await users.getById(id);
const allRoles   = await roles.getAll();
const resources  = await platform.getResources();
const navVis     = await platform.getResourceNavVisibility();
const settings  = await platform.getSettings();
const settingsMap = await platform.getSettingsMap();
const metrics    = await analytics.getPlatformMetrics();
const logs       = await audit.getLogs({ resourceKey, actorId, page });
```

**Seed order** (mirrors schema dependency order):

```
01-platform  →  02-roles  →  03-users
```

When adding a new feature:
1. Add a `.prisma` file for its schema (append to `schemas` array in `base.prisma`)
2. Register its resources in `01-platform.seed.ts`
3. Add a `04-<feature>.seed.ts` file
4. Import and call it in `seed.ts` after `03-users`
5. Add dbapi functions under `dbapi/read|write|transactions`

---

### `@core/email`

Handles all outbound email. Reads SMTP configuration from `platform.Setting` at send time — no restart required when settings change via the admin UI.

**Structure:**
```
shared/email/
  client.ts          — sendEmail(), getSiteConfig()
  index.ts
  templates/
    welcome.ts         — sendWelcomeEmail()
    verify-email.ts    — sendVerificationEmail()
    reset-password.ts  — sendPasswordResetEmail()
    change-email.ts    — sendEmailChangeEmail() (approval to current email)
```

**Usage:**
```typescript
import { sendWelcomeEmail, sendPasswordResetEmail } from '@core/email';

// Non-blocking — email failure never breaks the primary operation
sendWelcomeEmail(email, name).catch(err => console.error('[email]', err));
```

All templates are plain HTML with inline styles — no external template engine needed.

**SMTP config** lives in `platform.Setting` (keys: `smtp.host`, `smtp.port`, `smtp.user`, `smtp.pass`, `smtp.secure`). Configure via `/settings` in the admin panel. If SMTP is not configured, emails are skipped with a console warning.

---

### `@core/errors`

Domain error hierarchy. No runtime dependencies — safe to import from any package without circular reference risk.

```typescript
import { NotFoundError, ForbiddenError, ConflictError, ValidationError, DatabaseError } from '@core/errors';
```

| Class | HTTP | When to throw |
|---|---|---|
| `NotFoundError(resource, id)` | 404 | Entity does not exist |
| `ForbiddenError(action, resource)` | 403 | Authenticated but not permitted |
| `ConflictError(message)` | 409 | Conflict with existing state |
| `ValidationError(message)` | 400 | Invalid caller input |
| `DatabaseError(message, cause?)` | 500 | Unexpected DB/infra failure |

All extend `MarchesError` which carries `code`, `statusCode`, and a proper stack trace.

**Usage pattern in SvelteKit routes:**

```typescript
import { isMarchesError, toStatusCode } from '@core/errors';
import { error } from '@sveltejs/kit';

try {
    await roles.delete(id);
} catch (e) {
    if (isMarchesError(e)) throw error(e.statusCode, e.message);
    throw error(500, 'Unexpected error');
}
```


---

### `@core/rbac`

Authentication factory and RBAC engine. Depends on `@core/database`, never on `@prisma/client` directly.

**Key exports:**

```typescript
import {
    createAuth,
    getUserPermissions,
    checkPermission,
    isOwner,
    assertPermission,
    invalidateUserPermissions,
    invalidateRolePermissions,
} from '@core/rbac';
```

**`createAuth(config)`** — factory for the better-auth instance. Apps call this once, injecting their env vars and the SvelteKit cookie plugin. Config (social providers, session cache, additionalFields) is defined here — one source of truth.

**`getUserPermissions(userId)`** — checks the permission cache first. On miss, runs a single DB query, merges all roles additively (highest level wins), populates the cache, and returns a `UserPermissions` map. Called once per request in `hooks.server.ts`, stored in `event.locals.permissions`.

**`checkPermission(permissions, { resourceKey, action })`** — zero DB cost. Returns `{ allowed: false, level: 'NONE' }` or `{ allowed: true, level: 'OWN' | 'ALL' }`. Missing resource = NONE assumed.

**`canNavigate(permissions, resourceKey, navVisibility)`** — determines whether a nav item should be shown. Combines the user's permission level with the resource's `navVisibility` setting from `platform.Resource`.

**`assertListPermission(permissions, resourceKey, action?)`** — throws `ForbiddenError` unless level is `ALL`. Use on list routes (`/users`, `/roles`, `/audit`). OWN never grants list access.

**`assertRecordPermission(permissions, resourceKey, action, ownerId, requestingUserId)`** — throws `ForbiddenError` if denied. ALL always passes; OWN passes only if `ownerId === requestingUserId`.

**`assertWritePermission(permissions, resourceKey, action, ownerId?, requestingUserId?)`** — throws `ForbiddenError` if denied. ALL always passes; OWN passes only if owner context provided and matches.

**`invalidateUserPermissions(userId)`** — synchronous. Call after `roles.setUserRoles()`.

**`invalidateRolePermissions(roleId)`** — async. Call after `roles.updatePermissions()`. Clears cache for all users holding that role.

**Access levels:**

| Level | Meaning |
|---|---|
| `NONE` | No access — assumed if no permission row exists for a resource |
| `OWN` | Own records only — route must enforce ownership via `assertRecordPermission` |
| `ALL` | Full access |

Permissions are **additive** — a user with multiple roles gets the highest level across all roles for each resource/action combination. A user with `Role A: User/OWN` and `Role B: User/ALL` resolves to `User/ALL`.

**Route guard contract:**

| Route type | OWN | ALL |
|---|---|---|
| List (`/users`, `/roles`, `/audit`) | 403 | ✅ |
| Single record — own | ✅ | ✅ |
| Single record — other | 403 | ✅ |
| Create | 403 | ✅ |
| Update own | ✅ | ✅ |
| Update other | 403 | ✅ |
| Delete | 403 | ✅ |

**Special case — `AuditLog` with `OWN`:** the `/audit` list route silently forces `actorId = userId` instead of returning 403, so the user sees only their own audit trail.

**Permission cache** (`cache.ts`):

The `UserPermissions` map is cached in-process per user using `lru-cache` (max 5,000 entries, 5-minute TTL). The cache is checked before every DB query in `getUserPermissions`. Explicit invalidation is the primary mechanism — TTL is a safety net only.

The cache is built around a swappable `PermissionCacheStore` interface. To migrate to Redis when horizontal scaling is needed, implement `PermissionCacheStore` backed by Redis and swap the singleton in `cache.ts` — no other files change.

**Invalidation pattern** (app layer responsibility — keeps `@core/database` free of any `@core/rbac` dependency):

```typescript
// After assigning roles to a user:
await roles.setUserRoles(userId, roleIds, actorId);
invalidateUserPermissions(userId);              // synchronous

// After changing a role's permission matrix:
await roles.updatePermissions(roleId, permissions, actorId);
await invalidateRolePermissions(roleId);        // queries affected users, clears each
```

**Nav visibility (`platform.Resource.navVisibility`):**

Each resource declares how its nav item should behave:

| Value | Meaning |
|---|---|
| `NONE` | Never a nav item — internal resources (`System`, `Module`, `Resource`, `Permission`) |
| `ANY` | Show nav if user has `OWN` or `ALL` (`User`, `AuditLog`) |
| `ALL` | Show nav only if user has `ALL` (`Role`) |

The `canNavigate(permissions, resourceKey, navVisibility)` helper combines the user's permission level with the resource's `navVisibility`. The layout server calls this for each nav item — nav filtering and route enforcement use the same contract.

`navVisibility` is set in `01-platform.seed.ts` and shown as a read-only badge in the admin permission matrix.

---

### `@core/ui`

Design system and component library. Both apps import from here — one source of truth for styles and layout.

**Theming** via `data-theme` attribute on `<html>`:
- `data-theme="admin"` — cool, professional (dark grey palette)
- `data-theme="frontend"` — warm, immersive (parchment palette)

Both themes share `--brand-accent: #B8734A` (copper).

**CSS files** (import via `@core/ui/styles/index.css`):
- `tokens.css` — CSS custom properties for both themes
- `base.css` — resets, scrollbar, focus ring, body defaults
- `components/*.css` — Tailwind `@layer components` split into logical files, all imported directly in `index.css`

**Rule: no `<style>` blocks in pages.** All visual patterns live in `components/`. If a component needs slots or logic it becomes a Svelte component in `@core/ui/components/`. Pages only use class names.

**Component CSS files:**

| File | Contents |
|---|---|
| `components/layout.css` | `.page`, `.page__header`, `.sections`, `.fields`, `.field`, `.form-error`, `.form-success`, `.form-actions`, `.save-bar`, `.toolbar`, `.back-link` |
| `components/ui.css` | `.card`, `.btn`, `.badge`, `.input`, `.label`, `.auth-card`, `.forgot-link`, `.nav-signout`, `.settings-group` |
| `components/avatar.css` | `.avatar-preview`, `.avatar-preview-btn`, `.lightbox`, `.avatar-sm`, `.role-list`, `.role-option` |
| `components/table.css` | `.table`, `.table-wrap`, `.col-hide-mobile`, `.col-hide-tablet`, `.pagination` |
| `components/matrix.css` | `.matrix`, `.nav-badge`, `.legend` |
| `components/audit.css` | `.detail-panel`, `.detail-json`, `.actor`, `.filters__row` |
| `components/dashboard.css` | `.dashboard`, `.stat-card`, `.quick-link` |
| `components/site.css` | `.site`, `.nav-bar`, `.landing`, `.auth-layout`, `.auth-shell`, `.login` |

**Adding styles for a new feature:** create `components/<feature>.css` with `@layer components { }` and add `@import './components/<feature>.css';` to `index.css`. Never add to `components.css` — it is kept as a reference stub only.

**Important:** Tailwind v4 does not resolve nested `@import` chains. All component imports must be at the root level in `index.css`, not chained through an intermediary file.

**Components:**

| Component | Usage |
|---|---|
| `AppShell` | Admin app shell — Sidebar + Header + main. Mobile: drawer with backdrop overlay |
| `Sidebar` | Collapsible desktop sidebar / mobile drawer. `drawerOpen` prop for mobile toggle |
| `Header` | Sticky top header with hamburger (mobile), user avatar, action slot |
| `NavItem` | Single nav item with active state and icon-only collapsed mode |
| `NavBar` | Frontend top navigation bar |
| `Button` | `.btn` variants: primary, ghost, danger, sm, lg, icon, full |
| `Card` | `.card` variants: default, elevated, parchment |
| `Badge` | Status badges: accent, success, warning, danger, muted |
| `Avatar` | User avatar with initials fallback |
| `PermissionCell` | Permission level selector cell for the roles matrix |

---

## Applications

### `@apps/admin` — `http://localhost:5174`

Management panel. All routes require authentication and `System/read` permission.

**Route structure:**

```
src/routes/
  +layout.svelte              CSS imports only (no chrome, no guard)
  signout/                    POST action — signs out and redirects to /login
  (auth)/
    +layout.svelte            Centered card layout, no guard
    login/                    Email/password login + forgot password link
    forgot-password/          Request password reset link (no session required)
    reset-password/           Token validation + set new password
    unauthorized/             Access denied + sign out
  (app)/
    +layout.server.ts         Auth guard + nav resolution from nav.ts
    +layout.svelte            AppShell, renders data.nav and data.footer
    +page.server.ts           Dashboard with getPlatformMetrics()
    +page.svelte              Stat cards + quick links
    users/                    assertListPermission (ALL only)
    users/new/                registerUser transaction + welcome email
    users/[id]/               assertRecordPermission + assertWritePermission
    roles/                    assertListPermission (ALL only)
    roles/new/                createRole
    roles/[id]/               Permission matrix, navVisibility badges, SUPERADMIN locked
    audit/                    OWN silently forces actorId=userId filter
    settings/                 SMTP + site config (System/read required)
```

**Nav source of truth** — `apps/admin/src/lib/nav.ts`. Defines `NavItemDef[]` with `resourceKey` and a `href` that can be a static string or a function `(ctx: NavContext) => string`. The layout server resolves all hrefs server-side — the layout svelte only ever receives resolved strings.

```typescript
// OWN users navigate to their own profile; ALL users see the full list
{
    resourceKey: 'User',
    href: ({ userId, level }) => level === 'OWN' ? `/users/${userId}` : '/users',
    activeMatch: (pathname, { userId, level }) =>
        level === 'OWN' ? pathname === `/users/${userId}` : pathname.startsWith('/users'),
}
```

Adding a new route = one entry in `nav.ts`. Nothing else changes. Settings appears in the footer for any user with `System/read` (`navVisibility: ANY`).

**Auth guard logic** (`(app)/+layout.server.ts`):
1. No session → redirect to `/login?redirectTo=<current path>`
2. Session but no `System/read` permission → redirect to `/unauthorized`
3. Authenticated + authorized → pass minimal user object to layout

### `@apps/frontend` — `http://localhost:5173`

Player-facing application. Public routes work without authentication. Protected routes (character, profile, etc.) require a session.

**Route structure:**

```
src/routes/
  +layout.server.ts           Passes user to NavBar (no guard)
  +layout.svelte              NavBar + Footer wrapper
  +page.svelte                Landing page (public)
  api/auth/[...auth]/         better-auth API handler (verify-email, reset-password, etc.)
  signout/                    POST action — signs out, redirects to /
  change-email/               Ensures user is logged in before processing change-email token
  (auth)/
    +layout.svelte            Centered auth card layout
    login/                    Email/password login. EMAIL_NOT_VERIFIED → pending message
    signup/                   Self-registration via Better Auth → verification email → PLAYER role on verify
    signup/pending/           "Check your email" page (pending verification)
    forgot-password/          Request password reset
    reset-password/           Token validation + set new password
  (protected)/
    +layout.server.ts         Auth guard — redirects to /login?redirectTo=<path>
    +layout.svelte            Inherits root layout
    profile/                  Three sections: profile details, change password, change email
    profile/email-changed/    Landing after email change verification → redirects to /profile?emailChanged=1
    characters/               Character hub, detail sheet, D&D 5e creation wizard
    characters/new/dnd5e/     6-step inline D&D 5e wizard (`_wizard/` module)
    dm/                       DM hub (worlds, quests, characters, marketplace, …)
    marketplace/              Item browse and transactions
    token-store/              Boost purchases
    world/                    World landing pages, journal, quests
```

---

## Request lifecycle

```
HTTP request
  → hooks.server.ts
      → auth.api.getSession()         (reads cookie)
      → getUserPermissions(userId)    (single DB query, if authenticated)
      → event.locals.user = ...
      → event.locals.permissions = Map<resource, ResolvedPermission>
  → +layout.server.ts (guard)
      → checkPermission(locals.permissions, ...)
  → +page.server.ts (route logic)
      → checkPermission(locals.permissions, ...)   (zero DB cost)
      → isOwner() if level === 'OWN'
      → dbapi call (users.getById, roles.getAll, etc.)
          → write functions run inside $transaction
          → logAudit() called atomically within each transaction
```

---

## Environment variables

All vars live in the **monorepo root `.env`**. Full list, pm2 notes, and Discord vars: **[docs/setup.md](docs/setup.md)**.

Quick start:

```bash
cp .env.example .env
# Set DATABASE_URL, BETTER_AUTH_SECRET, ALLOWED_HOSTS, SITE_URL, SEED_ADMIN_PASSWORD
```

---

## Getting started

See **[docs/setup.md](docs/setup.md)** for full install, env, pm2, and test commands.

```bash
pnpm install
cp .env.example .env   # then edit — see docs/setup.md
pnpm --filter @core/database db:push
pnpm --filter @core/database db:generate
pnpm --filter @core/database db:seed
pnpm --filter @apps/admin init-admin
pnpm dev:all
pnpm docs:check        # validate documentation links
```

After setup:
- Admin panel: `http://localhost:5174` — log in with `admin@marches.local` and your `SEED_ADMIN_PASSWORD`
- Frontend: `http://localhost:5173`
- Configure SMTP in `/settings` to enable email flows (welcome, verification, password reset)

---

## Adding a new feature

1. **Schema** — add `<feature>.prisma` with `@@schema("<feature>")`, append `"<feature>"` to `base.prisma` schemas array
2. **Platform registry** — add a Module + Resources (with immutable `key` and mutable `displayName`) to `01-platform.seed.ts`
3. **Permissions** — add permission entries using `resourceKey` (matching `Resource.key`) to `02-roles.seed.ts` for SUPERADMIN and any other relevant roles
4. **DB** — `pnpm --filter @core/database db:push && db:generate && db:seed`
5. **dbapi** — add read/write/transaction functions under `shared/database/dbapi/`
6. **Routes** — add admin routes under `apps/admin/src/routes/(app)/<feature>/`, frontend routes under `apps/frontend/src/routes/(protected)/<feature>/`
7. **Guard** — use `checkPermission(locals.permissions, { resource: '<Feature>', action: 'read' })` at the top of each `+page.server.ts`

---

## Database performance

### Search indexes (pg_trgm)

The `get-all.ts` read functions use `ILIKE '%term%'` for substring search. Without specialised indexes, PostgreSQL performs a full sequential scan on every search — acceptable at small scale, a serious bottleneck as tables grow.

The `pg_trgm` extension (enabled in `base.prisma`) breaks strings into 3-character sequences and builds GIN indexes that PostgreSQL can use for `ILIKE` queries. Indexed columns:

| Table | Column | Index |
|---|---|---|
| `users.users` | `name` | `users_name_trgm_idx` (GIN) |
| `users.users` | `email` | `users_email_trgm_idx` (GIN) |

As new features are added with searchable string fields (quest names, character names, etc.), add GIN trigram indexes following the same pattern in `users.prisma`:

```prisma
@@index([fieldName(ops: raw("gin_trgm_ops"))], map: "table_field_trgm_idx", type: Gin)
```

The `pg_trgm` extension is declared once in `base.prisma` and is available across all schemas.

---

## Key decisions

**Why `@core/database` as a data platform, not just a Prisma wrapper?**
Centralising all queries, raw SQL, and transactions in one package means apps never import Prisma types directly. Cross-schema queries (e.g. joining `users` and `platform`) can use raw SQL where Prisma falls short, without leaking that complexity into application code.

**Why explicit `UserRole` join table instead of implicit Prisma M2M?**
Prisma's implicit M2M places the join table in an ambiguous schema with `multiSchema`. Explicit gives us guaranteed `@@schema("users")` placement, plus `assignedAt`/`assignedBy` audit fields.

**Why `platform.Resource.key` with a cross-schema FK in `users.RolePermission.resourceKey`?**
`Resource.key` is immutable (set once, never changed) and serves as the stable contract between `platform` and `users`. `Resource.displayName` holds the human-readable label and can be renamed freely in the UI without affecting any permission rows. A DB-level cross-schema FK (`users.role_permissions.resource_key → platform.resources.key`) enforces referential integrity — the DB rejects invalid keys entirely. The dbapi layer also validates keys before writing for cleaner domain errors. This eliminates the silent-break risk of a plain String while avoiding UUID FK complexity.

**Why a separate `@core/errors` package?**
Errors can originate in `@core/database`, `@core/rbac`, or application code. Placing domain errors in a package with no runtime dependencies means any layer can import and throw them without creating circular references. All packages share the same error hierarchy and callers (`apps`) can catch by type.

**Why an `audit` schema?**
Once permissions and user roles are editable through the admin UI, a tamper-evident trail is non-negotiable. The `AuditLog` is append-only (never updated or deleted), written atomically inside each dbapi write transaction, and lives in its own schema so it can be archived or queried independently of operational data.

**Why `better-auth/crypto.hashPassword` in `init-admin`?**
better-auth uses its own scrypt-based `hashPassword` function (not argon2, not bcrypt). Using any other hashing library produces a hash format better-auth's `verifyPassword` cannot read. The init-admin script imports directly from `better-auth/crypto` to guarantee compatibility.

**Why two separate apps instead of one?**
Admin and frontend have fundamentally different audiences, security requirements, and UI paradigms. Keeping them as separate SvelteKit apps means the admin panel is never accidentally exposed through the frontend build, and each can have its own deployment target.

**Why `lru-cache` for permission caching rather than Redis?**
Redis adds infrastructure complexity (another service to run, monitor, and deploy) that isn't justified at this stage. `lru-cache` is in-process, zero infrastructure, and handles the common case of a single-instance Node server well. The `PermissionCacheStore` interface means the implementation is swappable — when horizontal scaling requires cross-process cache consistency, a `RedisPermissionCache` can replace the LRU implementation with no changes to any callers.

**Why is cache invalidation the app layer's responsibility?**
`@core/database` must not import `@core/rbac` — that would create a circular dependency. Placing invalidation calls in SvelteKit actions (which already import both packages) keeps the dependency chain clean: `@core/database` knows nothing about the cache, `@core/rbac` owns the cache, and apps coordinate between them.

**Why `platform.Resource.navVisibility` drives both nav and route enforcement?**
Nav visibility and minimum route access level are the same concern expressed in two places. Encoding it once on the resource — `NONE`, `ANY`, `ALL` — means the permission matrix UI can show it, the layout server uses it for nav filtering, and route guards can reference the same contract. A future developer adding a new resource sets `navVisibility` in the seed and the system behaves correctly everywhere.

**Security guards in `@core/database` dbapi:**
- `deleteUser` — cannot delete own account; cannot delete last SUPERADMIN
- `setUserRoles` — cannot remove own SUPERADMIN role; cannot remove SUPERADMIN from last admin
- `deleteRole` — cannot delete SUPERADMIN role
- All guards throw typed domain errors (`ForbiddenError`, `ValidationError`) that bubble to the UI via `isMarchesError()`

**Why does admin user creation use the forgot-password flow for activation rather than a verification link?**
Better-auth's `sendVerificationEmail` API validates that the requesting session owns the email being verified — it rejects requests from an admin session trying to verify another user's email (`EMAIL_MISMATCH`). Rather than working around this with internal token manipulation, admin-created users receive a welcome email directing them to `/forgot-password`. They enter their email, receive a proper better-auth reset link, and set their own password — which both activates their account and verifies their email in one step. This is better UX than a separate verification flow.

**`pnpm peers check` tailwindcss warning:**
A persistent `conflicting peer tailwindcss` warning appears in `pnpm peers check`. This is a false positive — pnpm's semver parser incorrectly flags Tailwind v4 against the compound `||` range declared by `@tailwindcss/forms` and `@tailwindcss/typography`. Both plugins work correctly at runtime. The warning cannot be suppressed via `peerDependencyRules` because `pnpm peers check` always reports conflicts regardless of suppression config. It is safe to ignore.

**Why is the avatar lightbox implemented in CSS rather than a Svelte component?**
The lightbox uses only CSS classes (`.lightbox`, `.lightbox__backdrop`, `.lightbox__card`, `.lightbox__image`) and a single `$state(false)` variable in the page. No props, no events, no slots — a Svelte component would add indirection without benefit. The threshold for extracting to a component is when the pattern repeats across multiple pages or requires logic beyond a boolean toggle.

**Why is `changePassword` used server-side but `changeEmail` required a workaround?**
`auth.api.changePassword` works correctly server-side — it verifies the current password, updates the hash, and returns cleanly. `auth.api.changeEmail` has a known bug where calling it server-side bypasses the verification flow. The two APIs have different behaviours despite appearing symmetric.

**Why does email change route through `/change-email` before `/api/auth/verify-email`?**
Better-auth's `change-email-confirmation` token handler requires an active session cookie to process the change. If the user clicks the link in a different browser or device where they're not logged in, the token is silently ignored. The `/change-email` page server checks for an active session first — if not logged in, redirects to `/login?redirectTo=<link>`. Once logged in, it forwards to `/api/auth/verify-email` with the session cookie present. The `callbackURL` chain is: `changeEmail action → /profile/email-changed → /profile?emailChanged=1` to avoid query string mangling through the redirect chain.

**Why self-registered users get PLAYER role automatically on email verification?**
Self-registration is public-facing — anyone can create an account. Better Auth handles email verification (`requireEmailVerification: true`). On verification, the `afterEmailVerification` hook assigns the PLAYER role and notifies admins via Discord DM + in-app notification. Users auto-activate — no manual admin approval step needed.

**Why `pg_trgm` GIN indexes rather than full-text search (`tsvector`)?**
`pg_trgm` handles the primary use case (substring search on name/email) with no query changes — existing `ILIKE` queries automatically use the index once it exists. Full-text search (`tsvector`) offers better ranking and language-aware stemming but requires query changes and additional schema complexity. `pg_trgm` is the right starting point; full-text search can be layered on specific features (e.g. quest search) if needed later.