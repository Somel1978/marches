# Marches — Feature Specifications (Part 2)

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
---

### 23. Tavern Social Space ✅

**Schema:** `tavern.prisma`
```
TavernAuthorType enum: CHARACTER | DM | ADMIN
TavernChannel: id, worldId? (unique, Cascade), name, isActive, isPrivate, createdAt
TavernMessage: id, channelId, authorType, authorId, authorName, authorAvatar?,
               characterId?, characterName?, content, isDeleted (soft), deletedBy?, deletedAt?, createdAt
```

**Auto-create:** `createWorld()` creates `TavernChannel` automatically. `ensureWorld()` backfills on admin world page load and `/tavern` page load.

**Privacy:** `isPrivate=true` hides channel from non-world-members. Admins/DMs see all channels.

**Cap:** 200 messages stored, 100 shown in UI. Oldest deleted on insert.

**Author types:** CHARACTER (picks from active characters), DM (has DMProfile), ADMIN (admin permission)

**Discord:**
- Platform → Discord: `notifyTavernMessage` sends to TAVERN channel; `getAllForType` (findMany) sends to ALL matching servers
- Discord → Platform: `/tavern message channel character` slash command
- Global commands cleared before guild registration (prevents duplicates)

**CSS:** `shared/ui/styles/components/tavern.css`

---

### 24. Character Public Directory ✅

**Schema:** `Character.isPrivate Boolean @default(false)`

**Card system:** `shared/ui/src/gamesystems/dnd5e/Dnd5eCharacterCard.svelte` — read-only card.
- Uses `charSheet.abilityScores` array with `STAT_MAP` (`STRENGTH→str` etc, field is `baseScore`)
- Uses `charSheet.enrichedClasses` for features
- Uses `charSheet.chosenFeats` for feats
- Inventory loaded separately via `characters.getInventory()`
- No HP/AC/speed (not tracked in dnd5e schema)
- Future systems: add `_cards/[System]CardSection.svelte` wrapper

**Routes:**
- `/characters/public` — searchable directory (by character name or player name)
- `/characters/public/[id]` — full profile; private shows portrait+name only

**CSS:** `shared/ui/styles/components/char-card.css`

**Enricher:** `character:id` now links to `/characters/public/[id]`

---

### 25. Part 2 — Journal/Wiki Refactor ✅

**Schema:** `news.prisma`
- `ContentVisibility` enum: PUBLIC | WORLD | DM_ONLY | ADMIN_ONLY
- `WorldJournal` / `WorldJournalSection` / `WorldJournalPage` — per-world journals with visibility
- `PlatformWiki` / `PlatformWikiSection` / `PlatformWikiPage` — platform-wide wiki
  (renamed from Wiki to avoid clash with `WikiPage` in world.prisma)

**Visibility filtering:** `getWorldJournalsForUser(worldId, UserContext)` — filters by isDM/isAdmin/worldMembership

**Routes:**
- Admin: `/wiki` (list+editor), `/world/[id]/journal` (list+editor)
- Frontend: `/wiki` (reader), `/world/[slug]/journal/[id]` (reader)
- DM Hub: `/dm/worlds/[worldId]/journal` (list+editor with visibility selects)
- Old `/journal` routes deleted from disk

**Admin nav:** `resourceKey: 'Journal'`, `label: 'Wiki'`, `href: '/wiki'`

---

### 26. Discord Availability Commands ✅

**Commands:**
- `/setavailable start_date start_time end_date end_time [scope]`
- `/unsetavailable start_date start_time end_date end_time`

**Date formats:** YYYY-MM-DD or DD/MM/YYYY  
**Time format:** HH:MM 24h (end time exclusive — 17:00–18:00 books slots 34+35 only)  
**Scope:** `global` (default) or world name (partial match)

**Files:** `apps/discord/src/commands/availability.ts`

---

### 27. DM Hub World Dashboard — Player Availability ✅

**Behaviour:**
- `/dm` root — shows all players' availability (no world filter)
- `/dm/worlds/[worldId]` dashboard — shows:
  - WORLD-scoped slots targeting this world (always)
  - GLOBAL-scoped slots only if `world.acceptsGlobalCharacters = true` AND user has chars in world
