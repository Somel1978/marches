# To install Application: 
    Prepara Application:
        Install Node, PNPM,TURBOREPO,POSTGRESQL

# Install dependencies
pnpm install

# Set up environment
## Environment Variables

Create a `.env` file using the following example:

```
DATABASE_URL="postgresql://[User]:[Password]@localhost:5432/[Database_Name]"
SEED_ADMIN_PASSWORD=[SUPERADMIN_SEED_PASSWORD]
ORIGIN=http://localhost:5174
BETTER_AUTH_SECRET=[SET_A_BETTER_AUTH_SECRET]
BETTER_AUTH_URL=http://localhost:5174

# Comma-separated additional trusted origins beyond ORIGIN
# Add any IP/hostname users access the app from
TRUSTED_ORIGINS=http://[SERVER_IP]:5174,http://[SERVER_IP]:5173
FRONTEND_URL=http://[SERVER_IP]:5173
```

# Push schema to DB and generate Prisma client
pnpm --filter @core/database db:push --schema=./prisma
pnpm --filter @core/database db:generate --schema=./prisma

# Seed reference data
pnpm --filter @core/database db:seed --schema=./prisma

# Create admin account (sets password via better-auth)
pnpm --filter @apps/admin init-admin

# Start development
pnpm dev:all

# Other Usefull Commands:
pnpm exec prisma migrate reset - run within shared/database to drop database and start fresh
sudo -u postgres psql -d [database_name] -c "[SQL_QUERY]"
pkill -f "turbo dev" - To Force Kill Turbo 
pkill -f "vite dev" - To Force Kill Vite
pnpm --filter @apps/admin check  -To Check for Errors in admin  
pnpm --filter @apps/frontend check - To Check for Errors in Frontend

# App Discord
pnpm --filter @apps/discord register - To Re-Register the Bot Commands 