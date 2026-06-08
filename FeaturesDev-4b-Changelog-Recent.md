# Marches — Changelog (Sessions 21+)

### Session 72 — Auth Refactor, Dev Environment, Signup Rebuild (2026-06-08)

**Dev environment setup**
- Cloned repo to `/home/marches/dev`, separate `marches_dev` PostgreSQL database
- Dev ports: frontend 5273, admin 5274 — set via `FRONTEND_PORT`/`ADMIN_PORT` env vars read by `vite.config.ts`
- `ecosystem.config.js` — added `dev-frontend`, `dev-admin`, `dev-discord` pm2 processes
- `svelte.config.js` — always uses `adapter-node` (no adapter-auto switching); `csrf: { checkOrigin: false }`
- Build: `pnpm build` (no `NODE_ENV=production` needed, adapter-node works for both)

**Better Auth refactor (1.4.22 → 1.5.6)**
- Upgraded `better-auth` to `~1.5.0` across all packages (`@better-auth/cli` stays at 1.4.22 — no 1.5.x release)
- `shared/rbac/auth.ts` — now exports `getBaseAuthConfig()` returning plain `BetterAuthOptions`, not a pre-built instance. Each app calls `betterAuth()` itself.
- Removed `createAuth()`, `frontendURL`, `rebaseUrl`, `rebaseChangeEmailUrl` — all dead code with `allowedHosts`
- `baseURL: { allowedHosts: [...], fallback: SITE_URL }` — Better Auth 1.5 dynamic baseURL per-request
- `advanced: { useSecureCookies: false, trustedProxyHeaders: true }` — correct for HTTP-internal Cloudflare Tunnel
- CSRF: SvelteKit `csrf: { checkOrigin: false }`, Better Auth handles via `trustedOrigins`
- Login actions — both apps use `auth.handler(new Request(...))` and forward `Set-Cookie` headers

**Signup rebuild**
- Replaced `registerUser()` bypass with `auth.handler('/api/auth/sign-up/email')` — Better Auth owns user creation
- `sendOnSignUp: true` — verification email sent automatically by Better Auth
- `autoSignInAfterVerification: true` — user auto-signed in after clicking verification link
- PLAYER role assigned in `afterEmailVerification` hook — correct place, after email confirmed
- `SITE_URL` env var — canonical public URL for verification email links. `PUBLIC_URL` doesn't work — SvelteKit reserves `PUBLIC_` prefix for client-side env. Renamed to `SITE_URL`
- Pending page updated: "Check your email" instead of "awaiting admin activation"
- Cloudflare Tunnel does not forward `x-forwarded-host` through adapter-node — `SITE_URL` is the reliable solution

**Env vars — deprecated/renamed**
- `ORIGIN` → no longer needed (SvelteKit CSRF disabled)
- `BETTER_AUTH_URL` → replaced by `ALLOWED_HOSTS`
- `FRONTEND_URL` → replaced by `SITE_URL`
- `PUBLIC_URL` → renamed to `SITE_URL` (SvelteKit prefix conflict)
- New: `ALLOWED_HOSTS`, `SITE_URL`, `FRONTEND_PORT`, `ADMIN_PORT`

### Session 71 — Production Build, Auth Cookie & Bug Fixes (2026-06-05)

**Production Build (adapter-node)**
- `apps/frontend/svelte.config.js` + `apps/admin/svelte.config.js` — switched to `@sveltejs/adapter-node`; `csrf: { checkOrigin: false }`
- `shared/rbac/cache.ts` — stripped non-ASCII bytes (unicode em-dashes caused Rolldown UTF-8 build error)
- `shared/rbac/index.ts` — removed `cache.ts` re-export (internal module only)
- `apps/admin/src/lib/assets/favicon.svg` — created (missing, caused build failure)

**pm2 / ecosystem.config.js**
- Added `thebnb-frontend`, `thebnb-admin`, `thebnb-discord` processes
- Discord: `--env-file` must be in `args` not `node_args` — tsx is the interpreter so Node never sees `node_args`
- Deploy: `pnpm build && pm2 restart all`; after `.env` changes: `pm2 delete all && pm2 start ecosystem.config.js && pm2 save`

