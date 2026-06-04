# Marches — Changelog (Sessions 1-20)

## Bug Fixes & Patches




### Sessions 61-70 — Character Sheet Stabilisation + Background Feats (2026-06-03)

**Character Sheet Architecture**
- Universal +page.svelte / +page.server.ts contain zero dnd5e content
- `_sheets/Dnd5eSheetSection.svelte` — player: fetch+deserialize, submit for approval
- `_sheets/DmDnd5eSheetSection.svelte` — DM canManage: direct save; read-only for quest-only DMs
- `_sheets/AdminDnd5eSheetSection.svelte` — always canEdit=true, direct save
- `_sheets/dnd5e.actions.server.ts` — per-route, appropriate guards (player/DM/admin)
- `_loaders/dnd5e.server.ts` — thin wrapper per route

**Dnd5eCharacterSheet.svelte** (pure UI, no SvelteKit imports)
- Callbacks: onSaveAbilityScores, onSubmitChanges, onSubmitLevelUp, onSaveSlot, onRemoveFeat
- Props: canEdit, canManage, editBlockedReason, isLevelUp, isLevelDown, availableLevel
- ASI slots: +2 one stat / +1+1 two stats / feat picker — one row per slot enforced
- Background feat slots: category-filtered picker or locked auto-grant (🔒 for players)
- Ability scores: +N ASI label per stat, ASI bump stored on feat row and reversed on remove
- Edit-blocked banner when canEdit=false (shows reason: pending approval, suspended, etc.)
- Slot state defaults: background_feat and epic_boon default to 'feat' mode not 'asi'
- Resolved feat slots show full description below header row

**Background Feat Grant System**
- `Dnd5eBackground.grantsFeatCategory String?` — player picks from this category
- `Dnd5eBackground.grantsFeatId String?` — FK to Dnd5eFeat, auto-granted locked slot
- `syncBackgroundFeatGrant(tx, characterId, newBgId, oldBgId)` — called on direct save + approval
- Auto-heal on sheet load: if grantsFeatId set but no row exists, creates row silently
- Admin backgrounds CRUD: feat dropdown by name, grantsFeatCategory text field
- Import/export: grantsFeatCategory and grantsFeatId columns added

**Schema Changes (db:push required)**
- `Dnd5eBackground`: grantsFeatCategory String?, grantsFeatId String? (FK Dnd5eFeat with named relation)
- `Dnd5eFeat`: grantedByBackgrounds Dnd5eBackground[] @relation("BackgroundGrantedFeat")
- `Dnd5eCharacterFeat`: asiStat1, asiAmount1, asiStat2, asiAmount2 (stored stat bump choices)

**Key Bug Fixes**
- ASI removal reverses stat bump using stored asiStat1/2 values
- Duplicate orphan feat rows cleaned on load (keep one per featId per slot)
- Slot keyed by sourceClassId+sourceLevel — one row per slot enforced via deleteMany before create
- FEAT_STATS uppercase enum values (was title case, caused 500 on ASI save to DB)
- Admin marketplace nav import link corrected
- DM character view: canManage DMs edit directly, quest-only DMs read-only

### Session 25 — DM Notifications + Self-Approval Guards + CharacterClass Move (2026-06-02)

**Item 1 — `createNotificationsForWorldDMs`**
Added to `shared/database/dbapi/write/notifications/notifications.ts` — queries WorldDM where canManage=true, resolves userIds via DMProfile, creates in-app notifications with correct `/dm/worlds/[worldId]/...` links. Exported as `notifications.createForWorldDMs`. Wired alongside `createNotificationsForAdmins` in: characters/create.ts, quests/update-status.ts (PENDING_APPROVAL + PENDING_RESULT_APPROVAL), marketplace/transactions.ts (buy + sell pending).

**Item 2 — Self-approval guard on quest result**
`approveResult` and `rejectResult` in `dm/worlds/[worldId]/quests/+page.server.ts` now check that the approving DM is not the quest's own DM. Returns 403 if they match.

**Item 3 — Dnd5eCharacterClass schema move**
`CharacterClass` model renamed to `Dnd5eCharacterClass` and moved from `characters.prisma` to `dnd5e.prisma` (schema `dnd5e`, `@@map("character_classes")`). Back-relation `character Character @relation(...)` added with onDelete:Cascade. All `db.characterClass` / `tx.characterClass` references updated in 4 dnd5e DB API files. **REQUIRES db:push + db:generate.**

