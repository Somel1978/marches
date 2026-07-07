# Dev Environment Setup & Journal/Wiki Refactor Plan

> **Reference:** Part 1 (dev/prod isolation) is operational guidance.
> Parts 2+ include historical plans — check [CHANGELOG.md](../CHANGELOG.md) and reference docs for what was actually built.

---

## Part 1 — Dev Environment Setup

### Goal
Two isolated environments on the same server:

| | Production | Development |
|---|---|---|
| Folder | `/home/marches/space` | `/home/marches/dev` |
| Branch | `main` | `dev` |
| Database | `marches_prod` | `marches_dev` |
| Frontend port | 5173 | 5273 |
| Admin port | 5174 | 5274 |
| pm2 names | `thebnb-*` | `dev-*` |

---

### Step 1 — Create and push dev branch
```bash
cd /home/marches/space
git checkout -b dev
git push origin dev
```

### Step 2 — Clone into dev folder
```bash
cd /home/marches
git clone https://github.com/Somel1978/marches.git dev
cd dev
git checkout dev
```

### Step 3 — Create dev database
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE marches_dev;
GRANT ALL PRIVILEGES ON DATABASE marches_dev TO marches;
\q
```

### Step 4 — Create dev .env
```bash
cp /home/marches/space/.env /home/marches/dev/.env
```
Edit `/home/marches/dev/.env` — change these values:
```env
DATABASE_URL="postgresql://[User]:[Password]@localhost:5432/marches_dev"
# ORIGIN and BETTER_AUTH_URL are no longer used — replaced by ALLOWED_HOSTS
BETTER_AUTH_SECRET=[can reuse same secret]
TRUSTED_ORIGINS=http://10.0.0.183:5273,http://10.0.0.183:5274
SITE_URL=http://10.0.0.183:5273
FRONTEND_PORT=5273
ADMIN_PORT=5274
```

### Step 5 — Install, push schema, seed
```bash
cd /home/marches/dev
pnpm install
pnpm --filter @core/database db:push
pnpm --filter @core/database db:generate
pnpm --filter @core/database db:seed
pnpm --filter @apps/admin init-admin
```

### Step 6 — Create dev ecosystem.config.js
This file is **not committed to git** — it lives only on the server and differs per environment.

```bash
cat > /home/marches/dev/ecosystem.config.js << 'EOFINNER'
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'dev-frontend',
      script: 'apps/frontend/build/index.js',
      cwd: '/home/marches/dev',
      node_args: '--env-file=/home/marches/dev/.env',
      env: { PORT: '5273', HOST: '0.0.0.0' },
    },
    {
      name: 'dev-admin',
      script: 'apps/admin/build/index.js',
      cwd: '/home/marches/dev',
      node_args: '--env-file=/home/marches/dev/.env',
      env: { PORT: '5274', HOST: '0.0.0.0' },
    },
    {
      name: 'dev-discord',
      script: 'node_modules/.bin/tsx',
      args: '--env-file=/home/marches/dev/.env apps/discord/src/index.ts',
      cwd: '/home/marches/dev',
      interpreter: 'none',
      env: { NODE_ENV: 'development' },
    },
  ],
};
EOFINNER
```

### Step 7 — Build and start dev
```bash
cd /home/marches/dev
pnpm build
pm2 start ecosystem.config.js
pm2 save
```

Dev admin available at: `http://10.0.0.183:5274`
Dev frontend available at: `http://10.0.0.183:5273`

---

### Ongoing workflow

**Dev cycle:**
```bash
cd /home/marches/dev
git pull
# make changes, test
pnpm build && pm2 restart dev-admin dev-frontend dev-discord
```

**Deploy to production (alpha):**
```bash
# On dev branch — merge to main
git checkout main
git merge dev
git push origin main

# Deploy to prod folder
cd /home/marches/space
git pull
pnpm install
pnpm build
pm2 restart thebnb-admin thebnb-frontend thebnb-discord
```

**After schema changes (dev only):**
```bash
cd /home/marches/dev
pnpm --filter @core/database db:push
pnpm --filter @core/database db:generate
pnpm build && pm2 restart dev-admin dev-frontend dev-discord
```

**After schema changes are stable and merged to prod:**
```bash
cd /home/marches/space
git pull
pnpm --filter @core/database db:push
pnpm --filter @core/database db:generate
pnpm build
pm2 restart thebnb-admin thebnb-frontend thebnb-discord
```

