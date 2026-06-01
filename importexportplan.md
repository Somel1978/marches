# Import / Export Plan
> Status: COMPLETE
> Estimated effort: 1 session

---

## Goal

Every data area that can be imported must also be exportable in the same XLSX format so that export → edit → reimport works as a round-trip. Progression is currently missing both import and export. This must be complete before any DB reset.

---

## Current State

| Area | Import | Export | Template download |
|------|--------|--------|-------------------|
| dnd5e Classes | ✅ | ❌ | ✅ |
| dnd5e Class Features | ✅ | ❌ | ✅ |
| dnd5e Subclasses | ✅ | ❌ | ✅ |
| dnd5e Subclass Features | ✅ | ❌ | ✅ |
| dnd5e Species | ✅ | ❌ | ✅ |
| dnd5e Species Traits | ✅ | ❌ | ✅ |
| dnd5e Backgrounds | ✅ | ❌ | ✅ |
| Progression Thresholds | ❌ | ❌ | ❌ |
| Marketplace Items | ✅ | ❌ | ❌ |

---

## Approach

**Format:** XLSX throughout — same library (`xlsx`) already used in the import page.

**Column names:** Identical to existing import template columns so export → reimport works without remapping.

**Export delivery:** SvelteKit `GET` endpoint returning a binary XLSX response. The browser downloads the file directly. No new routes needed — add export actions to existing pages.

**Progression import:** Added as a new tab on the existing `game-systems/[id]/import` page alongside classes/species/backgrounds.

---

## Session Plan

### 1 — Add export API endpoint

New file: `apps/admin/src/routes/(app)/api/export/+server.ts`

Handles all export types via query param: `?type=classes&systemId=xxx`, `?type=marketplace`, etc.

Returns `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` with `Content-Disposition: attachment; filename=export_${type}.xlsx`.

```ts
// apps/admin/src/routes/(app)/api/export/+server.ts
import { error } from '@sveltejs/kit';
import { dnd5e, gameSystems, marketplace } from '@core/database';
import { checkPermission } from '@core/rbac';
import * as XLSX from 'xlsx';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
    const type     = url.searchParams.get('type') ?? '';
    const systemId = url.searchParams.get('systemId') ?? '';

    // ... switch on type, query data, build XLSX, return response
};
```

### 2 — dnd5e export — 7 data types

All use the same column order as the existing import templates so round-trip works.

**Classes** — columns: `name, hitDice, canCastSpells, subclassAvailableAtLevel, primaryAbilities, equipmentDescription, description, source, link, sortOrder`

**Class Features** — columns: `className, name, requiredLevel, description, url`
- Resolve `className` from `classId` at export time

**Subclasses** — columns: `className, name, description, source, link, sortOrder`
- Resolve `className` from `classId` at export time

**Subclass Features** — columns: `className, subclassName, name, requiredLevel, description, url`
- Resolve `className` and `subclassName` from IDs at export time

**Species** — columns: `name, description, source, link, isSubrace, isLegacy, sortOrder`

**Species Traits** — columns: `speciesName, name, description, requiredLevel`
- Resolve `speciesName` from `speciesId` at export time

**Backgrounds** — columns: `name, shortDescription, featureName, skillProficiencies, toolProficiencies, languages, url, sortOrder`

### 3 — Progression import + export

**Import** — new tab on `game-systems/[id]/import` page:

Add to `TABS` array in `+page.svelte`:
```ts
{ key: 'progression', label: 'Progression', action: '?/importProgression', columns: ['label', 'xpRequired', 'description', 'sortOrder'] }
```

Add `importProgression` action to `game-systems/[id]/import/+page.server.ts`:
- Reads `label`, `xpRequired`, `description`, `sortOrder` from rows
- Matches on `label` (case-insensitive) for update detection
- Same create/update/skip pattern as all other import actions
- Calls `gameSystems.progression.create()` / `gameSystems.progression.update()`

**Export** — same endpoint, `?type=progression&systemId=xxx`
- Columns: `label, xpRequired, description, sortOrder`
- Ordered by `xpRequired asc`

### 4 — Marketplace export

**Export** — same endpoint, `?type=marketplace`
- Columns match the import template exactly: `Category, Name, Price, Base Item, Var., Rarity, Att., Requirements, Weight, Source, Image, Link`
- Note: import uses column header names with capitals/spaces (e.g. `Base Item`, `Var.`) — export must match exactly for round-trip
- Fetches all marketplace items via `marketplace.items.getAll()` with no filters, all pages

### 5 — Export buttons in UI

**`game-systems/[id]/import/+page.svelte`** — add export buttons alongside each tab:

```svelte
<a href="/api/export?type={activeTab}&systemId={system.id}"
   class="btn btn-ghost btn-sm" download>
   ↓ Export current {activeTabDef.label}
</a>
```

One button per tab, visible even when no file is uploaded. Downloads current data as XLSX in import-compatible format.

**`game-systems/[id]/progression/+page.svelte`** — add export + import buttons to the page header:

```svelte
<a href="/api/export?type=progression&systemId={system.id}" class="btn btn-ghost btn-sm" download>↓ Export</a>
<a href="/game-systems/{system.id}/import" class="btn btn-ghost btn-sm">↑ Import</a>
```

**`marketplace/import/+page.svelte`** — add export button:

```svelte
<a href="/api/export?type=marketplace" class="btn btn-ghost btn-sm" download>↓ Export all items</a>
```

**`marketplace/items/+page.svelte`** — add export button to page header alongside existing controls.

---

## Files to Create

| File | Purpose |
|------|---------|
| `apps/admin/src/routes/(app)/api/export/+server.ts` | Single export endpoint for all types |

## Files to Modify

| File | Change |
|------|--------|
| `apps/admin/src/routes/(app)/game-systems/[id]/import/+page.server.ts` | Add `importProgression` action |
| `apps/admin/src/routes/(app)/game-systems/[id]/import/+page.svelte` | Add progression tab + export buttons on all tabs |
| `apps/admin/src/routes/(app)/game-systems/[id]/progression/+page.svelte` | Add export + import link buttons |
| `apps/admin/src/routes/(app)/marketplace/import/+page.svelte` | Add export button |
| `apps/admin/src/routes/(app)/marketplace/items/+page.svelte` | Add export button to header |

---

## Column Mapping Reference

### Marketplace — import column names (must match exactly for round-trip)
```
Category | Name | Price | Base Item | Var. | Rarity | Att. | Requirements | Weight | Source | Image | Link
```
Maps to DB fields:
```
category | name | buyPrice | baseItem | variant→isVariant | rarity | attunement→requiresAttunement | requirements | weight | source | imageUrl | link
```
Note: `Var.` and `Att.` are boolean-ish in the import (any truthy value = true). Export writes `true`/`false` or `yes`/`no` consistently.

### Progression — new columns (no existing template)
```
label | xpRequired | description | sortOrder
```

---

## After This Session

DB reset workflow:
1. Export progression (was missing — now covered)
2. Export dnd5e classes, features, subclasses, species, backgrounds
3. Export marketplace items
4. Reset DB
5. `db:push` + `db:generate`
6. Reimport in order: progression → dnd5e game data → marketplace items
7. Recreate users/roles manually (small, quick)

Total data preserved: 100%