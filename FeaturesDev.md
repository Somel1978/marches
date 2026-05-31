# Marches — Architecture & Decision Log

> **Living document.** Updated as decisions are made and features are built.
> Last updated: 2026-05-31 (session 19)

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
01 platform    — Module, Resource, Setting, NavVisibility, Notification
02 users       — User, Role, UserRole, RolePermission
03 auth        — Session, Account, Verification (better-auth owned)
04 audit       — AuditLog (append-only)
05 gamesystem  — GameSystem, ProgressionThreshold
06 dnd5e       — Dnd5eClass, Dnd5eClassFeature, Dnd5eSubclass, Dnd5eSubclassFeature,
                 Dnd5eSpecies, Dnd5eSpeciesTrait, Dnd5eBackground
07 characters  — Character, CharacterClass, CharacterSlotGrant,
                 CharacterTransaction, CharacterInventory
08 dms         — DMProfile, DMGameSystem, RoleRequest, DMRating
09 quests      — Quest, QuestDM, QuestReward (itemRarity/Category/MaxValue),
                 QuestSignup, QuestResult, QuestResultCharacter (itemGrantedId/Name),
                 QuestItemUsage
10 marketplace — MarketplaceItem, MarketplaceTransaction
11 world       — World, WorldDM (canManage Boolean), Region, RegionDM, Location, WikiPage, WikiRevision
12 rewards     — Achievement, CharacterAchievement
13 stats       — QuestStat (avgPartyLevel, playerCount, completedAt)
14 availability — AvailabilitySlot (userId, date, slot 0-47, scope GLOBAL|WORLD, worldIds[])
15 news        — Announcement (type NEWS|EVENT|WARNING|STATUS, tags[], scheduledAt, expiresAt),
                 Journal, JournalSection, JournalPage
16 discord     — DiscordServer (guildId, name, scope global|worldId),
                 DiscordChannel (channelId, channelName, type ANNOUNCEMENTS|QUESTS|MARKET|CHARACTERS),
                 DiscordNotificationQueue (type, payload JSON, processed)
```

---

## Build Order

```
✅ 0.  Core platform
✅ 1.  GameSystem
✅ 2.  Character Hub
✅ 3.  DM Hub
✅ 4.  Quest System (full — lifecycle, rewards, item rewards, destroyable inventory)
✅ 5.  Marketplace + Character Inventory
✅ 6.  World System
✅ 7.  Notification System
✅ 8.  Quest Completion Workflow + Rewards Engine
✅ 9.  Character additions (backstory, world lock, inventory links)
✅ 10. Statistics (platform + user + per-character, live queries)
✅ 11. Availability + Quest v2
✅ 12. News / Blog / Journal
✅ 13. Discord integration
✅ 14. GameSystem refactor (dnd5e schema)
✅ 15. Character system expansion
✅ 16. Frontend navigation redesign
✅ 17. Availability heatmap redesign (frontend)
✅ 18. Admin character sheet layout (tabbed)
✅ 19. World landing page card layout
✅ 20. World marketplace (per-world stock, price overrides, level restrictions) — schema + workflows + admin pages + frontend filter
✅ 21. World marketplace expansion — per-world level restrictions UI, world-lock enforcement, buy/sell world context, Discord world commands, transaction world filter
✅ 22. World DM assignment — WorldDM model, assign/remove DMs at world level (same pattern as RegionDM)
✅ 23. DM Hub world management — full world/region/location/wiki/marketplace/transactions/characters/quests/journal/audit per world, canManage flag, quest approval routing
⬜ 24. DM dashboard quest filters (UI cleanup phase)
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

**Settings:** `site.name`, `site.logo`, `site.logoIcon`, `site.url`, `site.footer`

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

### 1. GameSystem ✅ (refactored session 13)

**Schemas:** `gamesystem`, `dnd5e`

**gamesystem models:** GameSystem, ProgressionThreshold

