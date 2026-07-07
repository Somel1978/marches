# Agent notes — Marches

## Documentation

- **Index:** [docs/README.md](docs/README.md)
- **Workflow:** [docs/maintenance.md](docs/maintenance.md)

When changing behavior:

1. Append **one entry** to [CHANGELOG.md](CHANGELOG.md)
2. Update **only** the affected reference doc(s) under `docs/`
3. Run `pnpm docs:check` and `pnpm --filter @core/database check:dnd5e-sync` when relevant

Do **not** edit root stub files (`Commands.md`, `FeaturesDev-*.md`, etc.) — they redirect to `docs/`.

### Canonical topics

| Topic | Doc |
|---|---|
| Commands & env | `docs/setup.md` |
| Architecture | `docs/architecture.md` |
| SvelteKit / auth patterns | `docs/technical.md` |
| D&D 5e wizard | `docs/dnd5e/wizard.md` |
| D&D 5e import columns | `docs/dnd5e/import-guide.md` |
| UI rules | `docs/ui-system.md` |
| Architecture decisions | `docs/decisions/` |
