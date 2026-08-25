# Improvements Scratchpad

> Work-in-progress notes and completed checklists. **Canonical history:** [CHANGELOG.md](../CHANGELOG.md).
> Do not treat this as reference documentation — update reference docs in `docs/` when behavior changes.

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
        - Player page: dashboard with read-only heatmap + timeline blocks + add/edit modal — DONE (Session 80)
        - Mobile: horizontal scroll on week grid — FIXED (day tabs + single-day view ≤768px)
        - DM views (`/dm`, world dashboard, world quests) aligned to same layout — DONE (Session 80)

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
## Session 75 Completed
- Quest rejection now goes to DRAFT (not CANCELLED) so DM can edit and resubmit — FIXED
- LEVEL_UP_PENDING and LEVEL_DOWN_PENDING characters can no longer sign up for quests — FIXED
- PENDING_CONFIRMATION signup now expires after 8h with notifications — FIXED (expireStalePromotions every 15min)
- rejectQuestResult now notifies DM with reviewNote — FIXED
- itemGrantMap now built inside db.$transaction (was outside, inconsistent on retry) — FIXED
- Quest CANCELLED from PENDING_RESULT_APPROVAL now cleans up QuestResult records — FIXED
- Duplicate CHARACTER_APPROVED/REJECTED notifications removed from updateCharacterStatus — FIXED
- Zero-player quest result hard block removed — FIXED
- Signup capacity race condition reduced (count moved inside transaction) — FIXED
- Cancelled signup now notifies the player — FIXED
- Character list now shows D&D 5e classes and subclasses — FIXED
- <a class="btn-primary"> elements appeared as ghost buttons — FIXED (a element styles moved to @layer base)
- All buttons rendered the same due to double Tailwind/forms plugin processing — FIXED (deleted layout.css, strategy: class)
- btn-ghost + inline color:var(--color-danger) pattern replaced with btn-danger throughout — FIXED
- Item rarity badges now use fixed D&D 5e convention colours independent of theme — FIXED
- rarityColors defined in 3 separate svelte files — FIXED ($lib/rarity.ts single source)
- User theme selection with live preview and persistence — NEW

## Session 77 Completed
- Skill grant system: `grantsSkills`, `grantsExpertise`, `grantsHalfSkills`, `grantsSavingThrows`, `skillChoiceCount`, `skillChoicePool` added to all 5 source entities — DONE
- Class-level saving throws and skill pool editable in class detail admin form — DONE
- Species full edit form added to admin (name, description, source, link, isAvailable, isSubrace, isLegacy, sortOrder) — DONE
- Species traits grant fields in admin edit form — DONE
- Feats grant fields in admin create and edit forms — DONE
- Class features and subclass features grant fields in admin edit forms — DONE
- `updateClassSavingThrows` / `updateClassSkillPool` write functions added — DONE
- Character creation wizard Skills step (step 3) with full choice pool UI — DONE *(superseded: Session 79 moved all pools inline; no separate Skills step)*
- `Dnd5eSkillsPanel.svelte` rewritten for Float skill value system — DONE
- Character Mood moved to universal character page — DONE
- Import/Export all 7 tabs consistent with grant fields — DONE
- Wizard infinite reactive loop (`chosenClassSkills` filter) fixed with `untrack()` — DONE
- Dynamic child hrefs and activeMatch sub-route support in admin nav — DONE
- Marketplace filter buttons missing vertical spacing — FIXED
- Marketplace item detail field labels now use accent colour — FIXED (label-accent class)
- Mobile drawer stays open after navigation — FIXED (afterNavigate in AppShell)
- Section toggle buttons below 44px touch target — FIXED
## Session 78 Completed
- Skill/save override stuck at Expertise — FIXED (single Override sourceType replaces Player/DM/Admin multi-row; remove sweeps all legacy rows)
- window.prompt on skill edit — REPLACED with inline editor (proficiency buttons + note field + Save/Cancel)
- Skill/save tooltip showing grant sources (Background, Species trait, Class feature, Subclass feature, Feat) — NEW
- "Manual Override" badge + context hint in inline editor — NEW
- Orange dot indicator on overridden skills/saves — NEW
- `approve-character.ts` always writing `sourceType: 'SubclassFeature'` for class features — FIXED
- Wizard saving throws: Resilient showing as "Class skill choice" — FIXED (sourceDbId carries feat UUID to DB)
- Wizard saving throws: multiclass second-class features leaking saves — FIXED (filter against thisClassBaseSaves)
- Wizard saving throws: all saves written as sourceType: 'Class' — FIXED (each grant now carries correct sourceType + sourceId)

## Session 79 Completed
- D&D 5e character creation wizard rebuilt into `_wizard/` module — 6-step inline flow (Identity → Species → Background → Scores → Classes → Review)
- `WizardState` + `grants.ts` — centralised state, session persistence, pure derivation functions
- Inline choice pools at source (species traits, background, class features, feat grants, ASI slots)
- `FeatNestedPoolsInline` — feat-originated skill/save/tool/lang/expertise/dmg-mod pools (incl. ASI feat picks)
- Step validation fixes — `$derived.by()`, immutable state updates, creation-time species trait filter
- Background `bgFeatPick` no longer cleared on step remount — only on background change
- Expertise — review display + DB submission via `expertiseGrantSubmissions()`; class auto expertise submitted at creation
- `approve-character.ts` — preserves player-resolved pool grants when re-syncing fixed class feature grants
- Character sheet size picker hidden once size is already set on the sheet
- E2E suite rewritten for new wizard flow (`character-wizard.e2e.ts`)