**dnd5e models:**
```
Dnd5eClass             — gameSystemId, name, hitDice, canCastSpells, primaryAbilities,
                         equipmentDescription, subclassAvailableAtLevel (default 3),
                         isAvailable, sortOrder, source, link
Dnd5eClassFeature      — classId, name, requiredLevel, description, url
                         @@unique([classId, name, requiredLevel])
Dnd5eSubclass          — classId, name, description, source, link, isAvailable, sortOrder
                         @@unique([classId, name])
Dnd5eSubclassFeature   — subclassId, name, requiredLevel, description, url
                         @@unique([subclassId, name, requiredLevel])
Dnd5eSpecies           — gameSystemId, name, description, source, link,
                         isSubrace, isLegacy, isAvailable, sortOrder
Dnd5eSpeciesTrait      — speciesId, name, description, requiredLevel
Dnd5eBackground        — gameSystemId, name, shortDescription, featureName,
                         skillProficiencies, toolProficiencies, languages,
                         url, isAvailable, sortOrder
```

**Key decisions:**
- Each game system gets its own schema (`dnd5e`, `pathfinder`, etc.) — fully isolated
- `ProgressionThreshold` stays in `gamesystem` — agnostic, works across all systems
- `CharacterClass.classId/subclassId` = plain String, cross-schema FK resolved at app level
- `subclassAvailableAtLevel` on `Dnd5eClass` (default 3) — controls when subclass selector appears
- Other game systems show "Schema not yet implemented" until their schema is built
- `isActive` toggle on game systems list page — controls availability to players
- GameSystem is a data-only plugin — no code changes needed to add a new system
- Progression label is per-system (`label` field, e.g. "Level 1" vs "Tier 2")

**Admin routes:**
```
/game-systems                               — list + isActive toggle
/game-systems/new                           — create (name, slug, description)
/game-systems/[id]/classes                  — list + create
/game-systems/[id]/classes/[classId]        — edit class + features + subclasses inline
/game-systems/[id]/species                  — list + inline traits
/game-systems/[id]/backgrounds              — list
/game-systems/[id]/progression              — manage ProgressionThresholds (XP per level)
/game-systems/[id]/import                   — 7-tab Excel import
```

**Import system (7 tabs, flat Excel templates):**
```
Classes           — name, hitDice, canCastSpells, subclassAvailableAtLevel,
                    primaryAbilities, equipmentDescription, description,
                    source, link, sortOrder
Class Features    — className, name, requiredLevel, description, url
Subclasses        — className, name, description, source, link, sortOrder
Subclass Features — className, subclassName, name, requiredLevel, description, url
Species           — name, description, source, link, isSubrace, isLegacy, sortOrder
Species Traits    — speciesName, name, description, requiredLevel
Backgrounds       — name, shortDescription, featureName, skillProficiencies,
                    toolProficiencies, languages, url, sortOrder
```
- Parent lookup: exact name match with whitespace normalization
- Feature uniqueness: `name + requiredLevel` (same-name features at different levels = distinct)
- `allowUpdate` checkbox: explicit opt-in to overwrite existing records (unchecked = skip duplicates)
- `toInt(v, fallback)` helper strips Excel apostrophe prefix (`'1'` → `1`)
- `boolVal(v)` handles `TRUE/true/1/yes` → boolean
- `normalize(s)` collapses multiple spaces, trims
- Friendly unique constraint error messages

**DB API:**
```
dnd5e.classes.{getAll, getActive, getById, create, update, delete}
dnd5e.classFeatures.{create, update, delete}
dnd5e.subclasses.{create, update, delete}
dnd5e.subclassFeatures.{create, update, delete}
dnd5e.species.{getAll, getActive, create, update, delete}
dnd5e.speciesTraits.{create, update, delete}
dnd5e.backgrounds.{getAll, getActive, create, update, delete}
dnd5e.getSystemData(gameSystemId) — returns {classes, species, backgrounds} for a system
gameSystems.{getAll, getActive, getById, create, update, delete}
gameSystems.progression.{create, update, delete}
```

