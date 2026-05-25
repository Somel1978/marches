# Marches — Architecture & Decision Log

> **Living document.** Updated as decisions are made and features are built.
> Last updated: 2026-05-25 (session 6)

---

## Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Frontend framework | SvelteKit 2.x + Svelte 5 |
| Language | TypeScript |
| Database | PostgreSQL (multi-schema) |
| ORM | Prisma v7 (prismaSchemaFolder) |
| Auth | better-auth v1.4.22 |
| CSS | Tailwind CSS v4 |
| Runtime | Node.js v24 |
| Package manager | pnpm v11 |
| Markdown | marked (via @core/ui) |

---

## Monorepo Structure

```
marches/
├── apps/
│   ├── admin/      @apps/admin     (port 5174)
│   ├── frontend/   @apps/frontend  (port 5173)
│   └── discord/    @apps/discord   (persistent process — tsx bot)
└── shared/
    ├── database/   @core/database
    ├── rbac/       @core/rbac
    ├── email/      @core/email
    ├── ui/         @core/ui        (includes renderMarkdown)
    └── errors/     @core/errors
```

---

## Database Schema Topology

```
01 platform    — Module, Resource, Setting, NavVisibility
02 users       — User, Role, UserRole, RolePermission
03 auth        — Session, Account, Verification (better-auth owned)
04 audit       — AuditLog (append-only)
05 gamesystem  — GameSystem, Class, Subclass, Species, ProgressionThreshold
06 characters  — Character, CharacterClass, CharacterSlotGrant,
                 CharacterTransaction, CharacterInventory
07 dms         — DMProfile, DMGameSystem, RoleRequest, DMRating
08 quests      — Quest, QuestDM, QuestReward (itemRarity/Category/MaxValue),
                 QuestSignup, QuestResult, QuestResultCharacter (itemGrantedId/Name),
                 QuestItemUsage
09 marketplace — MarketplaceItem, MarketplaceTransaction
10 world       — World, Region, RegionDM, Location, WikiPage, WikiRevision
11 rewards     — Achievement, CharacterAchievement
12 stats        — QuestStat (avgPartyLevel, playerCount, completedAt)
13 availability — AvailabilitySlot (userId, date, slot 0-47, scope GLOBAL|WORLD, worldIds[])
14 news         — Announcement (type NEWS|EVENT|WARNING|STATUS, tags[], scheduledAt, expiresAt),
                  Journal, JournalSection, JournalPage
15 discord      — DiscordServer (guildId, name, scope global|worldId),
                  DiscordChannel (channelId, channelName, type ANNOUNCEMENTS|QUESTS|MARKET|CHARACTERS),
                  DiscordNotificationQueue (type, payload JSON, processed)
```

---

## Build Order

```
✅ 0. Core platform
✅ 1. GameSystem
✅ 2. Character Hub
✅ 3. DM Hub
✅ 4. Quest System (full — lifecycle, rewards, item rewards, destroyable inventory)
✅ 5. Marketplace + Character Inventory
✅ 6. World System
✅ 7. Notification System
✅ 8. Quest Completion Workflow + Rewards Engine
✅ 9. Character additions (backstory, world lock, inventory links)
✅ 10. Statistics (platform + user + per-character, live queries)
✅ 11. Availability + Quest v2
✅ 12. News / Blog / Journal
✅ 13. Discord
```

---

## Feature Plugin Pattern

Every new feature follows this pattern:

```
1. New schema + Prisma models
2. Resource entries in platform (with navVisibility)
3. Setting entries in feature seed file (not 01-platform.seed.ts)
4. Nav entry in apps/admin/src/lib/nav.ts
5. Admin routes under (app)/[feature]/
6. Frontend routes under (protected)/[feature]/
```

### Settings Grouping
```
/settings              — Core only (smtp.*, email.*, site.*)
/[feature]/settings    — Feature settings ([feature].*)
Same platform.Setting table, grouped by key prefix.
```

### NavVisibility
```
ALL  — admin-only list routes (full access required)
ANY  — own-record sections (OWN or ALL grants nav)
NONE — internal resources (never navigable)
```

---

## Feature Specifications

---

### 0. Core Platform ✅

**Schemas:** `platform`, `users`, `auth`, `audit`

**Key models:** Module, Resource, Setting, NavVisibility, User, Role,
UserRole, RolePermission, Session, Account, Verification, AuditLog

