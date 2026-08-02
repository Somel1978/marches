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
| DM role request submitted | All SUPERADMIN / User-read-ALL admins |
| DM re-approved with existing worlds | Same admins (`DM_REAPPROVED_WITH_WORLDS`) |
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
1. Gold and tokens awarded → `CharacterTransaction(GOLD|TOKEN)` + totals incremented
2. Mission XP, bonus XP and milestone credits go through `applyProgressionChange`,
   which writes the `XP` / `MILESTONE` transactions, updates the totals, sets
   `restUntil`, and owns the level decision:
   - `earnedLevel` above approved `level` → `PENDING` + `LEVEL_UP_PENDING` + `CHARACTER_LEVEL_UP` notification
   - `earnedLevel` below approved `level` → `PENDING` + `LEVEL_DOWN_PENDING` + `CHARACTER_LEVEL_DOWN` notification
   - equal → `RESTING` + `QUEST_REST` + `QUEST_COMPLETE` notification to player
3. `CharacterTransaction(STATUS)` written with rest end date

**Reward division.** XP, gold and tokens are divided equally among confirmed
players. `Quest.milestoneAward` is **not** divided — each participant receives
the full amount. Credits only affect characters on milestone progression, but
they are recorded for everyone so a later mode switch keeps its history.

**DM Rating:**
- Players can rate DM 1-5 stars + optional comment on completed quests they participated in
- Gated by `dm.ratingsEnabled` setting — hidden everywhere when disabled
- DMs cannot rate their own quests
- DM sees all ratings on their quest detail page (anonymous — no player name shown)
- DM sees aggregate ratings on their profile page
- Admin sees full ratings table on DM admin page with quest title + average
- Stored in `dms.dm_ratings` — supports future stats: filter by dmProfileId + quest main DM

**Sign-up enforcement:**
- Approved `Character.level` must be within quest min/max
- Enforced in `quests.signup()` dbapi before creating the signup record, and
  mirrored by the eligibility filter on the quest detail page
- Characters in `LEVEL_UP_PENDING` / `LEVEL_DOWN_PENDING` cannot sign up at all

**World progression ladder overrides:**
- Game system owns the full threshold ladder; worlds store sparse
  `WorldProgressionOverride` rows (`thresholdId` + optional `xpRequired` /
  `milestoneRequired`)
- Effective ladder for a character = system + overrides for their **home**
  `worldId`. Globals ignore world overrides. Quest world is never used for
  ladder resolution
- Editable by admins and by DMs with `WorldDM.canManage` (DM hub Progression tab)
- Saving overrides re-resolves home-world characters’ `earnedLevel`

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
- Mobile hamburger: each nav section (Adventure / Campaign / Community / DM / Account) independently collapses; the section matching the current route opens on menu open
- Mobile menu scrolls (`max-height: calc(100dvh - 3.5rem)`) so longer lists stay reachable
- All dropdown CSS in `shared/ui/styles/components/site.css`
- Mobile accordion styles in `shared/ui/styles/components/nav-mobile.css`

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

### 27. DM Hub — Player Availability Dashboard ✅

**Shared component:** `apps/frontend/src/lib/dm/DmAvailabilityDashboard.svelte`  
**Server loader:** `apps/frontend/src/lib/dm/build-availability-dashboard.ts`  
**Utils:** `apps/frontend/src/lib/availability/utils.ts` (slot merge, week bounds, timeline block layout)

**Layout (matches player `/availability`):**
- Week navigation via `?week=` (Mon–Sun UTC week)
- Day tabs with player-count badges
- Read-only community heatmap (density by half-hour)
- Per-player timeline rows (merged blocks); click block → scope badge + character tags
- Mobile: single selected day, no horizontal scroll

**Pages:**
| Route | Scope |
|---|---|
| `/dm` | All players, all slots |
| `/dm/worlds/[worldId]` | GLOBAL + WORLD slots targeting this world |
| `/dm/worlds/[worldId]/quests` | Same world filter, embedded above quest table |

**World filter rules (unchanged):**
- Slot visible if `scope=GLOBAL` OR (`scope=WORLD` and worldId in `worldIds`)
- Character tags: if `acceptsGlobalCharacters` → all active chars; else → chars assigned to this world only
- User names via `users.getById` per player (not bulk `getAll` cap)