---

## Part 2 — Journal / Wiki Refactor Plan

### Current problem
The `Journal` model is used for two unrelated concepts:
- **World Journals** — DM/admin written lore scoped to a specific world
- **Platform Wiki** — global knowledge base, role-gated

Both share the same table with `worldIds[]` and `roleIds[]` arrays, which is ambiguous and confusing.

---

### Target architecture

#### World Journals
- Written and managed by DMs (via DM hub) and admins (via admin world route)
- Scoped to exactly **one world** (`worldId: String` FK, not an array)
- Visible to all logged-in players with a character in that world
- No role gating — world membership is the access gate
- `isPublished` toggle for draft vs visible

#### Platform Wiki
- Written and managed by admins only
- Platform-wide, visible to all logged-in players by default
- Individual entries can be role-gated (e.g. DM-only lore, admin-only notes)
- `roleIds: String[]` — empty = all players, otherwise restricted to those roles

---

### Schema changes (`shared/database/prisma/news.prisma`)

**Rename + simplify `Journal` → `WorldJournal`:**
```prisma
model WorldJournal {
  id          String   @id @default(uuid())
  worldId     String   @map("world_id")
  world       World    @relation(fields: [worldId], references: [id], onDelete: Cascade)
  title       String
  icon        String?
  description String?
  sortOrder   Int      @default(0)  @map("sort_order")
  isPublished Boolean  @default(false) @map("is_published")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt      @map("updated_at")

  sections    WorldJournalSection[]

  @@map("world_journals")
  @@schema("news")
}
```

**New `Wiki` model (replaces global Journal concept):**
```prisma
model Wiki {
  id          String   @id @default(uuid())
  title       String
  icon        String?
  description String?
  sortOrder   Int      @default(0)  @map("sort_order")
  isPublished Boolean  @default(false) @map("is_published")
  roleIds     String[] @map("role_ids")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt      @map("updated_at")

  sections    WikiSection[]

  @@map("wikis")
  @@schema("news")
}
```

Section/Page models follow the same pattern, renamed accordingly.

Also add back-relation to `World` model in `world.prisma`:
```prisma
worldJournals WorldJournal[]
```

---

### Routes to add/change

#### Admin
| Old | New | Notes |
|---|---|---|
| `/journal` | `/wiki` | Manages platform Wiki |
| `/journal/[id]` | `/wiki/[id]` | Wiki editor |
| *(none)* | `/world/[id]/journal` | NEW — world journal management, no DMProfile required |
| *(none)* | `/world/[id]/journal/[journalId]` | NEW — world journal editor |

#### Frontend
| Old | New | Notes |
|---|---|---|
| `/journal` | `/community/wiki` | Platform wiki reader |
| `/world/[slug]/journal` | stays | World journal reader (already built) |

#### DM Hub (no route changes, update logic only)
| Route | Change |
|---|---|
| `/dm/worlds/[worldId]/journal` | Update to use `WorldJournal` model |
| `/dm/worlds/[worldId]/journal/[journalId]` | Update to use `WorldJournal` model |

---

### DB API changes (`shared/database/`)

**New files:**
- `dbapi/read/news/get-world-journals.ts` — `getWorldJournals(worldId)`, `getWorldJournalPage(id)`
- `dbapi/write/news/world-journals.ts` — `createWorldJournal`, `updateWorldJournal`, `deleteWorldJournal`, section/page CRUD
- `dbapi/read/news/get-wiki.ts` — `getWikiForUser(roleIds)`, `getWikiPage(id)`
- `dbapi/write/news/wiki.ts` — `createWiki`, `updateWiki`, `deleteWiki`, section/page CRUD

**Update `shared/database/index.ts`:**
- `news.journals.*` → `news.worldJournals.*`
- Add `news.wiki.*`

---

### Nav changes

**Admin nav (`apps/admin/src/lib/nav.ts`):**
- Rename `Journal` entry → `Wiki`
- World journal management accessed via `/world/[id]` page (add Journal button there)

**Frontend nav (`apps/frontend/src/routes/+layout.svelte`):**
- Move journal link from wherever it is → Community group
- Rename to `Wiki`

---