**SUPERADMIN bypass:** SUPERADMIN role skips permission checks entirely
via sentinel map `__SUPERADMIN__`. New features work automatically for
SUPERADMIN with zero seed configuration.

**Permission cache:** `getUserPermissions` caches per user. Invalidated
explicitly via `invalidateUserPermissions(userId)` after role changes.

---

### Site Branding

**Settings:** `site.name`, `site.logo`, `site.url`

`site.name` — application name shown in the sidebar, nav bar, browser tab, and footer.

`site.logo` — full SVG markup (`<svg>...</svg>`) or an image URL. Renders in the sidebar
(expanded) and frontend nav bar. When collapsed, the sidebar falls back to the hardcoded
`⚔` icon. Use `currentColor` for fill/stroke so the logo inherits `--accent-light` (`#E6A87A`).
Remove hardcoded `width`/`height` attributes — use only `viewBox`. The CSS constrains height
to 28px and preserves aspect ratio.

`site.footer` — raw HTML string for the frontend footer. Supports links and markup.
When empty, falls back to `© {year} {site.name}`. Admin app has no page footer (sidebar only).

**Current implementation:** Option B — two logo fields.
- `site.logo` — full logo for expanded sidebar and frontend nav
- `site.logoIcon` — compact icon for collapsed admin sidebar and frontend nav fallback. Accepts SVG markup, image URL, or emoji. Defaults to `⚔`.

**Recommended viewBox sizes:**
- Icon only: `viewBox="0 0 28 28"`
- Logo + wordmark: `viewBox="0 0 120 28"` to `viewBox="0 0 160 28"`

**Frontend layout server pattern:** all three site settings are loaded unconditionally
(before auth check) so they are available on the login page and all public routes:
```typescript
const settings    = await platform.getSettingsMap();
const siteName    = settings['site.name']   || '';
const siteLogo    = settings['site.logo']   || '';
const siteFooter  = settings['site.footer'] || '';
if (!locals.user) return { user: null, siteName, siteLogo, siteFooter };
```

---

### 1. GameSystem ✅

**Schema:** `gamesystem`

**Models:** GameSystem, Class, Subclass, Species, ProgressionThreshold

**Admin routes:**
```
/game-systems          — list
/game-systems/[id]     — edit system + manage classes/subclasses/species/progression inline
```

**Key decisions:**
- GameSystem is a data-only plugin — no code changes to add a system
- `isAvailable` hides entries from players without deleting
- Progression label is per-system (`label` field, e.g. "Level 1" vs "Tier 2")

---

### 2. Character Hub ✅

**World lock matrix:**
| Character | World `acceptsGlobalCharacters` | Result |
|---|---|---|
| `isGlobal=true` | `true` | ✅ allowed |
| `isGlobal=true` | `false` | ❌ blocked |
| `isGlobal=false`, `worldId=X` | quest in world X | ✅ allowed |
| `isGlobal=false`, `worldId=X` | quest in world Y | ❌ blocked |
| `isGlobal=false`, `worldId=null` | any world | ✅ allowed |



**Schema:** `characters`

**Models:**
```
Character              — status, xp, gold, tokens, restUntil,
                         description, worldId, isGlobal
CharacterClass         — classRef, subclassRef (named cross-schema relations)
CharacterSlotGrant     — delta grants per user
CharacterTransaction   — audit trail (XP|GOLD|TOKEN|STATUS|ITEM|REWARD)
CharacterInventory     — itemId, itemName, itemCategory, itemRarity,
                         itemSource, purchasePrice, canSell, sourceType,
                         sourceId, transactionId
```

**Status flow:**
```
PENDING → ACTIVE → RESTING (QUEST_REST | LEVEL_UP_PENDING)
                 → SUSPENDED | RETIRED | DECEASED | REJECTED
```

**CharacterInventory snapshot:** stores name, category, rarity, source,
and purchasePrice at acquisition time. Live price read from MarketplaceItem.

**Admin routes:**
```
/characters            — list with status filter
/characters/[id]       — approve/reject, edit, classes, currency, transactions,
                         inventory (remove with refund), delete
/characters/slots      — per-user slot management
/characters/settings   — baseSlots, startingGold, restDays
```

**Frontend routes:**
```
/characters            — own characters grid
/characters/new        — create
/characters/[id]       — view/edit, class allocation, transactions,
                         inventory (sell requests), pending purchases
```

