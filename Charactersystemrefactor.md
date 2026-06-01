# Character System Refactor Plan
> Status: PLANNED — do not start until explicitly scheduled
> Prerequisite for: any second game system beyond dnd5e
> Prerequisite: ImportExportPlan.md must be complete first (need progression + all data exported before reset)
> DB reset: approved — no data migration SQL needed
> Estimated effort: 2 sessions

---

## Goal

Surgically separate dnd5e-specific character concerns from universal character platform concerns, without a plugin abstraction. dnd5e stays fully integrated and unchanged in behaviour. The result is a clean boundary that lets any second system be added by writing new files, not modifying existing ones.

---

## Current State — What's Wrong

### Fields on `Character` that don't belong there
```
speciesId    String?   ← FK to dnd5e.species
backgroundId String?   ← FK to dnd5e.backgrounds
pendingChanges Json?   ← structure is 100% dnd5e (speciesId, backgroundId, classes[])
```

### `CharacterClass` model in `characters.prisma`
```
classId        String   ← FK to dnd5e.classes (cross-schema, no Prisma relation)
subclassId     String?  ← FK to dnd5e.subclasses (cross-schema, no Prisma relation)
allocatedLevel Int      ← dnd5e multi-class concept, meaningless for other systems
```
This model is entirely dnd5e but lives in the universal `characters` schema.

### The level problem — the deepest coupling
Every cross-cutting concern that is otherwise universal reaches into dnd5e to get one number: the character's level.

**`quests/signup.ts`**
```ts
const totalLevel = await db.characterClass.aggregate({ _sum: { allocatedLevel: true } })
```

**`quests/submit-result.ts`**
```ts
const totalLevel = charLevels.reduce((s, c) => s + (c._sum.allocatedLevel ?? 0), 0)
const avgPartyLevel = totalLevel / charIds.length
```

**`characters/get-by-id.ts` — `enrichCharacter()`**
```ts
const totalLevel = enrichedClasses.reduce((sum, c) => sum + c.allocatedLevel, 0)
```

**`apps/discord/src/commands/characters.ts`**
```ts
const level = c.totalLevel ?? c.classes.reduce((s, cc) => s + cc.allocatedLevel, 0)
```

A non-dnd5e character has no `CharacterClass` rows. Level checks return 0. Quest signup fails. Party level calculation breaks. Discord display is wrong.

### DB API files with dnd5e concerns in the universal layer

| File | dnd5e-specific content |
|------|------------------------|
| `read/characters/get-by-id.ts` | `enrichCharacter()` queries `dnd5eClass`, `dnd5eSubclass`, `dnd5eSpecies`, `dnd5eBackground`, computes `totalLevel` from `allocatedLevel` |
| `write/characters/create.ts` | Validates `speciesId`, `backgroundId`, `classes` required; creates `CharacterClass` rows |
| `write/characters/update.ts` — `submitStructuralChanges` | `pendingChanges` structure: `{speciesId, backgroundId, classes[]}` |
| `write/characters/update.ts` — `updateCharacter` | Admin bypass writes `speciesId`, `backgroundId` |
| `write/characters/update-classes.ts` | Entirely dnd5e — replaces `CharacterClass` rows |
| `write/characters/approve.ts` — `pendingChanges` application | Applies `speciesId`, `backgroundId`, `classes[]` from `pendingChanges` |
| `write/characters/level-check.ts` | Uses `progressionThreshold` XP system + `allocatedLevel` sum — dnd5e level model |

### UI files with dnd5e hardcoded