### Session 26 — Feats + ASI System (2026-06-02)

**Schema (`dnd5e.prisma`)**
- `Dnd5eFeat` model — name, description, snippet, repeatable, categories, prerequisites, detailsUrl, isAvailable, isEpicBoon, sortOrder
- `Dnd5eCharacterFeat` model — join table character ↔ feat with Character back-relation
- `asiChoices Json?` added to `Dnd5eCharacterSheet`
**Requires db:push + db:generate**

**DB API (all dnd5e/)**
- `read/dnd5e/get-feats.ts` — getAll, getAllForAdmin, getById
- `write/dnd5e/feats.ts` — create, update, delete
- `write/dnd5e/update-character-asi.ts` — saveDnd5eAsiChoices
- `write/dnd5e/update-character-feats.ts` — addDnd5eCharacterFeat, removeDnd5eCharacterFeat
- `read/dnd5e/get-character-sheet.ts` — updated to compute ASI slots from class features, load chosen feats

**ASI slot detection**
- Features named "Ability Score Improvement" → ASI slot, canEpicBoon if totalLevel ≥ 19
- Features named "Epic Boon Feat" → Epic Boon slot (unconditional)
- Matched against saved asiChoices by sourceClassId + sourceLevel

**Admin CRUD**
- `game-systems/[id]/dnd5e/feats/` — list with expandable rows, inline edit, create, delete
- Import/export: feats tab added to `data/import/dnd5e/` and `data/export/dnd5e/`
- Feats link added to game system pages

**@core/ui**
- `Dnd5eAsiFeatsPanel.svelte` — slot resolution UI (ASI +2 / +1+1 / feat picker with epic boon filter)
- `Dnd5eCharacterSheet.svelte` — updated to show pending slots notice + chosen feats
- `shared/ui/index.ts` — exports `Dnd5eAsiFeatsPanel`

**Frontend**
- `characters/[id]/+page.server.ts` — loads availableFeats, adds saveAsi/addFeat/removeFeat actions
- `characters/[id]/+page.svelte` — shows Dnd5eAsiFeatsPanel when pending slots

### Session 26b — Admin Expandable Rows (2026-06-02)

Backgrounds, species, feats pages converted from table layout to flexbox rows:
- Click any row to expand — shows full description, all fields formatted
- Edit button in expanded panel opens inline edit form
- Mobile-friendly: flexbox with flex-wrap, no fixed column widths
- `backgrounds/+page.server.ts` — added `updateBackground` action (was missing)

### Session 26c — Game System Admin Restructure (2026-06-02)

Moved dnd5e-specific admin routes under `dnd5e/` subfolder:
- `game-systems/[id]/classes/` → `game-systems/[id]/dnd5e/classes/`
- `game-systems/[id]/backgrounds/` → `game-systems/[id]/dnd5e/backgrounds/`
- `game-systems/[id]/species/` → `game-systems/[id]/dnd5e/species/`
- `game-systems/[id]/data/import/` → `game-systems/[id]/data/import/dnd5e/`
- `game-systems/[id]/data/export/` → `game-systems/[id]/data/export/dnd5e/`
All internal links updated. `progression/` stays at root (universal).

### Session 26d — Point Buy Calculator (2026-06-02)

`apps/frontend/src/routes/(protected)/tools/dndpointbuy/+page.svelte` — standalone tool, no DB, no server.
- Standard 27-point buy with cost table (8-15)
- User-configurable bonus pool: 1:1 cost, up to 17 max per stat
- Added to Community nav group in root layout

### Session 22-23 — Character System Refactor (2026-06-01)

**Schema**
- `characters.prisma` — removed `speciesId`, `backgroundId`, `pendingChanges`; added `level Int @default(0)`; added `dnd5eSheet Dnd5eCharacterSheet?` relation
- `dnd5e.prisma` — added `Dnd5eCharacterSheet` model

**Universal character DB API** (zero dnd5e knowledge)
- `write/characters/create.ts`, `update.ts`, `approve.ts`, `level-check.ts`, `adjust-currency.ts` — all dnd5e removed
- `read/characters/get-by-id.ts`, `get-all.ts` — no enrichment, uses `character.level`
- Deleted: `write/characters/update-classes.ts`

