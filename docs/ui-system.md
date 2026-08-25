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
10. **No inline `style` colour overrides on buttons** — use the correct btn class instead
11. **Rarity colours always from `$lib/rarity`** — never define `rarityColors` inline in a svelte file
12. **Size picker on character sheet** — only show `traitSizeChoices` buttons when `!sheet.size && !traitSize && canEdit`; once size is set, display badge only

---

## CSS Architecture

The CSS entry point is `shared/ui/styles/index.css`. Both apps import it via a JS import in their root `+layout.svelte`:

```svelte
<!-- +layout.svelte -->
import '@core/ui/styles/index.css';
```

**Do NOT** also import tailwind or any of its plugins in the app's own CSS files — `index.css` already handles the full stack. Doing so causes `@tailwindcss/forms` to run twice and break all `.btn` styles.

`@tailwindcss/forms` uses `strategy: 'class'` — it does NOT auto-style `button` or `input` elements. All input styling comes from the `.input` class defined in `layout.css`.

The base `a { color: ... }` rule is inside `@layer base` so `@layer components` (where `.btn-primary` lives) correctly overrides it on `<a class="btn">` elements.

---

## Themes

Two built-in themes + unlimited user-selectable themes. Applied via `data-theme` on `<html>`:
- Default: `data-theme="frontend"` (warm amber/parchment)
- Admin: `data-theme="admin"` (cool professional grey) — not user-selectable

### User theme system

User themes are defined in `tokens.css` using the naming convention:
```css
/* theme-name: Display Name */
[data-theme="frontend-yourkey"] {
  ...
}
```

The comment must appear on the line **immediately before** the selector — no CSS between them.

The `themes.ts` utility in the frontend parses `tokens.css` at build time (via Vite `?raw` import), finds all `frontend-*` blocks, resolves `var(--)` references, and returns `ThemeOption[]` for the profile page picker.

**Adding a new theme:** add the comment + block to `tokens.css` — it appears in the picker automatically. No code changes needed.

### Current themes

| Key | Name |
|---|---|
| `frontend` | Default (amber/parchment — hardcoded in themes.ts) |
| `frontend-emerald` | Emerald & Gold |
| `frontend-crimsonandgold` | Crimson & Gold |
| `frontend-burgundygoldblack` | Burgundy |
| `frontend-antiqueparchment` | Parchment |
| `frontend-midnightneon` | Midnight Neon |
| `frontend-arcanesanctuary` | Arcane Sanctuary |
| `frontend-sunlightsapphire` | Sunlight & Sapphire |
| `frontend-portugal` | Portugal |

### Theme persistence

- Stored in `User.theme` DB field (default `"frontend"`)
- Persisted in `userTheme` cookie (httpOnly: false, 1 year) for fast SSR application
- `hooks.server.ts` seeds cookie from DB on first login
- `updateTheme` action in profile saves to DB + sets cookie
- `app.html` inline script reads cookie before paint — **no flash of wrong theme**

### Token structure