### Implementation order
1. Schema changes + `db:push` + `db:generate`
2. DB API — WorldJournal read/write
3. DB API — Wiki read/write
4. Update `index.ts` exports
5. Admin `/wiki` routes (rename from `/journal`)
6. Admin `/world/[id]/journal` routes (new)
7. Update DM hub journal routes to use `worldJournals`
8. Update frontend `/world/[slug]/journal` to use `worldJournals`
9. Frontend `/community/wiki` routes (rename from `/journal`)
10. Nav updates (admin + frontend)
11. `db:push` to prod after stable on dev

---

## Part 3 — ASI/Feat in Character Creation Wizard ✅ Done

### Problem (original)
When a character is created at a level that grants ASI/Feat slots (e.g. level 4 Fighter), the wizard had no way to make those choices at creation time.

### Solution implemented (Session 79)
ASI and Epic Boon slots are resolved **inline on the Classes step**, not as a separate wizard step:

- `grants.asiSlots(sys, ws)` computes slots from `systemData.classes` features (same logic as character sheet)
- `AsiSlotInline.svelte` renders each slot on the class feature timeline — stat (+2 or +1/+1) or feat picker
- Feat picks can grant nested choice pools (skills, saves, tools, etc.) via `FeatNestedPoolsInline`
- Choices submitted as parallel `asi_*` hidden inputs + `dnd5e.addCharacterFeat()` in `+page.server.ts` create action
- Background feat pick remains on the Background step

**Key files:**
- `apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/StepClasses.svelte`
- `apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/AsiSlotInline.svelte`
- `apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/grants.ts` — `asiSlots`, `syncAsiChoices`, `asiChoiceValid`

**Note:** The original plan (Part 3 below) described a conditional 7th step between Classes and Review. The implemented design keeps the 6-step ribbon and resolves ASI inline instead. See [dnd5e/wizard.md](./dnd5e/wizard.md).

---

## Part 4 — Better Auth Architecture Review (Partially Done)

### Problem
Two separate Better Auth instances (admin + frontend) sharing one DB causes cookie/session inconsistencies. Current workarounds (`useSecureCookies: false`, manual `cookies.set()`) are hacks.

### Options evaluated
- **Option A (recommended medium term)** — Single auth instance on frontend, admin validates sessions via fetch to frontend auth API
- **Option B** — Shared subdomain cookie (`.binderbrew.quest`) — Better Auth doesn't expose `domain` cleanly, fragile
- **Option C (recommended short term)** — Keep two instances, fix `useSecureCookies` properly with request-aware logic, document the two-instance architecture
- **Option D** — Replace admin auth with simpler JWT/iron-session — adds heterogeneity, not worth it

### What was implemented (session 72)
- Option C implemented and improved with Better Auth 1.5 features
- `shared/rbac/auth.ts` now exports `getBaseAuthConfig()` — plain config object, no pre-built instance
- Each app calls `betterAuth()` itself with app-specific plugins
- `baseURL: { allowedHosts, fallback: SITE_URL }` — dynamic per-request resolution (Better Auth 1.5)
- `useSecureCookies: false` — correct for HTTP-internal Cloudflare Tunnel setup
- `trustedProxyHeaders: true` — set but Cloudflare Tunnel does not forward headers through adapter-node
- Login actions use `auth.handler(new Request(...))` + forward `Set-Cookie` headers

### Remaining
- Option A (single auth instance) — still a future consideration if cross-app session sharing becomes needed

---

## Part 5 — Approval Workflow Notifications ✅ Done

### Problem
When users, characters, or transactions are submitted for approval, admins and DMs have no real-time notification. They only find out by checking the admin panel manually.

### Three approval queues that need notifications
| Queue | Who approves | Current state |
|---|---|---|
| User registration | Admin | No notification |
| Character creation | DM (world) + Admin | No notification |
| Marketplace transaction | DM (world) | No notification |

### Notification channels needed
- **Email** — for non-Discord users / async fallback
- **Discord DM** — direct message to the admin/DM user's linked Discord account — immediate, preferred

### Proposed approach

**Trigger points** (already have audit/event hooks):
- `users.approve` / pending user created → notify admins
- `characters.submitForApproval` → notify world DMs + admins
- `marketplace.createTransaction` → notify world DMs

**Delivery logic:**
1. Look up the target admin/DM users
2. If they have a linked Discord account (`discordHandle` or Discord OAuth link) → send Discord DM via bot
3. Always send email as fallback (or in addition, configurable per user in settings)