**Settings:** `character.baseSlots`, `character.startingGold`, `character.restDays`

**Key decisions:**
- Characters are never deleted by workflow — REJECTED status is permanent for audit
- Level-up rejection reverts to ACTIVE, discarding class allocation
- Cross-schema relations require named relation fields (`classRef`/`subclassRef`)

---

### 3. DM Hub ✅

**Schema:** `dms`

**Models:** DMProfile, DMGameSystem, RoleRequest, DMRating

**Admin routes:**
```
/role-requests         — approve/reject/delete requests
/dms                   — DM profile list
/dms/[id]              — edit profile + revoke DM role
/dms/settings          — dm.ratingsEnabled toggle
```

**Frontend routes:**
```
/dm                    — DM dashboard
/dm/profile            — DM edits own profile
/dm-request            — role request flow
```

**Settings:** `dm.ratingsEnabled`

**Key decisions:**
- DM role ≠ DM profile. Nav checks `hasDMProfile` (active profile in `dms.dm_profiles`)
- Approving role request: assigns role, creates DMProfile, calls `invalidateUserPermissions`
- Revoking: DMProfile.isActive=false, removes UserRole, sets request to REJECTED
- `/dm-request` redirects to `/dm` only if active DM profile exists

---

### 4. Quest System ✅ (core — item rewards pending Rewards Engine)

**Schema:** `quests`

**Models:** Quest, QuestDM, QuestReward, QuestSignup, QuestResult, QuestResultCharacter

**Quest status flow:**
```
DRAFT → PENDING_APPROVAL → PUBLISHED → IN_PROGRESS
     → PENDING_RESULT → COMPLETED | CANCELLED
```

**Signup status:** CONFIRMED | WAITLIST | PENDING_CONFIRMATION | CANCELLED

**Admin routes:**
```
/quests                — list with status filter
/quests/[id]           — approve/reject, rewards, signups, results, delete
/quests/settings       — global min/max capacity
```

**DM routes:**
```
/dm                    — quest list
/dm/quests/new         — create (rules pre-filled from DM profile)
/dm/quests/[id]        — manage: edit, rewards, signups, results, co-DMs
```

**Player routes:**
```
/quests                — published quests list
/quests/[id]           — detail, per-player reward table, signup/cancel
```

**Settings:** `quest.minCapacity`, `quest.maxCapacity`

**Key decisions:**
- `missionXp` divided equally among confirmed players, minimum 1
- Extra rewards (GOLD/TOKEN) in QuestReward, divided equally
- ITEM rewards pending Rewards Engine integration
- Waitlist auto-promotes to PENDING_CONFIRMATION on cancellation; DM confirms
- Co-DMs have equal access to main DM
- Rewards changed after PUBLISHED → `rewardAdjusted` flag, reverts to PENDING_APPROVAL
- Quest regionId + locationId — fully wired: create, edit (DM + admin), display (World › Region · Location + DM name)

---

### 5. Marketplace ✅

**Schema:** `marketplace`

**Models:**

```
MarketplaceItem        — category, rarity, baseItem, isVariant,
                         requiresAttunement, requirements, weight,
                         source, imageUrl, link, description,
                         buyPrice, isDestroyable, isAvailable, stock
MarketplaceTransaction — type (BUY|SELL|REWARD), status (PENDING|APPROVED|REJECTED),
                         priceAtTransaction, totalPrice, requestedBy, reviewedBy
```

**Buy flow:**
```
Player requests → gold deducted immediately (reserved)
Admin approves  → item added to CharacterInventory
Admin rejects   → gold refunded
Player cancels  → gold refunded
```

**Sell flow:**
```
Player requests sell → transaction PENDING (no inventory change yet)
Admin approves       → gold credited, item removed from inventory
Admin rejects        → no change
```

**Reward flow:**
```
grantRewardItem() → creates APPROVED transaction at price 0
                 → adds directly to CharacterInventory
```

**Level restrictions:** JSON tier table in `marketplace.levelRestrictions` setting.
Admin UI is a proper table (not raw JSON). Each tier: minLevel, maxLevel,
maxRarity, maxValue, allowedCategories.

**Import:** xlsx upsert by name. Column mapping:
Category, Name, Price, Base Item, Var., Rarity, Att., Requirements,
Weight, Source, Image, Link (+ description field optional)

