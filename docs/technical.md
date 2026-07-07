# Marches — Technical Reference

> **Living document.** Updated as decisions are made and features are built.
> Last updated: 2026-07-07 (session 79)

---


## Critical Technical Decisions

### use:enhance + confirm pattern
`onclick e.preventDefault()` does not work with `use:enhance`. Always use `cancel()`:
```javascript
use:enhance={({ cancel }) => {
  if (!confirm('msg')) { cancel(); return; }
  return async ({ update }) => { await update(); };
}}
```

### Named SvelteKit actions
Never mix `default:` with other named actions. Always use explicit names.

### Permission cache invalidation
After role assignment/revocation, always call `invalidateUserPermissions(userId)`
from `@core/rbac`.

### DM role ≠ DM profile
Nav checks `hasDMProfile` (active DM profile in `dms.dm_profiles`), NOT the DM role.
Set in root `+layout.server.ts` via `dms.profiles.getByUserId()`.

### `$state` initialized from `data`
Use `$effect.pre()`, not inline initialization, for `$state` vars derived from `data`.

### `{@const}` placement
Must be immediate child of `{#if}`, `{#each}`, `{:else}`, etc. — never top-level or inside a plain `<div>`. Workaround: wrap the `<div>` in `{#if true}` to create a valid block child.

### Score audit trail pattern
`Dnd5eScoreAuditEntry` records every delta to a character's ability scores. Rules:
- Every entry has a real non-zero delta — no zero-delta entries
- Entries are immutable — never edited or deleted
- Removal/swap creates new negative-delta entries (not deletes of old entries)
- `baseScore` on `Dnd5eAbilityScore` remains the source of truth — audit entries explain how it got there
- `actorId` tracked on all entries for attribution
- Sources: `INITIAL` (first set by player), `ASI` (standard ASI feat), `FEAT` (feat-granted ASI), `MANUAL` (DM adjustment)

### Feat ASI grant — stat caching pattern
`AsiChoice` in the wizard stores `featAsiAmount?` and `featAsiFixed?` cached from the feat definition when the feat is selected. `finalScores` uses `c.stat1`/`c.amount1` (set at selection time and on dropdown change) rather than looking up `sys.feats` at render time, avoiding reactivity timing issues with `$derived.by` and `restoreState` from sessionStorage.

### D&D 5e character creation wizard

**Canonical reference:** [dnd5e/wizard.md](./dnd5e/wizard.md)

Summary: 6-step inline flow at `/characters/new/dnd5e` with `_wizard/` module (`WizardState`, `grants.ts`, step components). All choice pools resolved at source; `+page.server.ts` hidden-input contract unchanged.

### feature-names.ts dual location
`isAsiFeatureName`/`isEpicBoonFeatureName`/`normalizeFeatureName` must exist in two places because `@core/database` must not depend on `@core/ui`:
- `shared/ui/src/gamesystems/dnd5e/feature-names.ts` — for Svelte components importing from `@core/ui`
- `shared/database/dbapi/read/dnd5e/feature-names.ts` — for server files importing from `@core/database`
Keep both in sync. Never put this file in the root of `dbapi/`.

### Cross-schema Prisma relations
`CharacterClass.classId/subclassId` are plain `String` — cross-schema FK resolved at app level.
No Prisma relation defined. Class name resolved by loading from `dnd5e.classes` by ID at enrichment time.

### Prisma nullable JSON
Use `Prisma.JsonNull` (not `null`) when clearing a nullable Json field:
```typescript
import { Prisma } from '@core/database';
await db.character.update({ where: { id }, data: { pendingChanges: Prisma.JsonNull } });
```

### MarketTransactionType naming
Marketplace enum is `MarketTransactionType` (not `TransactionType`) to avoid conflict
with the same-named enum in the `characters` schema.

### Inventory admin removal refunds purchase price
`removeFromInventory()` refunds `purchasePrice × quantity` to character gold and logs
both a `CharacterTransaction(GOLD)` and an `AuditLog` entry.