**Better Auth cookie fix (HTTP local IP access)**
- Root cause: `useSecureCookies: baseURL.startsWith('https://')` was always `true` → browser rejects `Secure` cookies over HTTP → `Set-Cookie` silently dropped
- `shared/rbac/auth.ts` — `useSecureCookies: false` forces plain `better-auth.session_token` name always
- `apps/admin/src/routes/(auth)/login/+page.server.ts` — manual `cookies.set()` after `auth.api.signInEmail()` because `sveltekitCookies(getRequestEvent)` wasn't forwarding the cookie to the browser response

**Bug fixes**
- `apps/admin/src/routes/(app)/world/[id]/+page.server.ts` — `updateWorld` was not reading `acceptsGlobalCharacters` from form data; added to `worlds.update()` call
- `apps/admin/src/routes/(app)/news/[id]/+page.svelte` — textarea had no `oninput` handler; full enricher implementation ported from journal page
- `shared/ui/styles/components/ui.css` — added `.enricher-badge` + per-type colour variants; `user` type renders as `<span>` (no public profile page), all others as `<a>`

### Session 19 — Discord improvements (2026-05-31)

**Fixed: CHAR_APPROVED never enqueued**
- `shared/database/dbapi/write/characters/approve.ts` — `CHAR_APPROVED` and `CHAR_REJECTED` now properly queued with worldId for world routing

**New: Pending/approval-needed notifications**
- `shared/database/dbapi/write/characters/create.ts` — `CHAR_PENDING_APPROVAL` queued on character submission
- `shared/database/dbapi/write/quests/update-status.ts` — `QUEST_PENDING_APPROVAL` queued on DRAFT→PENDING_APPROVAL; `QUEST_RESULT_PENDING` queued on PENDING_RESULT→PENDING_RESULT_APPROVAL
- `shared/database/dbapi/write/marketplace/transactions.ts` — `MARKET_PENDING` queued on both buy and sell submission

**New: World routing on all notifications**
- `notifyCharacterApproved/Rejected` — now posts to world channel if char.worldId set
- `notifyItemPurchased/Sold` — worldId passed through and routed to world MARKET channel
- `notifyQuestStarted` — now includes siteUrl link (was missing)
- `notifyQuestResult` — now includes siteUrl link (was missing)
- `notifyInvite` — scheduledAt added to embed

**New: APPROVALS channel type**
- `shared/database/prisma/discord.prisma` — APPROVALS added to DiscordChannelType enum (requires db:push + db:generate)
- `apps/discord/src/notifications/dispatcher.ts` — notifyQuestPendingApproval, notifyQuestResultPending, notifyCharacterPendingApproval, notifyCharacterRejected, notifyMarketplacePending all post to APPROVALS channel
- `apps/discord/src/notifications/process-queue.ts` — handles all 5 new notification types
- `apps/admin/src/routes/(app)/discord/+page.svelte` — APPROVALS added to CHANNEL_TYPES

**Fixed: Discord server scope always global**
- `apps/admin/src/routes/(app)/discord/+page.svelte` — "Add server" from bot list now shows world scope selector; existing servers show inline scope change form


### Session 18 — Bug fixes (2026-05-31)

**Quest read-only for COMPLETED/CANCELLED**
- `apps/frontend/src/routes/(protected)/dm/quests/[id]/+page.svelte` — `isReadOnly` derived; details + rewards wrapped in `<fieldset disabled>`; save buttons hidden when isReadOnly
- `apps/frontend/src/routes/(protected)/quests/[id]/+page.svelte` — signup form gated: `data.eligible.length && data.quest.status === 'PUBLISHED'`
- `apps/frontend/src/routes/(protected)/quests/[id]/+page.server.ts` — signup action validates `quest.status === 'PUBLISHED'` server-side

**Character creation world selector**
- `apps/frontend/src/routes/(protected)/characters/new/+page.server.ts` — loads `activeWorlds` (isActive + acceptsGlobalCharacters); passes `worldId` to `characters.create()`
- `apps/frontend/src/routes/(protected)/characters/new/+page.svelte` — world selector card added before submit

**Availability tooltip mobile fix**
- `apps/frontend/src/routes/(protected)/availability/+page.svelte` — `flipped` field added to `Tip` type; tooltip renders below cell when near top of viewport

**DM Hub character features**
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/+page.svelte` — species traits, background proficiencies, class/subclass features section added using `sheet-class`/`sheet-feature` markup

**Status reason label**
- `NEW_CHARACTER` added to `statusReasonLabels` in DM Hub character list

**Quest approval routing**
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/quests/+page.server.ts` — approve/reject/approveResult/rejectResult actions for canManage DMs; quest-only DMs see "Awaiting approval" badge