**Admin routes:**
```
/marketplace/items           — browse/filter/sort catalogue
/marketplace/items/[id]      — edit price, stock, availability; delete
/marketplace/transactions    — all transactions with approve/reject
/marketplace/import          — xlsx upload
/marketplace/settings        — sellPricePercent, stockEnabled, levelRestrictions
```

**Frontend routes:**
```
/marketplace           — grid browse with filters + sort
/marketplace/[id]      — item detail + buy request form
```

**Settings:** `marketplace.sellPricePercent`, `marketplace.stockEnabled`,
`marketplace.levelRestrictions`

**Key decisions:**
- `CharacterInventory` stores full item snapshot (name, category, rarity, source, purchasePrice)
- Live price always read from MarketplaceItem.buyPrice at runtime
- Admin removing inventory item refunds purchasePrice × quantity to character
- All transactions audited to AuditLog + CharacterTransaction activity feed
- `TransactionType` in marketplace schema named `MarketTransactionType` to avoid conflict with
  `TransactionType` enum in characters schema

---

### 6. World System ✅

**Schema:** `world`

**Models:**
```
World          — name, slug, description, mapImageUrl, isActive
Region         — worldId, name, slug, description, mapX, mapY,
                 color, minLevel, maxLevel, dangerRating, isActive, imageUrl
RegionDM       — regionId, dmProfileId (many-to-many)
Location       — regionId, name, slug, description, type, minLevel,
                 maxLevel, dangerRating, isActive, imageUrl
WikiPage       — entityType (WORLD|REGION|LOCATION), entityId,
                 title, content (markdown)
WikiRevision   — pageId, content, editedBy (full history)
```

**Multiple worlds:** supported from the start. Each world is independent
with its own map and regions.

**Map markers:** regions placed as dot markers on the world map image.
Admin clicks "Place marker" on a region then clicks the map to set X/Y%
position. Frontend renders glowing dots at those positions.

**Wiki:** markdown content, full revision history. Every edit saves
current content as a WikiRevision before overwriting. Rendered via
`renderMarkdown()` from `@core/ui`.

**Admin routes:**
```
/world                               — world list + create
/world/[id]                          — edit world, map, region list + add region
/world/[id]/regions/[regionId]       — edit region, assign DMs, wiki, locations
/world/[id]/regions/[regionId]/locations/[locationId] — edit location, wiki
/world/settings                      — showDangerRating, showLevelRange
```

**Frontend routes:**
```
/world                               — world list with map + region cards
/world/[worldSlug]/[regionSlug]      — region detail + wiki + locations
/world/[worldSlug]/[regionSlug]/[locationSlug] — location detail + wiki
```

**Settings:** `world.showDangerRating`, `world.showLevelRange`

**Wiki access:**
- Admin: full create/edit on all wiki pages
- DM: can create/edit wiki on regions they are assigned to + child locations
- Player: read-only

**Key decisions:**
- Single polymorphic `WikiPage` model (entityType + entityId) instead of
  separate WorldWikiPage / RegionWikiPage / LocationWikiPage tables
- `slug` field on World/Region/Location for clean frontend URLs
- `dangerRating` is an enum: Safe | Low | Moderate | High | Extreme
- `LocationType` enum: Town | City | Dungeon | Ruins | Landmark | Wilderness | Other
- DM wiki edit right = being in RegionDM for that region (covers child locations too)

---

### 7. Notification System ✅

**Schema:** `platform` (Notification model added to existing schema)

**Model:**
```
Notification — userId, type, title, message, actionUrl, isRead, createdAt
               @@index([userId, isRead])
```

**Triggers — fires on:**
| Event | Notified |
|---|---|
| Character submitted (create) | All SUPERADMIN users |
| Character approved/rejected | Player (character owner) |
| Quest submitted for approval | All SUPERADMIN users |
| Quest approved | DM |
| Quest rejected | DM |
| Quest result submitted | All SUPERADMIN users |
| Quest result approved | DM |
| Quest result rejected | DM |
| DM role request submitted | All SUPERADMIN users |
| Marketplace purchase created | All SUPERADMIN users |
| Marketplace purchase approved | Player |
| Marketplace purchase rejected | Player |

**UI:**
- Bell icon with red unread count badge in admin Header and frontend nav
- Click bell → dropdown panel shows unread notifications
- Unread items highlighted with accent left border
- Click notification → POST to `/notifications?id=X&to=URL&/read` → marks read + redirects to actionUrl
- "Mark all read" button in panel header
- Panel closes on outside click via `use:clickOutside` action

