# Character System Refactor
> Status: COMPLETE (Sessions 22-23)
> Prerequisite for: any second game system beyond dnd5e

---

## What Was Done

### Schema Changes
- `characters.prisma` — removed `speciesId`, `backgroundId`, `pendingChanges` from `Character`; added `level Int @default(0)`; added `dnd5eSheet Dnd5eCharacterSheet?` relation
- `dnd5e.prisma` — added `Dnd5eCharacterSheet` model with `speciesId`, `backgroundId`, `pendingChanges`, back-relation to `Character` with `onDelete: Cascade`

### Universal Character DB API (zero dnd5e knowledge)
- `write/characters/create.ts` — universal only: name, userId, gameSystemId, avatar, level, worldId
- `write/characters/update.ts` — free fields + universal admin update (no speciesId/backgroundId)
- `write/characters/approve.ts` — status transitions, audit, notifications only. Accepts optional `newLevel`
- `write/characters/level-check.ts` — writes `character.level` on level-up/down
- `write/characters/adjust-currency.ts` — uses `character.level` not `classes.reduce`
- `read/characters/get-by-id.ts` — raw character + classes + dnd5eSheet include. No enrichment
- `read/characters/get-all.ts` — dnd5eSheet include only, uses `character.level`

### dnd5e Character DB API (new files)
- `write/dnd5e/create-character.ts` — validates species/background/classes, creates Dnd5eCharacterSheet + CharacterClass rows, calls universal create
- `write/dnd5e/approve-character.ts` — applies pending classes/species/background, calls universal approve
- `write/dnd5e/update-character.ts` — `submitDnd5eStructuralChanges`, `updateDnd5eCharacterFields`
- `write/dnd5e/update-classes.ts` — replaces universal update-classes (deleted)
- `read/dnd5e/get-character-sheet.ts` — enriched sheet (class names, features, species traits, background)
- `read/dnd5e/enrich-signups.ts` — quest signup character enrichment (class names, species)

### Level references fixed (all use `character.level` now)
- `write/quests/signup.ts`
- `write/quests/submit-result.ts`
- `write/quests/delete.ts`
- `write/marketplace/transactions.ts`
- `read/quests/get-by-id.ts` — uses `enrichDnd5eSignups` from dnd5e layer
- `apps/discord/src/commands/characters.ts`

### DB Index (`shared/database/index.ts`)
- `characters.*` — removed `submitChanges`, `updateClasses` (moved to dnd5e)
- `dnd5e.*` — added `createCharacter`, `approveCharacter`, `rejectCharacter`, `submitChanges`, `updateFields`, `updateClasses`, `getCharacterSheet`, `enrichSignups`

### Server files (dispatch by system)
- `fe/characters/new/+page.server.ts` — calls `dnd5e.createCharacter()`
- `fe/characters/[id]/+page.server.ts` — calls `dnd5e.getCharacterSheet()`, passes `charSheet`
- `fe/dm/worlds/[worldId]/characters/+page.server.ts` — calls `dnd5e.approveCharacter/rejectCharacter`
- `fe/dm/worlds/[worldId]/characters/[charId]/+page.server.ts` — same + `charSheet`
- `admin/characters/[id]/+page.server.ts` — calls dnd5e functions, passes `charSheet`

### UI Components (extracted to @core/ui)
- `shared/ui/src/gamesystems/dnd5e/Dnd5eCharacterSheet.svelte` — read-only sheet rendering (species, background, class features)
- `shared/ui/src/gamesystems/dnd5e/Dnd5eCharacterCreation.svelte` — creation form fields (species, background, classes)
- `shared/ui/index.ts` — exports `Dnd5eCharacterSheet`, `Dnd5eCharacterCreation`

### Svelte files updated
- `fe/characters/new/+page.svelte` — `{#if dnd5e}` branch, uses `Dnd5eCharacterCreation`
- `fe/characters/[id]/+page.svelte` — uses `charSheet`, `enrichedClasses`, `Dnd5eCharacterSheet`
- `fe/dm/worlds/[worldId]/characters/[charId]/+page.svelte` — uses `charSheet`, `Dnd5eCharacterSheet`
- `admin/characters/[id]/+page.svelte` — uses `charSheet`, `Dnd5eCharacterSheet`

### Also deleted
- `write/characters/update-classes.ts` — moved to `write/dnd5e/update-classes.ts`

---

## Adding a Second Game System

Everything is additive — no existing files modified:

1. Create `write/dnd5e/` equivalent: `write/systemX/create-character.ts`, `approve-character.ts`, `update-character.ts`
2. Create `read/systemX/get-character-sheet.ts`
3. Create `shared/ui/src/gamesystems/systemX/SystemXCharacterSheet.svelte` + `SystemXCharacterCreation.svelte`
4. Export from `shared/ui/index.ts`
5. Add `systemX.*` to `shared/database/index.ts`
6. Add `{:else if systemX}` branches in the 4 server files and 4 svelte files that dispatch by system

Platform workflows (approval, quest signup, result distribution, Discord, marketplace) are all untouched — they read `character.level` and work with any system.

---

## What Remains (Future Sessions)

- **Session 27** — dnd5e sheet completion: stats/ability scores + feats on `Dnd5eCharacterSheet` model
- `CharacterClass` still in `characters.prisma` — it's dnd5e-specific but contained. Can be renamed `Dnd5eCharacterClass` and moved to `dnd5e.prisma` in a future cleanup pass once stable