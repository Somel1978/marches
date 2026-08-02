# D&D 5e Codex

Community reference browser for available D&D 5e rules content. Structured
multi-field search (not free-text) with results always nested under parents.

| Surface | Route | Purpose |
|---|---|---|
| Frontend tool | `/tools/codex` | Filter Classes, Species, Feats, Backgrounds, Spells |

**Permission:** `dnd5eDescriptions` / `read` (same gate as sheet/wizard descriptions).
Denied users get **403**; the Community nav link is hidden unless allowed.

---

## Data

`dnd5e.getCodexData(gameSystemId)` in
[`shared/database/dbapi/read/dnd5e/get-codex.ts`](../../shared/database/dbapi/read/dnd5e/get-codex.ts)
loads the active available-only corpus (classes with nested features/subclasses,
species with traits, feats, backgrounds, non-legacy spells). No new Prisma models;
read-only.

---

## Filters (client)

1. Multi-select entity types
2. Field + operator + value rows, combined **left-to-right** with per-row **AND / OR**
3. Friendly field labels (optgrouped); some labels search multiple DB props (OR within the field)
4. Field catalog changes with selected types

Operators: `contains` / `equals` for strings; `equals` / `≥` / `≤` for numbers;
`equals` Yes/No for booleans.

**Field picker hierarchy** (native `<optgroup>` is flat; nesting is shown in the group label):

```
Classes
Classes › Class features
Classes › Subclasses
Classes › Subclasses › Subclass features
Species
Species › Traits
Feats | Backgrounds | Spells
```

Name fields are labeled **Name** under each group (avoids “Feats / Feats”).

**Consolidated grant fields** (on features, subclass features, traits, feats, backgrounds):
Skills, Saves Proficiency, Resistances, Immunities, Vulnerabilities, Includes Spells,
Speed, Senses, Tools, Languages — each maps to one or more grant/choice columns.

Trait **Senses** searches both `senses` and `grantsSenses` (OR within the field).

**Match rules**

- Type selected + no filters → all parents of that type
- Filters that only hit children still return the parent, with the nested tree
  trimmed to matching features / subclasses / traits
- Filters scoped to another type do not dump the full list for unrelated types
- No parentheses — joins evaluate left-to-right

---

## Result hierarchy

```
Classes
  Class Features
  Subclasses
    Subclass Features
Species
  Species Traits
Feats | Backgrounds | Spells  (flat)
```

Full description text is always shown on this page (caller already passed the
permission gate). Descriptions use `DescriptionText`: if the string looks like
Markdown (`looksLikeMarkdown`), it renders via the same `renderMarkdown` stack
as wiki/journals; otherwise plain text. Spell results also reuse
`Dnd5eSpellDetail` (property grid, damage, upcast, tags).

---

## Key files

```
shared/database/dbapi/read/dnd5e/get-codex.ts
apps/frontend/src/routes/(protected)/tools/codex/+page.server.ts
apps/frontend/src/routes/(protected)/tools/codex/+page.svelte
apps/frontend/src/routes/(protected)/tools/codex/codex-filter.ts
```