**dnd5e character DB API** (new files in `write/dnd5e/` and `read/dnd5e/`)
- `write/dnd5e/create-character.ts`, `approve-character.ts`, `update-character.ts`, `update-classes.ts`
- `read/dnd5e/get-character-sheet.ts`, `enrich-signups.ts`

**Level references fixed** — all use `character.level` now:
- `write/quests/signup.ts`, `submit-result.ts`, `delete.ts`
- `write/marketplace/transactions.ts`
- `read/quests/get-by-id.ts` — uses `enrichDnd5eSignups` from dnd5e layer
- `apps/discord/src/commands/characters.ts`

**UI components extracted to `@core/ui`**
- `shared/ui/src/gamesystems/dnd5e/Dnd5eCharacterSheet.svelte`
- `shared/ui/src/gamesystems/dnd5e/Dnd5eCharacterCreation.svelte`
- `shared/ui/index.ts` — exports both components

**Server + svelte files** — all dispatch by system, use `charSheet` from `dnd5e.getCharacterSheet()`

### Session 24 — Quest DM Approval Fix (2026-06-01)

**Problem:** DM with `canManage` had no way to approve quests from their own quest detail page — had to navigate to world quest list.

**Option B** — `dm/quests/[id]/+page.server.ts`:
- Added `checkCanApprove()` — verifies DM has `canManage` on quest's world AND is not the quest's own DM (self-approval guard)
- Added `approve` action (`PENDING_APPROVAL → PUBLISHED`) and `reject` action (`PENDING_APPROVAL → CANCELLED`)
- `canApprove` passed to page

**Option C** — `dm/worlds/[worldId]/+page.svelte`:
- Pending quests stat card now links to `?status=PENDING_APPROVAL` instead of unfiltered list


### Session 21 — Import/Export (2026-06-01)

**Architecture**
- Established consistent `data/import` + `data/export` pattern for all data-owning areas
- Each area owns its own import and export — no shared api/export routes
- Structure: `game-systems/[id]/data/import|export`, `game-systems/[id]/progression/data/import|export`, `marketplace/data/import|export`
- Pattern established for future systems: `game-systems/[id]/data/` for system-specific data

**New routes**
- `apps/admin/src/routes/(app)/game-systems/[id]/data/import/+page.server.ts` — moved from `game-systems/[id]/import/`
- `apps/admin/src/routes/(app)/game-systems/[id]/data/import/+page.svelte`
- `apps/admin/src/routes/(app)/game-systems/[id]/data/export/+server.ts` — new, exports classes/features/subclasses/species/backgrounds
- `apps/admin/src/routes/(app)/game-systems/[id]/progression/data/import/+page.server.ts` — new
- `apps/admin/src/routes/(app)/game-systems/[id]/progression/data/import/+page.svelte` — new
- `apps/admin/src/routes/(app)/game-systems/[id]/progression/data/export/+server.ts` — new
- `apps/admin/src/routes/(app)/marketplace/data/import/+page.server.ts` — moved from `marketplace/import/`
- `apps/admin/src/routes/(app)/marketplace/data/import/+page.svelte`
- `apps/admin/src/routes/(app)/marketplace/data/export/+server.ts` — new

**Deleted routes**
- `apps/admin/src/routes/(app)/game-systems/[id]/import/` — replaced by `data/import/`
- `apps/admin/src/routes/(app)/marketplace/import/` — replaced by `data/import/`

**Updated sveltes** (import links updated to new paths)
- `apps/admin/src/routes/(app)/game-systems/+page.svelte`
- `apps/admin/src/routes/(app)/game-systems/[id]/+page.svelte`
- `apps/admin/src/routes/(app)/game-systems/[id]/classes/+page.svelte`
- `apps/admin/src/routes/(app)/game-systems/[id]/progression/+page.svelte`
- `apps/admin/src/routes/(app)/marketplace/items/+page.svelte`

**DB API**
- `shared/database/dbapi/read/marketplace/get-items.ts` — `getAllMarketplaceItemsForExport()` added (no pagination, select only export columns)
- `shared/database/dbapi/write/marketplace/import.ts` — `ImportRow.weight` accepts `null`; weight sanitized on import to prevent NaN storage
- `shared/database/index.ts` — `marketplace.items.getAllForExport` exported

**Bug fixed**
- Marketplace import was storing NaN for weight when source data had empty/non-numeric values (e.g. blank, N/A)
- 327 affected items identified, export handled NaN gracefully, reimport cleaned all to null
- Import now sanitizes weight: only stores numeric values, null otherwise