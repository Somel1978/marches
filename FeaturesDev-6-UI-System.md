# Marches — UI System Reference
> `@core/ui` — `shared/ui/`
> Pure UI package. No SvelteKit imports. No DB imports. All data via props and callbacks.

---

## Rules — Always Follow

1. **No SvelteKit imports** inside `shared/ui` — `$app/navigation`, `$app/forms`, `$app/stores` are forbidden
2. **No `@core/database` imports** — all data arrives via component props
3. **CSS lives here** — both apps import `@core/ui` styles; never duplicate in app-level CSS
4. **Token variables only** — never hardcode colours; always `var(--token-name)`
5. **`confirmModal` requires mount** — `<ConfirmModal />` must exist in every layout that uses the singleton
6. **`canViewDescriptions` prop** — any new D&D 5e description field must be gated behind this prop
7. **`enrichedClasses` not `characterClasses`** — correct field name on `charSheet`
8. **`$effect` not `onMount`** — Svelte 5 rune syntax throughout
9. **`type="button"` on all non-submit buttons** — prevents accidental form submission

---

## Themes

Two themes, one token set. Applied via `data-theme` on `<html>`:
- `apps/frontend/src/app.html` → `<html data-theme="frontend">`
- `apps/admin/src/app.html` → `<html data-theme="admin">`

| Token | Frontend | Admin |
|---|---|---|
| `--bg-base` | `#14171C` | `#0F1216` |
| `--bg-surface` | `#1E2228` | `#1B1F25` |
| `--bg-overlay` | `#252B33` | `#2A2F37` |
| `--bg-muted` | `#2A3040` | `#333A44` |
| `--text-primary` | `#F3E9DC` (parchment) | `#AEB4BD` (cool grey) |
| `--text-secondary` | `#C4B5A5` | `#7E8694` |
| `--text-muted` | `#8A7D72` | `#555D6B` |
| `--text-disabled` | `#5A504A` | `#3A4050` |

**Shared brand tokens (never change per theme):**
```css
--brand-accent:       #B8734A
--brand-accent-light: #E6A87A
--brand-accent-dim:   #7A4D32
--color-success:      #4A7C59
--color-warning:      #B8934A
--color-danger:       #E05555
--color-info:         #3A6B8B
--radius-sm: 4px  --radius-md: 8px  --radius-lg: 12px  --radius-xl: 16px
--transition-fast: 150ms ease  --transition-base: 250ms ease
--sidebar-width: 240px  --sidebar-width-collapsed: 64px  --header-height: 56px
```

---

## CSS Class Reference

### Cards
```
.card              bg-surface, border, radius-lg, padding 1.5rem
.card-elevated     bg-overlay, border, radius-lg, shadow
.card-parchment    parchment tint, accent border
```

### Buttons
```
.btn               base — inline-flex, radius-md, 0.875rem, 500 weight
.btn-primary       accent background, white text
.btn-ghost         transparent, border-base, text-secondary
.btn-danger        danger background, white text
.btn-sm            smaller padding + font
.btn-lg            larger padding + font
.btn-icon          square aspect ratio
.btn-full          width 100%
```
**Rule:** Always `type="button"` unless the button is the form submit. Ghost danger buttons use inline `style` override, not a separate class.

### Badges
```
.badge             inline-flex, pill shape, 0.75rem
.badge-accent      accent-dim bg, accent-light text
.badge-success     success bg, white text
.badge-warning     warning bg, white text
.badge-danger      danger bg, white text
.badge-muted       bg-overlay, text-muted
```

### Tables
```
.table             full-width, border-collapse
.table th          muted text, border-bottom, nowrap
.table td          primary text, border-bottom, middle align
.table tr:hover    bg-overlay on hover
.table__row        clickable row (cursor pointer)
.table__muted      secondary colour, 0.8125rem
.table__num        text-align right
.table__action     right-aligned, 80px wide
.table__id         monospace, muted
.table__empty      centred, 2rem padding, muted
.table__name       flex with avatar gap
.table-wrap        overflow-x scroll wrapper
.col-hide-mobile   hidden < 640px
.col-hide-tablet   hidden < 960px
```

