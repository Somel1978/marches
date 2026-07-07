# Marches — Commands Reference

---

## Initial Setup

### Prerequisites
Install: Node.js v24, pnpm 11+, PostgreSQL

### Install dependencies
```bash
pnpm install
```

### Environment Variables
Create a `.env` file at the monorepo root (see also `README.md` for full descriptions):

```env
# Database
DATABASE_URL="postgresql://[User]:[Password]@localhost:5432/[Database_Name]"

# Auth
BETTER_AUTH_SECRET=[32+ char random string]

# Better Auth 1.5+ — comma-separated hostnames for dynamic baseURL resolution
ALLOWED_HOSTS=localhost:5173,localhost:5174,[SERVER_IP]:5173,[SERVER_IP]:5174

# Canonical public URL for email verification links
SITE_URL=http://localhost:5173

# Trusted origins for Better Auth CSRF validation
TRUSTED_ORIGINS=http://localhost:5173,http://localhost:5174

# Port overrides for dev (optional)
FRONTEND_PORT=5173
ADMIN_PORT=5174

# Seeding
SEED_ADMIN_PASSWORD=[SUPERADMIN_SEED_PASSWORD]

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Discord bot (optional — apps/discord)
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
```

> **Note:** Older docs referenced `ORIGIN`, `BETTER_AUTH_URL`, and `FRONTEND_URL`. The current auth config uses `SITE_URL`, `ALLOWED_HOSTS`, and `TRUSTED_ORIGINS` (see [technical.md](./technical.md)).

### Push schema + seed
```bash
pnpm --filter @core/database db:push
pnpm --filter @core/database db:generate
pnpm --filter @core/database db:seed
```

### Create admin account
```bash
pnpm --filter @apps/admin init-admin
```

### Start development
```bash
pnpm dev:all          # frontend + admin + discord
pnpm dev:frontend     # frontend only (port 5173)
pnpm dev:admin        # admin only (port 5174)
```

---

## Production Deployment (pm2)

### Build
```bash
pnpm build
```

### Start all services (first time or after ecosystem.config.js changes)
```bash
pm2 delete all && pm2 start ecosystem.config.js && pm2 save
```

### Standard redeploy (code changes only)
```bash
git pull && pnpm install && pnpm build && pm2 restart all
```

### After .env changes
```bash
pm2 delete all && pm2 start ecosystem.config.js && pm2 save
```

### Logs
```bash
pm2 logs                        # all services
pm2 logs thebnb-admin           # admin only
pm2 logs thebnb-discord         # discord bot only
pm2 logs --lines 50             # last 50 lines
```

### ecosystem.config.js (monorepo root)
Update `cwd` and `--env-file` paths to match your deployment directory:

```js
module.exports = {
  apps: [
    {
      name: 'thebnb-frontend',
      script: 'apps/frontend/build/index.js',
      cwd: '/path/to/marches',
      node_args: '--env-file=/path/to/marches/.env',
      env: { PORT: '5173', HOST: '0.0.0.0' },
    },
    {
      name: 'thebnb-admin',
      script: 'apps/admin/build/index.js',
      cwd: '/path/to/marches',
      node_args: '--env-file=/path/to/marches/.env',
      env: { PORT: '5174', HOST: '0.0.0.0' },
    },
    {
      name: 'thebnb-discord',
      script: 'node_modules/.bin/tsx',
      args: '--env-file=/path/to/marches/.env apps/discord/src/index.ts',
      cwd: '/path/to/marches',
      interpreter: 'none',
      env: { NODE_ENV: 'production' },
    },
  ],
};
```

> **Note:** `node_args: '--env-file=...'` does not work for the discord app because `tsx` is the interpreter (not node). Pass `--env-file` in `args` directly.

---

## Database

```bash
# Push schema changes to DB (no migrations — always use db:push)
pnpm --filter @core/database db:push

# Regenerate Prisma client after schema changes
pnpm --filter @core/database db:generate

# Re-seed reference data
pnpm --filter @core/database db:seed

# Prisma Studio (visual browser)
pnpm --filter @core/database db:studio

# Validate D&D 5e duplicated logic + import-guide columns
pnpm --filter @core/database check:dnd5e-sync

# Validate documentation links and stubs
pnpm docs:check
```

---

## Documentation

```bash
pnpm docs:check           # validate stubs, index links, generated dependency map header
pnpm docs:generate-deps   # regenerate docs/dependency-map.md from dbapi imports
```

> **Note:** This project uses `db:push`, not Prisma Migrate. Do not run `prisma migrate reset` in production workflows.

---

## Type Checking & Lint

```bash
pnpm --filter @apps/admin check
pnpm --filter @apps/frontend check
pnpm lint
pnpm format
```

---

## Tests (frontend)

```bash
pnpm --filter @apps/frontend test          # unit (Vitest)
pnpm --filter @apps/frontend test:e2e      # Playwright (character wizard, etc.)
```

---

## Discord Bot

```bash
# Dev
pnpm --filter @apps/discord dev

# Re-register slash commands with Discord
pnpm --filter @apps/discord register
```

---

## Utilities

```bash
# Force-kill dev processes if hanging
pkill -f "turbo dev"
pkill -f "vite dev"
```