---

### 2. Character Hub ✅ (expanded session 13)

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
Character              — status, statusReason, speciesId, backgroundId,
                         pendingChanges Json?, xp, gold, tokens, restUntil,
                         description, worldId, isGlobal
CharacterClass         — classId (String), subclassId (String?), allocatedLevel
                         (plain strings — cross-schema FK resolved at app level)
CharacterSlotGrant     — delta grants per user
CharacterTransaction   — audit trail (XP|GOLD|TOKEN|STATUS|ITEM|REWARD)
CharacterInventory     — itemId, itemName, itemCategory, itemRarity,
                         itemSource, purchasePrice, canSell, sourceType,
                         sourceId, transactionId
```

**CharacterStatusReason enum:**
```
NEW_CHARACTER    — new character awaiting first approval
EDIT_PENDING     — player submitted structural changes, awaiting approval
LEVEL_UP_PENDING — unallocated levels after XP threshold crossed
QUEST_REST       — recovering after quest, clears after restDays
ADMIN            — manually set by admin
SYSTEM           — set by platform (e.g. quest death)
```

**Status flow:**
```
PENDING (NEW_CHARACTER)   → ACTIVE (approved) | REJECTED
ACTIVE                    → PENDING (EDIT_PENDING)     → ACTIVE (approved) | ACTIVE (rejected, reverts)
                          → PENDING (LEVEL_UP_PENDING) → ACTIVE (approved) | ACTIVE (rejected, reverts)
                          → RESTING (QUEST_REST)       → ACTIVE (rest cleared)
                          → SUSPENDED | RETIRED | DECEASED
```

**Edit workflow — two paths:**
- **Free fields** (name, avatarUrl, portraitUrl, description) → `updateFreeFields` → saves immediately, no approval needed
- **Structural fields** (species, background, classes/levels/subclasses) → `submitStructuralChanges` → saves snapshot to `pendingChanges Json` + sets status PENDING/EDIT_PENDING → admin approval required
- **Approval** → `approveCharacter` reads `pendingChanges`, applies to actual fields, clears `pendingChanges`, sets ACTIVE
- **Rejection** → clears `pendingChanges`, reverts to ACTIVE
- **Level-up** → same path as structural edit via `submitChanges` with classes only → LEVEL_UP_PENDING

**Character sheet enrichment (`getCharacterById`):**
- Loads `speciesRef` + all traits from `dnd5e.species`
- Loads `backgroundRef` from `dnd5e.backgrounds`
- Per class: loads `classRef` + features up to `allocatedLevel`, `subclassRef` + subclass features up to `allocatedLevel`

**CharacterInventory snapshot:** stores name, category, rarity, source,
and purchasePrice at acquisition time. Live price read from MarketplaceItem.

**Admin routes:**
```
/characters            — list with status filter
/characters/[id]       — approve/reject (with pendingChanges diff shown),
                         edit all fields including backgroundId, species,
                         currency, transactions, inventory (remove with refund), delete
/characters/slots      — per-user slot management
/characters/settings   — baseSlots, startingGold, restDays
```

**Frontend routes:**
```
/characters            — own characters grid
/characters/new        — full creation form: system, name, species (required),
                         background (required), classes+levels+subclasses (subclass
                         gated by subclassAvailableAtLevel), backstory, avatar
/characters/[id]       — view/edit (see card order below)
```

**Frontend character page — card order:**
```
1. Portrait + stats (XP, Gold, Tokens, Level)
2. Details — name, avatar, portrait, backstory (free fields, saves immediately)
3. Pending changes notice (if EDIT_PENDING)
4. Species, Background & Classes:
   - ACTIVE/RESTING:        read-only summary + Edit button → structural edit form
                            (species dropdown, background dropdown, class rows with
                            multiclass + subclass gating) → ?/submitChanges
   - LEVEL_UP_PENDING:      read-only summary + Allocate levels → class rows only
                            → ?/submitLevelUp