| File | dnd5e-specific content |
|------|------------------------|
| `frontend/characters/new/+page.server.ts` | Always calls `dnd5e.getSystemData()` |
| `frontend/characters/new/+page.svelte` | Species selector, background selector, class+level allocation rows — entirely dnd5e |
| `frontend/characters/[id]/+page.server.ts` | Calls `dnd5e.getSystemData()` for all characters |
| `frontend/characters/[id]/+page.svelte` | 757 lines, entirely dnd5e sheet rendering, `allocatedLevel` throughout |
| `admin/characters/[id]/+page.server.ts` | Calls `dnd5e.getSystemData()` |
| `admin/characters/[id]/+page.svelte` | 563 lines, dnd5e sheet rendering |
| `frontend/dm/worlds/[worldId]/characters/[charId]/+page.server.ts` | Calls `dnd5e.getSystemData()` |
| `frontend/dm/worlds/[worldId]/characters/[charId]/+page.svelte` | dnd5e features rendering |

---

## The Plan

### Principle
No plugin abstraction. No interfaces. Clean file/folder boundaries with explicit `if dnd5e / else if systemX` branches in the ~8 places where systems diverge. dnd5e code lives in dnd5e folders. Universal code lives in character folders.

---

## Session 1 — Schema Changes + DB Reset + Level Field

> DB reset is approved. No data migration SQL needed. Export all data first using ImportExportPlan.md workflow.

### Pre-session checklist
- [ ] Export progression thresholds (ImportExportPlan.md step 1)
- [ ] Export all dnd5e game data (classes, features, subclasses, species, backgrounds)
- [ ] Export all marketplace items
- [ ] Note down platform settings, Discord config, roles

### Step 1 — Make all schema changes at once

**`characters.prisma`** — remove dnd5e fields, add `level`, add `dnd5eSheet` relation:
```prisma
model Character {
  // Remove these:
  // speciesId    String?
  // backgroundId String?
  // pendingChanges Json?

  // Add this:
  level        Int    @default(0) @map("level")

  // Add relation:
  dnd5eSheet   Dnd5eCharacterSheet?
  ...
}
```

**`dnd5e.prisma`** — add `Dnd5eCharacterSheet` model:
```prisma
model Dnd5eCharacterSheet {
  id             String    @id @default(uuid())
  characterId    String    @unique @map("character_id")
  speciesId      String?   @map("species_id")
  backgroundId   String?   @map("background_id")
  pendingChanges Json?     @map("pending_changes")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt      @map("updated_at")

  @@map("character_sheets")
  @@schema("dnd5e")
}
```

Note: `CharacterClass` stays in `characters.prisma` for now. It is dnd5e-specific but moving it in the same session risks too many cascading changes. It can be renamed/moved in a future cleanup.

### Step 2 — DB reset and push

```bash
# Drop and recreate all schemas
pnpm --filter @core/database db:reset  # or equivalent

# Push new schema
pnpm --filter @core/database db:push
pnpm --filter @core/database db:generate
```

### Step 3 — Reimport all data

1. Reimport dnd5e game data via admin import page (classes → features → subclasses → subclass features → species → traits → backgrounds)
2. Reimport progression thresholds via new progression import tab
3. Reimport marketplace items via marketplace import page
4. Reconfigure platform settings and Discord

### Step 4 — Update `Character.level` on every level change

Patch these files to write `character.level` whenever level changes:

**`write/characters/level-check.ts`** — after computing `newEarned`, add:
```ts
await tx.character.update({ where: { id: characterId }, data: { level: newEarned } });
```

**`write/characters/approve.ts`** — after applying `pendingChanges.classes`, recompute and write level:
```ts
const newLevel = pending.classes.reduce((s, c) => s + c.allocatedLevel, 0);
await tx.character.update({ where: { id }, data: { level: newLevel } });
```

**`write/characters/create.ts`** — compute initial level from classes input:
```ts
const initialLevel = input.classes?.reduce((s, c) => s + c.allocatedLevel, 0) ?? 0;
// include level: initialLevel in character create data
```

---

## Session 2 — DB API Sculpt + UI Separation

### Step 6 — New file: `read/dnd5e/get-character-sheet.ts`

Extract `enrichCharacter()` from `get-by-id.ts` into its own dnd5e-namespaced function:

