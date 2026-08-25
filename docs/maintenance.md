# Documentation Maintenance

How to keep docs accurate without updating ten files per feature.

---

## Three doc types

| Type | Where | When to update |
|---|---|---|
| **Reference** | `docs/` (except scratchpad) | When behavior or architecture changes |
| **History** | `CHANGELOG.md` | Once per session or PR — append only |
| **Generated / validated** | Scripts | CI catches drift |

Do **not** copy reference content into the changelog, or session notes into reference docs.

---

## Per-change checklist

1. **One changelog entry** in `CHANGELOG.md` — what changed, why, key files
2. **Update affected reference pages only** — e.g. wizard change → `docs/dnd5e/wizard.md`
3. **Run checks:**
   ```bash
   pnpm docs:check
   pnpm docs:generate-deps   # after dbapi import graph changes (regenerates dependency-map.md)
   pnpm --filter @core/database check:dnd5e-sync   # duplicated logic + import-guide columns
   ```

---

## Single sources of truth

| Topic | Canonical doc | Do not duplicate in |
|---|---|---|
| Env vars & commands | `docs/setup.md` | README (summary + link only) |
| Wizard flow | `docs/dnd5e/wizard.md` | technical.md (link only), changelog |
| Import columns | `docs/dnd5e/import-guide.md` | feature docs (link only) |
| UI rules | `docs/ui-system.md` | app READMEs |
| Stack / schema map | `docs/architecture.md` | README (summary only) |

---

## Adding an architecture decision

Create `docs/decisions/NNN-short-title.md` using the template in [decisions/README.md](./decisions/README.md). Reference docs link to ADRs for *why*; ADRs are rarely rewritten.

---

## Root stub files

Files like `Commands.md` at the repo root are **redirects** to `docs/`. Never edit stubs with real content — edit the target under `docs/`.

When adding a new reference doc, add it to `docs/README.md` and extend `scripts/docs-check.ts` if needed.

---

## Future automation

- **Dependency map:** `pnpm docs:generate-deps` — regenerate `docs/dependency-map.md` from dbapi imports
- **Import guide:** `check:dnd5e-sync` validates admin import TABS ↔ `docs/dnd5e/import-guide.md`
- **Route lists:** optional script from SvelteKit file tree