5. Character sheet (collapsible <details> blocks):
   - Species traits
   - Background info (skills, tools, languages)
   - Class features per class (sorted by level, includes subclass features)
6. Backstory
7. Inventory (with sell requests)
8. Recent activity
9. Pending purchases
10. Achievements
```

**Multiclassing:** multiple `CharacterClass` rows per character. Total level = sum of all
`allocatedLevel` values. Used by quest signup check, marketplace level restrictions,
and submit-result level-up detection. All use `db.characterClass.aggregate._sum.allocatedLevel`.

**Settings:** `character.baseSlots`, `character.startingGold`, `character.restDays`

**Key decisions:**
- Characters are never deleted by workflow — REJECTED status is permanent for audit
- Level-up rejection reverts to ACTIVE, discarding pending allocation
- `CharacterClass.classId/subclassId` are plain String — no Prisma cross-schema FK
- `pendingChanges` uses `Prisma.JsonNull` (not `null`) to clear the field

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

### 4. Quest System ✅

**Schema:** `quests`

**Models:** Quest, QuestDM, QuestReward, QuestSignup, QuestResult, QuestResultCharacter, QuestItemUsage

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
- Waitlist auto-promotes to PENDING_CONFIRMATION on cancellation; DM confirms
- Co-DMs have equal access to main DM
- Rewards changed after PUBLISHED → `rewardAdjusted` flag, reverts to PENDING_APPROVAL
- Quest regionId + locationId — fully wired: create, edit (DM + admin), display (World › Region · Location + DM name)

---

### 5. Marketplace ✅

**Schema:** `marketplace`

**Models:**
```
MarketplaceItem          — category, rarity, baseItem, isVariant,
                           requiresAttunement, requirements, weight,
                           source, imageUrl, link, description,
                           buyPrice, isDestroyable, isAvailable, stock
MarketplaceTransaction   — type (BUY|SELL|REWARD), status (PENDING|APPROVED|REJECTED),
                           priceAtTransaction, totalPrice, requestedBy, reviewedBy,
                           worldId String? (null = global)
WorldMarketplaceItem     — worldId, itemId, stock Int?, isAvailable Boolean?, priceOverride Int?
                           @@unique([worldId, itemId])
WorldMarketplaceSetting  — worldId @@unique, sellPricePercent Int?, stockEnabled Boolean?,
                           levelRestrictions Json?
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
Level = sum of all `CharacterClass.allocatedLevel` — multiclassing supported automatically.

**Import:** xlsx upsert by name. Column mapping:
Category, Name, Price, Base Item, Var., Rarity, Att., Requirements,
Weight, Source, Image, Link (+ description field optional)