**Mobile layout — tables**
- `shared/ui/styles/components/table.css` — `.table-wrap` gets `max-width:100%`; `.table-wrap > .table` gets `width:max-content; min-width:100%`
- `shared/ui/styles/components/layout.css` — `.sections > *` gets `min-width:0` to prevent grid children expanding beyond column width
- All frontend + admin svelte files with `<table>` — wrapped in `<div class="table-wrap">` (previously inline `overflow-x:auto`)

**Mobile layout — flex rows**
- All frontend + admin svelte files — `flex-wrap:wrap` added to all inline `display:flex` rows missing it

**Journal sidebar mobile**
- `shared/ui/styles/components/site.css` — sidebar uses `z-index:200`, `padding-top:4rem` for nav clearance, semi-transparent backdrop on mobile

**Broken table indentation**
- All svelte files — `<table>` tags inside `.table-wrap` re-indented to correct level after earlier regex script left them at column 0


### Session 17 (2026-05-29)

**Schema + DB**
- `shared/database/prisma/world.prisma` — `WorldDM.canManage Boolean @default(false)` added
- `shared/database/dbapi/read/world/get-worlds.ts` — `getWorldsByDMProfile` with canManage, all regions/locations; `getWorldById` includes dms
- `shared/database/dbapi/write/world/worlds.ts` — `assignDMToWorld` accepts canManage; `updateWorldDMPermission` added
- `shared/database/dbapi/read/characters/get-all.ts` — `worldId` filter added
- `shared/database/dbapi/read/quests/get-all.ts` — `worldId` filter via region ID lookup (cross-schema); enrichRegionIds rename to avoid duplicate declaration
- `shared/database/dbapi/read/audit/get-logs.ts` — `resourceId` filter added
- `shared/database/index.ts` — `worlds.getByDMProfile`, `worlds.updateDMPermission` exported

**Admin**
- `apps/admin/src/routes/(app)/world/[id]/+page.server.ts` — `assignDM` reads canManage; `updateDMPermission` action added
- `apps/admin/src/routes/(app)/world/[id]/+page.svelte` — canManage select on assign form; Access column with inline toggle in DM table

**Frontend DM Hub — new routes**
- `apps/frontend/src/routes/(protected)/dm/+layout.server.ts` — loads dmProfile + myWorlds
- `apps/frontend/src/routes/(protected)/dm/+layout.svelte` — pass-through
- `apps/frontend/src/routes/(protected)/dm/+page.server.ts` — uses parent() for profile; My Worlds section
- `apps/frontend/src/routes/(protected)/dm/+page.svelte` — My Worlds button + summary card
- `apps/frontend/src/routes/(protected)/dm/worlds/+page.server.ts` — auto-redirect if single world
- `apps/frontend/src/routes/(protected)/dm/worlds/+page.svelte` — world grid cards
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/+layout.server.ts` — canManage from assignment
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/+layout.svelte` — world header, switcher, split tabs
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/+page.server.ts` — dashboard stats
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/+page.svelte` — stat cards, region list
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/edit/+page.server.ts` — world + region management
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/edit/+page.svelte`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/regions/+page.server.ts` — redirect to /edit
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/regions/[regionId]/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/regions/[regionId]/+page.svelte`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/regions/[regionId]/locations/[locationId]/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/regions/[regionId]/locations/[locationId]/+page.svelte`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/marketplace/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/marketplace/+page.svelte`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/transactions/+page.server.ts` — canManage passed; approve/reject gated
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/transactions/+page.svelte`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/+page.server.ts` — canManage passed
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/+page.svelte` — Review vs View vs Pending badge
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/+page.svelte` — diff highlights, canManage-gated approve/reject
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/quests/+page.server.ts` — approve/reject/approveResult/rejectResult actions for canManage DMs
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/quests/+page.svelte` — approval actions for canManage; awaiting badge for quest-only
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/quests/new/+page.server.ts` — uses myWorlds from layout
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/quests/new/+page.svelte` — world pre-selected via $effect.pre
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/journal/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/journal/+page.svelte`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/journal/[journalId]/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/journal/[journalId]/+page.svelte`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/audit/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/audit/+page.svelte`


### Session 16 (2026-05-29)

