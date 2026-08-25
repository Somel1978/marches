# Architecture Decision Records

Small, permanent notes for *why* we chose something — not how it works today (that belongs in reference docs).

---

## When to write an ADR

- Cross-cutting choice that will confuse future readers (schema layout, auth flow, package boundaries)
- Deliberate trade-off (e.g. inline wizard pools vs separate Skills step)
- Something we rejected and might be proposed again

Skip ADRs for routine bug fixes or obvious refactors.

---

## Template

Create `NNN-short-kebab-title.md`:

```markdown
# NNN — Title

**Status:** Accepted | Superseded by MMM  
**Date:** YYYY-MM-DD

## Context
What problem or constraint led to this decision?

## Decision
What we chose.

## Consequences
What becomes easier / harder; what to watch for.
```

Number sequentially (`001`, `002`, …).

---

## Index

| ADR | Title |
|---|---|
| [001](./001-inline-wizard-choice-pools.md) | Inline wizard choice pools (no separate Skills step) |