**Admin routes:**
```
/marketplace/items           — browse/filter/sort catalogue
/marketplace/items/[id]      — edit price, stock, availability; delete
/marketplace/transactions    — all transactions with approve/reject; world + status filters; World column
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
WorldDM        — worldId, dmProfileId (many-to-many assignment)
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
/world/[id]                          — edit world, map, region list + add region, assign/remove world DMs
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

---

### 10. Discord Integration ✅

**Schema:** `discord`

**See:** Discord Setup Guide section.

---

### 11–13. Statistics, Availability, News/Journal ✅

See previous session notes / implemented features.

---

### 14. GameSystem Refactor ✅

See GameSystem section (§1) above — full dnd5e schema and import details.

---

### 15. Character System Expansion ✅

See Character Hub section (§2) above — full details of new fields, edit workflow, character sheet.

---

### 16. Frontend Navigation Redesign ✅

**Structure:** Top nav with 3 hover-dropdown groups + standalone DM Hub link + right-side actions unchanged.

```
Adventure:  Characters, Quests, World, Journal, Statistics
Campaign:   Availability, Marketplace
Community:  News
[DM Hub | Become a DM]  — standalone, checks hasDMProfile
[Notifications bell] [Profile] [Sign out]
```

**Implementation:**
- Groups use CSS hover-based dropdowns (`.nav-group`, `.nav-group__trigger`, `.nav-group__menu`)
- Nav links centered via `position: absolute; left: 50%; transform: translateX(-50%)` on `.nav-bar__links`
- `.nav-bar` uses `position: relative` to anchor the absolute centering
- Active group trigger highlighted when any child route is current (`groupActive()` helper)
- Invisible `::after` pseudo-element bridges gap between trigger and menu to prevent premature close
- `padding-top` on `.nav-group__menu` adds extra hover area
- Mobile hamburger expands full menu with group section headers (`.nav-mobile__group-title` in `nav-mobile.css`)
- All dropdown CSS in `shared/ui/styles/components/site.css`
- Mobile group titles in `shared/ui/styles/components/nav-mobile.css`

---

### 20–22. World Marketplace ✅ (session 15–16)

**Schema additions:**
```
WorldMarketplaceItem     — worldId, itemId, stock Int?, isAvailable Boolean?, priceOverride Int?
                           @@unique([worldId, itemId])
WorldMarketplaceSetting  — worldId @@unique, sellPricePercent Int?, stockEnabled Boolean?,
                           levelRestrictions Json?