**World marketplace expansion**
- `apps/frontend/src/routes/(protected)/marketplace/[id]/+page.server.ts` — resolves contexts for all character worlds in parallel; returns `contexts` map keyed by worldId + `urlWorldId`; buy action passes null worldId (DB enforces via character.worldId)
- `apps/frontend/src/routes/(protected)/marketplace/[id]/+page.svelte` — character selector drives world context; price/sell/stock update reactively per selected character; buy button shows world-resolved price
- `apps/frontend/src/routes/(protected)/marketplace/+page.server.ts` — minPrice/maxPrice null-check fix (was truthy check, broke on 0); worldId from URL param
- `apps/frontend/src/routes/(protected)/marketplace/+page.svelte` — item links preserve worldId param
- `shared/database/dbapi/read/marketplace/get-items.ts` — minPrice+maxPrice merged into single buyPrice object (was overwriting each other as separate spread keys)
- `shared/database/dbapi/write/marketplace/transactions.ts` — `checkLevelRestrictions` signature adds `effectivePrice` param; call site passes `ctx.price`; maxValue null check fixed
- `shared/database/dbapi/read/marketplace/get-transactions.ts` — `worldId` filter added (`'global'` → `WHERE world_id IS NULL`); enriched with world name via parallel query
- `apps/admin/src/routes/(app)/marketplace/transactions/+page.server.ts` — worldId filter param; loads activeWorlds for dropdown
- `apps/admin/src/routes/(app)/marketplace/transactions/+page.svelte` — World column added; world + status filters composable via `filterUrl()` helper; colspan 7→8
- `apps/admin/src/routes/(app)/world/[id]/marketplace/+page.svelte` — level restrictions tier editor added (was missing despite server already saving levelRestrictions)
- `apps/frontend/src/routes/(protected)/characters/[id]/+page.server.ts` — resolves worldSellPct + worldItemMap in parallel; attaches effectiveSellPrice to each inventory slot
- `apps/frontend/src/routes/(protected)/characters/[id]/+page.svelte` — sell button uses effectiveSellPrice; cancel sell request button (uses existing ?/cancel action); cancelSuccess feedback message

**Discord commands**
- `apps/discord/src/commands/buyitem.ts` — worlds import + full world resolution chain restored (was stripped to char.worldId only)
- `apps/discord/src/commands/sellitem.ts` — worlds import + full world resolution chain restored
- `apps/discord/src/commands/item.ts` — world option added; resolveContext called; shows world price, sell price, stock, unavailability
- `apps/discord/src/register-commands.ts` — world option registered for /item, /buyitem, /sellitem

**World DM assignment**
- `shared/database/prisma/world.prisma` — WorldDM model added; dms WorldDM[] relation added to World
- `shared/database/dbapi/write/world/worlds.ts` — `assignDMToWorld`, `removeDMFromWorld` added
- `shared/database/dbapi/read/world/get-worlds.ts` — `getWorldById` includes `dms` relation
- `shared/database/index.ts` — worlds.assignDM / worlds.removeDM exported; import updated
- `apps/admin/src/routes/(app)/world/[id]/+page.server.ts` — loads allDMs; assignDM + removeDM actions added
- `apps/admin/src/routes/(app)/world/[id]/+page.svelte` — DM assignment section at bottom: assign dropdown (filtered to unassigned), table with remove button

### Session 15 (2026-05-29)
- Quest approval — `LEVEL_UP_PENDING` was used as `CharacterStatus` value; refactored to `status: PENDING` + `statusReason: LEVEL_UP_PENDING` matching session 13 schema
- Character level display — `enrichCharacter` in `get-by-id.ts` now computes and returns `totalLevel`; DM hub server has defensive fallback from classes array
- Inventory admin removal — `removeFromInventory` now creates `MarketplaceTransaction(SELL/APPROVED)` record and restores stock to correct marketplace item; uses `character.userId` not `characterId` for `requestedBy`
- Journal — `getForUser` was receiving empty `roleIds` because `locals.permissions` is a Map not role array; added `getUserRoleIds(userId)` to users DB API; world filter was reading URL params instead of user character worldIds
- Admin character sheet — full tabbed rewrite; `updateClasses` action uses named form fields (classId/subclassId/allocatedLevel) not JSON blob
- Tabs CSS — `.tabs`, `.tab`, `.tab--active` added to `shared/ui/styles/components/site.css`

### Session 15 (2026-05-29)