```ts
// shared/database/dbapi/read/dnd5e/get-character-sheet.ts
export async function getDnd5eCharacterSheet(characterId: string, gameSystemId: string) {
    // Load Dnd5eCharacterSheet for this character
    const sheet = await db.dnd5eCharacterSheet.findUnique({ where: { characterId } });
    if (!sheet) return null;

    // Load classes (still in characters schema for now)
    const classes = await db.characterClass.findMany({
        where: { characterId },
        orderBy: { allocatedLevel: 'desc' },
    });

    // Enrich with dnd5e references (existing enrichCharacter logic moved here)
    const classIds    = classes.map(c => c.classId);
    const subclassIds = classes.map(c => c.subclassId).filter(Boolean) as string[];
    const [classRecords, subclassRecords, speciesRecord, backgroundRecord] = await Promise.all([
        classIds.length    ? db.dnd5eClass.findMany({ where: { id: { in: classIds } }, include: { features: { orderBy: { requiredLevel: 'asc' } } } }) : [],
        subclassIds.length ? db.dnd5eSubclass.findMany({ where: { id: { in: subclassIds } }, include: { features: { orderBy: { requiredLevel: 'asc' } } } }) : [],
        sheet.speciesId    ? db.dnd5eSpecies.findUnique({ where: { id: sheet.speciesId }, include: { traits: true } }) : null,
        sheet.backgroundId ? db.dnd5eBackground.findUnique({ where: { id: sheet.backgroundId } }) : null,
    ]);

    // ... same enrichment logic as current enrichCharacter() ...

    return { sheet, enrichedClasses, speciesRef: speciesRecord, backgroundRef: backgroundRecord };
}
```

Export as `dnd5e.getCharacterSheet(characterId, gameSystemId)`.

### Step 7 — Simplify `read/characters/get-by-id.ts`

Remove `enrichCharacter()` entirely. `getCharacterById` returns the raw character + classes (for `totalLevel` backcompat during transition):

```ts
export async function getCharacterById(id: string) {
    return db.character.findUnique({
        where:   { id },
        include: {
            classes:   { orderBy: { allocatedLevel: 'desc' } },
            inventory: true,
        },
    });
}
```

`totalLevel` is now `character.level` — no more compute on read.

### Step 8 — Sculpt `write/characters/create.ts`

Split into two functions:

**Universal character creation** (stays in `write/characters/create.ts`):
- Creates `Character` row with universal fields only
- No `speciesId`, `backgroundId`, `classes` validation
- No `CharacterClass` rows

**dnd5e character creation** (new file `write/dnd5e/create-character.ts`):
- Calls universal `createCharacter()`
- Validates dnd5e-specific requirements (`speciesId`, `backgroundId`, `classes` required)
- Creates `CharacterClass` rows
- Creates `Dnd5eCharacterSheet` row
- Writes `character.level`

Export as `dnd5e.createCharacter(input, actorId)`.

The frontend `characters/new/+page.server.ts` calls `dnd5e.createCharacter()` (since only dnd5e exists now). When system X is added, it calls `systemX.createCharacter()`.

### Step 9 — Sculpt `write/characters/approve.ts`

The `pendingChanges` application block is dnd5e-specific. Move it to `write/dnd5e/approve-character.ts`:

```ts
// write/dnd5e/approve-character.ts
export async function applyDnd5ePendingChanges(tx, characterId, pending) {
    // existing logic: update CharacterClass rows, write speciesId/backgroundId to Dnd5eCharacterSheet
    // compute new level and write to character.level
}
```

`approve.ts` (universal) becomes:
```ts
// detect system from character.gameSystemId
if (character.gameSystemId === dnd5eId) {
    await applyDnd5ePendingChanges(tx, id, pending);
} // else if systemX: await applySystemXPendingChanges(tx, id, pending)
```

### Step 10 — Fix all level references to use `character.level`

**`quests/signup.ts`** — replace aggregate query:
```ts
// Before
const totalLevel = await db.characterClass.aggregate({ _sum: { allocatedLevel: true } })
const level = totalLevel._sum.allocatedLevel ?? 0

// After
const char = await db.character.findUnique({ where: { id: characterId }, select: { level: true } });
const level = char?.level ?? 0;
```