MarketplaceTransaction   — add worldId String?
CharacterInventory       — add worldId String?
```

**Resolution hierarchy (3 layers, null = fall through):**
```
WorldMarketplaceItem.priceOverride  → MarketplaceItem.buyPrice
WorldMarketplaceItem.stock          → MarketplaceItem.stock
WorldMarketplaceItem.isAvailable    → MarketplaceItem.isAvailable
WorldMarketplaceSetting.*           → platform.Setting (marketplace.*)
```

**Resolution helper:** `resolveMarketplaceContext(itemId, worldId?)` — returns effective price,
stock, availability, sell%, levelRestrictions. All workflows call this, no duplication.

**Buy workflow:**
1. `createBuyTransaction` — resolve context, check world level restrictions, check world stock, use world price
2. `approveTransaction(buy)` — decrement stock on WorldMarketplaceItem row (or global), tag CharacterInventory.worldId

**Sell workflow:**
1. `createSellTransaction` — resolve sell% from inventory.worldId context
2. `approveTransaction(sell)` — restore stock to origin row (inventory.worldId)

**Admin removal:** restore stock to origin row (inventory.worldId), tag marketplace transaction with worldId

**Global character (worldId=null):** always falls back to global catalogue and settings

**Frontend marketplace:** world filter (persistent URL param), items priced/filtered by world context

**Admin world pages:** new Marketplace section under each world — manage WorldMarketplaceItem rows
(add from catalogue, set stock/price/availability) + WorldMarketplaceSetting (sell%, restrictions)

**Stock origin rule:** stock always restored to where it was bought (inventory.worldId). Never cross-world.


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
Must be immediate child of `{#if}`, `{#each}`, `{:else}`, etc. — never top-level or inside a plain `<div>`.

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
users.getByDiscordId, users.updateDiscord, users.getRoleIds
roles.{getAll, getById, getByName, create, update, delete, assignToUser, ...}
gameSystems.{getAll, getActive, getById, create, update, delete}
gameSystems.progression.{create, update, delete}
dnd5e.classes.{getAll, getActive, getById, create, update, delete}
dnd5e.classFeatures.{create, update, delete}
dnd5e.subclasses.{create, update, delete}
dnd5e.subclassFeatures.{create, update, delete}
dnd5e.species.{getAll, getActive, create, update, delete}
dnd5e.speciesTraits.{create, update, delete}
dnd5e.backgrounds.{getAll, getActive, create, update, delete}
dnd5e.getSystemData(gameSystemId)
characters.{getAll, getById, getByUserId, getSlotInfo, getAllSlotInfo,
            getInventory, addInventory, removeInventory, getTransactions,
            create, update, updateFreeFields, submitChanges,
            updateStatus, updateClasses, approve, reject,
            delete, adjustCurrency, grantSlot, checkRest, clearExpiredRest}
dms.profiles.{getAll, getById, getByUserId, create, update, revoke}
dms.roleRequests.{getAll, getPending, getLatestByUser, create, approve, reject, delete}
quests.{getAll, getById, getByDM, getResult, create, update, updateRewards,
        updateStatus, addCoDM, removeCoDM, signup, cancelSignup,
        confirmWaitlistPromotion, submitResult, approveResult, rejectResult,
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

```
shared/ui/styles/index.css          — imports all components
shared/ui/styles/components/
  site.css          — nav-bar, nav-group dropdowns, site layout
  nav-mobile.css    — hamburger nav (≤640px) + .nav-mobile__group-title
  character.css     — character cards, portrait, avatar, lightbox, class allocation,
                      sheet-class, sheet-feature, sheet-trait
  world.css         — .worlds-page, .worlds-section, .region-grid, .region-card,
                      .region-card__img, .region-card__footer, .region-card__top,
                      .region-card__danger--*, .region-card__level, .region-card__sub
  availability.css  — .avail, .avail__grid, .avail__cell, .avail__tip, .avail__bulk-bar,
                      .avail__modal, .avail__scopes, .avail__backdrop
  world-map.css     — .world-map-marker, .world-map-label
  markdown.css      — .markdown-body (headings, lists, code, tables)
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

### ✅ Completed (added session 15)
- [x] Admin character sheet — tabbed layout (Overview/Identity/Sheet/Inventory/Activity)
- [x] Admin character Overview — stats, adjust currency inline, status management, pending changes banner
- [x] Admin character Identity — direct edit species/background/classes (bypasses approval), multiclass support
- [x] Admin character Sheet — collapsible traits/features, game system aware
- [x] Admin character Inventory — table + remove with stock restore + marketplace transaction record
- [x] Admin character Activity — full transaction log
- [x] Clear rested button — `clearAllExpiredRest()` bulk clears expired RESTING characters
- [x] Tabs CSS — `.tabs` / `.tab` / `.tab--active` added to site.css
- [x] Journal layout redesign — sidebar nav with expand/collapse, mobile toggle, no more fixed left bar
- [x] Journal role filter fix — `getUserRoleIds()` added to users DB API, properly filters by role ID
- [x] Journal world filter fix — uses character worldIds instead of URL params
- [x] Quest approval fix — `LEVEL_UP_PENDING` moved from CharacterStatus to CharacterStatusReason (status=PENDING + statusReason=LEVEL_UP_PENDING)
- [x] Character level display fix — `totalLevel` now computed in `enrichCharacter` and returned on all character objects
- [x] Inventory admin removal — creates MarketplaceTransaction record + restores stock + uses character userId for playerName

### ✅ Completed (session 17)
- [x] DM Hub layout — `+layout.server.ts` loads `dmProfile` + `myWorlds`, guards DM access
- [x] DM Hub `/dm/worlds` — world list, auto-redirect if single world
- [x] DM Hub `/dm/worlds/[worldId]` layout — world switcher, tab nav, `canManage` flag
- [x] DM Hub `/dm/worlds/[worldId]` dashboard — summary stats, region quick-list
- [x] DM Hub `/dm/worlds/[worldId]/edit` — world settings + map + region list + add region
- [x] DM Hub `/dm/worlds/[worldId]/regions` — redirects to /edit (list is there)
- [x] DM Hub `/dm/worlds/[worldId]/regions/[regionId]` — edit region, wiki, locations, add location
- [x] DM Hub `/dm/worlds/[worldId]/regions/[regionId]/locations/[locationId]` — edit location + wiki
- [x] DM Hub `/dm/worlds/[worldId]/marketplace` — world item overrides + settings + level restrictions
- [x] DM Hub `/dm/worlds/[worldId]/transactions` — world-scoped, approve/reject gated by canManage
- [x] DM Hub `/dm/worlds/[worldId]/characters` — list with Review (canManage) or View (quest-only)
- [x] DM Hub `/dm/worlds/[worldId]/characters/[charId]` — full character sheet, diff highlights for EDIT_PENDING, approve/reject gated by canManage
- [x] DM Hub `/dm/worlds/[worldId]/quests` — world quest list, approve/reject PENDING_APPROVAL + PENDING_RESULT_APPROVAL for canManage DMs; quest-only DMs see "Awaiting approval" badge
- [x] DM Hub `/dm/worlds/[worldId]/quests/new` — new quest pre-scoped to world, uses myWorlds from layout (no extra DB call)
- [x] DM Hub `/dm/worlds/[worldId]/journal` — world journals list + create
- [x] DM Hub `/dm/worlds/[worldId]/journal/[journalId]` — full journal editor (sections, pages, enricher popup)
- [x] DM Hub `/dm/worlds/[worldId]/audit` — audit log with resourceId/action/date filters
- [x] `WorldDM.canManage Boolean @default(false)` — schema + db:push
- [x] `worlds.getByDMProfile` — includes ALL regions + locations (no isActive filter)
- [x] `worlds.updateDMPermission` — toggle canManage on existing assignments
- [x] Admin world page — canManage select on assign form, inline toggle on existing DMs
- [x] `getAllQuests` worldId filter — resolves regionIds first (cross-schema FK, no Prisma relation)
- [x] `getAllJournals` — filtered by worldIds array in DM Hub
- [x] `getAuditLogs` — resourceId filter added
- [x] `getAllCharacters` — worldId filter added
- [x] Quest approval routing — world quests approved by canManage DMs (not admin); global quests admin only; quest-only DMs have no approval rights
- [x] DM Hub tab access — baseTabs (Dashboard, Quests, Characters, Transactions) always visible; manageTabs (Settings, Regions, Marketplace, Journal, Audit) canManage only
- [x] DM dashboard — "My Worlds" button + worlds summary card

### ✅ Completed (session 16)
- [x] World marketplace — per-world level restrictions UI (tier editor in admin world marketplace page)
- [x] World marketplace — world-lock enforcement at character level (item detail resolves context per selected character's world)
- [x] World marketplace — listing page world filter preserves worldId on item links
- [x] World marketplace — buy action enforced server-side via character.worldId (cannot be spoofed)
- [x] World marketplace — sell price in character inventory uses world sellPricePercent (not hardcoded 50%)
- [x] World marketplace — sell request cancel button on character inventory page
- [x] World marketplace — admin transactions page: World column + world/status filter (composable, URL-persistent)
- [x] World marketplace — level restrictions check uses ctx.price (effective world price) not global buyPrice
- [x] Marketplace — minPrice + maxPrice filter collision fixed (both mapped same buyPrice key in Prisma where clause)
- [x] Marketplace — minPrice filter broken for value 0 (JS falsiness on '0' string)
- [x] Discord — /item command: world-aware pricing (server scope → world option → global)
- [x] Discord — /buyitem command: world resolution chain restored (server scope → char lock → world option → global)
- [x] Discord — /sellitem command: world resolution chain restored; sell% from origin world
- [x] Discord — world option registered for /item, /buyitem, /sellitem slash commands
- [x] World DM assignment — WorldDM model added to schema; worlds.assignDM / worlds.removeDM DB API
- [x] World DM assignment — admin world [id] page: assign/remove DMs UI (same pattern as RegionDM)
- [x] World DM assignment — getWorldById includes dms relation

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

## Bug Fixes & Patches


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