**World Marketplace (per-world overrides)**
- `shared/database/prisma/marketplace.prisma` — added `WorldMarketplaceItem`, `WorldMarketplaceSetting`, `worldId` on `MarketplaceTransaction`
- `shared/database/prisma/characters.prisma` — added `worldId` on `CharacterInventory`, `LEVEL_DOWN_PENDING` on `CharacterStatusReason`
- `shared/database/dbapi/read/marketplace/resolve-context.ts` — NEW `resolveMarketplaceContext(itemId, worldId?)` — 3-layer resolution
- `shared/database/dbapi/read/marketplace/get-world-marketplace.ts` — NEW `getWorldMarketplaceItems`, `getWorldMarketplaceSetting`
- `shared/database/dbapi/write/marketplace/world-marketplace.ts` — NEW `upsertWorldMarketplaceItem`, `deleteWorldMarketplaceItem`, `upsertWorldMarketplaceSetting`
- `shared/database/dbapi/write/marketplace/transactions.ts` — full rewrite: world-aware buy/sell/approve/reject/cancel/grant
- `shared/database/dbapi/write/characters/inventory.ts` — `removeFromInventory` restores stock to world origin; `addToInventory` accepts `worldId`
- `apps/admin/src/routes/(app)/world/id/marketplace/+page.server.ts` — NEW world marketplace admin page
- `apps/admin/src/routes/(app)/world/id/marketplace/+page.svelte` — NEW: item search (not dropdown), stock overrides, settings
- `apps/frontend/src/routes/(protected)/marketplace/+page.server.ts` — world filter, applies overrides
- `apps/frontend/src/routes/(protected)/marketplace/+page.svelte` — world filter dropdown
- `apps/frontend/src/routes/(protected)/marketplace/id/+page.svelte` — `worldId` hidden input from selected character
- `apps/frontend/src/routes/(protected)/marketplace/id/+page.server.ts` — passes `worldId` to buy transaction

**Level-up / Level-down detection**
- `shared/database/dbapi/write/characters/level-check.ts` — NEW shared helper `checkLevelChange(tx, ...)` used by all XP-changing paths
- `shared/database/dbapi/write/characters/adjust-currency.ts` — uses `checkLevelChange`; detects both level-up and level-down
- `shared/database/dbapi/write/quests/delete.ts` — uses `checkLevelChange` on XP reversal when quest deleted
- `apps/admin/src/routes/(app)/rewards/grant/+page.server.ts` — `grantXp` now uses `characters.adjustCurrency` (not raw DB) so level detection fires
- `CharacterStatusReason.LEVEL_DOWN_PENDING` — new enum value; player must adjust classes down and resubmit

**Character system fixes**
- `shared/database/dbapi/write/characters/approve.ts` — deduplicates classes on approval; handles `LEVEL_DOWN_PENDING`; `LEVEL_UP/DOWN` rejections revert to ACTIVE
- `shared/database/dbapi/read/characters/get-by-id.ts` — `enrichCharacter` returns `totalLevel`
- `apps/frontend/src/routes/(protected)/characters/id/+page.svelte` — XP progression bar; level-up/down banners; `availableLevel` derived from thresholds; REJECTED characters can edit and resubmit
- `apps/frontend/src/routes/(protected)/characters/id/+page.server.ts` — `progressionThresholds` loaded from gameSystem; `resubmit` action; `submitChanges` allowed for REJECTED; REJECTED saves directly without pending flow
- `apps/frontend/src/routes/(protected)/characters/+page.svelte` — REJECTED characters visible and linkable

**Admin character sheet**
- `apps/admin/src/routes/(app)/characters/id/+page.svelte` — 5 tabs (Overview/Identity/Sheet/Inventory/Activity); pending banner resolves IDs to names; Approve+Reject in header for all PENDING; LEVEL_DOWN_PENDING info shown
- `apps/admin/src/routes/(app)/characters/id/+page.server.ts` — `updateClasses` uses named fields; `subclassId` empty string → null
- `apps/admin/src/routes/(app)/characters/+page.server.ts` — `clearRest` action
- `shared/database/dbapi/write/characters/check-rest.ts` — `clearAllExpiredRest()` exported

