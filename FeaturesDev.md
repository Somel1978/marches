# Marches — Architecture & Decision Log

> **Living document.** Updated as decisions are made and features are built.
> Last updated: 2026-05-21

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
│   └── discord/    @apps/discord   (persistent process — future)
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
08 quests      — Quest, QuestDM, QuestReward, QuestSignup,
                 QuestResult, QuestResultCharacter
09 marketplace — MarketplaceItem, MarketplaceTransaction
10 world       — World, Region, RegionDM, Location,
                 WikiPage, WikiRevision
```

---

## Build Order

```
✅ 0. Core platform
✅ 1. GameSystem
✅ 2. Character Hub
✅ 3. DM Hub
✅ 4. Quest System (core — item rewards pending Rewards Engine)
✅ 5. Marketplace + Character Inventory
✅ 6. World System
⬜ 7. Rewards Engine
⬜ 8. Discord
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

**Current implementation:** Option A — one logo field, same SVG everywhere.
**Known limitation:** collapsed sidebar ignores `site.logo` and shows the fallback icon.
**Future:** Option B — add `site.logoIcon` for the compact collapsed state.

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

**Schema:** `characters`

**Models:**
```
Character              — status, xp, gold, tokens, restUntil
CharacterClass         — classRef, subclassRef (named cross-schema relations)
CharacterSlotGrant     — delta grants per user
CharacterTransaction   — audit trail (XP|GOLD|TOKEN|STATUS|ITEM|REWARD)
CharacterInventory     — itemId, itemName, itemCategory, itemRarity,
                         itemSource, purchasePrice, sourceType, transactionId
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
- Quest regionId + locationId fields exist on schema (UI pending)

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

### 7. Rewards Engine ⬜

**Schema:** `rewards`

**Purpose:** Admin-defined reward pool. Connects Quest completion → Character records.
Random item rewards use the Marketplace at cost 0.

**Pending implementation.**

---

### 8. Discord Integration ⬜

**Purpose:** Notification and bot interaction layer. Platform is primary.

**Pending implementation.**

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
`marketplace`, `worlds`.

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
quests.{getAll, getById, getByDM, create, update, updateRewards, updateStatus,
        addCoDM, removeCoDM, signup, cancelSignup, confirmWaitlistPromotion,
        submitResult, approveResult, rejectResult, delete}
marketplace.items.{getAll, getById, getByName, upsert, update, delete, import}
marketplace.transactions.{getAll, buy, sell, approve, reject, cancel, reward}
worlds.{getAll, getBySlug, getById, create, update}
worlds.regions.{getBySlug, getById, create, update, assignDM, removeDM}
worlds.locations.{getBySlug, create, update}
worlds.wiki.{get, upsert}
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
```

## Frontend Routes Summary

```
/characters, /characters/new, /characters/[id]
/quests, /quests/[id]
/dm, /dm/profile, /dm/quests/new, /dm/quests/[id]
/dm-request
/marketplace, /marketplace/[id]
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

### ⬜ Pending
- [ ] Rewards Engine (titles, badges, token grants, random item from marketplace)
- [ ] Quest item reward distribution (marketplace zero-cost transactions)
- [ ] Quest region/location assignment UI
- [ ] Discord integration
- [ ] Remove debug console.log from marketplace/transactions.ts
- [ ] site.logoIcon setting for collapsed sidebar (Option B)

---

## Open Questions

None currently. Add new questions here as they arise.