### Pagination
```
.pagination        flex, centred, gap
.pagination__page  2rem square, radius-sm
.pagination__page--active  accent bg, white text
```

### Forms
```
.field             flex column with gap
.label             0.8125rem, muted, 500 weight
.input             bg-overlay, border-base, text-primary, radius-md
.input--select     select variant
.form-actions      flex row, justify-end, gap
.field-hint        0.8125rem, muted, margin-bottom
```

### Layout
```
.shell             flex, min-height 100dvh
.shell__body       flex column, flex 1
.shell__main       flex 1, overflow-y auto, padding 1.5rem (1rem mobile)
.page__header      flex, justify-between, align-center, gap
.section-title     section heading style
.divider           1px border-muted horizontal rule
.pending-banner    warning banner for pending states
```

### Enricher Badges
```
.enricher-badge              base inline badge, bg-overlay
.enricher-quest              red border/text
.enricher-item               amber border/text
.enricher-character          purple border/text
.enricher-world              blue border/text
.enricher-region             emerald border/text
.enricher-location           cyan border/text
.enricher-user               grey border/text
```

### Character Specific
```
.character-card__classes     class name row on character card
.character-class-tag         class + subclass + level badge inline group
.tarot__desc                 description text in tarot/card picker
```

---

## Layout Components

### `AppShell`
Root application shell. Composes Sidebar + Header + main content.

```svelte
<AppShell
  title="Site Name"
  siteLogo="<svg>…</svg>"       <!-- SVG string, URL, or omit -->
  siteLogoIcon="⚔"              <!-- compact icon for collapsed sidebar -->
  notifCount={data.notifCount}
  notifications={data.notifications}
  user={data.user}              <!-- { name, email, image? } -->
>
  {#snippet nav({ collapsed })}
    <NavItem href="/" label="Home" icon="<svg>…</svg>" active={…} {collapsed} />
  {/snippet}

  {#snippet footer({ collapsed })}
    <!-- sign out button etc -->
  {/snippet}

  <!-- page content -->
</AppShell>
```

**State managed internally:** `collapsed` (desktop sidebar), `drawerOpen` (mobile drawer).

---

### `NavItem`
Single navigation link. Supports sub-items shown when parent is active.

```svelte
<NavItem
  href="/quests"
  label="Quests"
  icon="<svg>…</svg>"   <!-- raw SVG HTML string -->
  active={page.url.pathname.startsWith('/quests')}
  collapsed={collapsed}
  children={[           <!-- optional sub-nav, shown when active + not collapsed -->
    { label: 'Published', href: '/quests?status=PUBLISHED', active: false }
  ]}
/>
```

---

## UI Primitives

### `ConfirmModal`

**Always mount in layout:**
```svelte
<!-- +layout.svelte -->
<script>
  import { ConfirmModal } from '@core/ui';
</script>
<slot />
<ConfirmModal />
```

**Prop-driven (for simple cases):**
```svelte
<ConfirmModal
  open={showModal}
  title="Delete item"
  message="This cannot be undone."
  confirmLabel="Delete"
  confirmClass="btn-danger"
  onconfirm={() => { /* do action */ showModal = false; }}
  oncancel={() => showModal = false}
/>
```

**Imperative singleton (preferred for form actions):**
```svelte
<script>
  import { confirmModal } from '@core/ui';
</script>

<button
  type="button"
  onclick={() => confirmModal('Delete', 'Sure?').then(ok => {
    if (ok) form.requestSubmit();
  })}
>
  Delete
</button>
```
> ⚠ `confirmModal` returns `false` and logs a warning if `<ConfirmModal />` is not mounted.

---

### `PermissionCell`
Click-to-cycle permission toggle: `NONE` → `OWN` → `ALL`.

```svelte
<PermissionCell
  value={perm.canRead}
  locked={isSystemRole}
  onchange={(v) => handlePermChange('read', v)}
/>
```