**World / Region / Journal**
- `apps/frontend/src/routes/(protected)/world/+page.svelte` — world cards landing (one per world)
- `apps/frontend/src/routes/(protected)/world/+page.server.ts` — loads active worlds only
- `apps/frontend/src/routes/(protected)/world/world-slug/+page.svelte` — world detail (map + region cards)
- `apps/frontend/src/routes/(protected)/world/world-slug/+page.server.ts` — loads single world by slug
- `apps/frontend/src/routes/(protected)/world/world-slug/region-slug/+page.svelte` — 🗺 World map + 🏔 Region map (lightbox) buttons
- `apps/frontend/src/routes/(protected)/journal/+page.svelte` — sidebar nav, mobile toggle
- `apps/frontend/src/routes/(protected)/journal/+page.server.ts` — uses `users.getRoleIds` for proper role filtering
- `shared/database/dbapi/read/users/get-by-id.ts` — `getUserRoleIds()` added
- `shared/database/index.ts` — `users.getRoleIds`, `characters.clearExpiredRest`, world marketplace exports

**CSS**
- `shared/ui/styles/components/site.css` — `.tabs`, `.tab`, `.tab--active`, journal layout
- `shared/ui/styles/components/world.css` — world landing, region card grid, premium card design
- `shared/ui/styles/components/availability.css` — heatmap, multi-select, bulk bar

**Discord commands**
- `apps/discord/src/commands/buyitem.ts` — operator precedence fix; world-aware price/stock/restrictions
- `apps/discord/src/commands/sellitem.ts` — operator precedence fix; world-aware sell%
- `apps/discord/src/commands/characters.ts` — uses `totalLevel` from enrichCharacter; status emojis
- `apps/discord/src/commands/charactersinv.ts` — removed `livePrice`; shows 🌍 for world-scoped items

**Bug fixes**
- `submit-result.ts` — `LEVEL_UP_PENDING` is `statusReason` not `status`
- `inventory.ts` — admin removal creates `MarketplaceTransaction` record + restores stock to world origin
- `approve.ts` — subclassId empty string → null coercion; class deduplication on approval
- Live price on inventory — only shown for PURCHASE items where price differs from paid


### Session 15 (2026-05-29)

**World marketplace (per-world stock, price overrides, level restrictions)**
- `shared/database/prisma/marketplace.prisma` — added `WorldMarketplaceItem`, `WorldMarketplaceSetting` models; `worldId` on `MarketplaceTransaction`
- `shared/database/prisma/characters.prisma` — `worldId` on `CharacterInventory`; `LEVEL_DOWN_PENDING` added to `CharacterStatusReason` enum
- `shared/database/dbapi/read/marketplace/resolve-context.ts` — NEW: `resolveMarketplaceContext(itemId, worldId?)` resolution helper
- `shared/database/dbapi/read/marketplace/get-world-marketplace.ts` — NEW: `getWorldMarketplaceItems`, `getWorldMarketplaceSetting`
- `shared/database/dbapi/write/marketplace/world-marketplace.ts` — NEW: `upsertWorldMarketplaceItem`, `deleteWorldMarketplaceItem`, `upsertWorldMarketplaceSetting`
- `shared/database/dbapi/write/marketplace/transactions.ts` — full rewrite: world-aware buy/sell/approve/reject/cancel/grant; `decrementStock`/`restoreStock` helpers
- `shared/database/dbapi/write/characters/inventory.ts` — `removeFromInventory` restores stock to origin world row; `addToInventory` accepts `worldId`
- `shared/database/index.ts` — exports `marketplace.worldItems`, `marketplace.worldSettings`, `marketplace.resolveContext`
- `apps/admin/src/routes/(app)/world/id/marketplace/+page.server.ts` — NEW: world marketplace admin page (upsertItem, removeItem, saveSettings)
- `apps/admin/src/routes/(app)/world/id/marketplace/+page.svelte` — NEW: item search (not dropdown), stock/price/availability overrides table, world settings
- `apps/admin/src/routes/(app)/world/id/+page.svelte` — 🛒 Marketplace button fixed (was orphaned outside header div)
- `apps/frontend/src/routes/(protected)/marketplace/+page.server.ts` — world filter; applies world overrides to item listing
- `apps/frontend/src/routes/(protected)/marketplace/+page.svelte` — world filter dropdown
- `apps/frontend/src/routes/(protected)/marketplace/id/+page.svelte` — `selectedCharId` bound; `worldId` hidden input passes character world to buy
- `apps/frontend/src/routes/(protected)/marketplace/id/+page.server.ts` — passes `worldId` to `createBuyTransaction`