**`quests/submit-result.ts`** — replace aggregate:
```ts
// Before
const charLevels = await db.characterClass.groupBy(...)
const totalLevel = charLevels.reduce(...)

// After
const chars = await db.character.findMany({ where: { id: { in: charIds } }, select: { id: true, level: true } });
const totalLevel = chars.reduce((s, c) => s + c.level, 0);
```

**`apps/discord/src/commands/characters.ts`**:
```ts
// Before
const level = c.totalLevel ?? c.classes.reduce(...)

// After
const level = c.level ?? 0;
```

### Step 11 — Extract character sheet UI into system-specific components

**New file: `apps/frontend/src/lib/components/sheets/Dnd5eCharacterSheet.svelte`**
- Extract the dnd5e-specific sheet rendering from `characters/[id]/+page.svelte` (the class allocation editor, species/background display, features section)
- Props: `{ character, systemData, canEdit }`

**Updated `characters/[id]/+page.svelte`**:
```svelte
{#if data.gameSystem?.slug === 'dnd5e'}
  <Dnd5eCharacterSheet character={data.character} systemData={data.systemData} canEdit={true} />
{:else}
  <div class="card"><p>Character sheet not yet available for {data.gameSystem?.name}.</p></div>
{/if}
```

Same pattern for:
- `admin/characters/[id]/+page.svelte` → `Dnd5eCharacterSheet` with `canEdit={true}` (admin mode)
- `frontend/dm/worlds/[worldId]/characters/[charId]/+page.svelte` → `Dnd5eCharacterSheet` with `canEdit={false}` (read-only + diff highlights)

**New file: `apps/frontend/src/lib/components/sheets/Dnd5eCharacterCreation.svelte`**
- Extract the dnd5e creation form fields from `characters/new/+page.svelte`
- Props: `{ systemData, classRows, onClassRowsChange }`

**Updated `characters/new/+page.svelte`**:
```svelte
{#if selectedSystemSlug === 'dnd5e'}
  <Dnd5eCharacterCreation {systemData} bind:classRows />
{:else}
  <p>Character creation for {selectedSystemName} coming soon.</p>
{/if}
```

### Step 12 — Update `characters/new/+page.server.ts`

```ts
// Load system data only for dnd5e
const systemData = gameSystem?.slug === 'dnd5e'
    ? await dnd5e.getSystemData(gameSystem.id)
    : null;
```

Similarly for `characters/[id]/+page.server.ts` and all admin/DM Hub equivalents.

### Step 13 — Update `dnd5e` export in `index.ts`

Add new exports:
```ts
export const dnd5e = {
    ...existing,
    createCharacter:   createDnd5eCharacter,       // new
    getCharacterSheet: getDnd5eCharacterSheet,      // new
    applyPendingChanges: applyDnd5ePendingChanges,  // new
};
```

---

## Files Changed — Complete List

### Session 1
| File | Change |
|------|--------|
| `shared/database/prisma/characters.prisma` | Add `level Int`, remove `speciesId`, `backgroundId`, `pendingChanges`, add `dnd5eSheet` relation |
| `shared/database/prisma/dnd5e.prisma` | Add `Dnd5eCharacterSheet` model |
| `shared/database/dbapi/write/characters/level-check.ts` | Write `character.level` after computing `newEarned` |
| `shared/database/dbapi/write/characters/approve.ts` | Write `character.level` after applying class changes |
| `shared/database/dbapi/write/characters/create.ts` | Include `level` in initial character create |
| Data migration SQL | Backfill `level`, create `Dnd5eCharacterSheet` rows |