**Quest invite list:** `/dm/quests/[id]` — available players at `scheduledAt` slot; card layout aligned with dashboard; `worldId` resolved via `regionId` (§36)

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
- Collapsed header: name · level badge · school · Conc · Ritual · damage chips (dice + emoji/type) · chevron (kept in header for combat scanning)
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

---

### 31. D&D 5e Descriptions Permission Gate ✅

**Permission key:** `dnd5eDescriptions` / action `read`
**Resource registered in:** `Game Systems` module, `01-platform.seed.ts`
**No schema changes** — uses existing RBAC `RolePermission` table and `Setting` table.

**What is gated** — shows `📖 Description not available — contact your DM.` when permission not granted:

| Page | Gated content |
|---|---|
| Character sheet | Species trait tooltips, class/subclass feature tooltips, feat description in ASI panel, feat snippet in feat picker |
| ASI Feats Panel | Chosen feat snippet, feat picker snippet (`Dnd5eAsiFeatsPanel` — prop ready, not yet wired) |
| Spellbook | Spell description in expanded card |
| Character wizard | Species, traits, backgrounds, feats, class/subclass features — `_wizard/` step components; descriptions gated via `canViewDescriptions` |
| Marketplace item detail | Item description |
| Token store list | Item description snippet |
| Token store item detail | Item description |
| Codex (`/tools/codex`) | Entire page (403 if denied); Community nav link only when allowed |

**What is NOT gated** — world lore always visible: world/region/location descriptions, journal descriptions, faction descriptions, quest descriptions.

**Codex tool:** structured AND filters over Classes (nested features/subclasses), Species (traits), Feats, Backgrounds, and Spells. See [tools/codex.md](../tools/codex.md).

**Prop chain:** `canViewDescriptions` resolved in page server → passed through page svelte → `Dnd5eSheetSection` / `DmDnd5eSheetSection` → `Dnd5eCharacterSheet` → `Dnd5eSpellbooks`

---

### 31b. D&D 5e Character Creation Wizard (inline 6-step) ✅

> **Canonical reference:** [dnd5e/wizard.md](../dnd5e/wizard.md)

Route: `/characters/new/dnd5e` (after system selector at `/characters/new`)

| Step | Component | Inline choices resolved here |
|---|---|---|
| 0 Identity | `StepIdentity.svelte` | Name, avatar, portrait, world |
| 1 Species | `StepSpecies.svelte` | Size (`sizeChoices`), trait skill/save/tool/lang/expertise/dmg pools, trait feat grants + nested feat pools |
| 2 Background | `StepBackground.svelte` | Background feat pick, skill/tool/lang/save/dmg pools, nested feat pools |
| 3 Scores | `StepScores.svelte` | Point-buy, roll, standard array, species bonus points |
| 4 Classes | `StepClasses.svelte` | Class skills, feature pools, feat grants, **ASI/Epic Boon slots** (`AsiSlotInline`) |
| 5 Review | `StepReview.svelte` | Summary + `<form>` with all hidden inputs for `+page.server.ts` |

State: `WizardState` in `wizard-state.svelte.ts` — persisted to `sessionStorage` key `wizard_dnd5e`.

Derivations: `grants.ts` — `allPoolsSatisfied`, `advanceBlockersForStep`, `expertiseGrantSubmissions`, `featNestedPools`, etc.

E2E: `apps/frontend/tests/interactions/character-wizard.e2e.ts`

**Setup for new installs:** `pnpm seed` in `shared/database` registers the resource automatically. Then assign `dnd5eDescriptions / read / ALL` to desired roles in Admin → Roles.

---

### 32. RBAC Cross-Process Cache Invalidation ✅

**Problem:** Admin and frontend run as separate Node.js processes each with their own LRU permission cache. When admin saves role permissions, it invalidates its own cache but the frontend cache stays stale until TTL expires (was 5 minutes).

**Solution:** DB timestamp invalidation via `Setting` key `rbac.permissionsUpdatedAt`.