**Admin routes:** `(app)/notifications/+page.server.ts` (actions only, +page.svelte redirects to /)
**Frontend routes:** `(protected)/notifications/+page.server.ts` (actions only, +page.svelte redirects to /)

**Key decisions:**
- Notifications loaded on every page load (no polling/SSE) — acceptable for this use case
- `createNotificationsForAdmins` queries SUPERADMIN role users at runtime
- `use:clickOutside` action used instead of `svelte:window onclick` due to Svelte 5 type constraints
- Notification action URLs use `?id=X&to=URL&/read` format (SvelteKit named action with query params before action name)
- Both apps share `NotificationBell` component from `@core/ui`

---

### 8. Quest Completion Workflow ✅

**Triggered by:** Admin approving a quest result (`approveQuestResult`)

**Per participating character:**
1. XP awarded → `CharacterTransaction(XP)` + `character.totalXp` incremented
2. Gold awarded → `CharacterTransaction(GOLD)` + `character.totalGold` incremented
3. Tokens awarded → `CharacterTransaction(TOKEN)` + `character.totalTokens` incremented
4. `character.restUntil` set to `now + character.restDays` days
5. Level-up detection: compare new XP against `ProgressionThreshold` for character's game system
   - Crossed threshold → status `LEVEL_UP_PENDING` + `LEVEL_UP` notification to player
   - Not crossed → status `RESTING` + `QUEST_COMPLETE` notification to player
6. `CharacterTransaction(STATUS)` written with rest end date

**DM Rating:**
- Players can rate DM 1-5 stars + optional comment on completed quests they participated in
- Gated by `dm.ratingsEnabled` setting — hidden everywhere when disabled
- DMs cannot rate their own quests
- DM sees all ratings on their quest detail page (anonymous — no player name shown)
- DM sees aggregate ratings on their profile page
- Admin sees full ratings table on DM admin page with quest title + average
- Stored in `dms.dm_ratings` — supports future stats: filter by dmProfileId + quest main DM

**Sign-up enforcement:**
- Character level (sum of `allocatedLevel` across classes) must be within quest min/max
- Enforced in `quests.signup()` dbapi before creating the signup record

---

### 9. Rewards Engine ✅

**Schema:** `rewards`

**Models:** Achievement, CharacterAchievement

**See:** Progress Tracker — Rewards Engine section.

---

### 10. Discord Integration ✅

**Schema:** `discord`

**See:** Discord Setup Guide section.

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

### Cross-schema Prisma relations
Require explicit named relation fields on both sides. `CharacterClass` → `Class` uses
`classRef` / `@relation("ClassRef")`. Both sides must be present without `@ignore`.

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

For stats: `dms.dm_ratings` stores `dmProfileId + questId + userId`. Future queries can
join with `quests.quests WHERE dm_profile_id = dmProfileId` to filter ratings only for
quests where the DM was the main DM (not co-DM).

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
`platform`, `users`, `roles`, `gameSystems`, `characters`, `dms`, `quests`,
`marketplace`, `worlds`, `stats`, `achievements`.

---

## Database API Index

```
platform.{getSettings, getSettingsMap, updateSettings, getModules, ...}
users.{getAll, getById, getByEmail, create, update, delete}
roles.{getAll, getById, getByName, create, update, delete, assignToUser, ...}
gameSystems.{getAll, getById, create, update, delete, ...}
characters.{getAll, getById, getByUserId, getSlotInfo, getAllSlotInfo,
            getInventory, addInventory, removeInventory, getTransactions,
            create, update, updateStatus, updateClasses, approve, reject,
            delete, adjustCurrency, grantSlot, checkRest}
dms.profiles.{getAll, getById, getByUserId, create, update, revoke}
dms.roleRequests.{getAll, getPending, getLatestByUser, create, approve, reject, delete}
quests.{getAll, getById, getByDM, getResult, create, update, updateRewards,
        updateStatus, addCoDM, removeCoDM, signup, cancelSignup,
        confirmWaitlistPromotion, submitResult, approveResult, rejectResult,
        delete, itemUsage.{submit, approve, reject, getForQuest}}
achievements.{getAll, getForCharacter, create, update, grant, revoke}
marketplace.items.{getAll, getById, getByName, upsert, update, delete, import}
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
users.getByDiscordId, users.updateDiscord
worlds.{getAll, getBySlug, getById, create, update}
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
04-gamesystem.seed.ts  — D&D 5e, Pathfinder 2e, Daggerheart
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
/game-systems, /game-systems/[id]
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
/availability  — daily view, player+character detail per slot, admin delete
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
/dm-request
/marketplace, /marketplace/[id]
/stats
/world
/world/[worldSlug]/[regionSlug]
/world/[worldSlug]/[regionSlug]/[locationSlug]
```