### Session 2
| File | Change |
|------|--------|
| `shared/database/dbapi/read/dnd5e/get-character-sheet.ts` | **NEW** — extracted from `get-by-id.ts` |
| `shared/database/dbapi/read/characters/get-by-id.ts` | Remove `enrichCharacter()`, simplify |
| `shared/database/dbapi/write/dnd5e/create-character.ts` | **NEW** — dnd5e character creation |
| `shared/database/dbapi/write/dnd5e/approve-character.ts` | **NEW** — dnd5e pendingChanges application |
| `shared/database/dbapi/write/characters/create.ts` | Universal only — remove dnd5e validation |
| `shared/database/dbapi/write/characters/approve.ts` | Universal status + system dispatch |
| `shared/database/dbapi/write/characters/update.ts` | Remove `speciesId`/`backgroundId` from direct fields |
| `shared/database/dbapi/write/quests/signup.ts` | Use `character.level` instead of aggregate |
| `shared/database/dbapi/write/quests/submit-result.ts` | Use `character.level` instead of aggregate |
| `shared/database/index.ts` | Add `dnd5e.createCharacter`, `dnd5e.getCharacterSheet`, `dnd5e.applyPendingChanges` |
| `apps/discord/src/commands/characters.ts` | Use `character.level` |
| `apps/frontend/src/lib/components/sheets/Dnd5eCharacterSheet.svelte` | **NEW** — extracted sheet component |
| `apps/frontend/src/lib/components/sheets/Dnd5eCharacterCreation.svelte` | **NEW** — extracted creation component |
| `apps/frontend/src/routes/(protected)/characters/new/+page.server.ts` | Conditional `dnd5e.getSystemData()` |
| `apps/frontend/src/routes/(protected)/characters/new/+page.svelte` | System branch for creation form |
| `apps/frontend/src/routes/(protected)/characters/[id]/+page.server.ts` | Conditional `dnd5e.getCharacterSheet()` |
| `apps/frontend/src/routes/(protected)/characters/[id]/+page.svelte` | System branch for sheet |
| `apps/admin/src/routes/(app)/characters/[id]/+page.server.ts` | Conditional `dnd5e.getCharacterSheet()` |
| `apps/admin/src/routes/(app)/characters/[id]/+page.svelte` | System branch for sheet |
| `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/+page.server.ts` | Conditional `dnd5e.getCharacterSheet()` |
| `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/+page.svelte` | System branch for sheet |

---

## Adding a Second System After This Refactor

Everything needed is additive — no existing files modified:

1. Create `shared/database/dbapi/write/systemX/create-character.ts`
2. Create `shared/database/dbapi/write/systemX/approve-character.ts`
3. Create `shared/database/dbapi/read/systemX/get-character-sheet.ts`
4. Create `apps/frontend/src/lib/components/sheets/SystemXCharacterSheet.svelte`
5. Create `apps/frontend/src/lib/components/sheets/SystemXCharacterCreation.svelte`
6. Add `systemX.createCharacter` to `index.ts`
7. Add `{:else if systemX}` branches in the 4 UI files that have system branches

The platform workflows (approval, quest signup, result distribution, Discord notifications, marketplace, availability) are all untouched — they read `character.level` and work with any system.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Data migration fails halfway | Run migration in a transaction; validate row counts before and after removing old fields |
| `character.level` gets out of sync | Write it in every code path that changes level (level-check, approve, create); add a `characters.recalculateLevel(id)` utility for manual repair |
| `CharacterClass` still in universal schema | Acceptable for now — it's dnd5e-specific but contained; can be renamed/moved in a future cleanup pass once the bigger refactor is stable |
| Type errors after removing `speciesId`/`backgroundId` from `Character` | Compiler will catch every reference; fix systematically before `db:push` |

---

## What This Does NOT Change

- All approval workflow logic (status transitions, audit, notifications)
- All quest workflows (signup, result, level-up detection)
- All marketplace workflows
- All Discord commands
- All availability logic
- Admin RBAC and permissions
- World management
- DM Hub (except character sheet rendering)
- The dnd5e game data admin pages (classes, species, backgrounds, progression)
- Any existing dnd5e character data — zero data loss