**How it works:**
1. `getUserPermissions(userId)` does one cheap `SELECT` on `settings WHERE key = 'rbac.permissionsUpdatedAt'`
2. Compares `cachedAt` of the LRU entry against the DB timestamp
3. If `cachedAt >= dbTimestamp` → return cached (fast path)
4. If `cachedAt < dbTimestamp` → stale → re-fetch from DB and re-cache
5. `invalidateRolePermissions` and `invalidateUserPermissions` both call `bumpPermissionsTimestamp()` which does an `UPSERT` on the setting with `Date.now()`

**Effect:** Permission changes in admin propagate to all processes (frontend, discord) on the next request — no restart needed, no arbitrary delay.

**Files changed:**
- `shared/rbac/cache.ts` — `CachedEntry` stores `{ permissions, cachedAt: number }` instead of bare `UserPermissions`; TTL raised to 60 minutes (DB timestamp is primary invalidation)
- `shared/rbac/access.ts` — `getUserPermissions` checks DB timestamp before using cache; `bumpPermissionsTimestamp` helper added; both invalidation functions bump the timestamp
- `shared/database/seeds/01-platform.seed.ts` — `rbac.permissionsUpdatedAt` setting seeded with value `'0'`

---

### 33. Discord Multi-Server Channel Routing ✅

**Problem:** Multiple Marches instances in the same Discord guild caused command conflicts — commands resolved by `guildId` alone couldn't distinguish which server instance should respond.

**Solution:** Resolve server context by `channelId + guildId` instead of `guildId` alone. Each registered Discord channel belongs to exactly one server instance. The bot silently ignores interactions from unregistered channels.