---

## Shared UI CSS Components

```
shared/ui/styles/index.css          — imports all components
shared/ui/styles/components/
  character.css                     — character cards, portrait, avatar, lightbox,
                                       signup cards, class allocation
  nav-mobile.css                    — hamburger nav (≤640px) + SVG logo size constraints
  world-map.css                     — .world-map-marker, .world-map-label
  markdown.css                      — .markdown-body (headings, lists, code, tables)
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
- [x] GameSystem (admin CRUD: systems, classes, subclasses, species, progression)
- [x] Character Hub (full: creation, approval, classes, XP/gold/tokens, inventory, slot grants)
- [x] DM Hub (profiles, role requests, DM rating, rules field)
- [x] Quest System (core: full lifecycle, rewards breakdown, waitlist, co-DMs, result approval)
- [x] Marketplace (catalogue, import, buy/sell/reward flows, level restrictions, filters, sort)
- [x] Character Inventory (snapshots, pending purchases, sell requests, admin removal with refund)
- [x] World System (multi-world, regions with map markers, locations, wiki with markdown + revision history, DM wiki edit)
- [x] Site branding (site.name, site.logo, site.footer — platform settings, live in nav/sidebar/footer)
- [x] Quest region/location assignment UI (new + edit forms, DM + admin, world › region › location display)
- [x] Notification System (bell icon, unread count, panel, mark read, mark all read, all approval triggers)
- [x] Quest completion workflow (XP/gold/token CharacterTransactions, rest status, level-up detection, player notifications)
- [x] DM rating system (1-5 stars + comment, per quest, gated by dm.ratingsEnabled, DM self-rating blocked)
- [x] Sign-up level enforcement (character level checked against quest min/max on signup)
- [x] Completed quest list (frontend /quests?tab=completed with Rate DM button)
- [x] Quest region/location on all list pages (admin, frontend, DM dashboard)
- [x] Rewards Engine (Achievements, item grants, destroyable inventory, Admin Rewards Hub)
- [x] Quest item rewards (random item per player per ITEM reward, filter by rarity/category/maxValue)
- [x] Quest completion workflow full (PENDING_RESULT_APPROVAL status, result resubmission)
- [x] Item usage tracking (DM records during IN_PROGRESS, approved atomically with quest result)
- [x] canSell enforcement (QUEST/ADMIN granted items not sellable, UI + server-side)
- [x] Sell by unit quantity (when quantity > 1, number input shown)
- [x] Admin Rewards Hub (/rewards, /rewards/achievements, /rewards/grant with search + randomize)
- [x] Character achievements display (frontend + admin character pages)
- [x] Completed quest rewards display (per-character actual grants: XP/gold/tokens/item)
- [x] Cancel signup blocked on active/completed quests

### ⬜ Pending
- [ ] Availability — further testing needed
- [ ] News/Journal — further testing needed
- [ ] Discord — further testing needed
- [x] site.logoIcon setting for collapsed sidebar — SVG/URL/emoji, works in both admin sidebar (collapsed) and frontend nav bar
- [ ] DM dashboard quest filters (by status, date)
- [ ] Roles & permissions review — differentiated admin roles (tiered: Content Admin, Quest Admin, Player Admin)

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

## Bug Fixes & Patches

### Session 5 (2026-05-25)
- Quest result item reward query — enum string comparison fixed using `{ equals: value }` filter
- Discord notification queue — `markProcessed` now always called (even on failure) to prevent infinite retry
- `notifyQuestResult` — `characterName` was undefined (stale pre-transaction data); fixed by reloading `QuestResultCharacter` after transaction
- `notifyQuestResult` — now includes tokens and item grants in embed
- Quest status transitions `PUBLISHED` and `IN_PROGRESS` now queue Discord notifications (`QUEST_PUBLISHED`, `QUEST_STARTED`)
- `notifyQuestStarted` added to dispatcher and process-queue