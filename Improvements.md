### Improvements and BUGS TO BE FIXED ###

# Platform

# RBAC

# Database

# UI - Non Specific to Features
    - Mobile: Tables all over the app break on mobile — FIXED (table-wrap class + min-width:0 on .sections grid children)
    - Mobile: Flex rows without flex-wrap — FIXED (added flex-wrap:wrap to all inline flex rows)

# Feature Specific
## Availability
    - Frontend:
        - Mobile: tooltip with availability button placed outside viewport — FIXED (flip below cell when near top of screen)

## Characters
    - Frontend:
        - New character creation missing world selector — FIXED
        - DM Hub character detail does not list character features and their details — FIXED
        - Deleted characters show raw UUID instead of name in quest rewards table, signups list, and other references — need graceful fallback (e.g. "Deleted character")

    - Admin:

## Navigation
    - Frontend:

    - Admin:

## Gamesystem

## World
    - Admin/Frontend:
        - World item overrides table breaks on mobile — FIXED (table-wrap + layout.css min-width:0)

## Quests
    - Frontend:
        - Completed quests still show edit/signup UI — FIXED (isReadOnly fieldset + status guard on signup action)
        - Player quest signup button showing for non-PUBLISHED quests — FIXED

## Journal
    - Frontend:
        - Sidebar overlays menu on mobile — FIXED (z-index:200, backdrop, padding-top for nav clearance)

## Import/Export
    - Marketplace import stored NaN for non-numeric weight values — FIXED (sanitize on import, handle on export)

## Discord
    - Discord server scope was hardcoded to global — FIXED (scope selector on add + inline scope change on existing)
    - CHAR_APPROVED never enqueued — FIXED
    - No pending/approval notifications — FIXED (CHAR_PENDING, QUEST_PENDING_APPROVAL, QUEST_RESULT_PENDING, MARKET_PENDING)
    - No world routing on character/market notifications — FIXED
    - Inconsistent siteUrl links on quest notifications — FIXED
    - APPROVALS channel type missing from schema — FIXED (requires db:push)

## Notifications
- DMs receive some in-app notifications with wrong links (admin paths) because they come from `createNotificationsForAdmins`.
  Solution: add `createNotificationsForWorldDMs(worldId, type, title, body, link)` to `notifications.ts` — sends to all DMs with management capability for the given world with correct `/dm/worlds/[worldId]/...` paths.
  For each relevant event, fire BOTH channels for DMs:
  - `createNotificationsForWorldDMs(worldId, ...)` — in-app bell notification with DM path
  - `queueDiscordNotification(...)` to world APPROVALS channel — already wired, keep as-is
  Affected write functions: character create (pending approval), quests/update-status (pending approval, result pending), marketplace/transactions (purchase/sell pending).

## Quest Approval
- ✅ Self-approval guard added to approveResult/rejectResult in dm/worlds/[worldId]/quests/+page.server.ts A DM with `canManage` can approve their own quest. Need to check that the quest's `dmProfileId` does not belong to the approving user before allowing `PENDING_APPROVAL → PUBLISHED`. Fix in `dm/worlds/[worldId]/quests/+page.server.ts` approve action — fetch the quest, compare `quest.dmProfileId` against the current user's DM profile id, reject with 403 if they match.

## World DM Permissions
- Quest approval requires `canManage = true` on the WorldDM assignment. DMs with "Quest only" access cannot approve quests — they only see "Awaiting approval". This is intentional but may be confusing. Consider renaming "Quest only" / "Full access" labels to make it clearer that "Full access" includes quest approval capability. Also consider showing the DM their own permission level somewhere in the DM hub.

## Session 51+ Completed
- Character page fully refactored: universal +page.svelte, _sheets/Dnd5eSheetSection.svelte, _sheets/dnd5e.actions.server.ts, _loaders/dnd5e.server.ts
- Dnd5eCharacterSheet.svelte: pure UI component, owns all dnd5e rendering — ability scores, species/background/classes, ASI/feats panel
- ASI/Feat system fully working: per-slot save, one row per slot enforced, orphan cleanup on load
- Ability scores show +N ASI label under affected stats
- ASI removal correctly reverses stat bump
- Schema: Dnd5eCharacterFeat gains asiStat1/asiAmount1/asiStat2/asiAmount2
- dispatchApproveCharacter/dispatchRejectCharacter: system-agnostic approval routing
- TODO: Admin character page — same refactor as frontend (after FE is complete)

## Sessions 61-70 Completed

### Character Sheet Architecture — Final
- Universal +page.svelte / +page.server.ts — no dnd5e content
- _sheets/Dnd5eSheetSection.svelte — player: fetch+deserialize, submit for approval
- _sheets/DmDnd5eSheetSection.svelte — DM canManage: direct save; read-only otherwise  
- _sheets/AdminDnd5eSheetSection.svelte — always canEdit=true, direct save
- _sheets/dnd5e.actions.server.ts — per-route, appropriate guards
- _loaders/dnd5e.server.ts — per-route thin wrapper

### Dnd5eCharacterSheet.svelte — Pure UI (no SvelteKit imports)
- Callbacks: onSaveAbilityScores, onSubmitChanges, onSubmitLevelUp, onSaveSlot, onRemoveFeat
- canEdit, canManage, editBlockedReason props
- ASI slots: +2 one stat / +1+1 two stats / feat picker
- Background feat slots: category-filtered picker or locked auto-grant
- Ability scores: +N ASI label per stat
- Edit-blocked banner when canEdit=false (shows reason)
- Slot state defaults: background_feat and epic_boon default to 'feat' mode

### Background Feat Grant System
- Dnd5eBackground gains grantsFeatCategory (player picks from category) and grantsFeatId (FK, auto-granted locked)
- syncBackgroundFeatGrant(tx, characterId, newBgId, oldBgId) — called on direct save and approval
- Auto-heal on sheet load: if grantsFeatId set but no row exists, creates row silently
- Dnd5eFeat back-relation: grantedByBackgrounds @relation("BackgroundGrantedFeat")
- Admin backgrounds CRUD: feat dropdown by name (not UUID), grantsFeatCategory text field
- Import/export: grantsFeatCategory and grantsFeatId columns added

### Schema Changes (db:push required)
- Dnd5eBackground: grantsFeatCategory String?, grantsFeatId String? (FK Dnd5eFeat)
- Dnd5eFeat: grantedByBackgrounds Dnd5eBackground[] @relation("BackgroundGrantedFeat")
- Dnd5eCharacterFeat: asiStat1, asiAmount1, asiStat2, asiAmount2 (stored stat bump choices)

### Bug Fixes
- ASI removal now reverses stat bump using stored asiStat1/2
- Duplicate orphan feat rows cleaned on load
- Slot keyed by sourceClassId+sourceLevel — one row per slot enforced
- FEAT_STATS uppercase enum values (was title case, caused 500 on ASI save)
- Admin marketplace nav import link fixed
- DM view: canManage DMs edit directly, quest-only DMs read-only