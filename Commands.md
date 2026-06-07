# Marches — Commands Reference

---

## Initial Setup

### Prerequisites
Install: Node.js v24, pnpm, Turborepo, PostgreSQL

### Install dependencies
```bash
pnpm install
```

### Environment Variables
Create a `.env` file at the monorepo root:

```env
# Database
DATABASE_URL="postgresql://[User]:[Password]@localhost:5432/[Database_Name]"

# Auth — ORIGIN must match the admin app URL exactly
ORIGIN=http://localhost:5174
BETTER_AUTH_SECRET=[SET_A_BETTER_AUTH_SECRET]
BETTER_AUTH_URL=http://localhost:5174

# Comma-separated trusted origins (all hosts users access the app from)
TRUSTED_ORIGINS=http://[SERVER_IP]:5174,http://[SERVER_IP]:5173

FRONTEND_URL=http://[SERVER_IP]:5173

# Seeding
SEED_ADMIN_PASSWORD=[SUPERADMIN_SEED_PASSWORD]

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

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
pnpm dev:all
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
```js
module.exports = {
  apps: [
    {
      name: 'thebnb-frontend',
      script: 'apps/frontend/build/index.js',
      cwd: '/home/marches/space',
      node_args: '--env-file=/home/marches/space/.env',
      env: { PORT: '5173', HOST: '0.0.0.0' },
    },
    {
      name: 'thebnb-admin',
      script: 'apps/admin/build/index.js',
      cwd: '/home/marches/space',
      node_args: '--env-file=/home/marches/space/.env',
      env: { PORT: '5174', HOST: '0.0.0.0' },
    },
    {
      name: 'thebnb-discord',
      script: 'node_modules/.bin/tsx',
      args: '--env-file=/home/marches/space/.env apps/discord/src/index.ts',
      cwd: '/home/marches/space',
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

# Drop and recreate database (destructive!)
pnpm exec prisma migrate reset   # run from shared/database

# Raw SQL
sudo -u postgres psql -d [database_name] -c "[SQL_QUERY]"
```

---

## Type Checking

```bash
pnpm --filter @apps/admin check
pnpm --filter @apps/frontend check
```

---

## Discord Bot

```bash
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