Used only in admin roles permission table.

---

### `NotificationBell`
Bell icon with badge + dropdown panel.

```svelte
<NotificationBell count={notifCount} notifications={notifications} />
```

Notifications render as form POST buttons to `/notifications?/read`. Click-outside handled internally.

---

## Utility Functions

### `renderMarkdown(content: string): string`
Wraps `marked` with GFM + line breaks enabled.
```ts
import { renderMarkdown } from '@core/ui';
const html = renderMarkdown(journalEntry.content);
// Use: {@html html}
```

### `generateFantasyName(speciesName?: string): string`
Syllable-based name generator. Adapts to species.
```ts
import { generateFantasyName } from '@core/ui';
const name = generateFantasyName('Elf'); // e.g. "Aelriel"
```
Supported species keys: `elf`, `dwarf`, `halfling`, `human`, `tiefling`. Falls back to `default` for anything else.

### `isAsiFeatureName(name: string | null | undefined): boolean`
### `isEpicBoonFeatureName(name: string | null | undefined): boolean`
### `normalizeFeatureName(name: string | null | undefined): string`
Always use `normalizeFeatureName` before comparing feature names — handles casing + whitespace in imported data.
> ⚠ These are **intentionally duplicated** in `@core/database/dbapi/read/dnd5e/feature-names.ts`. Keep both in sync when changing logic.

---

## D&D 5e Components

### `Dnd5eCharacterSheet`

The main character sheet. 763 lines. Pure UI — no network calls.

**Props:**

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `charSheet` | `any` | — | Enriched sheet from `getDnd5eCharacterSheet()` |
| `systemData` | `any` | — | System data from `getDnd5eSystemData()` |
| `scoreAudit` | `any[]` | `[]` | Ability score history |
| `canEdit` | `boolean` | `false` | Enables edit buttons (player) |
| `canViewDescriptions` | `boolean` | `false` | Gates feat/feature/trait descriptions |
| `canManage` | `boolean` | `false` | DM override (manual score adjust, bypass locks) |
| `isLevelUp` | `boolean` | `false` | Shows level allocation UI |
| `isLevelDown` | `boolean` | `false` | Shows level reduction UI |
| `availableLevel` | `number` | `0` | Target total level for level up/down |
| `editBlockedReason` | `string?` | — | Banner shown when canEdit is false |
| `spellbooks` | `any[]` | `[]` | Character spellbooks |

**Callbacks:**

| Callback | Signature | When called |
|---|---|---|
| `onSaveAbilityScores` | `(scores: Record<string,number>) => Promise<void>` | Player saves base stats |
| `onSubmitChanges` | `({ speciesId, backgroundId, classes }) => Promise<void>` | Player submits identity edit |
| `onSubmitLevelUp` | `(classes: any[]) => Promise<void>` | Player submits level allocation |
| `onSaveSlot` | `(opts: any) => Promise<void>` | Player saves ASI/feat slot |
| `onRemoveFeat` | `(id: string) => Promise<void>` | Player removes a feat |
| `onManualScoreAdjust` | `(stat, delta, note) => Promise<void>` | DM applies manual stat change |
| `onCreateSpellbook` | `(name: string) => Promise<void>` | Creates new spellbook |
| `onRenameSpellbook` | `(id, name) => Promise<void>` | Renames spellbook |
| `onDeleteSpellbook` | `(id: string) => Promise<void>` | Deletes spellbook |
| `onAddSpellbookEntry` | `(spellbookId, spellId, classId, className) => Promise<void>` | Adds spell to book |
| `onRemoveSpellbookEntry` | `(entryId: string) => Promise<void>` | Removes spell from book |
| `onToggleSpellPrepared` | `(entryId, prepared) => Promise<void>` | Toggles prepared state |