### Gold reserved on buy request
Gold is deducted at request time (not approval). Refunded on rejection or player
cancellation. Item only added to inventory on approval.

### Wiki revision pattern
Every wiki edit: save current content as `WikiRevision` → overwrite `WikiPage.content`.
Never delete revisions.

### Markdown rendering
`renderMarkdown(content: string): string` exported from `@core/ui`. Uses `marked`
with GFM + line breaks. All wiki displays use `{@html renderMarkdown(content)}` with
`.markdown-body` CSS class.

### DM rating visibility
Ratings are anonymous to the DM — no player name is stored or shown. The `userId` on
`DMRating` is for uniqueness enforcement (one per user per quest) and future admin review,
not for display. The DM sees star + comment only.

### Notification action URL format
SvelteKit named actions with query params must place params **before** the action name:
```
/notifications?id=X&to=%2Fpath&/read   ✓
/notifications?/read?id=X&to=%2Fpath   ✗  (404)
```
Server reads params from `url.searchParams` in the action handler.

### click-outside pattern (Svelte 5)
`svelte:window onclick` is not typed correctly in Svelte 5. Use a `use:` action instead:
```typescript
function clickOutside(node: HTMLElement) {
    function handle(e: MouseEvent) {
        if (!node.contains(e.target as Node)) open = false;
    }
    document.addEventListener('click', handle, true);
    return { destroy() { document.removeEventListener('click', handle, true); } };
}
```

### Admin auth guard placement
The auth redirect guard lives **only** in `(app)/+layout.server.ts`, not the root layout.
The root `+layout.server.ts` loads only site settings (no redirects) so login and
unauthorized pages render without triggering infinite redirect loops.

`encodeURIComponent` is used on the `redirectTo` param to handle special characters in paths.

### Site branding component chain
`site.name`, `site.logo`, `site.footer` are loaded in root `+layout.server.ts` and flow
down via SvelteKit's parent layout merge:

```
Root layout → (app) layout → AppShell → Sidebar (title + logo in sidebar brand area)
                                      → Header  (logo in top bar)
```

`AppShell` accepts `title` and `siteLogo` props. It passes them to both `Sidebar` and
`Header`. Logo rendering priority: SVG markup (`{@html}`) → image URL (`<img>`) → text fallback.
SVG logos must use `currentColor` and no hardcoded `width`/`height` attributes — CSS
constrains to 28px height.

### Character image sizing
Character images use two separate fields:
- `portraitUrl` — full portrait (120×160px, `object-fit: cover`, `object-position: top center`)
- `avatarUrl` — circular thumbnail (64×64px, `border-radius: 50%`, clipped by `overflow: hidden` on the button wrapper)

Avatar is only rendered if its URL **differs** from the portrait URL, preventing duplicate images.

Lightbox (`.lightbox`, `.lightbox__image`) uses:
```css
max-width: min(90vw, 800px);
max-height: 90vh;
object-fit: contain;  /* never crops, always fits viewport */
```

### File path comment convention
Every file must have its repo path as the first line:
```
// shared/rbac/auth.ts
/* apps/admin/src/app.html */
```

### No `<style>` blocks in Svelte pages
All CSS lives in `shared/ui/styles/components/*.css`, imported via `index.css`.

### All DB access through named API
Never use `db.*` directly in route files. Always use `@core/database` namespaced exports:
`platform`, `users`, `roles`, `gameSystems`, `dnd5e`, `characters`, `dms`, `quests`,
`marketplace`, `worlds`, `stats`, `achievements`, `notifications`, `discord`,
`availability`, `news`.

### Excel import helpers (session 13)
- `toInt(v, fallback)` — strips leading apostrophe prefix (`'1'` → `1`), parses integer
- `boolVal(v)` — handles `TRUE/true/1/yes/true` → boolean
- `normalize(s)` — collapses multiple spaces, trims — used for parent name matching

---


## Database API Index

