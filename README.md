# Marches

A geo-localized quest platform for tabletop RPG communities. Players discover and complete quests on a real-world map, manage characters, and interact through Discord integration.

---

## Architecture

Marches is a **pnpm monorepo** powered by **Turborepo**. The codebase is divided into shared packages consumed by two SvelteKit applications.

```
marches/
├── apps/
│   ├── admin/      — Management interface (admin panel)
│   └── frontend/   — Player-facing application
└── shared/
    ├── database/   — @core/database
    ├── rbac/       — @core/rbac
    └── ui/         — @core/ui
```

### Dependency chain

```
apps (admin / frontend)
  └── @core/rbac          auth factory, RBAC engine
        └── @core/database  Prisma client, dbapi, types
              └── PostgreSQL

apps (admin / frontend)
  └── @core/ui            design tokens, components
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
| Auth | better-auth v1.4.x |
| Monorepo | pnpm workspaces + Turborepo |
| Runtime | Node.js v24 |

---

## Shared Packages

### `@core/database`

The data platform. The only layer allowed to import from `@prisma/client` or write SQL. All other packages and apps consume its exported API.

**PostgreSQL schema order** (dependency chain — never reorder):

| Order | Schema | Purpose |
|---|---|---|
| 01 | `platform` | Resource/Module registry — no dependencies, foundation for everything |
| 02 | `users` | User, Role, UserRole, RolePermission |
| 03 | `auth` | Session, Account, Verification — owned by better-auth, FKs to `users` |
| 04+ | feature schemas | quests, characters, etc. — FK to `platform.Resource` |

**Structure:**

```
shared/database/
  prisma/
    base.prisma         generator + datasource (schemas array)
    platform.prisma     Module, Resource models
    users.prisma        User, Role, UserRole, RolePermission, AccessLevel
    auth.prisma         Session, Account, Verification (better-auth owned)
  dbapi/
    read/
      users/            get-all.ts, get-by-id.ts
      roles/            get-all.ts, get-with-permissions.ts
      platform/         get-resources.ts
    write/
      users/            create.ts, update.ts, delete.ts
      roles/            create.ts, update-permissions.ts, delete.ts
    transactions/       register-user.ts
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
const metrics    = await analytics.getPlatformMetrics();
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

### `@core/rbac`

Authentication factory and RBAC engine. Depends on `@core/database`, never on `@prisma/client` directly.

**Key exports:**

```typescript
import { createAuth, getUserPermissions, checkPermission, isOwner, assertPermission } from '@core/rbac';
```

**`createAuth(config)`** — factory for the better-auth instance. Apps call this once, injecting their env vars and the SvelteKit cookie plugin. Config (social providers, session cache, additionalFields) is defined here — one source of truth.

**`getUserPermissions(userId)`** — single DB query, merges all roles additively, returns a `UserPermissions` map. Called once per request in `hooks.server.ts`, stored in `event.locals.permissions`.

**`checkPermission(permissions, { resource, action })`** — zero DB cost, works against the pre-loaded map. Returns `{ allowed: boolean, level: 'NONE' | 'OWN' | 'ALL' }`.

**`isOwner(resourceOwnerId, requestingUserId)`** — enforces the `OWN` access level. Call when `checkPermission` returns `level === 'OWN'`.

**`assertPermission(result, resource, action)`** — throws a plain `Error` if denied. Apps catch and map to `error(403)`.

**Access levels:**

| Level | Meaning |
|---|---|
| `NONE` | No access |
| `OWN` | Access to own resources only — caller must call `isOwner()` |
| `ALL` | Full access |

Permissions are **additive** — a user with multiple roles gets the highest level across all roles for each resource/action combination.

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
- `components.css` — Tailwind `@layer components`: `.card`, `.btn`, `.btn-primary`, `.btn-ghost`, `.badge`, `.input`, `.stat-card`

**Components:**

| Component | Usage |
|---|---|
| `AppShell` | Admin app shell — wraps Sidebar + Header + main content |
| `Sidebar` | Collapsible sidebar with snippet-based nav and footer slots |
| `NavItem` | Single nav item with active state and icon-only collapsed mode |
| `Header` | Sticky top header with user avatar and action slot |
| `NavBar` | Frontend top navigation bar |
| `Footer` | Frontend footer |
| `Button` | `.btn` variants: primary, ghost, danger |
| `Card` | `.card` variants: default, elevated, parchment |
| `Badge` | Status badges: accent, success, warning, danger, muted |
| `Avatar` | User avatar with initials fallback |