**Discord DM implementation:**
The bot already exists. Add a `sendDirectMessage(discordUserId, content)` helper to `apps/discord`. The platform needs to store the Discord user ID (not just handle) on the user record to send DMs — handle alone is not enough.

**Schema change needed:** None — `User.discordId` (snowflake) and `User.discordHandle` are already populated by the custom Discord OAuth callback at `/auth/discord/callback`. The bot can send DMs immediately using `discordId`.

**User preferences:**
Add notification preferences to user settings:
- `notifyEmail: boolean` (default true)
- `notifyDiscord: boolean` (default true if Discord linked)

### Implementation order
1. Add `sendDirectMessage(discordUserId, embed)` helper to Discord bot
2. Add notification triggers to the three approval actions in dbapi
3. Add user notification preferences to settings page (notifyEmail, notifyDiscord)
4. Wire email fallback using existing email infrastructure

> `discordId` is already stored — no schema changes needed.

---

## Part 6 — User Signup Workflow Revision ✅ Done

### Current flow (partially implemented)
1. ✅ User fills signup form → `auth.handler('/api/auth/sign-up/email')` — Better Auth owns user creation
2. ✅ Better Auth sends verification email automatically (`sendOnSignUp: true`)
3. ✅ User clicks link → `emailVerified = true`, PLAYER role assigned in `afterEmailVerification` hook
4. ✅ User auto-signed in after verification (`autoSignInAfterVerification: true`)
5. ✅ `/signup/pending` updated to "Check your email" messaging
6. ✅ Admin approval step — removed, users auto-activate on email verification
7. ✅ Admins notified when a user verifies their email (Discord DM + in-app notification)
8. ✅ User notification on approval — not needed, auto-activate

### What was fixed (session 72)
- `registerUser()` bypass removed from self-signup — Better Auth now owns account creation
- Verification email uses correct public domain via `SITE_URL` env var (`PUBLIC_` prefix is reserved by SvelteKit for client-side, was silently `undefined`)
- PLAYER role assignment moved to `afterEmailVerification` hook
- Pending page updated with correct messaging

### Proposed clean workflow

**Two separate concerns:**
1. **Email verification** — does this email address belong to this person? (automated, Better Auth handles)
2. **Admin approval** — is this person allowed to join the platform? (manual, admin decision)

**New User status field:**
```prisma
enum UserStatus {
  PENDING    // registered, email verified, awaiting admin approval
  ACTIVE     // approved, can access platform
  SUSPENDED  // banned/suspended
  @@schema("users")
}

// Add to User model
status UserStatus @default(PENDING) @map("status")
```

**New flow:**
```
User fills form
  → Better Auth signUpEmail() (email verification sent)
  → User clicks verification link in email
  → emailVerified = true, status = PENDING
  → Admin notified (email + Discord DM) — "New user awaiting approval"
  → Admin approves in /admin/users → status = ACTIVE
  → User notified (email + Discord DM if linked) — "Your account has been approved"
  → User can now log in and access platform
```

**Enforcement gate** — in `hooks.server.ts`:
```ts
if (session && user.status !== 'ACTIVE') {
  // Allow access only to /signup/pending and /signout
  // Redirect everything else to /signup/pending
}
```

**Key changes:**
- Switch signup to use `auth.api.signUpEmail()` instead of `registerUser()` — Better Auth owns account creation
- Add `status` field to User model (schema change + `db:push`)
- Move role assignment to post-verification hook (Better Auth `afterEmailVerification`)
- Add enforcement gate in `hooks.server.ts` checking `status === 'ACTIVE'`
- Admin approval action sets `status = ACTIVE` and fires notification
- `/signup/pending` page polls or uses a clear message — "Check your email to verify, then await admin approval"

### What stays the same
- `registerUser()` can be kept for admin-created users (already verified + active by default)
- Discord OAuth linking flow unchanged
- RBAC/role assignment unchanged — just triggered at a different point

### Implementation
1. ✅ Signup route — uses `auth.handler('/api/auth/sign-up/email')`
2. ✅ `afterEmailVerification` hook — assigns PLAYER role, notifies admins
3. ✅ `/signup/pending` — updated messaging ("Check your email")
4. ✅ Admin notified via Discord DM + in-app notification on verification
5. ~~Admin approval gate~~ — dropped, users auto-activate on email verification