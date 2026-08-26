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

Two built-in default themes + unlimited user-selectable themes for **both** apps. Applied via `data-theme` on `<html>`:
- Frontend default: `data-theme="frontend"` (warm amber/parchment)
- Admin default: `data-theme="admin"` (cool professional grey)

Admin themes are user-selectable too (added when Crimson Portal shipped) — see Admin theme system below.

### User theme system (frontend)

User themes are defined in `tokens.css` using the naming convention:
```css
/* theme-name: Display Name */
[data-theme="frontend-yourkey"] {
  ...
}
```

The comment must appear on the line **immediately before** the selector — no CSS between them.

`apps/frontend/src/lib/themes.ts` parses `tokens.css` at build time (via Vite `?raw` import), finds all `frontend-*` blocks, resolves `var(--)` references, and returns `ThemeOption[]` for the profile page picker.

**Adding a new frontend theme:** add the comment + block to `tokens.css` — it appears in the picker automatically. No code changes needed.

### Admin theme system

Separate, parallel system — same `/* theme-name: X */` convention but scoped to `admin-*` blocks. **Deliberately a different file and a different prefix from frontend** — the two pickers must never cross-list each other's themes.

- `apps/admin/src/lib/themes.ts` — own copy of the parser, scoped to `admin-*`. Not shared with frontend's `themes.ts` (they read the same `tokens.css` but filter for different prefixes).
- `apps/admin/src/lib/components/ThemeToggle.svelte` — compact header dropdown (rendered via `AppShell`'s `actions` snippet), optimistic client-side apply + background persist.
- `apps/admin/src/routes/api/theme/+server.ts` — `POST` endpoint, persists to `User.theme` + sets `adminTheme` cookie. A plain endpoint, not a form action, since the toggle needs to work from any admin page and SvelteKit form actions only live on `+page.server.ts`.
- `apps/admin/src/app.html` — inline pre-paint script reads the `adminTheme` cookie, same flash-prevention technique as frontend.

**Adding a new admin theme:** add `/* theme-name: X */` + `[data-theme="admin-yourkey"]` block to `tokens.css`. No code changes needed — same auto-discovery as frontend.

### Current themes

**Frontend:**

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
| `frontend-obsidiancopper` | Obsidian & Copper |
| `frontend-crimsonportal` | Crimson Portal — the only theme with an atmospheric `--body-background` (see Atmospheric body background below) |

**Admin:**

| Key | Name |
|---|---|
| `admin` | Default (cool grey — hardcoded in admin's themes.ts) |
| `admin-crimsonportal` | Crimson Portal — same accent palette as the frontend version, but **deliberately no atmospheric body background** (see below) |

### Theme persistence

**Frontend:**
- Stored in `User.theme` DB field (default `"frontend"`)
- Persisted in `userTheme` cookie (httpOnly: false, 1 year) for fast SSR application
- `hooks.server.ts` seeds cookie from DB on first login
- `updateTheme` action in profile saves to DB + sets cookie
- `app.html` inline script reads cookie before paint — **no flash of wrong theme**

**Admin:**
- Same `User.theme` DB field, shared with frontend (a user's theme choice is per-account, not per-app — though the stored value is only meaningful to whichever app's prefix it matches; a `frontend-*` value is simply unrecognized by admin's parser and vice versa)
- Persisted in a separate `adminTheme` cookie (httpOnly: false, 1 year) — separate cookie name so the two apps' theme choices don't collide when both are open in the same browser
- `ThemeToggle.svelte` applies the theme optimistically (`document.documentElement.setAttribute('data-theme', key)`) then fires `POST /api/theme` in the background
- `+layout.server.ts` reads the `adminTheme` cookie (not a DB round-trip) to know which option to highlight as active in the toggle — same rationale as frontend: the cookie is already the source of truth for what's rendered

### Atmospheric body background

Most themes use a flat `--bg-base` fill for the page body. Crimson Portal (frontend only) instead sets `--body-background` to a full multi-layer gradient — a diagonal hairline texture, a crimson diagonal wash, and a soft radial crimson glow — via `background-blend-mode: overlay, screen, normal`.

**This required two separate fixes to actually become visible**, both worth knowing if a future theme wants the same effect:

1. `base.css`'s `body` rule must read `background: var(--body-background, var(--bg-base))`, not a hardcoded `background-color`.
2. **Every top-level layout wrapper that paints its own opaque `background-color` across the full viewport height will silently occlude `<body>`'s background entirely**, regardless of what `<body>` is set to. Both `AppShell.svelte`'s `.shell` (used by admin) and `site.css`'s `.site` (used by frontend's own hand-built layout — frontend does **not** use `AppShell`) had exactly this bug. Both now read `background-color: var(--bg-shell-fill, var(--bg-base))` — a theme that wants its body background to actually show through must set `--bg-shell-fill: transparent` alongside `--body-background`.

`admin-crimsonportal` deliberately does **not** set `--body-background` or `--bg-shell-fill` — the atmospheric effect is a frontend-only design choice; admin keeps the same crimson/gold accent palette everywhere else but a flat body fill.

### Token structure

| Token | Purpose |
|---|---|
| `--bg-base` | Page background |
| `--bg-surface` | Card/panel backgrounds |
| `--bg-overlay` | Hover states, overlays, popovers |
| `--bg-muted` | Inactive/muted sections |
| `--bg-raised` | One elevation step above `--bg-overlay` — nested rows, inset panels that need to visually separate from a card they sit inside. Falls back to `--bg-overlay` |
| `--bg-highlight` | Dedicated hover/active background wash, distinct from `--bg-overlay` so that state doesn't fight for contrast with popovers that also use overlay. Falls back to `--bg-overlay` |
| `--bg-shell-fill` | Background of the top-level layout wrapper (`AppShell`'s `.shell`, frontend's `.site`). Falls back to `--bg-base`. Set to `transparent` only by themes with an atmospheric `--body-background` |
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
| `--accent-secondary` | Second solid accent for a two-tone button pair (e.g. crimson primary + gold secondary via `.btn-secondary`). Falls back to `--brand-accent` |
| `--accent-secondary-light` / `--accent-secondary-text` | Hover/foreground for `.btn-secondary` |
| `--brand-accent` | Brand logo/icon colour |
| `--brand-accent-light` | Brand secondary |
| `--color-success/warning/danger/info` | Semantic feedback |
| `--color-success-dim/warning-dim/danger-dim` | Tinted (not solid) backgrounds for the same semantics — alert boxes, `.badge-*-dim`. Auto-derived via `color-mix()`, no per-theme upkeep needed |
| `--color-rating` | Fixed warm gold for star ratings — theme-independent by design, same rationale as rarity badges (a rating should read the same regardless of theme) |
| `--color-bonus` | Fixed purple for ASI/feat bonus indicators in the wizard and point-buy tool — theme-independent, same rationale as `--color-rating` |
| `--parchment` | Decorative tint for special cards |
| `--accent-text` | Text colour on `btn-primary` background (default `#fff`, override for light accents like Midnight Neon cyan) |
| `--accent-text-hover` | Text colour on `btn-primary:hover` background |
| `--card-shadow` | Shadow on `.card-elevated`. Falls back to a soft default; flatter themes (Crimson Portal) set `none` |
| `--radius-sm/md/lg/xl` | Corner radii — themeable per-theme (Crimson Portal uses noticeably tighter radii than the shared default) |
| `--viz-track-bg` / `--viz-cell-empty` / `--viz-scale-1..5` / `--viz-label` / `--viz-label-active` | Heatmap/activity-grid colour ramp (availability dashboard). `--viz-scale-1..5` default to a `color-mix()` ramp off `--accent`; themes with a distinct data-viz hue (Crimson Portal uses gold, not the crimson primary) override explicitly |
| `--chart-series-1..6` | 6-colour cycle for multi-series charts (`AreaChart`, `LineChart`, `BarChart`, `DonutChart` — see Charts section below). Default cycle derives from existing semantic tokens; Crimson Portal overrides all 6 for a curated gold/crimson/cream palette matching its card aesthetic |
| `--chart-area-opacity` / `--chart-line-width` | Fill opacity for `AreaChart`, stroke width shared across all chart types |
| `--body-background` / `--body-background-blend` | Full CSS `background` shorthand + blend-mode override for an atmospheric page background (see Atmospheric body background above). Falls back to a flat `--bg-base` fill |

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
.btn-secondary     accent-secondary background — a SECOND solid colour for a
                    two-tone button pair (e.g. crimson primary + gold
                    secondary). Falls back to --brand-accent on themes that
                    don't define a distinct secondary accent
.btn-ghost         transparent, border-base, text-secondary — has a visible
                    border, reads as a real (if quiet) button
.btn-quiet         borderless, text-muted, only shows a background on hover —
                    one step quieter than .btn-ghost, for a third action next
                    to an existing primary+secondary pair (e.g. a row-level
                    Cancel)
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
- **One `.btn-primary` per screen, not one per action** — a page with multiple actions should have exactly one primary (the actual call-to-action) and everything else `.btn-ghost`/`.btn-quiet`/`.btn-secondary` as appropriate. As of this writing most admin pages still default every action to `.btn-primary`; this is known debt, not the intended pattern — new pages should follow the one-primary rule from the start

### Badges
```
.badge             base pill shape, 0.75rem
.badge-accent      accent-dim bg, accent-light text  ← theme-dependent
.badge-success     success bg (green), white text
.badge-warning     warning bg (amber), white text
.badge-danger      danger bg (red), white text
.badge-muted       bg-overlay, text-muted
.badge-info        info bg (blue), white text
.badge-outline     transparent, border-base, text-primary — for a tag/label
                    that shouldn't compete with a solid status badge sitting
                    next to it (e.g. a category label beside a "Verified" pill)
.badge-success-dim / .badge-warning-dim / .badge-danger-dim
                    tinted (not solid) background + solid-coloured text — a
                    status pill that should read as "on" without shouting as
                    loud as the fully solid badge (e.g. an "Active" flag next
                    to a muted "Inactive" one)
```

### Star ratings
```
.star-rating         colour: var(--color-rating) — fixed warm gold,
                      theme-independent (same rationale as rarity badges)
.star-rating--muted   colour: var(--text-muted) — the unfilled/empty star state
```
Use on the star glyphs themselves (`★`/`☆`), not as a wrapper. **Never** hardcode
a star-rating colour inline — five separate call sites did this before
`--color-rating` existed and had to be found and fixed individually.

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

## Charts (`shared/ui/src/charts/`)

Four hand-rolled SVG chart components, no charting library dependency — deliberately built as three genuinely different rendering techniques (smoothed path, discrete rects, arcs), not three cosmetic variants of the same trick, so the token system is actually exercised across different geometries.

**All colours come from `--chart-series-1..6`** (see Token structure above) — never hardcode a series colour. Adding a 7th simultaneous series isn't supported by the palette; wrap around is silent (`i % 6`), so keep real usage to 6 series or fewer.

### `AreaChart`
Smoothed curve (Catmull-Rom → cubic Bezier) with a low-opacity filled area under each series plus a crisp stroke on top. Use for a quantity that reads naturally as "volume under the curve" (e.g. average price by rarity tier).

```svelte
<AreaChart series={[{ name: 'Avg buy price', points: [{ label: 'Common', value: 12 }, ...] }]}
  yFormat={(v) => `${Math.round(v)} GP`} />
```

### `LineChart`
Same smoothing/axis logic as `AreaChart`, stroke only, no fill. Use instead of `AreaChart` when several series would visually overlap as filled areas, or when a fill would misleadingly imply "volume" for data that isn't a quantity (a ratio, an index, a monthly count).

### `BarChart`
Discrete `<rect>` grid, grouped by category, always zero-based (a bar's length is read as proportional to its value — an area/line chart can show a non-zero baseline, a bar chart cannot without misrepresenting the data). Use for counts or discrete comparisons.

### `DonutChart`
Arc/wedge geometry. **Different data shape from the other three** — takes one flat `DonutSlice[]` list (parts-of-a-whole), not parallel series over a shared category axis. Supports an optional centre label/value.

```svelte
<DonutChart slices={[{ label: 'Purchases', value: 12 }, { label: 'Sales', value: 4 }]}
  centerValue="16" centerLabel="Transactions" />
```

### Shared conventions across all four
- Props: `series: { name, points: { label, value }[] }[]` (Area/Line/Bar) or `slices: { label, value }[]` (Donut)
- `yFormat?: (v: number) => string` — controls axis/tooltip number formatting
- `showLegend?: boolean` — defaults `true`; set `false` for a single-series chart where the card title already says what it is
- `height?: number` — defaults `220`
- Every data point renders an SVG `<title>` for a native hover tooltip — no JS tooltip library
- `viewBox="0 0 500 …"` with `preserveAspectRatio="none"` — the chart scales to its container's actual width, so wrap it in a sized parent

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

### `$lib/themes.ts` (frontend)
Parses `tokens.css` at build time via Vite `?raw` import. Scoped to `frontend-*` blocks.

| Export | Purpose |
|---|---|
| `getAvailableThemes()` | Returns `ThemeOption[]` — all user-selectable themes parsed from tokens.css |
| `validateTheme(key)` | Returns `key` if valid, otherwise `'frontend'` |
| `ThemeOption` | `{ key, name, bgBase, bgSurface, accent, accentLight }` |

**Called by:** `apps/frontend/src/hooks.server.ts`, `apps/frontend/src/routes/(protected)/profile/+page.server.ts`

### `$lib/themes.ts` (admin)
**Separate file, not shared with frontend's version** — same parsing approach against the same `tokens.css`, but scoped to `admin-*` blocks. Two independent copies is intentional: the prefixes must never cross-list, and the two apps' theme systems evolve independently.

| Export | Purpose |
|---|---|
| `getAvailableThemes()` | Returns `ThemeOption[]` — all `admin-*` themes, plus the hardcoded `admin` default first |
| `validateTheme(key)` | Returns `key` if valid, otherwise `'admin'` |

**Called by:** `apps/admin/src/routes/(app)/+layout.server.ts`, `apps/admin/src/lib/components/ThemeToggle.svelte`, `apps/admin/src/routes/api/theme/+server.ts`

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
| `AppShell` | `apps/admin/src/routes/(app)/+layout.svelte` only — frontend has its own hand-built layout (`.site` in `site.css`, root `apps/frontend/src/routes/+layout.svelte`), not `AppShell` |
| `afterNavigate` (SvelteKit) | `AppShell.svelte` — closes mobile drawer on route change. Pragmatic exception to no-SvelteKit-imports rule. |
| `ConfirmModal` (mounted) | `apps/admin/src/routes/(app)/+layout.svelte` — **not currently mounted in frontend's root layout**. `confirmModal()` calls exist on several frontend pages (see list above) but have nothing to render into until this is fixed; flagged here rather than silently left inaccurate |
| `confirmModal` (singleton) | Any page with destructive actions |
| `PermissionCell` | `apps/admin/src/routes/(app)/roles/[id]/+page.svelte` |
| `NotificationBell` | Internal to `Header.svelte` → `AppShell` |
| `renderMarkdown` | Journal, wiki, news pages in both apps |
| `Dnd5eCharacterSheet` | `characters/[id]/_sheets/Dnd5eSheetSection.svelte` (player), `dm/worlds/[w]/characters/[c]/_sheets/DmDnd5eSheetSection.svelte` (DM), admin character sheet |
| `Dnd5eSpellbooks` | Internal to `Dnd5eCharacterSheet` only |
| `Dnd5eAsiFeatsPanel` | Not yet wired — ready to use |
| `AreaChart` / `LineChart` / `BarChart` / `DonutChart` | `apps/admin/src/routes/(app)/+page.svelte` (dashboard) |
| `ThemeToggle` | `apps/admin/src/routes/(app)/+layout.svelte` (via `AppShell`'s `actions` snippet) |
| `generateFantasyName` | `characters/new/dnd5e/+page.svelte` |
| `getAvailableThemes` (frontend) | `profile/+page.server.ts`, `hooks.server.ts` |
| `getAvailableThemes` (admin) | `apps/admin/src/routes/(app)/+layout.server.ts` |
| `validateTheme` (frontend) | `hooks.server.ts` |
| `validateTheme` (admin) | `apps/admin/src/routes/api/theme/+server.ts` |
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

**New user theme (frontend):**
- [ ] Add `/* theme-name: Display Name */` immediately before `[data-theme="frontend-*"]` in `tokens.css`
- [ ] Define all required tokens (see Token structure table above)
- [ ] If it needs an atmospheric body background, also set `--bg-shell-fill: transparent` — otherwise `.site`'s opaque fill will hide it completely (see Atmospheric body background above)
- [ ] No code changes needed — picker auto-discovers it

**New user theme (admin):**
- [ ] Add `/* theme-name: Display Name */` immediately before `[data-theme="admin-*"]` in `tokens.css`
- [ ] Define all required tokens
- [ ] Atmospheric body backgrounds are a frontend-only pattern by convention — don't set `--body-background` on an admin theme unless there's a specific reason to break that convention
- [ ] No code changes needed — `ThemeToggle` auto-discovers it

**New chart on a page:**
- [ ] Pick the right type: `AreaChart` (quantity under a curve) / `LineChart` (comparison, no fill) / `BarChart` (discrete counts, zero-based) / `DonutChart` (parts of a whole)
- [ ] Real data only — reshape an existing DB read, don't invent numbers even for a "just testing the theme" chart
- [ ] Never hardcode a series colour — the component already reads `--chart-series-1..6`
- [ ] Import from `@core/ui`, not a relative path

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