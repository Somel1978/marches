# 001 — Inline wizard choice pools (no separate Skills step)

**Status:** Accepted  
**Date:** 2026-07-07

## Context

The D&D 5e character creation wizard originally grew as a single large page (~2,700 lines). Session 77 added a dedicated **Skills** step (step 3) to collect skill/save/tool/language/expertise pools after Background and before Scores.

That design had several problems:

- **Cognitive disconnect** — players chose skills on a step far from the class feature or species trait that granted the pool
- **State fragmentation** — pool choices keyed by `sourceId` had to survive step navigation and sessionStorage round-trips across many steps
- **Validation complexity** — gating "Next" required knowing all pools globally while UI for each pool lived on a different step
- **Feat-granted pools** — ASI feat picks could grant nested pools; a standalone Skills step could not show those in context with the feat selection

A conditional **7th step** for ASI (between Classes and Review) was considered in `docs/dev-environment.md` Part 3 but would have added more ribbon complexity without fixing the pool-at-source problem.

## Decision

Rebuild the wizard as a **6-step inline flow**:

1. Identity → Species → Background → Scores → Classes → Review  
2. Resolve **all** choice pools (skills, saves, tools, languages, expertise, damage modifiers, feats, ASI/Epic Boon) on the step where the granting source is displayed  
3. Centralise state in `WizardState` + pure derivations in `grants.ts` under `_wizard/`  
4. Keep `+page.server.ts` hidden-input contract unchanged so server-side create logic stays stable

No separate Skills step. No separate ASI step — ASI slots render inline on the Classes step feature timeline via `AsiSlotInline`.

## Consequences

**Easier**

- Players see grants and make choices in one place (species trait, background, class feature, feat)
- Step validation is local: `advanceBlockersForStep` checks only the current step's sources
- Feat nested pools (`FeatNestedPoolsInline`) compose naturally under feat/ASI pickers
- Orchestrator `+page.svelte` stays thin; E2E tests target a stable 6-step ribbon

**Harder**

- Step components (especially `StepClasses.svelte`) are larger than a dedicated Skills page would have been
- Review step must aggregate all pool submissions (`expertiseGrantSubmissions`, etc.) — bugs here affect DB writes
- Documentation must describe inline flow clearly ([dnd5e/wizard.md](../dnd5e/wizard.md)) — changelog alone is not enough

**Follow-ups**

- Expertise must be submitted at creation and preserved on approval (`approve-character.ts`) — implemented Session 79
- Size picker on post-creation sheet only when size unset — separate UI rule ([ui-system.md](../ui-system.md) rule #12)

## Supersedes

- Separate Skills step (Session 77) — marked superseded in CHANGELOG
- Conditional 7th ASI step (dev-environment Part 3 plan) — not implemented; ASI stays inline on step 4