---

## Applications

### `@apps/admin` — `http://localhost:5174`

Management panel. All routes require authentication and `System/read` permission.

**Route structure:**

```
src/routes/
  +layout.svelte              CSS imports only (no chrome, no guard)
  (auth)/
    +layout.svelte            Centered card layout, no guard
    login/                    Email/password login
    unauthorized/             Access denied page
  (app)/
    +layout.server.ts         Auth guard — redirects to /login or /unauthorized
    +layout.svelte            AppShell with sidebar nav
    +page.svelte              Dashboard
    +page.server.ts           signOut action
```

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
  (protected)/
    +layout.server.ts         Auth guard — redirects to /login
    +layout.svelte            Inherits root layout, adds player context
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
```

---

## Environment variables

All vars live in the **monorepo root `.env`**. All scripts reference `../../.env`.

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/website_db"

# Auth
ORIGIN="http://localhost:5174"           # must match admin app URL exactly
BETTER_AUTH_SECRET="<32+ char random string>"
BETTER_AUTH_URL="http://localhost:5174"

# GitHub OAuth (optional — leave empty to disable)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Seeding
SEED_ADMIN_PASSWORD="<strong password>"  # used by init-admin script
```

---

## Getting started

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL, BETTER_AUTH_SECRET, ORIGIN, SEED_ADMIN_PASSWORD

# Push schema to DB and generate Prisma client
pnpm --filter @core/database db:push
pnpm --filter @core/database db:generate

# Seed reference data
pnpm --filter @core/database db:seed

# Create admin account (sets password via better-auth)
pnpm --filter @apps/admin init-admin

# Start development
pnpm dev:all
```

After setup:
- Admin panel: `http://localhost:5174` — log in with `admin@marches.local` and your `SEED_ADMIN_PASSWORD`
- Frontend: `http://localhost:5173`

---

## Adding a new feature

1. **Schema** — add `<feature>.prisma` with `@@schema("<feature>")`, append `"<feature>"` to `base.prisma` schemas array
2. **Platform registry** — add a Module + Resources to `01-platform.seed.ts`
3. **Permissions** — add permission entries to the SUPERADMIN role in `02-roles.seed.ts` and any other relevant roles
4. **DB** — `pnpm --filter @core/database db:push && db:generate && db:seed`
5. **dbapi** — add read/write/transaction functions under `shared/database/dbapi/`
6. **Routes** — add admin routes under `apps/admin/src/routes/(app)/<feature>/`, frontend routes under `apps/frontend/src/routes/(protected)/<feature>/`
7. **Guard** — use `checkPermission(locals.permissions, { resource: '<Feature>', action: 'read' })` at the top of each `+page.server.ts`

---

## Key decisions

**Why `@core/database` as a data platform, not just a Prisma wrapper?**
Centralising all queries, raw SQL, and transactions in one package means apps never import Prisma types directly. Cross-schema queries (e.g. joining `users` and `platform`) can use raw SQL where Prisma falls short, without leaking that complexity into application code.

**Why explicit `UserRole` join table instead of implicit Prisma M2M?**
Prisma's implicit M2M places the join table in an ambiguous schema with `multiSchema`. Explicit gives us guaranteed `@@schema("users")` placement, plus `assignedAt`/`assignedBy` audit fields.

**Why `platform.Resource` with a String FK in `users.RolePermission`?**
A hard FK across schemas (`users.role_permissions → platform.resources`) adds migration complexity. Using a String that matches `Resource.name` keeps the schemas independent. Consistency is enforced by seed order and a rename transaction helper (TODO).

**Why `better-auth/crypto.hashPassword` in `init-admin`?**
better-auth uses its own scrypt-based `hashPassword` function (not argon2, not bcrypt). Using any other hashing library produces a hash format better-auth's `verifyPassword` cannot read. The init-admin script imports directly from `better-auth/crypto` to guarantee compatibility.

**Why two separate apps instead of one?**
Admin and frontend have fundamentally different audiences, security requirements, and UI paradigms. Keeping them as separate SvelteKit apps means the admin panel is never accidentally exposed through the frontend build, and each can have its own deployment target.