**How it works:**
1. On interaction, collect all `DiscordChannel` entries matching `channelId + guildId`
2. If none found → silently ignore (not this server's channel)
3. If command requires a specific channel type → prefer the matching type entry from the results
4. If wrong channel type → redirect user to the correct channel with a mention
5. Server context (`server`) is resolved from the matched channel's `server` relation

**Admin notice added:** Bot Setup section in `/discord` admin page now shows:
> "Each server should have its own dedicated channels. Do not add multiple bots to the same channels."

**Files changed:**
- `apps/discord/src/interaction-handler.ts` — channel-based routing with `guildId` cross-check; handles multiple channel type registrations on same channelId
- `apps/admin/src/routes/(app)/discord/+page.svelte` — multi-server warning notice

---

### 34. Discord Quest Links Fix ✅

**Problem:** Quest notification URLs were generating `https://site.url/quests/undefined` because the notification payload uses `questId` but `dispatcher.ts` was reading `quest.id`.

**Fix:** All 6 `quest.id` references in `dispatcher.ts` changed to `quest.questId` to match the payload field name.

**File:** `apps/discord/src/notifications/dispatcher.ts`

---

### 35. Discord `/quests` Per-Quest Layout ✅

**Problem:** `/quests` command sent one embed with all quests as fields, then all buttons grouped at the bottom — buttons not associated with their quest visually.

**Fix:** Each quest now gets its own embed + buttons sent as separate messages. First quest uses `editReply`, subsequent quests use `followUp`. Details and View on site buttons appear directly below each quest.

**File:** `apps/discord/src/commands/quests.ts`

---

### 36. DM Quest Invite — WorldId Fix ✅

**Problem:** `getAvailableUsersForQuest` was always called with `worldId = null` because `quest.worldId` doesn't exist on the Quest model (only `regionId` does). This meant only `GLOBAL`-scoped availability was ever matched, so world-scoped players never appeared in the invite list.

**Fix:** `worldId` now resolved via `regionId → db.region.worldId` before calling the availability query.

**File:** `apps/frontend/src/routes/(protected)/dm/quests/[id]/+page.server.ts`
---

### 38. Player Availability Dashboard ✅

**Route:** `/availability` (`apps/frontend/src/routes/(protected)/availability/`)

**UX:**
- **Community overview** — heatmap is view-only (shows how many players are free per half-hour)
- **Player schedules** — horizontal timeline blocks per player (adjacent 30-min slots merged)
- **Add / Edit modal** — date picker, From/Until time selects (30-min steps), GLOBAL/WORLD scope, world checkboxes
- Current user row pinned first; only own blocks are clickable (opens edit modal)
- Week nav: `?week=YYYY-MM-DD` (Monday-based UTC week)

**Server actions:** `setRange`, `updateRange`, `clearRange`, `clearDay` on `+page.server.ts`

**Mobile (≤768px):** day tabs default to today; one density strip + one timeline per player for selected day — avoids 900px grid horizontal scroll

**CSS:** `.avail-dash__*` in `shared/ui/styles/components/availability.css`

---

**Overview:** DMs and Admins can manually override any character's skill proficiency or saving throw proficiency directly from the character sheet. The override is tracked as a single row with an optional note recording who changed it and why. Removing the override restores the natural grants from class, background, species, feats, etc.

**Grant model:**
- `Dnd5eCharacterSkillGrant` — multiple rows per skill (one per source). `sourceType` identifies origin: `Background`, `Class`, `ClassFeature`, `SubclassFeature`, `SpeciesTrait`, `Feat`, `PlayerChoice`, `Override`. `sourceId` is the UUID of the granting entity (null for junction-based rows). `note` stores audit text on Override rows.
- `Dnd5eCharacterSavingThrowGrant` — same pattern. `sourceId = '__SUPPRESS__'` forces non-proficient even if other sources grant it.
- Effective skill value = MAX across all non-Override source rows; a single Override row replaces the MAX entirely.
- Override rows keyed by `sourceType = 'Override'` — only one per skill per character. Remove also sweeps legacy `Player/DM/Admin` rows from earlier implementations.

**UI — `Dnd5eSkillsPanel.svelte`:**
- Click a skill row → inline editor opens below the grid showing: skill name, "Manual Override" amber badge, context hint (current value + note + "Setting to None restores natural grants"), four proficiency buttons (None / Half / Prof / Expert) pre-selected from current override, optional note field, Save / Cancel.
- Click same row again or Cancel → closes without saving.
- Enter in note field → commits.
- Saving throw editor: click a stat cell → inline editor with proficient toggle + note + Save/Cancel.
- Tooltip (`title`) on every skill/save cell shows resolved source names: "Ranger: Natural Explorer: Proficient | Background: Outlander: Proficient". Override tooltip shows "Manual override: Expert | Note: ... | Natural grants: ...".
- Orange `●` dot on skill name / save stat when an active Override row exists (edit mode only).

**Prop chain:** `canEdit` + `onToggleSkill(skill, proficiency, note?)` + `onToggleSave(stat, proficient, note?)` → `Dnd5eCharacterSheet` → `Dnd5eSkillsPanel`. Actions: `saveSkills` (admin/DM/player `dnd5e.actions.server.ts`) → `dnd5e.upsertOverrideSkillGrant` / `dnd5e.removeOverrideSkillGrant`.

**Source label resolution in `get-character-sheet.ts`:**
- Builds `sourceLabels` map from already-loaded data: background, species traits, class features, subclass features, feats — mapping UUIDs to readable strings like `"Ranger: Natural Explorer"`.
- `sourceTypeFallback` handles null-sourceId rows: `Background` → background name, `Class` → class name + "(class saves)", `PlayerChoice` → "Class skill choice", etc.
- `resolveGrantLabel(g)` used for both skill `grantSources` and saving throw `grantSources`.

---

### 38. Character Creation Wizard — Saving Throw Grant Fixes ✅

**Problem 1 — Wrong sourceType:** All saving throw grants were written with `sourceType: 'Class', sourceId: null` regardless of actual origin (feat, class feature, background choice pool, etc.). Tooltip showed "Class skill choice" for Resilient.

**Fix:** Wizard form now submits three parallel fields per save grant — `classSave`, `classSaveSourceType`, `classSaveSourceId`. Each source category carries its own `sourceType` and `sourceId`/`sourceDbId` (real entity UUID). Save choice pools carry both `sourceId` (composite pool-tracking key like `'asi-feat-0-saves'`) and `sourceDbId` (the actual feat/feature UUID written to DB).

**Problem 2 — Multiclass save leakage:** `featureAutoSaves` iterated all `classAllocs`, so a second class's features with `grantsSavingThrows` could sneak saves through even when they duplicate that class's own junction table.

**Fix:** `featureAutoSaves` now filters each feature's `grantsSavingThrows` against `thisClassBaseSaves` — the set of stats already in that class's own `savingThrows` junction — before emitting grants. Only genuinely additional saves (not covered by the class junction) pass through.

**Files:** `apps/frontend/src/routes/(protected)/characters/new/dnd5e/+page.svelte`, `+page.server.ts`