- Character visibility: `acceptsGlobal` → all active chars; else → world chars only
- Day picker with prev/next navigation
- Character level shown as `Lv X` badge (sum of `classes.allocatedLevel`)

---

### 28. Token Store ✅

**Schema:** `token-store.prisma` (schema: `tokenstore`)

```
TokenStoreRewardType: XP_BOOST | GOLD_BOOST | MANUAL (display: Quest XP Boost / Quest GP Boost)
TokenStoreRewardDirection: RETROSPECTIVE | FUTURE | BOTH
TokenStoreScope: GLOBAL | WORLD
TokenStoreTransactionStatus: PENDING | APPROVED | REJECTED | REVOKED

TokenStoreItem:
  name, description, imageUrl, tokenCost, gameSystemId? (null=universal),
  scope, worldId? (if WORLD), rewardType, rewardValue (Json: { percent, direction }),
  isActive, stock?, createdBy

TokenStoreTransaction:
  itemId, characterId, itemSnapshot (Json), status, tokenCostAtTransaction,
  requestedBy, reviewedBy?, reviewNote?, worldId?
```

**Purchase flow (same as marketplace):**
1. Player buys with tokens → tokens deducted immediately → status PENDING
2. Admin or canManage DM approves → boost applied → status APPROVED
3. Reject → tokens refunded → status REJECTED
4. Revoke (admin only) → boost reversed + tokens refunded → warns on level-down/negative gold

**Boost application — `apply-boosts.ts`:**
- Per-quest per-boost pattern — one `CharacterTransaction` per quest per boost
- `sourceType='QUEST'`, `sourceId=questId` → quest deletion auto-reverts boosts
- Delete+recreate on each application — fully idempotent, safe to recalculate
- Base XP scan excludes `note: contains 'boost:'` to prevent feedback loops
- `applyBoostPerQuest(tx, characterId, stTxId, item, direction)` — retrospective
- `applyFutureBoostForQuest(tx, characterId, questId, xpGranted, goldGranted, worldId)` — called at quest approval

**World scoping:**
- GLOBAL boost: applies to all quests regardless of world
- WORLD boost: only quests in that world (via `quest.regionId → region.worldId`)

**Game system restriction:** `gameSystemId = null` = universal; otherwise must match character's game system

**`↻ Recalc` button:** Re-runs retrospective calculation for approved boosts — fills missing per-quest transactions, corrects none

**Routes:**
- Admin: `/token-store` list, `/token-store/items/new`, `/token-store/items/[id]`, `/token-store/transactions` (approve/reject/revoke/recalc), data import/export
- DM Hub: `/dm/worlds/[worldId]/token-store` — approve/reject/recalc for world characters
- Frontend: `/token-store` (browse, filtered by character system+world), `/token-store/[id]` (purchase)

**Character sheet:** `+X from boosts` shown under XP and GP stat cards

**Discord:** `TOKEN_STORE_PENDING` notification via APPROVALS channel
---

### 29. D&D 5e Spell System ✅

**Schema additions to `Dnd5eSpell`:**
```
castingTime       String?   // "Action", "Bonus Action", "Reaction", "1 Minute"
components        String?   // "V, S" or "V, S, M (material note)"
description       String?   // full spell text, nullable
sourceBook        String?   // "Player's Handbook", "Xanathar's Guide", etc.
savingThrow       String?   // ability name: "Wisdom", "Constitution", etc.
```

**Schema additions to `Dnd5eSubclass`:**
```
canCastSpells     Boolean   @default(false)
// Only relevant when parent class does NOT cast spells (Eldritch Knight, Arcane Trickster)
```

**Schema additions to `Dnd5eSpellSlotProgression` and `Dnd5eSpellsKnownProgression`:**
```
subclassId        String    @default("")   // "" = class-level caster
subclassName      String    @default("")   // denormalized
@@unique([gameSystemId, classId, subclassId, classLevel])
```

