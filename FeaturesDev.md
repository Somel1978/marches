# Marches — Architecture & Decision Log

> **Living document.** Updated as decisions are made and features are built.
> Last updated: 2026-05-29 (session 15)

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
11 world       — World, Region, RegionDM, Location, WikiPage, WikiRevision
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
⬜ 20. World marketplace (per-world stock, price overrides, level restrictions)
⬜ 21. DM dashboard quest filters (UI cleanup phase)
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
Level = sum of all `CharacterClass.allocatedLevel` — multiclassing supported automatically.

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

### 20. World Marketplace ⬜ (planned)

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

### ⬜ Pending
- [ ] World marketplace (per-world stock, price overrides, level restrictions)
- [ ] DM dashboard quest filters (UI cleanup phase)

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

### Session 15 (2026-05-29)
- Quest approval — `LEVEL_UP_PENDING` was used as `CharacterStatus` value; refactored to `status: PENDING` + `statusReason: LEVEL_UP_PENDING` matching session 13 schema
- Character level display — `enrichCharacter` in `get-by-id.ts` now computes and returns `totalLevel`; DM hub server has defensive fallback from classes array
- Inventory admin removal — `removeFromInventory` now creates `MarketplaceTransaction(SELL/APPROVED)` record and restores stock to correct marketplace item; uses `character.userId` not `characterId` for `requestedBy`
- Journal — `getForUser` was receiving empty `roleIds` because `locals.permissions` is a Map not role array; added `getUserRoleIds(userId)` to users DB API; world filter was reading URL params instead of user character worldIds
- Admin character sheet — full tabbed rewrite; `updateClasses` action uses named form fields (classId/subclassId/allocatedLevel) not JSON blob
- Tabs CSS — `.tabs`, `.tab`, `.tab--active` added to `shared/ui/styles/components/site.css`

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