**Character level-up/down system**
- `shared/database/dbapi/write/characters/level-check.ts` — NEW: `checkLevelChange(tx, ...)` shared helper; detects level-up (newEarned > currentAllocated) and level-down (newEarned < currentAllocated); sets PENDING + LEVEL_UP/DOWN_PENDING; fires notifications
- `shared/database/dbapi/write/characters/adjust-currency.ts` — uses `checkLevelChange` helper for XP changes
- `shared/database/dbapi/write/quests/delete.ts` — uses `checkLevelChange` on XP reversal when quest deleted
- `apps/admin/src/routes/(app)/rewards/grant/+page.server.ts` — `grantXp` now calls `characters.adjustCurrency` (was raw DB update) so level detection fires
- `apps/frontend/src/routes/(protected)/characters/id/+page.svelte` — XP progression bar; `LEVEL_DOWN_PENDING` banner + class reduction form; `availableLevel` derived from thresholds; `REJECTED` characters can edit and resubmit
- `apps/frontend/src/routes/(protected)/characters/id/+page.server.ts` — `progressionThresholds` loaded from gameSystem; `resubmit` action; `submitChanges` allows REJECTED status (saves directly); `submitLevelUp`/`submitChanges` coerce empty subclassId to null

**Admin character sheet (tabbed)**
- `apps/admin/src/routes/(app)/characters/id/+page.svelte` — 5 tabs (Overview/Identity/Sheet/Inventory/Activity); Approve+Reject in header for all PENDING statuses; pending changes banner resolves IDs to names using systemData; `LEVEL_DOWN_PENDING` note in banner
- `apps/admin/src/routes/(app)/characters/id/+page.server.ts` — clean rewrite; `updateClasses` uses named form fields; subclassId empty string → null
- `apps/admin/src/routes/(app)/characters/+page.server.ts` — `clearRest` action
- `apps/admin/src/routes/(app)/characters/+page.svelte` — ⏰ Clear rested button

**Character approval fixes**
- `shared/database/dbapi/write/characters/approve.ts` — deduplicates classes on approval (Map by classId); handles `LEVEL_DOWN_PENDING`; rejection preserves `NEW_CHARACTER` → actually just sets `ADMIN` reason, any REJECTED character can resubmit
- `shared/database/dbapi/write/quests/submit-result.ts` — `LEVEL_UP_PENDING` uses `status:PENDING` + `statusReason:LEVEL_UP_PENDING` (was invalid CharacterStatus value)

**World route restructure**
- `/world` — new landing: one card per world with `mapImageUrl` thumbnail, region count badge
- `/world/[worldSlug]` — new: world detail with map + region cards (moved from old `/world`)
- `/world/[worldSlug]/[regionSlug]` — 🗺 World map + 🏔 Region map (lightbox) buttons; back-link fixed
- `shared/ui/styles/components/world.css` — `.region-card` portrait cards, staggered animation, danger/level badges
- `shared/ui/styles/components/availability.css` — 7×48 heatmap, dot pattern, trend line, multi-select, "Select slots" button

**Journal fixes**
- `shared/database/dbapi/read/users/get-by-id.ts` — `getUserRoleIds(userId)` added
- `shared/database/index.ts` — `users.getRoleIds` exported
- `apps/frontend/src/routes/(protected)/journal/+page.server.ts` — uses `users.getRoleIds` (was reading from locals.permissions which never had role IDs); worldIds from character worldIds not URL params
- `apps/frontend/src/routes/(protected)/journal/+page.svelte` — full redesign: sidebar nav, mobile toggle, `$effect.pre` for journal auto-open

**Bug fixes**
- Character totalLevel — `enrichCharacter` now computes and returns `totalLevel`
- Inventory admin removal — `removeFromInventory` creates MarketplaceTransaction + uses `character.userId` for requestedBy
- Live price — only shown for PURCHASE items where price differs from purchase price
- Tabs CSS — `.tabs`, `.tab`, `.tab--active` added to `site.css`
- Discord commands — operator precedence fix; world-aware price/stock/restrictions; totalLevel from enrichCharacter

### Session 14 (2026-05-28)
- Availability heatmap — new `+page.svelte` with 7×48 CSS grid, dot pattern color scale (dark brown→gold),
  SVG trend line with glow, click-only tooltip (pinned until dismissed), multi-select mode with floating
  action bar + bulk modal, GLOBAL/WORLD scope, `?/setSlot`, `?/clearSlot`, `?/clearDay`, `?/setSlots` actions
- Availability CSS — new `shared/ui/styles/components/availability.css`; mobile: `min-width:600px` with
  horizontal scroll + sticky time labels; cells are `<button>` elements (a11y)
