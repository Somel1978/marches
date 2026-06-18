# Marches — Feature Specifications (Part 1)

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



### Site Branding :D

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