```
platform.{getSettings, getSettingsMap, updateSettings, getModules, ...}
users.{getAll, getById, getByEmail, create, update, delete}
users.getByDiscordId, users.updateDiscord, users.updateTheme, users.getRoleIds
roles.{getAll, getById, getByName, create, update, delete, assignToUser, ...}
gameSystems.{getAll, getActive, getById, create, update, delete}
gameSystems.progression.{create, update, delete}
dnd5e.classes.{getAll, getActive, getById, create, update, delete, updateSavingThrows, updateSkillPool}
dnd5e.classFeatures.{create, update, delete}
dnd5e.subclasses.{create, update, delete}
dnd5e.subclassFeatures.{create, update, delete}
dnd5e.species.{getAll, getActive, create, update, delete}
dnd5e.speciesTraits.{create, update, delete}
dnd5e.backgrounds.{getAll, getActive, create, update, delete}
dnd5e.getSystemData(gameSystemId)     — cached 5 min; call invalidateSystemCache after imports
dnd5e.invalidateSystemCache(gameSystemId?)
dnd5e.getScoreAudit(characterId)
dnd5e.getScoreAuditForStat(characterId, stat)
dnd5e.addScoreAuditEntry(entry)
dnd5e.addScoreAuditEntries(entries[])
dnd5e.manualScoreAdjustment(characterId, stat, delta, note, actorId?)
characters.{getAll, getById, getByUserId, getSlotInfo, getAllSlotInfo,
            getInventory, addInventory, removeInventory, getTransactions,
            create, update, updateFreeFields, submitChanges,
            updateStatus, updateClasses, approve, reject,
            delete, adjustCurrency, grantSlot, checkRest, clearExpiredRest}
dms.profiles.{getAll, getById, getByUserId, create, update, revoke}
dms.roleRequests.{getAll, getPending, getLatestByUser, create, approve, reject, delete}
quests.{getAll, getById, getByDM, getResult, create, update, updateRewards,
        updateStatus, addCoDM, removeCoDM, signup, cancelSignup,
        confirmWaitlistPromotion, expireStalePromotions, submitResult, approveResult, rejectResult,
        delete, itemUsage.{submit, approve, reject, getForQuest}}
achievements.{getAll, getForCharacter, create, update, grant, revoke}
marketplace.items.{getAll, getById, getByName, upsert, update, delete, import}
marketplace.worldItems.{getAll, upsert, delete}
marketplace.worldSettings.{get, upsert}
marketplace.resolveContext(itemId, worldId?)
marketplace.transactions.{getAll, buy, sell, approve, reject, cancel, reward}
stats.{getPlatform, getPublic, getUser}
availability.{setSlots, clearDay, clearSlot, adminDelete, getForUser, getForQuest, getAll}
news.announcements.{getAll, getPublic, getById, create, update, delete}
news.journals.{getAll, getForUser, getPage, create, update, delete,
               createSection, updateSection, deleteSection,
               createPage, updatePage, deletePage}
news.enrichers.{resolve, search}
discord.servers.{getAll, getByScope, upsert, delete}
discord.channels.{getForType, upsert, delete}
discord.notifications.{getPending, markProcessed}
worlds.{getAll, getBySlug, getById, create, update, assignDM, updateDMPermission, removeDM, getByDMProfile}
worlds.regions.{getBySlug, getById, create, update, assignDM, removeDM}
worlds.locations.{getBySlug, create, update}
worlds.wiki.{get, upsert}
notifications.{getUnread, getAll, create, createForAdmins, markRead, markAllRead}
```

---


## Seed File Order

```
01-platform.seed.ts    — modules, resources, core settings
02-roles.seed.ts       — SUPERADMIN, DM, PLAYER + permissions
03-users.seed.ts       — default admin user
04-gamesystem.seed.ts  — GameSystem records (slug required)
04b-dnd5e.seed.ts      — empty (data loaded via Admin Import)
05-dms.seed.ts         — DM resources + dm.ratingsEnabled
06-quests.seed.ts      — quest resources + quest.minCapacity/maxCapacity
07-marketplace.seed.ts — marketplace resources + settings
08-world.seed.ts       — world resources + world.showDangerRating/showLevelRange
```