- World route restructure — old `world/+page.*` moved to `world/[worldSlug]/+page.*`;
  new `world/+page.*` shows one card per world with `mapImageUrl` thumbnail
- World CSS — new `shared/ui/styles/components/world.css`; `.region-card` 3:4 aspect-ratio portrait cards
  with full-bleed image, gradient footer, color bar, danger/level badges, staggered animation
- Region page — back-link fixed to `/world/{worldSlug}`; static banner removed; `mapOpen` lightbox state;
  🗺 World map + 🏔 Region map buttons in header

### Session 13 (2026-05-28)
- `CharacterStatusReason` enum — added `NEW_CHARACTER`, `EDIT_PENDING`
- `Character` model — added `backgroundId String?`, `pendingChanges Json?`
- `Dnd5eClassFeature` unique constraint — changed from `(classId, name)` to `(classId, name, requiredLevel)` to support same-name features at different levels (e.g. Ability Score Improvement)
- `Dnd5eSubclassFeature` — same unique constraint fix
- `Dnd5eClass.subclassAvailableAtLevel` — new field (default 3), controls when subclass selector appears
- Import server — `toInt()` strips Excel apostrophe prefix; `boolVal()` handles all Excel boolean formats; `allowUpdate` checkbox explicit opt-in to overwrite
- Game systems list — `isActive` toggle button; slug-based conditional dnd5e links (other systems show "Schema not yet built")
- Progression page — new `/game-systems/[id]/progression` route; fixed `xpRequired=0` validation (was treated as falsy)
- Character sheet — collapsible species traits, background, class features using `<details class="sheet-class">`
- Frontend character page — single "Species, Background & Classes" card handles both structural edit (ACTIVE/RESTING) and level-up allocation (LEVEL_UP_PENDING); removed duplicate Classes card
- `approve.ts` — uses `Prisma.JsonNull` for clearing `pendingChanges` field
- Frontend nav — 3-group dropdown redesign; groups centered with absolute positioning; invisible bridge prevents premature dropdown close

### Session 7 (2026-05-25)
- Admin settings page — per-field save (each setting has its own Save button, no more bulk wipe)
- Admin settings page — secret fields never pre-fill value (prevents placeholder dots being saved as token)
- Discord bot — comprehensive startup logging (token set, length, clientId match, per-guild registration)
- Admin nav — `canNavigate` + `navVis` replaced with `checkPermission(..., read).allowed` — nav items shown based on role permissions
- Discord index.ts — token/clientId trimmed, uncaughtException/unhandledRejection handlers added

### Session 5 (2026-05-25)
- Quest result item reward query — enum string comparison fixed using `{ equals: value }` filter
- Discord notification queue — `markProcessed` now always called (even on failure) to prevent infinite retry
- `notifyQuestResult` — `characterName` was undefined (stale pre-transaction data); fixed by reloading `QuestResultCharacter` after transaction
- `notifyQuestResult` — now includes tokens and item grants in embed
- Quest status transitions `PUBLISHED` and `IN_PROGRESS` now queue Discord notifications (`QUEST_PUBLISHED`, `QUEST_STARTED`)
- `notifyQuestStarted` added to dispatcher and process-queue
### Production Build Session (2026-06-05)

**Build fixes**
- `shared/rbac/cache.ts` — stripped unicode em-dashes from comments (Rolldown/Vite 8 rejects non-ASCII files with `stream did not contain valid UTF-8`)
- `shared/rbac/index.ts` — removed `cache.ts` re-export (internal module, not part of public API)
- `apps/frontend/svelte.config.js` + `apps/admin/svelte.config.js` — switched from `adapter-auto` to `adapter-node`
- `apps/frontend/package.json` + `apps/admin/package.json` — added `@sveltejs/adapter-node ^5.0.0` to devDependencies

**pm2 setup**
- `ecosystem.config.js` created at monorepo root
- Uses Node 22 native `--env-file=/home/marches/space/.env` — no dotenv package needed
- Frontend on port 5173, admin on port 5174

**Production env fix**
- `ORIGIN`, `BETTER_AUTH_URL`, `TRUSTED_ORIGINS` updated to `https://www.binderbrew.quest`
- Without this, all POST requests (signup, login, forms) returned 403 — SvelteKit CSRF protection rejects requests when `ORIGIN` doesn't match the incoming host

**Deploy workflow**
- Code changes: `git pull && pnpm install && pnpm build && pm2 restart all`
- Env changes: `pm2 delete all && pm2 start ecosystem.config.js && pm2 save`