| Token | Purpose |
|---|---|
| `--bg-base` | Page background |
| `--bg-surface` | Card/panel backgrounds |
| `--bg-overlay` | Hover states, overlays |
| `--bg-muted` | Inactive/muted sections |
| `--text-primary` | Main text |
| `--text-secondary` | Secondary text |
| `--text-muted` | Muted/placeholder text |
| `--text-disabled` | Disabled elements |
| `--border-base` | Default borders |
| `--border-muted` | Subtle borders |
| `--border-accent` | Highlighted borders |
| `--accent` | Buttons, active states |
| `--accent-light` | Hover states, links |
| `--accent-dim` | Badge backgrounds |
| `--brand-accent` | Brand logo/icon colour |
| `--brand-accent-light` | Brand secondary |
| `--color-success/warning/danger/info` | Semantic feedback |
| `--parchment` | Decorative tint for special cards |
| `--accent-text` | Text colour on `btn-primary` background (default `#fff`, override for light accents like Midnight Neon cyan) |
| `--accent-text-hover` | Text colour on `btn-primary:hover` background |

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
.btn-sm            smaller padding (0.375rem 0.75rem) + 0.8125rem font
.btn-xs            compact (0.1875rem 0.5rem) + 0.75rem font — for inline/tight contexts
.btn-lg            larger padding (0.75rem 1.5rem) + 1rem font
.btn-icon          square aspect ratio
.btn-full          width 100%
```
**Rules:**
- Always `type="button"` unless the button is the form submit
- Destructive actions → `btn-danger`, never `btn-ghost` with inline colour override
- `btn-sm` for table row actions and secondary page actions
- Full size `btn-primary`/`btn-ghost` for page-level CTAs and form submits
- `btn-xs` for compact inline contexts (sidebar actions, tight UI)

### Badges
```
.badge             base pill shape, 0.75rem
.badge-accent      accent-dim bg, accent-light text  ← theme-dependent
.badge-success     success bg (green), white text
.badge-warning     warning bg (amber), white text
.badge-danger      danger bg (red), white text
.badge-muted       bg-overlay, text-muted
.badge-info        info bg (blue), white text
```

### D&D 5e Rarity Badges — ALWAYS use these for item rarity
Fixed hardcoded colours — independent of the active user theme.
**Never** define a `rarityColors` Record inline in a svelte file. Always import from `$lib/rarity`.

```
.badge-rarity-common     grey
.badge-rarity-uncommon   green
.badge-rarity-rare       blue
.badge-rarity-very-rare  purple
.badge-rarity-legendary  orange
.badge-rarity-artifact   red
```

Usage:
```svelte
import { rarityBadge, rarityLabel } from '$lib/rarity';
<span class="badge {rarityBadge(item.rarity)}">{rarityLabel(item.rarity)}</span>
```

### Tables
```
.table             full-width, border-collapse
.table th          muted text, border-bottom, nowrap
.table td          primary text, border-bottom, middle align
.table__muted      secondary colour, 0.8125rem
.table__num        text-align right
.table__action     right-aligned, 80px wide
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
.input             bg-overlay, border-base, text-primary, radius-md — fully self-defined, no forms plugin dependency
.input--select     select variant (auto width)
.input-group       flex row for input + toggle button
.input-toggle      show/hide button attached to input
.form-actions      flex row, justify-end, gap, margin-top 1.25rem
.field-hint        0.8125rem, muted
.form-error        danger-tinted feedback block
.form-success      success-tinted feedback block
```

### Layout
```
.page              flex column, gap 1.5rem
.page__header      flex, justify-between, flex-wrap
.page__title       1.25rem, 700 weight
.page__subtitle    0.875rem, text-secondary
.section-title     1rem, 600 weight, margin-bottom 1.25rem
.sections          2-column grid, collapses to 1 on mobile
.fields            flex column, gap 1rem
.field             flex column, gap 0.375rem
.back-link         small muted navigation link
.divider           1px border-muted horizontal rule
.tabs              flex tab row, border-bottom
.tab               tab button, border-bottom indicator
.tab--active       accent colour + border
```

### Enricher Badges
```
.enricher-badge              base inline badge
.enricher-quest              red border/text
.enricher-item               amber border/text
.enricher-character          purple border/text
.enricher-world              blue border/text
.enricher-region             emerald border/text
.enricher-location           cyan border/text
.enricher-user               grey border/text
```

---

## Layout Components

### `AppShell`
Root application shell. Composes Sidebar + Header + main content.

```svelte
<AppShell title="Site Name" siteLogo="..." notifCount={n} notifications={[...]} user={data.user}>
  {#snippet nav({ collapsed })}
    <NavItem href="/" label="Home" icon="<svg>…</svg>" active={…} {collapsed} />
  {/snippet}
  {#snippet footer({ collapsed })}<!-- sign out -->{/snippet}
</AppShell>
```

### `NavItem`
```svelte
<NavItem href="/quests" label="Quests" icon="<svg>…</svg>" active={...} collapsed={collapsed}
  children={[{ label: 'Published', href: '/quests?status=PUBLISHED', active: false }]} />
```

---

## UI Primitives

### `ConfirmModal`

**Mount once in layout:**
```svelte
<ConfirmModal />
```

**Imperative singleton (always prefer for form actions):**
```svelte
<button type="button" onclick={() =>
  confirmModal('Delete', 'Sure?').then(ok => { if (ok) form.requestSubmit(); })
}>Delete</button>
```

### `PermissionCell`
Click-to-cycle `NONE → OWN → ALL`. Used only in admin roles page.

### `NotificationBell`
Bell + dropdown. Notifications POST to `/notifications?/read`. Internal to AppShell Header.

---

## Frontend Utilities (`apps/frontend/src/lib/`)

### `$lib/themes.ts`
Parses `tokens.css` at build time via Vite `?raw` import.

| Export | Purpose |
|---|---|
| `getAvailableThemes()` | Returns `ThemeOption[]` — all user-selectable themes parsed from tokens.css |
| `validateTheme(key)` | Returns `key` if valid, otherwise `'frontend'` |
| `ThemeOption` | `{ key, name, bgBase, bgSurface, accent, accentLight }` |

**Called by:** `apps/frontend/src/hooks.server.ts`, `apps/frontend/src/routes/(protected)/profile/+page.server.ts`

### `$lib/rarity.ts`
Single source of truth for D&D 5e item rarity display.

| Export | Purpose |
|---|---|
| `rarityBadge(rarity)` | Returns the correct `badge-rarity-*` class |
| `rarityLabel(rarity)` | Returns human-readable label (replaces `_` with space) |
| `RARITIES` | Ordered rarity array |
| `RARITY_BADGE` | Raw Record mapping |

**Called by:** `marketplace/+page.svelte`, `marketplace/[id]/+page.svelte`, `characters/[id]/+page.svelte`, `dm/worlds/[worldId]/marketplace/+page.svelte`

---

## Utility Functions

### `renderMarkdown(content)` → `string`
Wraps `marked` with GFM + line breaks. Use with `{@html}`.

### `looksLikeMarkdown(content)` → `boolean`
Heuristic for intentional Markdown (`**bold**`, `#` headings, lists, links,
fenced code, blockquotes). Does **not** treat stray single `*` as Markdown.

### `DescriptionText`
Renders D&D (and similar) description fields: Markdown via `renderMarkdown` +
`.markdown-body` when `looksLikeMarkdown` is true; otherwise escaped plain text
with preserved newlines. Used by Codex, wizard, spell detail, character sheet.

### `generateFantasyName(speciesName?)` → `string`
Syllable-based name generator. Species: `elf`, `dwarf`, `halfling`, `human`, `tiefling`.

### `isAsiFeatureName(name)` / `isEpicBoonFeatureName(name)` / `normalizeFeatureName(name)`
Feature name helpers. **Intentionally duplicated** in `@core/database` — packages cannot cross-depend. Keep both in sync.

---

## D&D 5e Components

### `Dnd5eCharacterSheet` — 763 lines

**Props:**

| Prop | Type | Purpose |
|---|---|---|
| `charSheet` | `any` | Enriched sheet from `getDnd5eCharacterSheet()` |
| `systemData` | `any` | System data from `getDnd5eSystemData()` |
| `scoreAudit` | `any[]` | Ability score history |
| `canEdit` | `boolean` | Enables edit buttons (player) |
| `canViewDescriptions` | `boolean` | Gates feat/feature/trait descriptions |
| `canManage` | `boolean` | DM override powers |
| `isLevelUp` / `isLevelDown` | `boolean` | Level allocation mode |
| `availableLevel` | `number` | Target level for up/down |
| `editBlockedReason` | `string?` | Banner when canEdit is false |
| `spellbooks` | `any[]` | Character spellbooks |

**Callbacks:** `onSaveAbilityScores`, `onSubmitChanges`, `onSubmitLevelUp`, `onSaveSlot`, `onRemoveFeat`, `onManualScoreAdjust`, `onCreateSpellbook`, `onRenameSpellbook`, `onDeleteSpellbook`, `onAddSpellbookEntry`, `onRemoveSpellbookEntry`, `onToggleSpellPrepared`

**`charSheet` key fields:**
```ts
{
  abilityScores: { stat, baseScore }[]
  asiSlots: { sourceClassId, sourceLevel, type, resolved?: { kind, featId?, ... } }[]
  enrichedClasses: { classId, classRef: { name, canCastSpells }, allocatedLevel, classFeatures[], subclassFeatures[] }[]
  chosenFeats: { id, featId, feat: { name, description?, snippet? } }[]
  speciesRef?: { name, traits[] }
  backgroundRef?: { name }
}
```

**`systemData` key fields:**
```ts
{
  classes: { id, name, canCastSpells, subclasses[] }[]
  species, backgrounds, feats: { id, name, isEpicBoon, ... }[]
  spellSlotProgressions, spellsKnownProgressions, spells[]
}
```

### `Dnd5eSpellbooks` — 611 lines

| Prop | Purpose |
|---|---|
| `spellbooks` | `{ id, name, classId, entries: { id, spellId, prepared }[] }[]` |
| `canViewDescriptions` | Gates spell descriptions |

Key computed values: `cantripCnt` (level-0 entries), `spellCnt` (prepared === true AND level > 0), `maxSpellLevel` (highest non-zero slot). Multiclass slot computation: FULL/HALF/THIRD contribution → combined → FULL table lookup. Pact Magic separate.

### `Dnd5eAsiFeatsPanel` — 282 lines
Standalone ASI/feat panel. **Not yet wired into any page.**

---

## Component Caller Map

| Component / Utility | Called from |
|---|---|
| `AppShell` | `apps/frontend/src/routes/+layout.svelte`, `apps/admin/src/routes/+layout.svelte` |
| `afterNavigate` (SvelteKit) | `AppShell.svelte` — closes mobile drawer on route change. Pragmatic exception to no-SvelteKit-imports rule. |
| `ConfirmModal` (mounted) | Both `+layout.svelte` files |
| `confirmModal` (singleton) | Any page with destructive actions |
| `PermissionCell` | `apps/admin/src/routes/(app)/roles/[id]/+page.svelte` |
| `NotificationBell` | Internal to `Header.svelte` → `AppShell` |
| `renderMarkdown` | Journal, wiki, news pages in both apps |
| `Dnd5eCharacterSheet` | `characters/[id]/_sheets/Dnd5eSheetSection.svelte` (player), `dm/worlds/[w]/characters/[c]/_sheets/DmDnd5eSheetSection.svelte` (DM), admin character sheet |
| `Dnd5eSpellbooks` | Internal to `Dnd5eCharacterSheet` only |
| `Dnd5eAsiFeatsPanel` | Not yet wired — ready to use |
| `generateFantasyName` | `characters/new/dnd5e/+page.svelte` |
| `getAvailableThemes` | `profile/+page.server.ts`, `hooks.server.ts` |
| `validateTheme` | `hooks.server.ts` |
| `rarityBadge` / `rarityLabel` | `marketplace/+page.svelte`, `marketplace/[id]/+page.svelte`, `characters/[id]/+page.svelte`, `dm/worlds/[w]/marketplace/+page.svelte` |

---

## Adding New Features — Checklist

**New description field on a D&D 5e entity:**
- [ ] Gate with `{#if canViewDescriptions}…{:else}<span>📖 Description not available — contact your DM.</span>{/if}`
- [ ] Add `canViewDescriptions` to prop chain if component doesn't have it yet

**New component in shared/ui:**
- [ ] No SvelteKit imports
- [ ] No database imports
- [ ] All colours via CSS tokens
- [ ] Export from `shared/ui/index.ts`
- [ ] Add to Component Caller Map above

**New destructive action button:**
- [ ] `type="button"` — NOT submit
- [ ] Class `btn-danger`, never `btn-ghost` + inline colour
- [ ] `confirmModal('Title', 'Message').then(ok => { if (ok) form.requestSubmit(); })`

**New CSS class:**
- [ ] In appropriate file under `shared/ui/styles/components/`
- [ ] Tokens only — no hardcoded values
- [ ] Document in CSS Class Reference above

**New user theme:**
- [ ] Add `/* theme-name: Display Name */` immediately before `[data-theme="frontend-*"]` in `tokens.css`
- [ ] Define all required tokens (see Token structure table above)
- [ ] No code changes needed — picker auto-discovers it

**Item rarity display:**
- [ ] Import `rarityBadge`, `rarityLabel` from `$lib/rarity`
- [ ] Never define a local `rarityColors` Record

---

## Admin Navigation System (`apps/admin/src/lib/nav.ts`)

### Types

```ts
NavItemDef = NavItem | NavSection   // discriminated union

NavSection  { type: 'section', label: string }
NavItem     { type?: 'item', label, icon, resourceKey, href, activeMatch?, children? }
NavChildDef { label, href: string | ((ctx) => string), activeMatch? }
NavContext  { userId: string, level: 'NONE' | 'OWN' | 'ALL' }

ResolvedNavItem = { type: 'section', label } | { type: 'item', label, icon, href, active, children? }
```

### Sections
| Section | Items |
|---|---|
| *(ungrouped)* | Dashboard |
| Campaign | Quests, Characters, DM Hub, Availability, Rewards |
| Content | World, Marketplace, Token Store, News, Wiki |
| Administration | Users, Roles & Permissions, Game Systems, Discord, Audit Log |
| Footer | Settings |

### Rules
- `activeMatch` string → `startsWith(match)` (prefix match)
- `activeMatch` function → called with `(pathname, ctx)`
- Default when no `activeMatch` → `startsWith(href)`
- Child `href` supports `(ctx: NavContext) => string` for dynamic routes
- Child `activeMatch` supports same patterns as parent
- Section labels always visible; items hidden when section is collapsed
- Active item's section always auto-expands regardless of saved collapsed state
- Collapsed state persisted in `localStorage` under key `admin-nav-collapsed-sections`
- On mobile (drawer mode), all items always visible; section dividers shown instead of labels when sidebar is icon-only

### Adding a nav item
Add one entry to `NAV_ITEMS` in `nav.ts`. Nothing else changes.