Feature settings always go in the feature seed file, never in 01-platform.

---


## Admin Routes Summary

```
/users, /users/[id]
/roles, /roles/[id]
/game-systems, /game-systems/new
/game-systems/[id]/classes, /game-systems/[id]/classes/[classId]
/game-systems/[id]/species
/game-systems/[id]/backgrounds
/game-systems/[id]/progression
/game-systems/[id]/import
/characters, /characters/[id], /characters/slots, /characters/settings
/role-requests
/dms, /dms/[id], /dms/settings
/quests, /quests/[id], /quests/settings
/marketplace/items, /marketplace/items/[id]
/marketplace/transactions
/marketplace/import
/marketplace/settings
/world, /world/[id]
/world/[id]/regions/[regionId]
/world/[id]/regions/[regionId]/locations/[locationId]
/world/settings
/rewards
/rewards/achievements
/rewards/grant
(dashboard enhanced with platform stats)
/availability  — week dashboard: read-only heatmap, player timeline blocks, add/edit modal (setRange actions)
/news          — list + create announcements
/news/[id]     — edit with markdown editor + enricher help panel
/journal       — list journals
/journal/[id]  — manage structure (sections/pages) + markdown editor with [[type:id]] enricher popup
/discord       — server management (auto-fetch from bot + manual fallback), channel mapping per type
/api/discord   — bot guild list + channel list endpoints
```


## Frontend Routes Summary

```
/characters, /characters/new, /characters/[id]
/quests, /quests/[id]
/dm, /dm/profile, /dm/quests/new, /dm/quests/[id]
  — /dm and /dm/worlds/[worldId] (+ /quests) embed DmAvailabilityDashboard (read-only week view)
/dm-request
/marketplace, /marketplace/[id]
/stats
/world                                    — world cards landing (one per world, mapImageUrl)
/world/[worldSlug]                        — world detail (map with region markers + region cards)
/world/[worldSlug]/[regionSlug]           — region detail (wiki, locations, lightbox map)
/world/[worldSlug]/[regionSlug]/[locationSlug]
/journal
/news
/availability
```

---


## Shared UI CSS Components

**CSS entry point:** `shared/ui/styles/index.css` — imported in both app `+layout.svelte` files via JS import. Do NOT also import tailwind or its plugins separately in the app — this causes double-processing and breaks `.btn` styles.

`@tailwindcss/forms` uses `strategy: 'class'` — does NOT auto-style `button`/`input` elements. All `.btn` and `.input` styles come from `@core/ui`.

`a { color }` styles live inside `@layer base` so `.btn-primary { color: #fff }` in `@layer components` correctly overrides on `<a class="btn">` elements.

```
shared/ui/styles/index.css          — imports tailwindcss + all components
shared/ui/styles/tokens.css         — design tokens per theme (frontend/admin/frontend-*)
shared/ui/styles/base.css           — body, a, * resets inside @layer base
shared/ui/styles/components/
  ui.css            — .btn, .badge, .card, .table, .pagination, .input, .field
                      New: .btn-xs, .badge-info, .badge-rarity-* (6 fixed D&D rarity colours)
  layout.css        — .page, .sections, .field, .form-actions, .input, .input-toggle
  site.css          — nav-bar, nav-group dropdowns, site layout, .tabs, .tab, .tab--active
  nav-mobile.css    — hamburger nav (≤640px) + .nav-mobile__group-title
  character.css     — character cards, portrait, avatar, lightbox, class allocation,
                      sheet-class, sheet-feature, sheet-trait
  world.css         — .worlds-page, .worlds-section, .region-grid, .region-card, ...
  availability.css  — .avail-dash__* (player + DM dashboard), .avail__scope, .avail__modal (add/edit)
  world-map.css     — .world-map-marker, .world-map-label
  markdown.css      — .markdown-body (headings, lists, code, tables)
```

