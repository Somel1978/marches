# Marches Documentation

Central index for project documentation. **Reference docs** describe how the system works today. **Changelog** is append-only history.

---

## Getting started

| Doc | Purpose |
|---|---|
| [setup.md](./setup.md) | Install, env vars, pm2, database commands, tests |
| [dev-environment.md](./dev-environment.md) | Prod vs dev server layout (ports, pm2 names, clone steps) |

---

## Reference (current behavior)

| Doc | Purpose |
|---|---|
| [architecture.md](./architecture.md) | Stack, monorepo layout, schema topology, build order |
| [technical.md](./technical.md) | SvelteKit patterns, auth, Discord, cross-package rules |
| [ui-system.md](./ui-system.md) | `@core/ui` rules, themes, components |
| [features/part1-characters-dms.md](./features/part1-characters-dms.md) | Characters, game systems, DMs |
| [features/part2-quests-worlds.md](./features/part2-quests-worlds.md) | Quests, worlds, marketplace, Discord features |
| [dependency-map.md](./dependency-map.md) | File-level dependency notes (manual; verify with code search) |

### D&D 5e

| Doc | Purpose |
|---|---|
| [dnd5e/wizard.md](./dnd5e/wizard.md) | 6-step character creation wizard (`_wizard/` module) |
| [dnd5e/import-guide.md](./dnd5e/import-guide.md) | Import column reference (validated by `check:dnd5e-sync`) |

---

## History & planning

| Doc | Purpose |
|---|---|
| [../CHANGELOG.md](../CHANGELOG.md) | Session/PR history (append-only) |
| [scratchpad.md](./scratchpad.md) | Completed work checklist / scratch notes |
| [decisions/](./decisions/) | Architecture decision records (ADRs) |

---

## Maintenance

See [maintenance.md](./maintenance.md) for the doc update workflow and CI checks.

```bash
pnpm docs:check                              # link + stub validation
pnpm docs:generate-deps                      # regenerate dependency-map.md
pnpm --filter @core/database check:dnd5e-sync  # duplicated logic + import-guide columns
```

---

## Root stubs

Legacy filenames at the repo root (`Commands.md`, `FeaturesDev-*.md`, etc.) redirect here so old links keep working.
