# Marches — Architecture & Decision Log

> **Living document.** Updated as decisions are made and features are built.
> Last updated: 2026-06-04 (wizard session)

---


## Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Frontend framework | SvelteKit 2.x + Svelte 5 |
| Language | TypeScript |
| Database | PostgreSQL (multi-schema) |
| ORM | Prisma v7 (prismaSchemaFolder) |
| Auth | better-auth v1.4.22 |
| CSS | Tailwind CSS v4 |
| Runtime | Node.js v24 |
| Package manager | pnpm v11 |
| Markdown | marked (via @core/ui) |

---


## Monorepo Structure

```
marches/
├── apps/
│   ├── admin/      @apps/admin     (port 5174)
│   ├── frontend/   @apps/frontend  (port 5173)
│   └── discord/    @apps/discord   (persistent process — tsx bot)
└── shared/
    ├── database/   @core/database
    ├── rbac/       @core/rbac
    ├── email/      @core/email
    ├── ui/         @core/ui        (includes renderMarkdown)
    └── errors/     @core/errors
```

---


## Database Schema Topology

```
01 platform    — Module, Resource, Setting, NavVisibility, Notification
02 users       — User, Role, UserRole, RolePermission
03 auth        — Session, Account, Verification (better-auth owned)
04 audit       — AuditLog (append-only)
05 gamesystem  — GameSystem, ProgressionThreshold
06 dnd5e       — Dnd5eClass, Dnd5eClassFeature, Dnd5eSubclass, Dnd5eSubclassFeature,
                 Dnd5eSpecies, Dnd5eSpeciesTrait, Dnd5eBackground (grantsFeatCategory, grantsFeatId),
                 Dnd5eFeat, Dnd5eCharacterFeat (sourceClassId, sourceLevel, asiStat1/2, asiAmount1/2),
                 Dnd5eCharacterSheet, Dnd5eCharacterClass, Dnd5eAbilityStat, Dnd5eAbilityScore
07 characters  — Character, CharacterClass, CharacterSlotGrant,
                 CharacterTransaction, CharacterInventory
08 dms         — DMProfile, DMGameSystem, RoleRequest, DMRating
09 quests      — Quest, QuestDM, QuestReward (itemRarity/Category/MaxValue),
                 QuestSignup, QuestResult, QuestResultCharacter (itemGrantedId/Name),
                 QuestItemUsage
10 marketplace — MarketplaceItem, MarketplaceTransaction
11 world       — World, WorldDM (canManage Boolean), Region, RegionDM, Location, WikiPage, WikiRevision
12 rewards     — Achievement, CharacterAchievement
13 stats       — QuestStat (avgPartyLevel, playerCount, completedAt)
14 availability — AvailabilitySlot (userId, date, slot 0-47, scope GLOBAL|WORLD, worldIds[])
15 news        — Announcement (type NEWS|EVENT|WARNING|STATUS, tags[], scheduledAt, expiresAt),
                 Journal, JournalSection, JournalPage
16 discord     — DiscordServer (guildId, name, scope global|worldId),
                 DiscordChannel (channelId, channelName, type ANNOUNCEMENTS|QUESTS|MARKET|CHARACTERS),
                 DiscordNotificationQueue (type, payload JSON, processed)
```

---


## Build Order

```
✅ 0.  Core platform
✅ 1.  GameSystem
✅ 2.  Character Hub
✅ 3.  DM Hub
✅ 4.  Quest System (full — lifecycle, rewards, item rewards, destroyable inventory)
✅ 5.  Marketplace + Character Inventory
✅ 6.  World System
✅ 7.  Notification System
✅ 8.  Quest Completion Workflow + Rewards Engine
✅ 9.  Character additions (backstory, world lock, inventory links)
✅ 10. Statistics (platform + user + per-character, live queries)
✅ 11. Availability + Quest v2
✅ 12. News / Blog / Journal
✅ 13. Discord integration
✅ 14. GameSystem refactor (dnd5e schema)
✅ 15. Character system expansion
✅ 16. Frontend navigation redesign
✅ 17. Availability heatmap redesign (frontend)
✅ 18. Admin character sheet layout (tabbed)
✅ 19. World landing page card layout
✅ 20. World marketplace (per-world stock, price overrides, level restrictions) — schema + workflows + admin pages + frontend filter
✅ 21. World marketplace expansion — per-world level restrictions UI, world-lock enforcement, buy/sell world context, Discord world commands, transaction world filter
✅ 22. World DM assignment — WorldDM model, assign/remove DMs at world level (same pattern as RegionDM)
✅ 23. DM Hub world management — full world/region/location/wiki/marketplace/transactions/characters/quests/journal/audit per world, canManage flag, quest approval routing
✅ 24. Import/Export audit — identified all gaps (progression missing both, all areas missing export)
✅ 25. Import/Export — add progression import/export, add export to all existing import areas (see ImportExportPlan.md)
✅ 26. Character system refactor — sculpt dnd5e out of universal character layer (see CharacterSystemRefactor.md) — COMPLETE
✅ 27. dnd5e character sheet completion — ASI/feats, ability scores, background feat grants, DM/admin sheet sections
⬜ 28. DM dashboard quest filters (UI cleanup phase)
✅ 29. Character creation wizard — 6-step D&D 5e wizard (/characters/new/dnd5e), system selector gate, point-buy + roll, class browser with feature timeline, mobile bottom sheets
```

---


## Feature Plugin Pattern

Every new feature follows this pattern:

```
1. New schema + Prisma models
2. Resource entries in platform (with navVisibility)
3. Setting entries in feature seed file (not 01-platform.seed.ts)
4. Nav entry in apps/admin/src/lib/nav.ts
5. Admin routes under (app)/[feature]/
6. Frontend routes under (protected)/[feature]/
```

### Settings Grouping
```
/settings              — Core only (smtp.*, email.*, site.*)
/[feature]/settings    — Feature settings ([feature].*)
Same platform.Setting table, grouped by key prefix.
```

### NavVisibility
```
ALL  — admin-only list routes (full access required)
ANY  — own-record sections (OWN or ALL grants nav)
NONE — internal resources (never navigable)
```

---