### Frontend-only utilities (`apps/frontend/src/lib/`)
```
themes.ts              — getAvailableThemes(), validateTheme() — parses tokens.css via Vite ?raw import
rarity.ts              — rarityBadge(rarity), rarityLabel(rarity) — D&D 5e rarity → badge class mapping
availability/utils.ts  — slot/calendar helpers, mergeSlotsToBlocks, weekBounds, blockStyle
dm/build-availability-dashboard.ts — server-side heatmap + playerRows builder for DM views
dm/DmAvailabilityDashboard.svelte  — read-only week dashboard (heatmap + timelines)
```

### Shared UI Components
```
shared/ui/components/layout/
  AppShell.svelte   — shell with sidebar + header. Props: title, siteLogo, nav, footer,
                      actions, user. Computes displayTitle (empty when logo set).
  Sidebar.svelte    — collapsible nav sidebar. Props: siteName, siteLogo, nav, footer.
                      Collapsed state shows fallback icon only.
  Header.svelte     — top bar. Props: title, logoHtml, logoUrl, logoAlt, actions, user.
  NavBar.svelte     — used in frontend layout (not admin)
  Footer.svelte     — not used; frontend footer is inline in +layout.svelte
```

---


## Progress Tracker

### ✅ Completed
- [x] Core platform (RBAC, users, audit, settings, email)
- [x] GameSystem (refactored: gamesystem + dnd5e schemas, 7-tab Excel import with upsert)
- [x] Character Hub (full: creation with species/background/classes, structural edit workflow,
      multiclassing, character sheet with collapsible traits/features)
- [x] DM Hub (profiles, role requests, DM rating, rules field)
- [x] Quest System (full lifecycle, rewards breakdown, waitlist, co-DMs, result approval)
- [x] Marketplace (catalogue, import, buy/sell/reward flows, level restrictions, filters, sort)
- [x] Character Inventory (snapshots, pending purchases, sell requests, admin removal with refund)
- [x] World System (multi-world, regions with map markers, locations, wiki + revision history)
- [x] Site branding (site.name, site.logo, site.logoIcon, site.footer)
- [x] Quest region/location assignment UI
- [x] Notification System (bell icon, unread count, panel, mark read, mark all read)
- [x] Quest completion workflow (XP/gold/token transactions, rest, level-up detection)
- [x] DM rating system (1-5 stars, anonymous, gated by setting)
- [x] Sign-up level enforcement
- [x] Completed quest list with Rate DM button
- [x] Rewards Engine (Achievements, item grants, destroyable inventory, Admin Rewards Hub)
- [x] Quest item rewards (random item per player per ITEM reward)
- [x] Item usage tracking (DM records during IN_PROGRESS)
- [x] canSell enforcement
- [x] Sell by unit quantity
- [x] Character achievements display
- [x] Completed quest rewards display
- [x] Cancel signup blocked on active/completed quests
- [x] Discord integration (slash commands, notifications, guild management)
- [x] Admin nav driven by can_read permission check
- [x] site.logoIcon setting for collapsed sidebar
- [x] Frontend navigation redesign (3-group dropdown: Adventure, Campaign, Community)

### ⬜ Pending
- [ ] DM dashboard quest filters (UI cleanup phase)
- [ ] General UI cleanup / polish pass

---


## Open Questions

None currently. Add new questions here as they arise.

---


## Discord Setup Guide

### 1. Create Discord Application
1. Go to https://discord.com/developers/applications
2. Click **New Application** → name it (e.g. "Marches")
3. Copy **Application ID** → this is `discord.clientId`

### 2. Create the Bot
1. Go to **Bot** tab → **Add Bot** → confirm
2. Click **Reset Token** → copy → this is `discord.botToken`
3. Enable **Server Members Intent** under Privileged Gateway Intents

### 3. Set OAuth2 Redirect
1. Go to **OAuth2** tab → **Redirects**
2. Add: `https://yourdomain.com/auth/discord/callback`
3. Copy **Client Secret** → this is `discord.clientSecret`