**Admin — Spell management:**
- `/game-systems/[id]/dnd5e/spells` — spell list with search + level/school/spellList/concentration filters; Source Book column
- `/game-systems/[id]/dnd5e/spells/[spellId]` — full spell editor: castingTime, components, description, sourceBook, savingThrow dropdown, all existing fields
- `/game-systems/[id]/dnd5e/spells/slots` — Spell Slot Progression table; selector shows spellcasting classes AND spellcasting subclasses (e.g. "Fighter — Eldritch Knight"); Cantrips column is **read-only** (managed on Spells Known page); saves slot1-slot9 only
- `/game-systems/[id]/dnd5e/spells/known` — Spells Known/Prepared table; same class/subclass selector; editable cantrips, prepared, additional, note columns; note column kept for 2014 backward compatibility, not used in 2024 rules
- `/game-systems/[id]/dnd5e/classes/[classId]` — subclass rows show `canCastSpells` toggle **only when parent class cannot cast spells**; "Spellcasting" badge shown on qualifying subclasses

**Import/Export:**
- Spells XLSX: adds `Casting Time`, `Components`, `Description`, `Source Book`, `Saving Throw` columns
- Spell Slots XLSX: `Subclass ID` and `Subclass Name` columns; import resolves `classId` and `subclassId` by **name** (portable across installations — no UUID dependency)
- Spells Known XLSX: same subclass columns; same name-based ID resolution
- Subclasses XLSX: adds `canCastSpells` column

**Multiclass spell slot computation:**
- Detects spellcasting via `cc.classRef?.canCastSpells || cc.subclassRef?.canCastSpells`
- FULL = full level contribution; HALF = floor(level/2); THIRD = floor(level/3)
- Combined level looked up against FULL caster table
- Pact Magic (PACT caster type) shown separately

**Character spellbooks (`Dnd5eSpellbooks.svelte`):**
- Limits banner shows: `Cantrips: X/Y` · `Prepared: X/Y` · `Max Spell Level: Nth`
  - Cantrips: count of level-0 entries in book
  - Prepared: count of entries where `entry.prepared === true` AND level > 0 (NOT total spells in book)
  - Max Spell Level: derived from highest non-zero slot in slot progression for character's class/level
- Spell picker: filter bar (text search, level dropdown, school dropdown, Concentration toggle, Ritual toggle); results grouped by level with sticky headers
- Expanded spell card: property tiles grid (`auto-fill minmax(100px, 1fr)`): Casting Time ⚡, Range 📏/🧍, Duration ⏳, Components ✦, AoE 💥, Saving Throw 🎲 (shows ability e.g. "WIS Save"), Attack Roll ⚔; damage with solid-color type pills (white text); cantrip scaling; At Higher Levels callout with contextual text ("for each slot level above Xth" or "for every two slot levels above Xth"); source book; DDB link
- Collapsed header: name · level badge · school · Conc · Ritual · damage pills · chevron (damage pills kept in header for combat scanning)
- Spell removal requires confirmation via `confirmModal`

---

### 30. Discord Spell Commands ✅

**Files:** `apps/discord/src/commands/spell.ts`, `apps/discord/src/commands/spellbook.ts`

**Channel:** `CHARACTERS` for all spell commands

**Commands:**

`/spell info [name]` — **ephemeral** — shows full spell card embed: level, school, concentration/ritual, casting time, range, duration, components, AoE, saving throw, damage with emoji type indicators, cantrip scaling, at higher levels (contextual text), source book, DDB link

`/spell list [class] [level]` — **ephemeral** — lists all spells for a class at a given level (cantrip or 1–9); shows name, school, concentration/ritual badges, damage; paginated if over 4000 chars

`/spellbook list [character] [spellbook]` — **ephemeral** — lists all spells in a named spellbook grouped by level; ✅ = prepared, ⬜ = not prepared, ✨ = cantrip; requires linked account

`/spellbook slots [character]` — **ephemeral** — shows spell slots card with multiclass caster level; requires linked account

`/spellbook prepared [character]` — **ephemeral** — shows all prepared spells grouped by level; limits banner (Cantrips X/Y · Prepared X/Y · Max Level Nth); requires linked account

**Notes:**
- All spellbook commands require a Discord-linked account
- `/spell info` and `/spell list` are always ephemeral (info lookups, not character actions)
- Game system resolved by `slug = 'dnd5e'` from `gameSystems.getAll()` — always targets the D&D 5e system regardless of other active systems