**Sections rendered:**
1. **Ability Scores** — 6-stat grid, audit history on click, DM manual adjust form (canManage only)
2. **Identity & Classes** — Species / Background / Classes display + edit mode + level up/down allocation
3. **ASI & Feats** — one card per `asiSlot`; modes: +2 one stat / +1/+1 two stats / feat picker
4. **Spellbooks** — only shown if `enrichedClasses.some(cc => cc.classRef?.canCastSpells)`; renders `Dnd5eSpellbooks`

**`charSheet` expected shape (from `getDnd5eCharacterSheet`):**
```ts
{
  abilityScores: { stat, baseScore }[]
  asiSlots: {
    sourceClassId, sourceClass, sourceLevel,
    type,           // 'asi' | 'background_feat' | 'epic_boon'
    grantsFeatId?,  // if background_feat with forced feat
    featCategory?,  // category filter
    canEpicBoon?,   // true at level 19+
    resolved?: {
      kind: 'asi' | 'feat',
      charFeatId?, featId?, featName?,
      asiStat1?, asiAmount1?, asiStat2?, asiAmount2?,
    }
  }[]
  enrichedClasses: {
    classId, classRef: { name, canCastSpells },
    subclassId?, subclassRef?: { name, canCastSpells },
    allocatedLevel,
    classFeatures: { name, description?, requiredLevel }[]
    subclassFeatures: { name, description?, requiredLevel }[]
  }[]
  chosenFeats: {
    id, featId,
    feat: { name, description?, snippet?, prerequisites?, ... }
  }[]
  speciesRef?: { name, traits: { name, description? }[] }
  backgroundRef?: { name, featureName? }
  sheet?: { speciesId, backgroundId }
}
```

**`systemData` expected shape (from `getDnd5eSystemData`):**
```ts
{
  classes: {
    id, name, isAvailable, subclassAvailableAtLevel, canCastSpells,
    subclasses: { id, name, isAvailable, canCastSpells }[]
  }[]
  species: { id, name, isAvailable }[]
  backgrounds: { id, name, isAvailable }[]
  feats: {
    id, name, isAvailable, isEpicBoon, repeatable,
    description?, snippet?, prerequisites?, categories?,
    asiAmount?, asiStatFixed?, asiStatChoices?,
  }[]
  spellSlotProgressions: {
    classId, subclassId, casterType, classLevel,
    slot1…slot9: number
  }[]
  spellsKnownProgressions: {
    classId, subclassId, classLevel,
    cantrips?, prepared?, additional?, note?
  }[]
  spells: { spellId, name, level, school, … }[]
}
```

---

### `Dnd5eSpellbooks`

Spellbook management. Rendered internally by `Dnd5eCharacterSheet`. Can also be used standalone.

**Props:**

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `charSheet` | `any` | — | Same enriched sheet |
| `systemData` | `any` | — | Same system data |
| `spellbooks` | `any[]` | `[]` | `{ id, name, classId, className, entries: { id, spellId, prepared }[] }[]` |
| `canEdit` | `boolean` | `false` | Enables add/remove/prepare |
| `canViewDescriptions` | `boolean` | `false` | Gates spell description |
| `onCreateSpellbook` | callback | — | |
| `onRenameSpellbook` | callback | — | |
| `onDeleteSpellbook` | callback | — | |
| `onAddEntry` | callback | — | |
| `onRemoveEntry` | callback | — | |
| `onTogglePrepared` | callback | — | |

**Key computed values per spellbook:**
- `cantripCnt` — count of level-0 entries in the book
- `spellCnt` — count of entries where `prepared === true` AND level > 0 (NOT total spells)
- `maxSpellLevel` — highest non-zero slot in progression for this class/level
- `limits.cantrips` — max cantrips from spells-known progression
- `limits.prepared` — max prepared spells from spells-known progression

**Multiclass slot computation:**
- FULL caster: full level contribution
- HALF caster: `floor(level / 2)`
- THIRD caster: `floor(level / 3)`
- Combined level → looked up against FULL caster table
- Pact Magic (PACT type) handled separately

**Subclass casters:** Detected via `cc.subclassRef?.canCastSpells` (Eldritch Knight, Arcane Trickster)