### 4. Configure Platform Settings (Admin → Settings)
| Key | Value |
|---|---|
| `discord.botToken` | Bot token from step 2 |
| `discord.clientId` | Application ID from step 1 |
| `discord.clientSecret` | Client secret from step 3 |
| `discord.callbackUrl` | `https://yourdomain.com/auth/discord/callback` |
| `discord.responseMode` | `ephemeral` (only visible to user) or `public` |

### 5. Add Bot to Discord Servers
1. Admin → **Discord** page → click **Invite bot to a server**
2. Authorise for each server

### 6. Configure Servers & Channels (Admin → Discord)
1. Click **↻ Fetch servers from bot** — all servers the bot is in appear
2. Click **Add** next to each server (set scope: Global or World-specific)
3. Click **↻ Fetch channels** per server
4. Map channels to types: ANNOUNCEMENTS, QUESTS, MARKET, CHARACTERS

### 7. Start Discord Bot
```bash
pnpm --filter @apps/discord dev
```

### Slash Commands (auto-registered on startup per guild)
| Command | Channel | Description |
|---|---|---|
| `/quests` | QUESTS | List published quests with detail buttons |
| `/quest [name]` | QUESTS | Show quest details |
| `/signup [quest] [character]` | QUESTS | Sign up character for quest |
| `/cancelsignup [quest] [character]` | QUESTS | Cancel signup |
| `/characters` | CHARACTERS | List your characters |
| `/charactersinv [character]` | CHARACTERS | List character inventory |
| `/item [name]` | MARKET | Show item details and price |
| `/buyitem [character] [item] [quantity?]` | MARKET | Buy item (pending approval) |
| `/sellitem [character] [item] [quantity?]` | MARKET | Sell item (pending approval) |

### Notification Events
| Event | Channel |
|---|---|
| Quest published | QUESTS |
| Quest started (IN_PROGRESS) | QUESTS |
| Quest result approved | QUESTS |
| Announcement published | ANNOUNCEMENTS |
| Item purchase approved | MARKET |
| Item sale approved | MARKET |
| Character approved | CHARACTERS |
| Quest invite | DM to player |

### User Linking
Players connect Discord via **Profile → Connect Discord** → OAuth flow stores `discordId` on their account. Required for buy/sell/signup commands.

---

# Marches — Bug Fixes & Session Changelog

---

## Production Deployment

### Stack
- **Adapter:** `@sveltejs/adapter-node` (both apps)
- **Process manager:** pm2
- **Env loading:** Node 22 native `--env-file`
- **Domain:** `https://www.binderbrew.quest`

### Files
- `ecosystem.config.js` — pm2 config at monorepo root
- `shared/rbac/cache.ts` — must be ASCII-only (no unicode chars, Rolldown rejects non-UTF-8)

### ecosystem.config.js
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

> **Discord note:** `node_args: '--env-file=...'` is ignored for the discord app because `tsx` is the interpreter (not node directly). The `--env-file` flag must be passed in `args` so tsx receives it.

### Required .env values (single file, all environments)
One `.env` file at the monorepo root, shared by all apps and loaded via `--env-file`. Dev and prod differ only in the values.

