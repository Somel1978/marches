# Encounter Planner

Standalone D&D 5e encounter calculator. Not tied to the quest system — it is a
player/DM-facing tool plus an admin editor for its variables.

| Surface | Route | Purpose |
|---|---|---|
| Frontend tool | `/tools/eplanner` | Standalone calculator (not tied to a quest) |
| Quest create/edit | `/dm/quests/new`, `/dm/quests/[id]`, `/dm/worlds/…/quests/new` | **Encounter Planner** tab — sets `Quest.missionXp` and persists `Quest.encounterPlan` |
| Admin | `/tools/eplanner` | Edit the lookup tables and config scalars (permission: `GameSystem`) |

Logic originated from the `NH Mission.xlsx` workbook (2024 DMG encounter
budgets); all values now live in the database.

---

## Data model (`dnd5e` schema, keyed by `gameSystemId`)

| Model | Table | Contents |
|---|---|---|
| `Dnd5eEncounterXp` | `encounter_xp` | XP per challenge rating (CR 0–45, fractional 1/8·1/4·1/2) |
| `Dnd5eEncounterLevelThreshold` | `encounter_level_thresholds` | Per-character Low/Moderate/High XP budgets, levels 1–20 |
| `Dnd5eEncounterMultiplier` | `encounter_multipliers` | XP multiplier by monster count (approximate lookup: highest `minCount` ≤ count wins) |
| `Dnd5eEncounterConfig` | `encounter_config` | One row per game system: tier ratios, `rewardGpRate`, `adventureDayMultiplier` |

Defaults (2024 DMG) live in
`shared/database/dbapi/read/dnd5e/eplanner-defaults.ts` and are seeded by
`seeds/04b-dnd5e.seed.ts` (idempotent — skipped when rows exist). The admin
"Reset to defaults" action replaces all rows from the same source.

### Quest integration

| Field | Source |
|---|---|
| `Quest.encounterPlan` | JSON snapshot of planner inputs (level, party size, adjustment, lair XP, encounters) |
| `Quest.missionXp` | Server-recalculated from `encounterPlan` on save via `quests.resolveMissionXp()` |

DM quest forms use a **Details | Encounter Planner** tab pair. The planner tab
uses [`dm/quests/_planner/EncounterPlannerPanel.svelte`](../../apps/frontend/src/routes/(protected)/dm/quests/_planner/EncounterPlannerPanel.svelte)
(mirror of the standalone tool). Both tab panels stay mounted so hidden fields
submit regardless of which tab is visible.

## API (`@core/database`)

```ts
import { dnd5e } from '@core/database';

const cfg = await dnd5e.encounterPlanner.getConfig(gameSystemId);
// dnd5e.encounterPlanner.upsertXp / deleteXp
// dnd5e.encounterPlanner.upsertLevelThreshold / deleteLevelThreshold
// dnd5e.encounterPlanner.upsertMultiplier / deleteMultiplier
// dnd5e.encounterPlanner.updateConfig
// dnd5e.encounterPlanner.reset
```

`getConfig` merges DB rows over the defaults (empty tables fall back to
defaults) and includes row ids for admin editing. All writes are audit-logged
against `GameSystem`.

### Client-safe calculation

The math is a pure module with no DB imports, exported as a package subpath so
Svelte pages can run it in the browser:

```ts
import { calculateMission } from '@core/database/eplanner-calc';

const result = calculateMission(
    {
        level: 5,
        partySize: 4,
        adjustment: 0.1,   // decimal: +10%
        lairXp: 500,
        encounters: [{ monsterCrs: [1, 1, 1, 1] }, { monsterCrs: [5] }],
    },
    config, // from getConfig(), loaded server-side
);
```

## Formulas

Per encounter:

1. **Base XP** — sum of CR→XP for each monster
2. **Multiplier** — monster-count lookup (defaults: 1→×1, 2→×1.1, 4→×1.2, 7→×1.3, 11→×1.4)
3. **Adjusted XP (AXP)** — `round(base × multiplier)`
4. **Tier** — AXP vs `partySize ×` level thresholds: ≤Low → Low, ≤Moderate → Moderate, ≤High → High, else Extreme

Mission totals:

| Value | Formula |
|---|---|
| Adventure day XP | `high(level) × adventureDayMultiplier × partySize` |
| Total XP | `round((Σ AXP + lairXp) × (1 + adjustment))` |
| Mission ratio | `totalXp / adventureDayXp` |
| Mission tier | ratio > `extremeRatio` → Extreme, > `highRatio` → High, > `moderateRatio` → Moderate, else Low |
| Reward XP / player | `floor(totalXp / partySize)` |
| Reward GP / player | `round(rewardXp × rewardGpRate)` |

## Files

```
shared/database/prisma/dnd5e.prisma                      # models (bottom of file)
shared/database/dbapi/read/dnd5e/eplanner-calc.ts        # pure calc (@core/database/eplanner-calc)
shared/database/dbapi/read/dnd5e/eplanner-defaults.ts    # 2024 DMG defaults
shared/database/dbapi/read/dnd5e/encounter-planner.ts    # getEncounterConfig
shared/database/dbapi/write/dnd5e/encounter-planner.ts   # upserts/deletes/reset (audited)
shared/database/seeds/04b-dnd5e.seed.ts                  # default seed
apps/frontend/src/routes/(protected)/dm/quests/_planner/     # quest integration UI
apps/frontend/src/routes/(protected)/tools/eplanner/     # standalone tool
apps/admin/src/routes/(app)/tools/eplanner/              # admin editor
```
