# D&D 5e Character Creation Wizard

> **Reference** — current behavior. History: [CHANGELOG.md](../../CHANGELOG.md) (Session 79).

Route: `apps/frontend/src/routes/(protected)/characters/new/dnd5e/`

Entry: `/characters/new` (system selector) → `/characters/new/dnd5e`

---

## Architecture

```
+page.svelte              Orchestrator — step ribbon, nav, WizardState, $effect hooks
+page.server.ts           Create action — hidden-input contract (unchanged)
_wizard/
  wizard-state.svelte.ts  WizardState class + sessionStorage (key: wizard_dnd5e)
  grants.ts               Pure (sys, ws) derivations — pools, validation, ASI sync
  types.ts                Shared types (AsiChoice, ChoicePoolSpec, …)
  StepIdentity.svelte … StepReview.svelte   One component per wizard step
  ChoicePoolInline.svelte FeatPickerInline.svelte AsiSlotInline.svelte FeatNestedPoolsInline.svelte
```

---

## 6-step flow

| Step | Component | Inline choices resolved here |
|---|---|---|
| 0 Identity | `StepIdentity.svelte` | Name, avatar, portrait, world |
| 1 Species | `StepSpecies.svelte` | Size (`sizeChoices`), trait skill/save/tool/lang/expertise/dmg pools, trait feat grants + nested feat pools |
| 2 Background | `StepBackground.svelte` | Background feat pick, skill/tool/lang/save/dmg pools, nested feat pools |
| 3 Scores | `StepScores.svelte` | Point-buy, roll, standard array, species bonus points |
| 4 Classes | `StepClasses.svelte` | Class skills, feature pools, feat grants, **ASI/Epic Boon slots** (`AsiSlotInline`) |
| 5 Review | `StepReview.svelte` | Summary + `<form>` with all hidden inputs for `+page.server.ts` |

There is **no separate Skills step**. All skill/save/tool/language/expertise/damage-modifier/feat/ASI choices are resolved inline on the step where the granting source appears.

---

## State & validation

- **State:** `WizardState` in `wizard-state.svelte.ts` — persisted to `sessionStorage` key `wizard_dnd5e`
- **Derivations:** `grants.ts` — `allPoolsSatisfied`, `advanceBlockersForStep`, `expertiseGrantSubmissions`, `featNestedPools`, `asiSlots`, etc.
- **Validation:** `grants.advanceBlockersForStep(sys, ws, step)` returns human-readable blockers; orchestrator uses `$derived.by()` so nested pool mutations re-run validation reliably
- **ASI keys:** stable `asi-feat-{classId}-{level}` (migrated from index-based keys)

---

## Form submission

`StepReview.svelte` emits hidden inputs consumed by `+page.server.ts`:

- Pool skills, saves (with per-grant `sourceType` / `sourceId`)
- Expertise via `expertisePoolSkill` arrays (value 2.0) + `expertisePoolSourceType` / `expertisePoolSourceId`
- ASI parallel arrays, `chosenSize`, feat picks, tool/language/damage-modifier pools

`+page.server.ts` is unchanged — the hidden-input contract is preserved across the rebuild.

---

## Post-creation character sheet

Universal `characters/[id]/+page.svelte` + `_sheets/Dnd5eSheetSection.svelte` action bridge → `@core/ui` `Dnd5eCharacterSheet.svelte`.

- Pending choice pools on the sheet use `saveChoicePoolGrants`
- Size uses `saveSize` when `traitSizeChoices` exists and sheet has no size yet (picker hidden once set)

---

## Tests

```bash
pnpm --filter @apps/frontend test:e2e   # character-wizard.e2e.ts
```

---

## Related

- [ADR 001 — Inline wizard choice pools](../decisions/001-inline-wizard-choice-pools.md) — why there is no separate Skills step
- [Import guide](./import-guide.md) — grant field columns for species/features/feats
- [Technical reference](../technical.md) — SvelteKit patterns, feat ASI caching
- [UI system](../ui-system.md) — `canViewDescriptions` gating in wizard steps