```dotenv
# ── Database ────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# ── Better Auth ─────────────────────────────────────────
BETTER_AUTH_SECRET=<secret>

# Comma-separated hostnames (no protocol/port) Better Auth 1.5 accepts.
# Used for dynamic baseURL resolution per-request via allowedHosts.
# Include all IPs and domains users may access the apps from.
ALLOWED_HOSTS=10.0.0.183:5273,10.0.0.183:5274,www.binderbrew.quest,admin.binderbrew.quest

# Comma-separated full origins for Better Auth CSRF trusted origins validation.
TRUSTED_ORIGINS=http://10.0.0.183:5273,http://10.0.0.183:5274,https://www.binderbrew.quest,https://admin.binderbrew.quest

# Canonical public URL used as fallback for email verification links.
# Must NOT start with PUBLIC_ — SvelteKit reserves that prefix for client-side env vars.
# In dev: URL of the dev tunnel. In prod: primary public domain.
SITE_URL=https://www.binderbrew.quest

# ── Ports (used by vite.config.ts for dev server) ──────
FRONTEND_PORT=5173
ADMIN_PORT=5174

# ── Admin account seeding ───────────────────────────────
SEED_ADMIN_PASSWORD=<password>

# ── GitHub OAuth (optional) ─────────────────────────────
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

**Dev `.env` differences:**
```dotenv
ALLOWED_HOSTS=10.0.0.183:5273,10.0.0.183:5274,dev.binderbrew.quest,dev.admin.binderbrew.quest
TRUSTED_ORIGINS=http://10.0.0.183:5273,http://10.0.0.183:5274
SITE_URL=https://dev.binderbrew.quest
FRONTEND_PORT=5273
ADMIN_PORT=5274
```

**Deprecated/removed env vars:**
- `ORIGIN` — was used for SvelteKit CSRF, now disabled (`csrf: { checkOrigin: false }`). Better Auth handles CSRF via `TRUSTED_ORIGINS`.
- `BETTER_AUTH_URL` — replaced by `ALLOWED_HOSTS` dynamic baseURL (Better Auth 1.5+).
- `FRONTEND_URL` — replaced by `SITE_URL`. `frontendURL` removed from auth config entirely.
- `PUBLIC_URL` — SvelteKit reserves `PUBLIC_` prefix for client-side env vars, so it was silently `undefined` server-side. Renamed to `SITE_URL`.

### Deploy workflow
```bash
# Standard redeploy after code changes
git pull
pnpm install
pnpm build
pm2 restart all

# After .env changes (must reload env)
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

### First-time setup
```bash
npm install -g pm2
pnpm install
pnpm build
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # copy and run the printed command for reboot persistence
```

### Build notes
- `shared/rbac/cache.ts` must contain only ASCII characters — Rolldown (Vite 8) rejects files with unicode chars (em-dashes etc) with `stream did not contain valid UTF-8`
- `INEFFECTIVE_DYNAMIC_IMPORT` warnings are harmless — bundling efficiency notices only

### Auth architecture (Better Auth 1.5)

**Shared config factory** — `shared/rbac/auth.ts` exports `getBaseAuthConfig()` returning a plain `BetterAuthOptions` object. Each app calls `betterAuth({ ...getBaseAuthConfig(...), })` itself. The shared package never instantiates Better Auth — each app owns its instance.

**Dynamic baseURL** — `baseURL: { allowedHosts: [...], fallback: SITE_URL }` (Better Auth 1.5+). Better Auth resolves the baseURL per-request from the `host` header. `fallback` is used when the host cannot be determined (e.g. email client tracking redirects).

**Cookie behaviour** — `useSecureCookies: false`. Traffic is HTTP internally (Cloudflare Tunnel handles HTTPS externally). This is correct — not a workaround. Cookies use plain `better-auth.session_token` name without `__Secure-` prefix.

**CSRF** — SvelteKit's built-in CSRF check is disabled (`csrf: { checkOrigin: false }`). Better Auth handles CSRF validation via `trustedOrigins`.

**Login actions** — both apps use `auth.handler(new Request('/api/auth/sign-in/email', ...))` and forward the `Set-Cookie` headers from Better Auth's response to the browser. This is more reliable than `auth.api.signInEmail()` + manual `cookies.set()`.

**Signup** — uses `auth.handler(new Request('/api/auth/sign-up/email', ...))` with `publicOrigin` derived from `SITE_URL` env var (not `url.origin` which is always the internal IP behind Cloudflare Tunnel). Verification email URL uses the correct public domain.

**Email verification** — `sendOnSignUp: true`, `autoSignInAfterVerification: true`. PLAYER role assigned in `afterEmailVerification` hook — the correct place after the user confirms their email is real.

**Cloudflare Tunnel note** — `x-forwarded-host` and `x-forwarded-proto` are NOT forwarded by Cloudflare Tunnel through adapter-node. The `host` header is always the internal IP. Solution: read `SITE_URL` from env for all public-facing URL construction. `trustedProxyHeaders: true` is set but not relied upon.
- Annotation comment warnings from `database.js` are harmless — third-party dependency issue