**At Higher Levels text:**
- `spellUpcastPerSlot` → "X for each slot level above Nth"
- `spellUpcastEveryTwoSlots` → "X for every two slot levels above Nth"
- `spellProgressionNote` → special scaling note (verbatim)
- `spellProgression` → fallback
- `note` field → 2014 formula-based prep (backward compat, not used in 2024 rules)

---

### `Dnd5eAsiFeatsPanel`

Standalone ASI & feats panel. Exported but **not yet wired into any page**.

**Props:**

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `asiSlots` | `any[]` | `[]` | Same format as charSheet.asiSlots |
| `availableFeats` | `any[]` | `[]` | Feat list from systemData.feats |
| `chosenFeats` | `any[]` | `[]` | Same format as charSheet.chosenFeats |
| `canViewDescriptions` | `boolean` | `false` | Gates feat snippet |
| `onAddFeat` | callback | — | `(featId, { sourceClassId, sourceLevel, stat1?, amount1?, stat2?, amount2?, stat3?, amount3? }) => void` |
| `onRemoveFeat` | callback | — | `(id: string) => void` |

---

### `Dnd5eCharacterCard`

Summary card for character list/picker displays. 174 lines.

---

### `Dnd5eCharacterCreation`

Thin wrapper/guide component for character creation flow. 103 lines.

---

## Component Caller Map

| Component / Function | Called from |
|---|---|
| `AppShell` | `apps/frontend/src/routes/+layout.svelte`, `apps/admin/src/routes/+layout.svelte` |
| `NavItem` | Both layout `+layout.svelte` nav snippets |
| `ConfirmModal` | Both layout `+layout.svelte` (mounted once); singleton `confirmModal()` called from any action page |
| `PermissionCell` | `apps/admin/src/routes/(app)/roles/[id]/+page.svelte` |
| `NotificationBell` | Internal to `Header.svelte` → `AppShell` |
| `renderMarkdown` | Journal, wiki, news pages in both apps |
| `Dnd5eCharacterSheet` | `apps/frontend/src/routes/(protected)/characters/[id]/_sheets/Dnd5eSheetSection.svelte` (player), `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/_sheets/DmDnd5eSheetSection.svelte` (DM), `apps/admin/src/routes/(app)/characters/[id]/_sheets/Dnd5eSheetSection.svelte` (admin) |
| `Dnd5eSpellbooks` | Internal to `Dnd5eCharacterSheet` only |
| `Dnd5eAsiFeatsPanel` | Not yet wired into any page |
| `generateFantasyName` | `apps/frontend/src/routes/(protected)/characters/new/dnd5e/+page.svelte` |
| `isAsiFeatureName` | `apps/frontend/src/routes/(protected)/characters/new/dnd5e/+page.svelte`, `shared/database/dbapi/write/dnd5e/score-audit.ts` |
| `isEpicBoonFeatureName` | Character sheet loaders in frontend and admin |
| `normalizeFeatureName` | Anywhere feature names are compared |

---

## Adding New Features — Checklist

**New description field on a D&D 5e entity:**
- [ ] Gate with `{#if canViewDescriptions}…{:else}<placeholder>{/if}`
- [ ] Placeholder text: `📖 Description not available — contact your DM.`
- [ ] Add `canViewDescriptions` to the prop chain if the component doesn't have it yet

**New component in shared/ui:**
- [ ] No SvelteKit imports
- [ ] No database imports
- [ ] Props typed with interface
- [ ] All colours via CSS tokens
- [ ] Export from `shared/ui/index.ts`
- [ ] Add to Component Caller Map above

**New destructive action button:**
- [ ] `type="button"` (not submit)
- [ ] Use `confirmModal` singleton
- [ ] Pattern: `onclick={() => confirmModal('Title','Message').then(ok => { if (ok) form.requestSubmit(); })}`

**New CSS class:**
- [ ] Add to appropriate file in `shared/ui/styles/components/`
- [ ] Use tokens only — no hardcoded values
- [ ] Document in this file under CSS Class Reference
