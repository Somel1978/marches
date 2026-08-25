# Marches Changelog

> Append-only project history. For **current system behavior**, see [docs/README.md](docs/README.md).

---

### Session 79 — D&D 5e Wizard Rebuild & Grant Pipeline Fixes (2026-07-07)

**Character creation wizard — modular rebuild**
- Monolithic `apps/frontend/.../dnd5e/+page.svelte` (~2,700 lines) split into `_wizard/` module (~15 files)
- **6-step flow:** Identity → Species → Background → Scores → Classes → Review (no separate Skills step)
- All choice pools (skills, saves, tools, languages, expertise, damage modifiers, feats, ASI/Epic Boon) resolved **inline** wherever the granting source is shown
- `wizard-state.svelte.ts` — `WizardState` class centralises state + sessionStorage (`wizard_dnd5e`); fixes incomplete persistence for `chosenSize`, tool/lang/expertise/dmg pools, `featureFeatPicks`
- `grants.ts` — pure `(sys, ws)` derivation functions: pool specs, step validation, ASI slot sync, `expertiseGrantSubmissions()`
- Reusable inline components: `ChoicePoolInline`, `FeatPickerInline`, `AsiSlotInline`, `FeatNestedPoolsInline`
- `+page.svelte` — thin orchestrator (ribbon, nav, `$effect` hooks); `+page.server.ts` **unchanged** (hidden-input contract preserved)
- E2E: `apps/frontend/tests/interactions/character-wizard.e2e.ts` rewritten for inline 6-step flow

**Wizard bug fixes**
- Species/Classes step "Next" gating — `$derived.by()` + immutable `WizardState` mutators (`updateClassAlloc`, `updateAsiChoice`, …)
- Feat-originated skill/tool/etc. pools on ASI slots — `FeatNestedPoolsInline` wired into `AsiSlotInline`
- Background feat pick cleared on remount — `$effect` now only clears `bgFeatPick` when **background changes**, not on every visit
- Stable ASI feat source keys (`asi-feat-{classId}-{level}`) with migration from index-based keys
- Expertise limited to proficient skills via `effectiveExpertisePool()` + `trimInvalidExpertiseChoices()`
- High-level species traits (`requiredLevel > 1`) excluded from creation-time validation

**Review & database — expertise**
- `expertiseGrantSubmissions()` — unified list for review display and form submission (auto-granted + player-chosen pools)
- Review step shows all expertise with ×2 badges; hidden inputs use `expertisePoolSkill` / `expertisePoolSourceType` / `expertisePoolSourceId` (value 2.0)
- Class/subclass auto expertise now submitted at creation (previously only applied on DM approval)

**Character sheet — size picker**
- `Dnd5eCharacterSheet.svelte` — size choice buttons only shown when size is **not yet set** (`!sheet.size && !traitSize`) and user can edit

**Approval — preserve player pool grants**
- `approve-character.ts` — `applyClassFeatureGrants` preserves player-resolved pool grants (skills/expertise/half) before re-syncing fixed auto-grants from feature definitions

---

### Session 80 — Availability Dashboard Redesign & DM Alignment (2026-07-07)

**Player availability — dashboard UX**
- `/availability` redesigned: read-only **Community overview** heatmap + per-player **timeline blocks** (merged 30-min slots)
- Players set times via **Add / Edit modal** (date, From/Until selects, GLOBAL/WORLD scope + world checkboxes) — no click-to-set on heatmap
- Server actions: `setRange`, `updateRange`, `clearRange`, `clearDay`
- **Mobile:** day tabs + single-day density strip + one full-width timeline per player (no horizontal scroll on narrow screens)
- Shared helpers moved to `apps/frontend/src/lib/availability/utils.ts` (route `availability-utils.ts` re-exports)

**DM availability — aligned layout**
- New read-only `DmAvailabilityDashboard.svelte` + `build-availability-dashboard.ts` shared loader
- `/dm` — full week dashboard (all players, all worlds)
- `/dm/worlds/[worldId]` — world-scoped dashboard (GLOBAL + WORLD slots for that world; chars filtered by `acceptsGlobalCharacters`)
- `/dm/worlds/[worldId]/quests` — same panel above quest table for scheduling context
- `/dm/quests/[id]` — “Available players” invite list uses matching card styling; shows quest time + player name

**CSS:** `shared/ui/styles/components/availability.css` — `.avail-dash__*` dashboard layout + DM embedded/read-only variants

---

**Skill Grant System — Schema**
- `Dnd5eClass` — `skillChoiceCount Int?` added directly; `savingThrows Dnd5eClassSavingThrow[]` and `skillOptions Dnd5eClassSkillOption[]` junction relations (already existed from earlier work)
- `Dnd5eClassFeature` + `Dnd5eSubclassFeature` — added `grantsSkills`, `grantsExpertise`, `grantsHalfSkills`, `grantsSavingThrows`, `skillChoiceCount`, `skillChoicePool`
- `Dnd5eSpeciesTrait` — added `grantsSkills`, `grantsExpertise`, `grantsHalfSkills`, `skillChoiceCount`, `skillChoicePool`
- `Dnd5eBackground` — added `grantsSkills String?`, `skillChoiceCount Int?`, `skillChoicePool String?` (replaces old `skillProficiencies` string with proper structured fields)
- `Dnd5eFeat` — added all 6 grant fields: `grantsSkills`, `grantsExpertise`, `grantsHalfSkills`, `grantsSavingThrows`, `skillChoiceCount`, `skillChoicePool`

**Skill Grant System — Write Functions**
- `shared/database/dbapi/write/dnd5e/classes.ts` — `updateClassSavingThrows(classId, stats[])` and `updateClassSkillPool(classId, skills[])` added (delete-and-recreate junction pattern)
- `shared/database/index.ts` — both exported as `dnd5e.classes.updateSavingThrows` and `dnd5e.classes.updateSkillPool`
- Grant fields added to all create/update functions: `createClassFeature`, `updateClassFeature`, `createSubclassFeature`, `updateSubclassFeature`, `createSpeciesTrait`, `updateSpeciesTrait`, `createDnd5eFeat`, `updateDnd5eFeat`

**Import/Export Consistency**
- All 7 import tabs now include their applicable grant columns
- `normalizeSkills(raw, warnings, context)` / `normalizeStats(raw, warnings, context)` helpers normalise display names → enum keys; unrecognised values pushed to `warnings[]`
- Export tabs updated to emit grant columns for all entities
- Import UI shows amber warning banner for normalisation failures (never silently drops)

**Admin UI — Class Detail (`/game-systems/[id]/dnd5e/classes/[classId]`)**
- Class details form: added `Saving throws granted` (pre-filled from `cls.savingThrows` junction), `Skill choices` count, `Skill pool` (pre-filled from `cls.skillOptions` junction)
- `updateClass` action now saves `skillChoiceCount` directly and calls `updateSavingThrows` + `updateSkillPool` on the junction tables
- Class feature and subclass feature edit forms: grant field row added (6 inputs per form); server reads and writes all grant fields on `addFeature`, `updateFeature`, `addSubclassFeature`, `updateSubclassFeature`

**Admin UI — Species (`/game-systems/[id]/dnd5e/species`)**
- Expanded species row now shows a full edit form for all species fields (name, description, source, link, isAvailable, isSubrace, isLegacy, sortOrder) — previously only trait management was available
- `updateSpecies` action added to server; calls `dnd5e.species.update`
- Species trait edit form gains grant field row (5 inputs — no saving throws for traits)
- `traitGrantFields(data)` helper in server

**Admin UI — Feats (`/game-systems/[id]/dnd5e/feats`)**
- Both create and edit forms gain full 6-field grant row
- `featGrantFields(data)` helper in server; both `create` and `update` actions spread it
- Empty `{#each feat.categories}` block fixed — now renders category badge spans

**Character Creation Wizard — Skills Step** *(superseded by Session 79 inline wizard rebuild)*
- Originally: separate Step 3 ("Skills") between Background and Scores — **removed** in Session 79
- All pool pickers now inline on Species, Background, and Classes steps; ASI/feats inline on class feature timeline
- `chosenPoolSkills`, `chosenExpertisePools`, and related state still keyed by `sourceId`; validation via `allPoolsSatisfied` / `advanceBlockersForStep` in `grants.ts`

**`Dnd5eSkillsPanel.svelte`**
- Full rewrite: uses `sk.value` (Float 0/0.5/1/2) replacing old `sk.proficiency` enum; `valueToProf()` converter; `sk.sources` array replacing `sk.source` string; legend layout fixed

**Character Mood**
- Moved from `Dnd5eCharacterSheet.svelte` to universal character page (`characters/[id]/+page.svelte`); reads from `data.character.moodEmoji` / `data.character.moodText`; saves via `?/saveMood`

**Bug Fixes**
- `Dnd5eClassSkillOption.createMany` — `skill as any` cast required for `Dnd5eSkillName` enum
- Grant helpers (`grantFields`, `traitGrantFields`, `featGrantFields`) return `undefined` not `null` to satisfy create function type signatures
- A11y: standalone `<label>` tags without `for` attributes removed from inline grant field rows (inputs retain `placeholder`)



**Part 5 — Approval Workflow Notifications ✅**
- `dispatcher.ts` — added `dmAdmins()` and `dmWorldDMs()` helpers; SUPERADMIN OR User/read/ALL query covers all admin roles; `notifyUserRegistered()` now delegates to `dmAdmins()`; `notifyCharacterPendingApproval()` and `notifyMarketplacePending()` wired to send Discord DMs in addition to channel posts
- `notifications.ts` — `createNotificationsForAdmins()` updated to use SUPERADMIN OR User/read/ALL query (not hardcoded SUPERADMIN)
- `shared/rbac/auth.ts` — `afterEmailVerification` hook now calls `notifications.createForAdmins()` + `queueDiscordNotification('USER_REGISTERED')` after role assignment
- `characters/create.ts` — in-app notifications wired for `CHAR_PENDING_APPROVAL` to admins and world DMs
- `process-queue.ts` — handles `USER_REGISTERED` type
- `database/index.ts` — exports `queueDiscordNotification`; Prisma query logging removed (was spamming logs every 30s)
- `discord/index.ts` — poll interval increased from 10s to 30s

**Part 6 — User Signup Workflow ✅**
- Auto-activate on email verification — no admin approval gate needed
- Admin notified via Discord DM + in-app notification when user verifies email
- `SITE_URL` env var used for canonical origin in verification emails (SvelteKit reserves `PUBLIC_` prefix)

**Bug fixes**
- `species.ts` — `grantsFeatCategory` and `grantsFeatId` added to `createDnd5eBackground` and `updateDnd5eBackground` type signatures
- `get-items.ts` — `description` added to `getAllMarketplaceItemsForExport` select
- `dispatcher.ts` — `DMProfile` has no `user` relation; fixed to query `userId` then look up users separately
- `auth.ts` — `BETTER_AUTH_SECRET ?? ''` fallback to satisfy TypeScript `string` type
- `characters/create.ts` — missing `.ts` extension on dispatcher import

### Session 81 — Encounter Planner Tool (2026-07-09)

**New feature — standalone encounter planner (not tied to quests)**
- Player tool at `/tools/eplanner` (frontend): add encounters dynamically, pick monster CRs, live mission XP / difficulty tier / reward XP & GP calculation
- Admin editor at `/tools/eplanner` (admin, new "Tools" nav section): edit CR→XP table, level thresholds, monster-count multipliers, mission config scalars; audited; reset-to-defaults action
- Logic ported from `NH Mission.xlsx` (2024 DMG encounter budgets); workbook no longer needed

**Database (`dnd5e` schema — game data, keyed by `gameSystemId`)**
- New models: `Dnd5eEncounterXp` (CR→XP), `Dnd5eEncounterLevelThreshold` (level × low/moderate/high), `Dnd5eEncounterMultiplier` (count breakpoints), `Dnd5eEncounterConfig` (tier ratios, GP rate, adventure-day multiplier)
- `seeds/04b-dnd5e.seed.ts` — seeds 2024 DMG defaults (49 CR rows, 20 levels, 5 multipliers, config row); idempotent
- `dbapi/read/dnd5e/encounter-planner.ts` — `getEncounterConfig()` merges DB rows over defaults
- `dbapi/write/dnd5e/encounter-planner.ts` — upsert/delete per table, `updateEncounterConfig`, `resetEncounterPlanner`; all audit-logged
- `dbapi/read/dnd5e/eplanner-calc.ts` — pure `calculateMission(input, config)`, no DB imports; exported as `@core/database/eplanner-calc` subpath for browser use
- `dbapi/read/dnd5e/eplanner-defaults.ts` — default tables (seed + reset source)
- `index.ts` — `dnd5e.encounterPlanner.*` namespace

**Frontend**
- `apps/frontend/src/routes/(protected)/tools/eplanner/` — `+page.server.ts` (config load), `+page.svelte` (party bar, encounter cards, sticky mission summary)
- Nav: "Encounter Planner" added to Community group

**Admin**
- `apps/admin/src/routes/(app)/tools/eplanner/` — `+page.server.ts` (GameSystem read/update permission checks, form actions), `+page.svelte` (config, thresholds, multipliers, CR table editors)
- `lib/nav.ts` — new "Tools" section

**Docs**
- `docs/tools/encounter-planner.md` — formula reference, models, routes

---

### Session 82 — Encounter Planner Quest Integration (2026-07-26)

**Quest forms — Encounter Planner tab**
- New `Quest.encounterPlan` JSON field stores planner inputs; `Quest.missionXp` recalculated server-side on save via `quests.resolveMissionXp()`
- Shared module `dm/quests/_planner/` — `EncounterPlannerPanel.svelte`, `planner.ts`, `types.ts`
- **Details | Encounter Planner** tabs on `/dm/quests/new`, `/dm/quests/[id]`, `/dm/worlds/…/quests/new`
- Manual Mission XP input removed from Details tab; read-only preview shows calculated total
- `dbapi/read/quests/encounter-plan.ts` — parse, resolve, `loadEncounterPlannerClientConfig()`

**Bug fixed**
- DM quest manage page crashed on load: `EncounterPlannerPanel` prop named `state` shadowed Svelte 5's `$state` rune; renamed to `planner`

---

### Session 73 — Dev Environment, ASI Wizard Step, Auth & Build Fixes (2026-06-08)

**Dev Environment**
- `vite.config.ts` — ports read from `FRONTEND_PORT`/`ADMIN_PORT` env vars (defaults 5173/5174); dev uses 5273/5274
- `svelte.config.js` — always uses `adapter-node`; `csrf: { trustedOrigins: [] }` replacing deprecated `checkOrigin: false`
- `pnpm-workspace.yaml` — `pnpm.overrides` / `peerDependencyRules` moved from `package.json` (pnpm 11 no longer reads from package.json)
- `BODY_SIZE_LIMIT=10M` env var needed for large data imports (adapter-node default is 512KB)

**Better Auth 1.5 + Signup rebuild**
- Upgraded `better-auth` to `~1.5.0`; `@better-auth/cli` stays at `~1.4.22`
- `shared/rbac/auth.ts` — exports `getBaseAuthConfig()` returning plain `BetterAuthOptions`; removed `createAuth()`, `frontendURL`, `rebaseUrl`, `rebaseChangeEmailUrl`
- `baseURL: { allowedHosts, fallback: SITE_URL }` — dynamic per-request resolution (Better Auth 1.5)
- `useSecureCookies: false` + `trustedProxyHeaders: true`; CSRF handled by Better Auth via `trustedOrigins`
- Both app `auth.ts` files call `betterAuth()` themselves; login actions use `auth.handler()` + forward `Set-Cookie` headers
- Signup uses `auth.handler('/api/auth/sign-up/email')` with `SITE_URL` as canonical origin
- PLAYER role assigned in `afterEmailVerification` hook
- `SITE_URL` env var — `PUBLIC_` prefix reserved by SvelteKit for client-side; was silently `undefined` server-side
- Pending page updated to "Check your email" messaging

**Part 3 — ASI/Feat Step in Character Creation Wizard**
- `dnd5e/+page.svelte` — dynamic `STEPS` array (ASI step inserted only when slots exist); ASI slots computed client-side from class + subclass features matching `getCharacterSheet` logic; `untrack()` prevents circular `$effect` dependency on `asiChoices`; `finalScores` derived adds ASI stat bumps to review display and form submission; a11y `for`/`id` pairs on all ASI labels
- `dnd5e/+page.server.ts` — ASI choices parsed as parallel arrays; stat-mode saves "Ability Score Improvement" feat with stat/amount fields; feat-mode saves chosen feat; `asiFeatId` looked up once before loop
- `shared/database/dbapi/write/characters/create.ts` — added `totalXp` parameter
- `shared/database/dbapi/write/dnd5e/create-character.ts` — starting XP calculated from progression thresholds at creation time (`thresholds[initialLevel - 1].xpRequired`)

**Bug fixes**
- World filter in character wizard — `acceptsGlobalCharacters` removed from filter; all active worlds shown
- `searchMarketplaceItems` dbapi function added; world marketplace pages use `?q=` server-side search instead of API routes

### Session 72 — Auth Refactor, Dev Environment, Signup Rebuild (2026-06-08)

**Dev environment setup**
- Cloned repo to `/home/marches/dev`, separate `marches_dev` PostgreSQL database
- Dev ports: frontend 5273, admin 5274 — set via `FRONTEND_PORT`/`ADMIN_PORT` env vars read by `vite.config.ts`
- `ecosystem.config.js` — added `dev-frontend`, `dev-admin`, `dev-discord` pm2 processes
- `svelte.config.js` — always uses `adapter-node` (no adapter-auto switching); `csrf: { checkOrigin: false }`
- Build: `pnpm build` (no `NODE_ENV=production` needed, adapter-node works for both)

**Better Auth refactor (1.4.22 → 1.5.6)**
- Upgraded `better-auth` to `~1.5.0` across all packages (`@better-auth/cli` stays at 1.4.22 — no 1.5.x release)
- `shared/rbac/auth.ts` — now exports `getBaseAuthConfig()` returning plain `BetterAuthOptions`, not a pre-built instance. Each app calls `betterAuth()` itself.
- Removed `createAuth()`, `frontendURL`, `rebaseUrl`, `rebaseChangeEmailUrl` — all dead code with `allowedHosts`
- `baseURL: { allowedHosts: [...], fallback: SITE_URL }` — Better Auth 1.5 dynamic baseURL per-request
- `advanced: { useSecureCookies: false, trustedProxyHeaders: true }` — correct for HTTP-internal Cloudflare Tunnel
- CSRF: SvelteKit `csrf: { checkOrigin: false }`, Better Auth handles via `trustedOrigins`
- Login actions — both apps use `auth.handler(new Request(...))` and forward `Set-Cookie` headers

**Signup rebuild**
- Replaced `registerUser()` bypass with `auth.handler('/api/auth/sign-up/email')` — Better Auth owns user creation
- `sendOnSignUp: true` — verification email sent automatically by Better Auth
- `autoSignInAfterVerification: true` — user auto-signed in after clicking verification link
- PLAYER role assigned in `afterEmailVerification` hook — correct place, after email confirmed
- `SITE_URL` env var — canonical public URL for verification email links. `PUBLIC_URL` doesn't work — SvelteKit reserves `PUBLIC_` prefix for client-side env. Renamed to `SITE_URL`
- Pending page updated: "Check your email" instead of "awaiting admin activation"
- Cloudflare Tunnel does not forward `x-forwarded-host` through adapter-node — `SITE_URL` is the reliable solution

**Env vars — deprecated/renamed**
- `ORIGIN` → no longer needed (SvelteKit CSRF disabled)
- `BETTER_AUTH_URL` → replaced by `ALLOWED_HOSTS`
- `FRONTEND_URL` → replaced by `SITE_URL`
- `PUBLIC_URL` → renamed to `SITE_URL` (SvelteKit prefix conflict)
- New: `ALLOWED_HOSTS`, `SITE_URL`, `FRONTEND_PORT`, `ADMIN_PORT`

### Session 71 — Production Build, Auth Cookie & Bug Fixes (2026-06-05)

**Production Build (adapter-node)**
- `apps/frontend/svelte.config.js` + `apps/admin/svelte.config.js` — switched to `@sveltejs/adapter-node`; `csrf: { checkOrigin: false }`
- `shared/rbac/cache.ts` — stripped non-ASCII bytes (unicode em-dashes caused Rolldown UTF-8 build error)
- `shared/rbac/index.ts` — removed `cache.ts` re-export (internal module only)
- `apps/admin/src/lib/assets/favicon.svg` — created (missing, caused build failure)

**pm2 / ecosystem.config.js**
- Added `thebnb-frontend`, `thebnb-admin`, `thebnb-discord` processes
- Discord: `--env-file` must be in `args` not `node_args` — tsx is the interpreter so Node never sees `node_args`
- Deploy: `pnpm build && pm2 restart all`; after `.env` changes: `pm2 delete all && pm2 start ecosystem.config.js && pm2 save`

**Better Auth cookie fix (HTTP local IP access)**
- Root cause: `useSecureCookies: baseURL.startsWith('https://')` was always `true` → browser rejects `Secure` cookies over HTTP → `Set-Cookie` silently dropped
- `shared/rbac/auth.ts` — `useSecureCookies: false` forces plain `better-auth.session_token` name always
- `apps/admin/src/routes/(auth)/login/+page.server.ts` — manual `cookies.set()` after `auth.api.signInEmail()` because `sveltekitCookies(getRequestEvent)` wasn't forwarding the cookie to the browser response

**Bug fixes**
- `apps/admin/src/routes/(app)/world/[id]/+page.server.ts` — `updateWorld` was not reading `acceptsGlobalCharacters` from form data; added to `worlds.update()` call
- `apps/admin/src/routes/(app)/news/[id]/+page.svelte` — textarea had no `oninput` handler; full enricher implementation ported from journal page
- `shared/ui/styles/components/ui.css` — added `.enricher-badge` + per-type colour variants; `user` type renders as `<span>` (no public profile page), all others as `<a>`

### Session 19 — Discord improvements (2026-05-31)

**Fixed: CHAR_APPROVED never enqueued**
- `shared/database/dbapi/write/characters/approve.ts` — `CHAR_APPROVED` and `CHAR_REJECTED` now properly queued with worldId for world routing

**New: Pending/approval-needed notifications**
- `shared/database/dbapi/write/characters/create.ts` — `CHAR_PENDING_APPROVAL` queued on character submission
- `shared/database/dbapi/write/quests/update-status.ts` — `QUEST_PENDING_APPROVAL` queued on DRAFT→PENDING_APPROVAL; `QUEST_RESULT_PENDING` queued on PENDING_RESULT→PENDING_RESULT_APPROVAL
- `shared/database/dbapi/write/marketplace/transactions.ts` — `MARKET_PENDING` queued on both buy and sell submission

**New: World routing on all notifications**
- `notifyCharacterApproved/Rejected` — now posts to world channel if char.worldId set
- `notifyItemPurchased/Sold` — worldId passed through and routed to world MARKET channel
- `notifyQuestStarted` — now includes siteUrl link (was missing)
- `notifyQuestResult` — now includes siteUrl link (was missing)
- `notifyInvite` — scheduledAt added to embed

**New: APPROVALS channel type**
- `shared/database/prisma/discord.prisma` — APPROVALS added to DiscordChannelType enum (requires db:push + db:generate)
- `apps/discord/src/notifications/dispatcher.ts` — notifyQuestPendingApproval, notifyQuestResultPending, notifyCharacterPendingApproval, notifyCharacterRejected, notifyMarketplacePending all post to APPROVALS channel
- `apps/discord/src/notifications/process-queue.ts` — handles all 5 new notification types
- `apps/admin/src/routes/(app)/discord/+page.svelte` — APPROVALS added to CHANNEL_TYPES

**Fixed: Discord server scope always global**
- `apps/admin/src/routes/(app)/discord/+page.svelte` — "Add server" from bot list now shows world scope selector; existing servers show inline scope change form


### Session 18 — Bug fixes (2026-05-31)

**Quest read-only for COMPLETED/CANCELLED**
- `apps/frontend/src/routes/(protected)/dm/quests/[id]/+page.svelte` — `isReadOnly` derived; details + rewards wrapped in `<fieldset disabled>`; save buttons hidden when isReadOnly
- `apps/frontend/src/routes/(protected)/quests/[id]/+page.svelte` — signup form gated: `data.eligible.length && data.quest.status === 'PUBLISHED'`
- `apps/frontend/src/routes/(protected)/quests/[id]/+page.server.ts` — signup action validates `quest.status === 'PUBLISHED'` server-side

**Character creation world selector**
- `apps/frontend/src/routes/(protected)/characters/new/+page.server.ts` — loads `activeWorlds` (isActive + acceptsGlobalCharacters); passes `worldId` to `characters.create()`
- `apps/frontend/src/routes/(protected)/characters/new/+page.svelte` — world selector card added before submit

**Availability tooltip mobile fix**
- `apps/frontend/src/routes/(protected)/availability/+page.svelte` — `flipped` field added to `Tip` type; tooltip renders below cell when near top of viewport

**DM Hub character features**
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/+page.svelte` — species traits, background proficiencies, class/subclass features section added using `sheet-class`/`sheet-feature` markup

**Status reason label**
- `NEW_CHARACTER` added to `statusReasonLabels` in DM Hub character list

**Quest approval routing**
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/quests/+page.server.ts` — approve/reject/approveResult/rejectResult actions for canManage DMs; quest-only DMs see "Awaiting approval" badge

**Mobile layout — tables**
- `shared/ui/styles/components/table.css` — `.table-wrap` gets `max-width:100%`; `.table-wrap > .table` gets `width:max-content; min-width:100%`
- `shared/ui/styles/components/layout.css` — `.sections > *` gets `min-width:0` to prevent grid children expanding beyond column width
- All frontend + admin svelte files with `<table>` — wrapped in `<div class="table-wrap">` (previously inline `overflow-x:auto`)

**Mobile layout — flex rows**
- All frontend + admin svelte files — `flex-wrap:wrap` added to all inline `display:flex` rows missing it

**Journal sidebar mobile**
- `shared/ui/styles/components/site.css` — sidebar uses `z-index:200`, `padding-top:4rem` for nav clearance, semi-transparent backdrop on mobile

**Broken table indentation**
- All svelte files — `<table>` tags inside `.table-wrap` re-indented to correct level after earlier regex script left them at column 0


### Session 17 (2026-05-29)

**Schema + DB**
- `shared/database/prisma/world.prisma` — `WorldDM.canManage Boolean @default(false)` added
- `shared/database/dbapi/read/world/get-worlds.ts` — `getWorldsByDMProfile` with canManage, all regions/locations; `getWorldById` includes dms
- `shared/database/dbapi/write/world/worlds.ts` — `assignDMToWorld` accepts canManage; `updateWorldDMPermission` added
- `shared/database/dbapi/read/characters/get-all.ts` — `worldId` filter added
- `shared/database/dbapi/read/quests/get-all.ts` — `worldId` filter via region ID lookup (cross-schema); enrichRegionIds rename to avoid duplicate declaration
- `shared/database/dbapi/read/audit/get-logs.ts` — `resourceId` filter added
- `shared/database/index.ts` — `worlds.getByDMProfile`, `worlds.updateDMPermission` exported

**Admin**
- `apps/admin/src/routes/(app)/world/[id]/+page.server.ts` — `assignDM` reads canManage; `updateDMPermission` action added
- `apps/admin/src/routes/(app)/world/[id]/+page.svelte` — canManage select on assign form; Access column with inline toggle in DM table

**Frontend DM Hub — new routes**
- `apps/frontend/src/routes/(protected)/dm/+layout.server.ts` — loads dmProfile + myWorlds
- `apps/frontend/src/routes/(protected)/dm/+layout.svelte` — pass-through
- `apps/frontend/src/routes/(protected)/dm/+page.server.ts` — uses parent() for profile; My Worlds section
- `apps/frontend/src/routes/(protected)/dm/+page.svelte` — My Worlds button + summary card
- `apps/frontend/src/routes/(protected)/dm/worlds/+page.server.ts` — auto-redirect if single world
- `apps/frontend/src/routes/(protected)/dm/worlds/+page.svelte` — world grid cards
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/+layout.server.ts` — canManage from assignment
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/+layout.svelte` — world header, switcher, split tabs
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/+page.server.ts` — dashboard stats
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/+page.svelte` — stat cards, region list
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/edit/+page.server.ts` — world + region management
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/edit/+page.svelte`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/regions/+page.server.ts` — redirect to /edit
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/regions/[regionId]/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/regions/[regionId]/+page.svelte`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/regions/[regionId]/locations/[locationId]/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/regions/[regionId]/locations/[locationId]/+page.svelte`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/marketplace/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/marketplace/+page.svelte`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/transactions/+page.server.ts` — canManage passed; approve/reject gated
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/transactions/+page.svelte`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/+page.server.ts` — canManage passed
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/+page.svelte` — Review vs View vs Pending badge
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/+page.svelte` — diff highlights, canManage-gated approve/reject
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/quests/+page.server.ts` — approve/reject/approveResult/rejectResult actions for canManage DMs
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/quests/+page.svelte` — approval actions for canManage; awaiting badge for quest-only
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/quests/new/+page.server.ts` — uses myWorlds from layout
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/quests/new/+page.svelte` — world pre-selected via $effect.pre
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/journal/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/journal/+page.svelte`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/journal/[journalId]/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/journal/[journalId]/+page.svelte`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/audit/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/audit/+page.svelte`


### Session 16 (2026-05-29)

**World marketplace expansion**
- `apps/frontend/src/routes/(protected)/marketplace/[id]/+page.server.ts` — resolves contexts for all character worlds in parallel; returns `contexts` map keyed by worldId + `urlWorldId`; buy action passes null worldId (DB enforces via character.worldId)
- `apps/frontend/src/routes/(protected)/marketplace/[id]/+page.svelte` — character selector drives world context; price/sell/stock update reactively per selected character; buy button shows world-resolved price
- `apps/frontend/src/routes/(protected)/marketplace/+page.server.ts` — minPrice/maxPrice null-check fix (was truthy check, broke on 0); worldId from URL param
- `apps/frontend/src/routes/(protected)/marketplace/+page.svelte` — item links preserve worldId param
- `shared/database/dbapi/read/marketplace/get-items.ts` — minPrice+maxPrice merged into single buyPrice object (was overwriting each other as separate spread keys)
- `shared/database/dbapi/write/marketplace/transactions.ts` — `checkLevelRestrictions` signature adds `effectivePrice` param; call site passes `ctx.price`; maxValue null check fixed
- `shared/database/dbapi/read/marketplace/get-transactions.ts` — `worldId` filter added (`'global'` → `WHERE world_id IS NULL`); enriched with world name via parallel query
- `apps/admin/src/routes/(app)/marketplace/transactions/+page.server.ts` — worldId filter param; loads activeWorlds for dropdown
- `apps/admin/src/routes/(app)/marketplace/transactions/+page.svelte` — World column added; world + status filters composable via `filterUrl()` helper; colspan 7→8
- `apps/admin/src/routes/(app)/world/[id]/marketplace/+page.svelte` — level restrictions tier editor added (was missing despite server already saving levelRestrictions)
- `apps/frontend/src/routes/(protected)/characters/[id]/+page.server.ts` — resolves worldSellPct + worldItemMap in parallel; attaches effectiveSellPrice to each inventory slot
- `apps/frontend/src/routes/(protected)/characters/[id]/+page.svelte` — sell button uses effectiveSellPrice; cancel sell request button (uses existing ?/cancel action); cancelSuccess feedback message

**Discord commands**
- `apps/discord/src/commands/buyitem.ts` — worlds import + full world resolution chain restored (was stripped to char.worldId only)
- `apps/discord/src/commands/sellitem.ts` — worlds import + full world resolution chain restored
- `apps/discord/src/commands/item.ts` — world option added; resolveContext called; shows world price, sell price, stock, unavailability
- `apps/discord/src/register-commands.ts` — world option registered for /item, /buyitem, /sellitem

**World DM assignment**
- `shared/database/prisma/world.prisma` — WorldDM model added; dms WorldDM[] relation added to World
- `shared/database/dbapi/write/world/worlds.ts` — `assignDMToWorld`, `removeDMFromWorld` added
- `shared/database/dbapi/read/world/get-worlds.ts` — `getWorldById` includes `dms` relation
- `shared/database/index.ts` — worlds.assignDM / worlds.removeDM exported; import updated
- `apps/admin/src/routes/(app)/world/[id]/+page.server.ts` — loads allDMs; assignDM + removeDM actions added
- `apps/admin/src/routes/(app)/world/[id]/+page.svelte` — DM assignment section at bottom: assign dropdown (filtered to unassigned), table with remove button

### Session 15 (2026-05-29)
- Quest approval — `LEVEL_UP_PENDING` was used as `CharacterStatus` value; refactored to `status: PENDING` + `statusReason: LEVEL_UP_PENDING` matching session 13 schema
- Character level display — `enrichCharacter` in `get-by-id.ts` now computes and returns `totalLevel`; DM hub server has defensive fallback from classes array
- Inventory admin removal — `removeFromInventory` now creates `MarketplaceTransaction(SELL/APPROVED)` record and restores stock to correct marketplace item; uses `character.userId` not `characterId` for `requestedBy`
- Journal — `getForUser` was receiving empty `roleIds` because `locals.permissions` is a Map not role array; added `getUserRoleIds(userId)` to users DB API; world filter was reading URL params instead of user character worldIds
- Admin character sheet — full tabbed rewrite; `updateClasses` action uses named form fields (classId/subclassId/allocatedLevel) not JSON blob
- Tabs CSS — `.tabs`, `.tab`, `.tab--active` added to `shared/ui/styles/components/site.css`

### Session 15 (2026-05-29)

**World Marketplace (per-world overrides)**
- `shared/database/prisma/marketplace.prisma` — added `WorldMarketplaceItem`, `WorldMarketplaceSetting`, `worldId` on `MarketplaceTransaction`
- `shared/database/prisma/characters.prisma` — added `worldId` on `CharacterInventory`, `LEVEL_DOWN_PENDING` on `CharacterStatusReason`
- `shared/database/dbapi/read/marketplace/resolve-context.ts` — NEW `resolveMarketplaceContext(itemId, worldId?)` — 3-layer resolution
- `shared/database/dbapi/read/marketplace/get-world-marketplace.ts` — NEW `getWorldMarketplaceItems`, `getWorldMarketplaceSetting`
- `shared/database/dbapi/write/marketplace/world-marketplace.ts` — NEW `upsertWorldMarketplaceItem`, `deleteWorldMarketplaceItem`, `upsertWorldMarketplaceSetting`
- `shared/database/dbapi/write/marketplace/transactions.ts` — full rewrite: world-aware buy/sell/approve/reject/cancel/grant
- `shared/database/dbapi/write/characters/inventory.ts` — `removeFromInventory` restores stock to world origin; `addToInventory` accepts `worldId`
- `apps/admin/src/routes/(app)/world/id/marketplace/+page.server.ts` — NEW world marketplace admin page
- `apps/admin/src/routes/(app)/world/id/marketplace/+page.svelte` — NEW: item search (not dropdown), stock overrides, settings
- `apps/frontend/src/routes/(protected)/marketplace/+page.server.ts` — world filter, applies overrides
- `apps/frontend/src/routes/(protected)/marketplace/+page.svelte` — world filter dropdown
- `apps/frontend/src/routes/(protected)/marketplace/id/+page.svelte` — `worldId` hidden input from selected character
- `apps/frontend/src/routes/(protected)/marketplace/id/+page.server.ts` — passes `worldId` to buy transaction

**Level-up / Level-down detection**
- `shared/database/dbapi/write/characters/level-check.ts` — NEW shared helper `checkLevelChange(tx, ...)` used by all XP-changing paths
- `shared/database/dbapi/write/characters/adjust-currency.ts` — uses `checkLevelChange`; detects both level-up and level-down
- `shared/database/dbapi/write/quests/delete.ts` — uses `checkLevelChange` on XP reversal when quest deleted
- `apps/admin/src/routes/(app)/rewards/grant/+page.server.ts` — `grantXp` now uses `characters.adjustCurrency` (not raw DB) so level detection fires
- `CharacterStatusReason.LEVEL_DOWN_PENDING` — new enum value; player must adjust classes down and resubmit

**Character system fixes**
- `shared/database/dbapi/write/characters/approve.ts` — deduplicates classes on approval; handles `LEVEL_DOWN_PENDING`; `LEVEL_UP/DOWN` rejections revert to ACTIVE
- `shared/database/dbapi/read/characters/get-by-id.ts` — `enrichCharacter` returns `totalLevel`
- `apps/frontend/src/routes/(protected)/characters/id/+page.svelte` — XP progression bar; level-up/down banners; `availableLevel` derived from thresholds; REJECTED characters can edit and resubmit
- `apps/frontend/src/routes/(protected)/characters/id/+page.server.ts` — `progressionThresholds` loaded from gameSystem; `resubmit` action; `submitChanges` allowed for REJECTED; REJECTED saves directly without pending flow
- `apps/frontend/src/routes/(protected)/characters/+page.svelte` — REJECTED characters visible and linkable

**Admin character sheet**
- `apps/admin/src/routes/(app)/characters/id/+page.svelte` — 5 tabs (Overview/Identity/Sheet/Inventory/Activity); pending banner resolves IDs to names; Approve+Reject in header for all PENDING; LEVEL_DOWN_PENDING info shown
- `apps/admin/src/routes/(app)/characters/id/+page.server.ts` — `updateClasses` uses named fields; `subclassId` empty string → null
- `apps/admin/src/routes/(app)/characters/+page.server.ts` — `clearRest` action
- `shared/database/dbapi/write/characters/check-rest.ts` — `clearAllExpiredRest()` exported

**World / Region / Journal**
- `apps/frontend/src/routes/(protected)/world/+page.svelte` — world cards landing (one per world)
- `apps/frontend/src/routes/(protected)/world/+page.server.ts` — loads active worlds only
- `apps/frontend/src/routes/(protected)/world/world-slug/+page.svelte` — world detail (map + region cards)
- `apps/frontend/src/routes/(protected)/world/world-slug/+page.server.ts` — loads single world by slug
- `apps/frontend/src/routes/(protected)/world/world-slug/region-slug/+page.svelte` — 🗺 World map + 🏔 Region map (lightbox) buttons
- `apps/frontend/src/routes/(protected)/journal/+page.svelte` — sidebar nav, mobile toggle
- `apps/frontend/src/routes/(protected)/journal/+page.server.ts` — uses `users.getRoleIds` for proper role filtering
- `shared/database/dbapi/read/users/get-by-id.ts` — `getUserRoleIds()` added
- `shared/database/index.ts` — `users.getRoleIds`, `characters.clearExpiredRest`, world marketplace exports

**CSS**
- `shared/ui/styles/components/site.css` — `.tabs`, `.tab`, `.tab--active`, journal layout
- `shared/ui/styles/components/world.css` — world landing, region card grid, premium card design
- `shared/ui/styles/components/availability.css` — heatmap, multi-select, bulk bar

**Discord commands**
- `apps/discord/src/commands/buyitem.ts` — operator precedence fix; world-aware price/stock/restrictions
- `apps/discord/src/commands/sellitem.ts` — operator precedence fix; world-aware sell%
- `apps/discord/src/commands/characters.ts` — uses `totalLevel` from enrichCharacter; status emojis
- `apps/discord/src/commands/charactersinv.ts` — removed `livePrice`; shows 🌍 for world-scoped items

**Bug fixes**
- `submit-result.ts` — `LEVEL_UP_PENDING` is `statusReason` not `status`
- `inventory.ts` — admin removal creates `MarketplaceTransaction` record + restores stock to world origin
- `approve.ts` — subclassId empty string → null coercion; class deduplication on approval
- Live price on inventory — only shown for PURCHASE items where price differs from paid


### Session 15 (2026-05-29)

**World marketplace (per-world stock, price overrides, level restrictions)**
- `shared/database/prisma/marketplace.prisma` — added `WorldMarketplaceItem`, `WorldMarketplaceSetting` models; `worldId` on `MarketplaceTransaction`
- `shared/database/prisma/characters.prisma` — `worldId` on `CharacterInventory`; `LEVEL_DOWN_PENDING` added to `CharacterStatusReason` enum
- `shared/database/dbapi/read/marketplace/resolve-context.ts` — NEW: `resolveMarketplaceContext(itemId, worldId?)` resolution helper
- `shared/database/dbapi/read/marketplace/get-world-marketplace.ts` — NEW: `getWorldMarketplaceItems`, `getWorldMarketplaceSetting`
- `shared/database/dbapi/write/marketplace/world-marketplace.ts` — NEW: `upsertWorldMarketplaceItem`, `deleteWorldMarketplaceItem`, `upsertWorldMarketplaceSetting`
- `shared/database/dbapi/write/marketplace/transactions.ts` — full rewrite: world-aware buy/sell/approve/reject/cancel/grant; `decrementStock`/`restoreStock` helpers
- `shared/database/dbapi/write/characters/inventory.ts` — `removeFromInventory` restores stock to origin world row; `addToInventory` accepts `worldId`
- `shared/database/index.ts` — exports `marketplace.worldItems`, `marketplace.worldSettings`, `marketplace.resolveContext`
- `apps/admin/src/routes/(app)/world/id/marketplace/+page.server.ts` — NEW: world marketplace admin page (upsertItem, removeItem, saveSettings)
- `apps/admin/src/routes/(app)/world/id/marketplace/+page.svelte` — NEW: item search (not dropdown), stock/price/availability overrides table, world settings
- `apps/admin/src/routes/(app)/world/id/+page.svelte` — 🛒 Marketplace button fixed (was orphaned outside header div)
- `apps/frontend/src/routes/(protected)/marketplace/+page.server.ts` — world filter; applies world overrides to item listing
- `apps/frontend/src/routes/(protected)/marketplace/+page.svelte` — world filter dropdown
- `apps/frontend/src/routes/(protected)/marketplace/id/+page.svelte` — `selectedCharId` bound; `worldId` hidden input passes character world to buy
- `apps/frontend/src/routes/(protected)/marketplace/id/+page.server.ts` — passes `worldId` to `createBuyTransaction`

**Character level-up/down system**
- `shared/database/dbapi/write/characters/level-check.ts` — NEW: `checkLevelChange(tx, ...)` shared helper; detects level-up (newEarned > currentAllocated) and level-down (newEarned < currentAllocated); sets PENDING + LEVEL_UP/DOWN_PENDING; fires notifications
- `shared/database/dbapi/write/characters/adjust-currency.ts` — uses `checkLevelChange` helper for XP changes
- `shared/database/dbapi/write/quests/delete.ts` — uses `checkLevelChange` on XP reversal when quest deleted
- `apps/admin/src/routes/(app)/rewards/grant/+page.server.ts` — `grantXp` now calls `characters.adjustCurrency` (was raw DB update) so level detection fires
- `apps/frontend/src/routes/(protected)/characters/id/+page.svelte` — XP progression bar; `LEVEL_DOWN_PENDING` banner + class reduction form; `availableLevel` derived from thresholds; `REJECTED` characters can edit and resubmit
- `apps/frontend/src/routes/(protected)/characters/id/+page.server.ts` — `progressionThresholds` loaded from gameSystem; `resubmit` action; `submitChanges` allows REJECTED status (saves directly); `submitLevelUp`/`submitChanges` coerce empty subclassId to null

**Admin character sheet (tabbed)**
- `apps/admin/src/routes/(app)/characters/id/+page.svelte` — 5 tabs (Overview/Identity/Sheet/Inventory/Activity); Approve+Reject in header for all PENDING statuses; pending changes banner resolves IDs to names using systemData; `LEVEL_DOWN_PENDING` note in banner
- `apps/admin/src/routes/(app)/characters/id/+page.server.ts` — clean rewrite; `updateClasses` uses named form fields; subclassId empty string → null
- `apps/admin/src/routes/(app)/characters/+page.server.ts` — `clearRest` action
- `apps/admin/src/routes/(app)/characters/+page.svelte` — ⏰ Clear rested button

**Character approval fixes**
- `shared/database/dbapi/write/characters/approve.ts` — deduplicates classes on approval (Map by classId); handles `LEVEL_DOWN_PENDING`; rejection preserves `NEW_CHARACTER` → actually just sets `ADMIN` reason, any REJECTED character can resubmit
- `shared/database/dbapi/write/quests/submit-result.ts` — `LEVEL_UP_PENDING` uses `status:PENDING` + `statusReason:LEVEL_UP_PENDING` (was invalid CharacterStatus value)

**World route restructure**
- `/world` — new landing: one card per world with `mapImageUrl` thumbnail, region count badge
- `/world/[worldSlug]` — new: world detail with map + region cards (moved from old `/world`)
- `/world/[worldSlug]/[regionSlug]` — 🗺 World map + 🏔 Region map (lightbox) buttons; back-link fixed
- `shared/ui/styles/components/world.css` — `.region-card` portrait cards, staggered animation, danger/level badges
- `shared/ui/styles/components/availability.css` — 7×48 heatmap, dot pattern, trend line, multi-select, "Select slots" button

**Journal fixes**
- `shared/database/dbapi/read/users/get-by-id.ts` — `getUserRoleIds(userId)` added
- `shared/database/index.ts` — `users.getRoleIds` exported
- `apps/frontend/src/routes/(protected)/journal/+page.server.ts` — uses `users.getRoleIds` (was reading from locals.permissions which never had role IDs); worldIds from character worldIds not URL params
- `apps/frontend/src/routes/(protected)/journal/+page.svelte` — full redesign: sidebar nav, mobile toggle, `$effect.pre` for journal auto-open

**Bug fixes**
- Character totalLevel — `enrichCharacter` now computes and returns `totalLevel`
- Inventory admin removal — `removeFromInventory` creates MarketplaceTransaction + uses `character.userId` for requestedBy
- Live price — only shown for PURCHASE items where price differs from purchase price
- Tabs CSS — `.tabs`, `.tab`, `.tab--active` added to `site.css`
- Discord commands — operator precedence fix; world-aware price/stock/restrictions; totalLevel from enrichCharacter

### Session 14 (2026-05-28)
- Availability heatmap — new `+page.svelte` with 7×48 CSS grid, dot pattern color scale (dark brown→gold),
  SVG trend line with glow, click-only tooltip (pinned until dismissed), multi-select mode with floating
  action bar + bulk modal, GLOBAL/WORLD scope, `?/setSlot`, `?/clearSlot`, `?/clearDay`, `?/setSlots` actions
- Availability CSS — new `shared/ui/styles/components/availability.css`; mobile: `min-width:600px` with
  horizontal scroll + sticky time labels; cells are `<button>` elements (a11y)
- World route restructure — old `world/+page.*` moved to `world/[worldSlug]/+page.*`;
  new `world/+page.*` shows one card per world with `mapImageUrl` thumbnail
- World CSS — new `shared/ui/styles/components/world.css`; `.region-card` 3:4 aspect-ratio portrait cards
  with full-bleed image, gradient footer, color bar, danger/level badges, staggered animation
- Region page — back-link fixed to `/world/{worldSlug}`; static banner removed; `mapOpen` lightbox state;
  🗺 World map + 🏔 Region map buttons in header

### Session 13 (2026-05-28)
- `CharacterStatusReason` enum — added `NEW_CHARACTER`, `EDIT_PENDING`
- `Character` model — added `backgroundId String?`, `pendingChanges Json?`
- `Dnd5eClassFeature` unique constraint — changed from `(classId, name)` to `(classId, name, requiredLevel)` to support same-name features at different levels (e.g. Ability Score Improvement)
- `Dnd5eSubclassFeature` — same unique constraint fix
- `Dnd5eClass.subclassAvailableAtLevel` — new field (default 3), controls when subclass selector appears
- Import server — `toInt()` strips Excel apostrophe prefix; `boolVal()` handles all Excel boolean formats; `allowUpdate` checkbox explicit opt-in to overwrite
- Game systems list — `isActive` toggle button; slug-based conditional dnd5e links (other systems show "Schema not yet built")
- Progression page — new `/game-systems/[id]/progression` route; fixed `xpRequired=0` validation (was treated as falsy)
- Character sheet — collapsible species traits, background, class features using `<details class="sheet-class">`
- Frontend character page — single "Species, Background & Classes" card handles both structural edit (ACTIVE/RESTING) and level-up allocation (LEVEL_UP_PENDING); removed duplicate Classes card
- `approve.ts` — uses `Prisma.JsonNull` for clearing `pendingChanges` field
- Frontend nav — 3-group dropdown redesign; groups centered with absolute positioning; invisible bridge prevents premature dropdown close

### Session 7 (2026-05-25)
- Admin settings page — per-field save (each setting has its own Save button, no more bulk wipe)
- Admin settings page — secret fields never pre-fill value (prevents placeholder dots being saved as token)
- Discord bot — comprehensive startup logging (token set, length, clientId match, per-guild registration)
- Admin nav — `canNavigate` + `navVis` replaced with `checkPermission(..., read).allowed` — nav items shown based on role permissions
- Discord index.ts — token/clientId trimmed, uncaughtException/unhandledRejection handlers added

### Session 5 (2026-05-25)
- Quest result item reward query — enum string comparison fixed using `{ equals: value }` filter
- Discord notification queue — `markProcessed` now always called (even on failure) to prevent infinite retry
- `notifyQuestResult` — `characterName` was undefined (stale pre-transaction data); fixed by reloading `QuestResultCharacter` after transaction
- `notifyQuestResult` — now includes tokens and item grants in embed
- Quest status transitions `PUBLISHED` and `IN_PROGRESS` now queue Discord notifications (`QUEST_PUBLISHED`, `QUEST_STARTED`)
- `notifyQuestStarted` added to dispatcher and process-queue
### Production Build Session (2026-06-05)

**Build fixes**
- `shared/rbac/cache.ts` — stripped unicode em-dashes from comments (Rolldown/Vite 8 rejects non-ASCII files with `stream did not contain valid UTF-8`)
- `shared/rbac/index.ts` — removed `cache.ts` re-export (internal module, not part of public API)
- `apps/frontend/svelte.config.js` + `apps/admin/svelte.config.js` — switched from `adapter-auto` to `adapter-node`
- `apps/frontend/package.json` + `apps/admin/package.json` — added `@sveltejs/adapter-node ^5.0.0` to devDependencies

**pm2 setup**
- `ecosystem.config.js` created at monorepo root
- Uses Node 22 native `--env-file=/home/marches/space/.env` — no dotenv package needed
- Frontend on port 5173, admin on port 5174

**Production env fix**
- `ORIGIN`, `BETTER_AUTH_URL`, `TRUSTED_ORIGINS` updated to `https://www.binderbrew.quest`
- Without this, all POST requests (signup, login, forms) returned 403 — SvelteKit CSRF protection rejects requests when `ORIGIN` doesn't match the incoming host

**Deploy workflow**
- Code changes: `git pull && pnpm install && pnpm build && pm2 restart all`
- Env changes: `pm2 delete all && pm2 start ecosystem.config.js && pm2 save`

### Session 6 (2026-06-10 to 2026-06-11)

**Token Store**
- New marketplace where players spend tokens on reward items
- `token-store.prisma` — `TokenStoreItem`, `TokenStoreTransaction`, enums for type/direction/scope/status
- Per-quest per-boost application via `apply-boosts.ts` — delete+recreate pattern, fully idempotent
- Boost txs use `sourceType='QUEST'`, `sourceId=questId` → quest deletion auto-reverts boosts
- `↻ Recalc` button on approved transactions in admin and DM hub
- Reward types: Quest XP Boost, Quest GP Boost, Manual
- Admin: list, new/edit item, transactions (approve/reject/revoke/recalc), import/export
- DM Hub: `/dm/worlds/[worldId]/token-store` — approve/reject/recalc for world characters
- Frontend: browse + purchase pages, filtered by character system+world
- Character sheet: `+X from boosts` under XP and GP stat cards
- Discord: `TOKEN_STORE_PENDING` notification via APPROVALS channel

**Tavern fixes**
- Mobile layout: drawer sidebar, ☰ menu button, fixed double sidebar on desktop
- Enricher autocomplete wired correctly with `bind:this` and `oninput`
- Image thumbnails: 150px, click to open full size
- Polling changed from `invalidateAll()` to `invalidate('app:tavern')` — major perf improvement

**Character Public Directory fixes**
- `Dnd5eCharacterCard` ability scores — field is `baseScore` not `value`
- World name badge on quest transactions in recent activity

**Quest fixes**
- `canManage` DMs can approve/reject their own quests (both workflows removed self-approval guard)
- `submitQuestResult` now transitions quest to `PENDING_RESULT_APPROVAL`
- Quest world selector only shows worlds with active regions (silent save fix)
- Duplicate status badge removed from DM hub quest list

**DM Hub improvements**
- Character status management: `canManage` DMs can toggle RESTING ↔ ACTIVE
- `clearAllExpiredRest` clears all chars with expired `restUntil` regardless of `statusReason`
- Token Store tab added to world layout nav
- Player availability section on world dashboard with day picker
  - WORLD-scoped slots for this world always shown
  - GLOBAL slots shown if `world.acceptsGlobalCharacters = true` AND user has chars in world
  - Character levels shown correctly

**Discord availability commands**
- `/setavailable start_date start_time end_date end_time [scope]`
- `/unsetavailable start_date start_time end_date end_time`
- End time exclusive, accepts YYYY-MM-DD or DD/MM/YYYY, 24h HH:MM

**Performance**
- `getCharacterTransactions` — 2 queries instead of 3
- Character page `boostTxs` moved into `Promise.all`
- Admin token store list shows game system name instead of UUID

**Bug fixes**
- `getCharacterTransactions` — invalid `region` select on Quest model fixed
- Dynamic imports in `approve.ts` → static imports (removes INEFFECTIVE_DYNAMIC_IMPORT warnings)
- Discord `setDescription('')` → `|| null` guards everywhere
- Token store transaction character names enriched (no UUID display)
- Admin availability character levels fixed (was always `?`)

### Session 74 — Feat ASI Grants, Score Audit Trail, Standard Array (2026-06-14)

**Feat ASI Grant System**
- `shared/ui/src/gamesystems/dnd5e/feature-names.ts` + `shared/database/dbapi/read/dnd5e/feature-names.ts` — NEW: `isAsiFeatureName`, `isEpicBoonFeatureName`, `normalizeFeatureName`. Exported from both `@core/ui` and `@core/database` index files. Correct locations per code structure (not root dbapi).
- `update-character-feats.ts` — slot-based save now looks up and reverses old feat's stat bump BEFORE deleting the row (fix for scores not decreasing on feat change/removal). Stat bump fires for ANY feat with `stat1/amount1`, not just ASI feat by name. `removeDnd5eCharacterFeat` accepts `actorId`.
- `Dnd5eAsiFeatsPanel.svelte` — ASI badge shown on feats with `asiAmount`; stat picker appears after feat selection (inside `{#if true}` block to satisfy `{@const}` placement rules); Confirm button disabled until stat chosen when required.
- `Dnd5eCharacterSheet.svelte` — `featGrantedStat` added to `SlotState`; ASI badge in feat list; stat picker after feat selection; `saveSlot` passes `stat1/amount1` for feat-granted ASI; Choose Feat disabled when stat required but not chosen.
- Wizard `+page.svelte` — `AsiChoice` gains `featGrantedStat?`, `featAsiAmount?`, `featAsiFixed?` cached fields. `finalScores` now uses `stat1/amount1` for both stat and feat mode (no `sys.feats` lookup at render time). `$effect` backfills `stat1/amount1` from `sys.feats` after data loads for restored sessions. `asi_stat1` hidden input simplified to always use `c.stat1`.
- Wizard `+page.server.ts` — loads `systemFeats` for both stat and feat modes; passes `stat1/amount1` for feat-granted ASI; inline `isAsiFeatureName` check (no broken import).

**Score Audit Trail**
- Schema: `ScoreEntrySource` enum (`INITIAL/ASI/FEAT/MANUAL`) and `Dnd5eScoreAuditEntry` model added to `dnd5e.prisma`. Back-relation `scoreAuditEntries` added to `Character` in `characters.prisma`. **Requires `db:push && db:generate`.**
- `shared/database/dbapi/write/dnd5e/score-audit.ts` — NEW: `addScoreAuditEntry`, `addScoreAuditEntries`, `applyManualScoreAdjustment`.
- `shared/database/dbapi/read/dnd5e/get-score-audit.ts` — NEW: `getScoreAuditForCharacter`, `getScoreAuditForStat`.
- `update-ability-scores.ts` — rewritten: writes `INITIAL` audit entries on first score save; `MANUAL` delta entries on edits; `applyDnd5eAsiStatBump` accepts `source/note/sourceId/actorId` opts and writes audit entries.
- `update-character-feats.ts` — `reverseStatBump` helper writes negative-delta audit entries for all removals/swaps. `addDnd5eCharacterFeat` writes `FEAT` or `ASI` audit entries with note "X added". `removeDnd5eCharacterFeat` writes "X removed" entries.
- `database/index.ts` — exposes `addScoreAuditEntry`, `addScoreAuditEntries`, `manualScoreAdjustment`, `getScoreAudit`, `getScoreAuditForStat`, `invalidateSystemCache` on `dnd5e` namespace.

**Score Audit UI**
- `Dnd5eCharacterSheet.svelte` — `scoreAudit` and `onManualScoreAdjust` props added. Stat boxes are now clickable — opens inline breakdown panel showing all audit entries for that stat (source badge colour-coded, note, signed delta, date). DM manual adjustment form (stat selector, delta input, reason text, Apply button) shown when `canManage && onManualScoreAdjust`. `auditByStat` derived groups entries by stat. `SOURCE_LABEL` maps enum values to display strings.
- All loaders updated to load `scoreAudit` in parallel: player `_loaders/dnd5e.server.ts`, DM hub `_loaders/dnd5e.server.ts`, admin `_loaders/dnd5e.server.ts`.
- DM hub: `manualScoreAdjust` action added to `_sheets/dnd5e.actions.server.ts` and `+page.server.ts`. `DmDnd5eSheetSection` passes `scoreAudit` and `onManualScoreAdjust`. `+page.svelte` passes `scoreAudit`.
- Admin: `manualScoreAdjust` action added to `_sheets/dnd5e.actions.server.ts` and `+page.server.ts`. `AdminDnd5eSheetSection` passes `scoreAudit` and `onManualScoreAdjust`. `+page.svelte` passes `scoreAudit`.
- Player: `Dnd5eSheetSection` gains `scoreAudit` prop, passes to `CharacterSheet`. `characters/[id]/+page.svelte` passes `scoreAudit`. Player `dnd5e.actions.server.ts` now passes `actorId` to `addCharacterFeat`, `removeCharacterFeat`, `saveAbilityScores`.

**Performance**
- `characters/[id]/+page.server.ts` — fully parallelised: `checkRest`, world queries, marketplace, and system data all in single `Promise.all`.
- `get-classes.ts` — 5-minute in-memory cache on `getDnd5eSystemData` with `invalidateDnd5eSystemDataCache(gameSystemId?)`. Cache invalidated after every successful admin import action.
- Admin import `+page.server.ts` — `dnd5e.invalidateSystemCache(params.id)` called before every import success return.

**Standard Array**
- Wizard `+page.svelte` — Standard Array mode added. Values `[8, 10, 12, 13, 14, 15]` shown as pool with strikethrough on used values. Per-stat dropdown replaces +/− buttons; only available (unassigned) values selectable. `scoresValid` requires all 6 assigned. `standardArray` persisted in sessionStorage.

**Bug Fixes**
- Wizard cancel ✕ button — was `<a href="/characters/new">` (no state clear, caused 405 POST errors on the index page which has no actions). Now calls `clearState()` then `goto('/characters')`. `goto` imported from `$app/navigation`.
---

## Spell System + Discord Spell Commands

**Schema (`dnd5e.prisma`):**
- `Dnd5eSpell` gains: `castingTime String?`, `components String?`, `description String?`, `sourceBook String?`, `savingThrow String?`
- `Dnd5eSubclass` gains: `canCastSpells Boolean @default(false)` — only relevant when parent class cannot cast spells
- `Dnd5eSpellSlotProgression` and `Dnd5eSpellsKnownProgression` gain: `subclassId String @default("")`, `subclassName String @default("")`; `@@unique` updated to include `subclassId`
- **Requires `db:push && db:generate`**

**Admin spell editor (`/game-systems/[id]/dnd5e/spells/[spellId]`):**
- New fields: Casting Time, Components, Description (textarea), Source Book, Saving Throw (dropdown: STR/DEX/CON/INT/WIS/CHA)

**Admin spell slots page:**
- Selector now shows spellcasting classes AND spellcasting subclasses (only when parent class `canCastSpells = false`)
- Cantrips column is now **read-only** (managed on Spells Known page only)
- Save action no longer writes to `Dnd5eSpellsKnownProgression`

**Admin spells known page:**
- Same subclass-aware selector

**Admin classes page:**
- `canCastSpells` toggle on subclass rows shown only when parent class `canCastSpells = false`
- "Spellcasting" badge shown on qualifying subclasses

**Import/Export:**
- Spells sheet: adds Casting Time, Components, Description, Source Book, Saving Throw columns
- Spell Slots/Known sheets: `Class ID` and `Subclass ID` removed from required columns; import resolves IDs by Class Name / Subclass Name (portable across systems)
- Subclasses sheet: adds `canCastSpells` column

**Character spellbooks (`Dnd5eSpellbooks.svelte`) — full rewrite:**
- `Prepared` count = entries where `entry.prepared = true` (NOT total spells in book)
- `Max Spell Level` computed from slot progression, shown in limits banner
- Spell card expanded body: property tiles grid (castingTime, range, duration, components, AoE, savingThrow with ability name, attackRoll); At Higher Levels with contextual text ("for each slot level above Nth")
- Collapsed header: damage pills kept for combat scanning
- Spell picker: filters (search, level, school, concentration, ritual); results grouped by level
- Spell removal requires `confirmModal` confirmation
- Subclass casters (Eldritch Knight, Arcane Trickster) fully supported in multiclass computation

**Availability fixes:**
- DM hub: removed own-slot skip (DM sees their own availability)
- DM hub + DM World: character status filter changed from `ACTIVE` only to exclude `RETIRED`, `DECEASED`, `REJECTED`; `needsNewChar: true` flag added when user has no valid characters
- DM World: slot filter now based purely on availability scope (`GLOBAL` always shows player; `WORLD` only shows for targeted worlds); `acceptsGlobal` only controls which characters are displayed, not which players appear
- DM Quest invite: `worldId` now correctly resolved via `regionId → region.worldId` (quest has no direct `worldId` field)
- All date range calculations changed to UTC methods (`setUTCHours`, `setUTCDate`, `getUTCDay`) to prevent timezone-based slot mismatches

**UI fixes:**
- Ability scores grid: `repeat(auto-fill, minmax(80px, 1fr))` — 3 cols on mobile, 6 on desktop
- `--color-danger` brightened from `#8B3A3A` to `#E05555` for readability on dark backgrounds
- Mobile nav `z-index: 100` (was behind backdrop z-index: 99, making menu unclickable)

**Discord spell commands (new):**
- `/spell info [name]` — ephemeral spell card
- `/spell list [class] [level]` — ephemeral spell list for class at level
- `/spellbook list [character] [spellbook]` — spellbook contents
- `/spellbook slots [character]` — spell slots summary
- `/spellbook prepared [character]` — prepared spells with limits
- Run `pnpm register` in `apps/discord` after deploying to push new commands to Discord

---

## D&D 5e Descriptions Permission Gate + RBAC Cross-Process Cache Fix

**New permission resource:** `dnd5eDescriptions` / action `read` — registered in `Game Systems` module via seed. Assign in Admin → Roles to control which roles see D&D 5e descriptions.

**Gated descriptions** (show placeholder `📖 Description not available — contact your DM.` when not permitted):
- Character sheet: species trait tooltips, class/subclass feature tooltips, feat description
- Spellbook: spell description in expanded card
- Character wizard: `_wizard/` step components — species, traits, backgrounds, feats, class/subclass features
- Marketplace item detail: item description
- Token store list + detail: item description

**World lore NOT gated:** world, region, location, journal, faction, quest descriptions remain visible to all.

**Files changed (descriptions gate):**
- `shared/ui/src/gamesystems/dnd5e/Dnd5eCharacterSheet.svelte` — added `canViewDescriptions` prop; gates trait tooltips and feat description
- `shared/ui/src/gamesystems/dnd5e/Dnd5eSpellbooks.svelte` — added `canViewDescriptions` prop; gates spell description
- `apps/frontend/src/routes/(protected)/characters/[id]/_sheets/Dnd5eSheetSection.svelte` — prop added and passed through
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/_sheets/DmDnd5eSheetSection.svelte` — prop added and passed through
- Page servers: `characters/[id]`, `characters/new/dnd5e`, `dm/worlds/[worldId]/characters/[charId]`, `marketplace/[id]`, `token-store`, `token-store/[id]` — all add `checkPermission(..., { resourceKey: 'dnd5eDescriptions', action: 'read' })` and return `canViewDescriptions`
- Page svelte files: `characters/[id]`, `characters/new/dnd5e`, `dm/worlds/[worldId]/characters/[charId]`, `marketplace/[id]`, `token-store`, `token-store/[id]` — pass `canViewDescriptions` down to components
- `shared/database/seeds/01-platform.seed.ts` — `dnd5eDescriptions` resource added to Game Systems module

**RBAC cross-process cache fix:**
- Root cause: admin and frontend are separate Node processes; admin invalidated its own LRU but frontend served stale permissions until 5-minute TTL expired
- Fix: `Setting` key `rbac.permissionsUpdatedAt` stores epoch ms of last permission change; `getUserPermissions` does one cheap DB SELECT per request to check if cache is stale
- `invalidateRolePermissions` and `invalidateUserPermissions` both call `bumpPermissionsTimestamp()` — any process that bumps the timestamp causes all other processes to re-fetch on next request
- Files: `shared/rbac/cache.ts`, `shared/rbac/access.ts`, `shared/database/seeds/01-platform.seed.ts`
- **Action required on existing installs:** `cd ~/dev/shared/database && pnpm seed` to register `rbac.permissionsUpdatedAt` setting

---

## D&D 5e Descriptions Gate — Additional Fixes

**Missing gates found and fixed after initial implementation:**

- `Dnd5eCharacterSheet.svelte` — feat picker `feat.snippet` (the long description shown when browsing feats in ASI edit mode) was not gated; `featRef.description` on the chosen feat summary was also missed in the first pass
- `Dnd5eAsiFeatsPanel.svelte` — added `canViewDescriptions` prop and gated both `feat.snippet` displays (chosen feat summary row + feat picker list). Component is exported from `@core/ui` but not yet wired into any page — prop is ready for when it gets used.

**Files updated:** `shared/ui/src/gamesystems/dnd5e/Dnd5eCharacterSheet.svelte`, `shared/ui/src/gamesystems/dnd5e/Dnd5eAsiFeatsPanel.svelte`

---

## Discord Multi-Server Routing + Quest Fixes

**Discord channel-based routing (`interaction-handler.ts`):**
- Server context now resolved by `channelId + guildId` instead of `guildId` alone
- Silently ignores interactions from unregistered channels (correct behaviour for multi-bot guilds)
- Handles multiple channel type registrations on same channelId — prefers matching type
- Admin Discord page: added multi-server notice "Each server should have its own dedicated channels. Do not add multiple bots to the same channels."

**Quest notification URL fix (`dispatcher.ts`):**
- `quest.id` → `quest.questId` in all 6 URL constructions — payload field was always `questId` not `id`

**`/quests` command layout (`commands/quests.ts`):**
- Each quest now sends its own embed + buttons as separate messages
- Details and View on site buttons appear directly below their quest
- No more grouped buttons at the bottom

**DM quest invite fix (`dm/quests/[id]/+page.server.ts`):**
- `worldId` now resolved via `regionId → db.region.worldId`
- Previously always `null` so only GLOBAL-scoped availability matched; world-scoped players never appeared
- Quest invite now works correctly for world-specific quests

---

### Session 75 — Quest/Character Workflow Audit, UI System & Theme Overhaul (2026-06-22)

**Quest & Character Approval Workflow Fixes**
- `shared/database/dbapi/write/quests/update-status.ts` — `PENDING_APPROVAL → DRAFT` on rejection (was CANCELLED, destroying the quest); `CANCELLED` from `PENDING_RESULT_APPROVAL` now deletes `QuestResult` + `QuestResultCharacter` records and notifies confirmed players
- `shared/database/dbapi/write/quests/signup.ts` — blocks `LEVEL_UP_PENDING` and `LEVEL_DOWN_PENDING` characters from signing up; capacity count moved inside `db.$transaction` (race condition fix); `cancelSignup` now sends notification to cancelled player + promotes waitlist with notification + sets `promotedAt`; `expireStalePromotions()` NEW — expires PENDING_CONFIRMATION > 8h, cancels + promotes next + notifies both; Discord bot calls every 15 min
- `shared/database/dbapi/write/quests/submit-result.ts` — `itemGrantMap` built inside `db.$transaction` (was outside, inconsistent on retry); zero-player result block removed; `rejectQuestResult` now notifies DM with `reviewNote`
- `shared/database/dbapi/write/characters/update-status.ts` — removed duplicate `CHARACTER_APPROVED`/`CHARACTER_REJECTED` notifications (handled only by `approve.ts`)
- `shared/database/prisma/quests.prisma` — `QuestSignup.promotedAt DateTime?` added
- Admin + DM frontend reject quest actions changed from `updateStatus(id, 'CANCELLED')` to `updateStatus(id, 'DRAFT')`
- `apps/discord/src/index.ts` — added `setInterval` every 15 min for `quests.expireStalePromotions()`

**Character List — Classes Display**
- `shared/database/dbapi/read/characters/get-by-id.ts` — `getCharactersByUserId` now detects dnd5e characters via separate `gameSystem` lookup, then loads `Dnd5eCharacterClass` + `Dnd5eClass` names + `Dnd5eSubclass` names separately (cross-schema, no direct relations); returns `gameSystemSlug` and `dnd5eClasses: { name, subclassName, allocatedLevel }[]` as additive fields — safe for all 23+ existing callers
- `apps/frontend/src/routes/(protected)/characters/+page.svelte` — shows `Fighter (Eldritch Knight)` format; gated on `gameSystemSlug === 'dnd5e'`

**User Theme System**
- `shared/database/prisma/users.prisma` — `theme String @default("frontend")` added to `User`
- `shared/database/dbapi/write/users/update.ts` — `updateUserTheme(id, theme)` added
- `shared/database/index.ts` — `users.updateTheme` exported
- `shared/ui/styles/tokens.css` — new user themes added: Emerald & Gold (`frontend-emerald`), Crimson & Gold (`frontend-crimsonandgold`), Burgundy (`frontend-burgundygoldblack`), Parchment (`frontend-antiqueparchment`), Midnight Neon (`frontend-midnightneon`); `/* theme-name: */` convention for theme picker auto-discovery
- `apps/frontend/src/lib/themes.ts` — NEW: parses `tokens.css` via Vite `?raw` import; `getAvailableThemes()` extracts theme names + swatch colours (resolves `var(--)` references); `validateTheme()` guards cookie values
- `apps/frontend/src/app.html` — inline `<script>` reads `userTheme` cookie before paint (no flash); default `data-theme="frontend"` hardcoded
- `apps/frontend/src/hooks.server.ts` — seeds `userTheme` cookie from DB on first login if missing; removed `transformPageChunk` (unreliable through `svelteKitHandler`)
- `apps/frontend/src/routes/(protected)/profile/+page.server.ts` — `updateTheme` action saves to DB + sets cookie; `getAvailableThemes()` in load
- `apps/frontend/src/routes/(protected)/profile/+page.svelte` — Appearance section: theme swatches with swatch preview generated from each theme's own tokens (no CSS vars — fully isolated from current page theme); clicking applies immediately via `data-theme` + cookie + DB save

**CSS Architecture Fixes**
- `apps/frontend/src/routes/+layout.svelte` — removed hardcoded `data-theme="frontend"` from `.site` div (was overriding `<html>` theme); removed `layout.css` import
- `apps/frontend/src/routes/layout.css` — DELETED; was causing `@tailwindcss/forms` to run twice (Tailwind Vite plugin + JS import both processing it), breaking all `.btn` styles
- `shared/ui/styles/index.css` — `@plugin '@tailwindcss/forms' { strategy: 'class' }` — prevents forms plugin from auto-resetting `button` elements and overriding `.btn` component classes
- `shared/ui/styles/base.css` — `a { color }` and `a:hover { color }` moved inside `@layer base` so `@layer components` (`.btn-primary { color: #fff }`) correctly overrides on `<a class="btn">` elements. Root cause of ghost-styled `<a>` buttons.

**Button Consistency Audit — All Frontend Svelte Files**
- Automated fix across 8 files: `btn-ghost` + `style="color:var(--color-danger)"` → `btn-danger`; `btn btn-sm` with no variant → `btn-ghost btn-sm`
- Manual fixes: removed redundant inline styles already covered by `.btn` (display:flex, align-items, gap); removed `margin-top` from button elements (belongs on parent); `font-size`+`padding` overrides replaced with new `btn-xs` class
- `shared/ui/styles/components/ui.css` — added `.btn-xs { padding: 0.1875rem 0.5rem; font-size: 0.75rem }` for compact inline contexts
- Settings page Discord buttons aligned with profile page (no `btn-sm` on Connect Discord)

**Item Rarity Colours**
- `shared/ui/styles/components/ui.css` — added `badge-info` (blue) and 6 fixed rarity badges: `badge-rarity-common/uncommon/rare/very-rare/legendary/artifact` with hardcoded colours independent of active theme; follows D&D 5e conventions (grey/green/blue/purple/orange/red)
- `apps/frontend/src/lib/rarity.ts` — NEW: `rarityBadge(rarity)`, `rarityLabel(rarity)`, `RARITIES`, `RARITY_BADGE`; single source of truth replacing 3 duplicate `rarityColors` Records
- Updated: `marketplace/+page.svelte`, `marketplace/[id]/+page.svelte`, `characters/[id]/+page.svelte`, `dm/worlds/[worldId]/marketplace/+page.svelte` — all import from `$lib/rarity`

**Schema changes requiring `db:push && db:generate`:**
- `QuestSignup.promotedAt DateTime?`
- `User.theme String @default("frontend")`

---

### Session 76 — Admin Nav Sections, Marketplace UX & Mobile Fixes (2026-06-23)

**Admin Navigation — Sections & Collapsible Groups**
- `apps/admin/src/lib/nav.ts` — `NavItemDef` is now a discriminated union (`NavItem | NavSection`); `NavChildDef` supports dynamic `href: string | ((ctx) => string)` and `activeMatch`; 16 flat items reorganised into 3 sections: Campaign (Quests, Characters, DM Hub, Availability, Rewards), Content (World, Marketplace, Token Store, News, Wiki), Administration (Users, Roles & Permissions, Game Systems, Discord, Audit Log)
- `apps/admin/src/routes/(app)/+layout.server.ts` — `resolveNavItems` handles section pass-through; string `activeMatch` changed to `startsWith` (was exact match); children resolve dynamic hrefs + own `activeMatch` with sub-route support (`startsWith(childHref + '/')`); `getSetting` → `getSettingsMap()` (single DB call)
- `apps/admin/src/routes/(app)/+layout.svelte` — nav items pre-grouped into `NavGroup[]` by section; per-section `collapsedSections` state persisted in `localStorage`; active section always auto-expands regardless of saved state; collapsed sidebar shows `nav-section-divider` (thin line) instead of section label
- `shared/ui/styles/components/site.css` — `.nav-section-label` (collapsible button, uppercase, 44px min-height touch target) + `.nav-section-divider` (1px border-muted line for icon-only sidebar) + `.nav-section-chevron` with `rotate(-90deg)` on collapsed state

**Marketplace UX**
- `apps/frontend/src/routes/(protected)/marketplace/+page.svelte` — `margin-top: 0.75rem` added to Apply Filters / Reset button row, separating it from Sort by select
- `apps/frontend/src/routes/(protected)/marketplace/[id]/+page.svelte` — item detail field labels (Buy price, Sell price, Stock, Weight, Source, Description, Requirements, Reference) now use `class="label label-accent"` for accent colour
- `shared/ui/styles/components/ui.css` — added `.label-accent { color: var(--accent-light) }` modifier class; also added `--accent-text` / `--accent-text-hover` support to `.btn-primary` for themes with light accents (Midnight Neon, Sunlight & Sapphire)

**Mobile Fixes**
- `shared/ui/components/layout/AppShell.svelte` — `afterNavigate(() => { drawerOpen = false })` closes mobile drawer on every route change. Pre-existing bug made critical with section collapse — without this the drawer stays open on top of the new page after clicking a nav item
- `shared/ui/styles/components/site.css` — `.nav-section-label` `min-height: 44px` for accessibility touch target compliance

**Note:** `AppShell.svelte` now imports `afterNavigate` from `$app/navigation` — a pragmatic exception to the no-SvelteKit-imports rule in `@core/ui`. AppShell is inherently tied to SvelteKit's routing model and the mobile UX fix requires it.
### Session 78 — Skill & Saving Throw Override System + Wizard Save Grant Fixes (2026-06-26)

**Skill/Saving Throw Override — Root Cause & Fix**
- Root cause of "stuck at Expertise" bug: multiple override rows per skill (one per role — Player/DM/Admin) meant removing one role's row left another role's stale row still winning the MAX aggregation. Also, the original alpha code used `sourceId: 'dm-manual-SKILL'` for delete but `sourceId: null` on create, so the delete never matched.
- `shared/database/dbapi/write/dnd5e/skills.ts` — replaced Player/DM/Admin multi-row approach with single `sourceType: 'Override'` row per skill per character. `upsertOverrideSkillGrant` and `removeOverrideSkillGrant` no longer take a role argument. Remove also sweeps legacy `Player/DM/Admin` rows for backwards compatibility. Same pattern applied to `upsertOverrideSavingThrowGrant` / `removeOverrideSavingThrowGrant`.
- `shared/database/dbapi/read/dnd5e/get-character-sheet.ts` — aggregation simplified to `OVERRIDE_TYPES = {'Override', 'Player', 'DM', 'Admin'}` set treated identically. Exposes `overrideValue`, `overrideNote`, `grantSources` on each enriched skill and `hasOverride`, `overrideNote`, `grantSources` on each enriched saving throw. Builds `sourceLabels` map from already-loaded data (background, species/traits, class features, subclass features, feats) resolving UUIDs to readable names. `sourceTypeFallback` handles null-sourceId rows (Background, Class, PlayerChoice). `resolveGrantLabel` used for both skill and saving throw grant sources.
- Three `dnd5e.actions.server.ts` files (admin, player, DM) — role argument removed from all `upsertOverrideSkillGrant`, `removeOverrideSkillGrant`, `upsertOverrideSavingThrowGrant`, `removeOverrideSavingThrowGrant` call sites.

**Skill/Saving Throw Override — UX**
- `shared/ui/src/gamesystems/dnd5e/Dnd5eSkillsPanel.svelte` — full rewrite of interaction model: replaced click-to-cycle + window.prompt with click-to-open inline editor. Clicking a skill row opens an editor panel below the grid showing the skill name, four proficiency buttons (None/Half/Prof/Expert) pre-selected from current override value, optional note field, and Save/Cancel. Clicking same row or Cancel closes without saving. Enter commits. One DB write per deliberate save, one audit record.
- Saving throw editor: click a save cell to open inline editor with proficient toggle + note + Save/Cancel.
- Tooltip (`title`) on every skill row shows grant sources — for overrides: "Manual override: Expert | Note: ... | Natural grants: Ranger: Natural Explorer (Proficient)"; for natural grants: lists all sources with proficiency level. Same tooltip on saving throw cells.
- "Manual Override" amber badge in editor header. Context hint explains current value, note, and that setting None restores natural grants.
- Orange `●` superscript on skill name (and save stat) when an active override exists, only visible in edit mode.

**`approve-character.ts` — sourceType bug fix**
- `'ClassFeature' in f` check was always `false` (plain DB object, not a typed instance) so all features got `sourceType: 'SubclassFeature'`. Fixed by tagging each array before merging: `features.map(f => ({ ...f, sourceType: 'ClassFeature' }))` and `subclassFeatures.map(f => ({ ...f, sourceType: 'SubclassFeature' }))`.

**Character Creation Wizard — Saving Throw Grant Fixes** *(logic now in `_wizard/grants.ts` + `StepReview.svelte` — Session 79)*
- `featureAutoSaves` filters against `thisClassBaseSaves` — prevents multiclass save leakage
- Save choice pools carry `sourceId` (state key) and `sourceDbId` (DB UUID)
- Form hidden inputs submit `classSave`, `classSaveSourceType`, `classSaveSourceId` per grant
- Server reads parallel arrays and writes each grant with correct `sourceType` and `sourceId`
---

## Bug Fixes & Patches




### Sessions 61-70 — Character Sheet Stabilisation + Background Feats (2026-06-03)

**Character Sheet Architecture**
- Universal +page.svelte / +page.server.ts contain zero dnd5e content
- `_sheets/Dnd5eSheetSection.svelte` — player: fetch+deserialize, submit for approval
- `_sheets/DmDnd5eSheetSection.svelte` — DM canManage: direct save; read-only for quest-only DMs
- `_sheets/AdminDnd5eSheetSection.svelte` — always canEdit=true, direct save
- `_sheets/dnd5e.actions.server.ts` — per-route, appropriate guards (player/DM/admin)
- `_loaders/dnd5e.server.ts` — thin wrapper per route

**Dnd5eCharacterSheet.svelte** (pure UI, no SvelteKit imports)
- Callbacks: onSaveAbilityScores, onSubmitChanges, onSubmitLevelUp, onSaveSlot, onRemoveFeat
- Props: canEdit, canManage, editBlockedReason, isLevelUp, isLevelDown, availableLevel
- ASI slots: +2 one stat / +1+1 two stats / feat picker — one row per slot enforced
- Background feat slots: category-filtered picker or locked auto-grant (🔒 for players)
- Ability scores: +N ASI label per stat, ASI bump stored on feat row and reversed on remove
- Edit-blocked banner when canEdit=false (shows reason: pending approval, suspended, etc.)
- Slot state defaults: background_feat and epic_boon default to 'feat' mode not 'asi'
- Resolved feat slots show full description below header row

**Background Feat Grant System**
- `Dnd5eBackground.grantsFeatCategory String?` — player picks from this category
- `Dnd5eBackground.grantsFeatId String?` — FK to Dnd5eFeat, auto-granted locked slot
- `syncBackgroundFeatGrant(tx, characterId, newBgId, oldBgId)` — called on direct save + approval
- Auto-heal on sheet load: if grantsFeatId set but no row exists, creates row silently
- Admin backgrounds CRUD: feat dropdown by name, grantsFeatCategory text field
- Import/export: grantsFeatCategory and grantsFeatId columns added

**Schema Changes (db:push required)**
- `Dnd5eBackground`: grantsFeatCategory String?, grantsFeatId String? (FK Dnd5eFeat with named relation)
- `Dnd5eFeat`: grantedByBackgrounds Dnd5eBackground[] @relation("BackgroundGrantedFeat")
- `Dnd5eCharacterFeat`: asiStat1, asiAmount1, asiStat2, asiAmount2 (stored stat bump choices)

**Key Bug Fixes**
- ASI removal reverses stat bump using stored asiStat1/2 values
- Duplicate orphan feat rows cleaned on load (keep one per featId per slot)
- Slot keyed by sourceClassId+sourceLevel — one row per slot enforced via deleteMany before create
- FEAT_STATS uppercase enum values (was title case, caused 500 on ASI save to DB)
- Admin marketplace nav import link corrected
- DM character view: canManage DMs edit directly, quest-only DMs read-only

### Session 25 — DM Notifications + Self-Approval Guards + CharacterClass Move (2026-06-02)

**Item 1 — `createNotificationsForWorldDMs`**
Added to `shared/database/dbapi/write/notifications/notifications.ts` — queries WorldDM where canManage=true, resolves userIds via DMProfile, creates in-app notifications with correct `/dm/worlds/[worldId]/...` links. Exported as `notifications.createForWorldDMs`. Wired alongside `createNotificationsForAdmins` in: characters/create.ts, quests/update-status.ts (PENDING_APPROVAL + PENDING_RESULT_APPROVAL), marketplace/transactions.ts (buy + sell pending).

**Item 2 — Self-approval guard on quest result**
`approveResult` and `rejectResult` in `dm/worlds/[worldId]/quests/+page.server.ts` now check that the approving DM is not the quest's own DM. Returns 403 if they match.

**Item 3 — Dnd5eCharacterClass schema move**
`CharacterClass` model renamed to `Dnd5eCharacterClass` and moved from `characters.prisma` to `dnd5e.prisma` (schema `dnd5e`, `@@map("character_classes")`). Back-relation `character Character @relation(...)` added with onDelete:Cascade. All `db.characterClass` / `tx.characterClass` references updated in 4 dnd5e DB API files. **REQUIRES db:push + db:generate.**

### Session 26 — Feats + ASI System (2026-06-02)

**Schema (`dnd5e.prisma`)**
- `Dnd5eFeat` model — name, description, snippet, repeatable, categories, prerequisites, detailsUrl, isAvailable, isEpicBoon, sortOrder
- `Dnd5eCharacterFeat` model — join table character ↔ feat with Character back-relation
- `asiChoices Json?` added to `Dnd5eCharacterSheet`
**Requires db:push + db:generate**

**DB API (all dnd5e/)**
- `read/dnd5e/get-feats.ts` — getAll, getAllForAdmin, getById
- `write/dnd5e/feats.ts` — create, update, delete
- `write/dnd5e/update-character-asi.ts` — saveDnd5eAsiChoices
- `write/dnd5e/update-character-feats.ts` — addDnd5eCharacterFeat, removeDnd5eCharacterFeat
- `read/dnd5e/get-character-sheet.ts` — updated to compute ASI slots from class features, load chosen feats

**ASI slot detection**
- Features named "Ability Score Improvement" → ASI slot, canEpicBoon if totalLevel ≥ 19
- Features named "Epic Boon Feat" → Epic Boon slot (unconditional)
- Matched against saved asiChoices by sourceClassId + sourceLevel

**Admin CRUD**
- `game-systems/[id]/dnd5e/feats/` — list with expandable rows, inline edit, create, delete
- Import/export: feats tab added to `data/import/dnd5e/` and `data/export/dnd5e/`
- Feats link added to game system pages

**@core/ui**
- `Dnd5eAsiFeatsPanel.svelte` — slot resolution UI (ASI +2 / +1+1 / feat picker with epic boon filter)
- `Dnd5eCharacterSheet.svelte` — updated to show pending slots notice + chosen feats
- `shared/ui/index.ts` — exports `Dnd5eAsiFeatsPanel`

**Frontend**
- `characters/[id]/+page.server.ts` — loads availableFeats, adds saveAsi/addFeat/removeFeat actions
- `characters/[id]/+page.svelte` — shows Dnd5eAsiFeatsPanel when pending slots

### Session 26b — Admin Expandable Rows (2026-06-02)

Backgrounds, species, feats pages converted from table layout to flexbox rows:
- Click any row to expand — shows full description, all fields formatted
- Edit button in expanded panel opens inline edit form
- Mobile-friendly: flexbox with flex-wrap, no fixed column widths
- `backgrounds/+page.server.ts` — added `updateBackground` action (was missing)

### Session 26c — Game System Admin Restructure (2026-06-02)

Moved dnd5e-specific admin routes under `dnd5e/` subfolder:
- `game-systems/[id]/classes/` → `game-systems/[id]/dnd5e/classes/`
- `game-systems/[id]/backgrounds/` → `game-systems/[id]/dnd5e/backgrounds/`
- `game-systems/[id]/species/` → `game-systems/[id]/dnd5e/species/`
- `game-systems/[id]/data/import/` → `game-systems/[id]/data/import/dnd5e/`
- `game-systems/[id]/data/export/` → `game-systems/[id]/data/export/dnd5e/`
All internal links updated. `progression/` stays at root (universal).

### Session 26d — Point Buy Calculator (2026-06-02)

`apps/frontend/src/routes/(protected)/tools/dndpointbuy/+page.svelte` — standalone tool, no DB, no server.
- Standard 27-point buy with cost table (8-15)
- User-configurable bonus pool: 1:1 cost, up to 17 max per stat
- Added to Community nav group in root layout

### Session 22-23 — Character System Refactor (2026-06-01)

**Schema**
- `characters.prisma` — removed `speciesId`, `backgroundId`, `pendingChanges`; added `level Int @default(0)`; added `dnd5eSheet Dnd5eCharacterSheet?` relation
- `dnd5e.prisma` — added `Dnd5eCharacterSheet` model

**Universal character DB API** (zero dnd5e knowledge)
- `write/characters/create.ts`, `update.ts`, `approve.ts`, `level-check.ts`, `adjust-currency.ts` — all dnd5e removed
- `read/characters/get-by-id.ts`, `get-all.ts` — no enrichment, uses `character.level`
- Deleted: `write/characters/update-classes.ts`

**dnd5e character DB API** (new files in `write/dnd5e/` and `read/dnd5e/`)
- `write/dnd5e/create-character.ts`, `approve-character.ts`, `update-character.ts`, `update-classes.ts`
- `read/dnd5e/get-character-sheet.ts`, `enrich-signups.ts`

**Level references fixed** — all use `character.level` now:
- `write/quests/signup.ts`, `submit-result.ts`, `delete.ts`
- `write/marketplace/transactions.ts`
- `read/quests/get-by-id.ts` — uses `enrichDnd5eSignups` from dnd5e layer
- `apps/discord/src/commands/characters.ts`

**UI components extracted to `@core/ui`**
- `shared/ui/src/gamesystems/dnd5e/Dnd5eCharacterSheet.svelte`
- `shared/ui/src/gamesystems/dnd5e/Dnd5eCharacterCreation.svelte`
- `shared/ui/index.ts` — exports both components

**Server + svelte files** — all dispatch by system, use `charSheet` from `dnd5e.getCharacterSheet()`

### Session 24 — Quest DM Approval Fix (2026-06-01)

**Problem:** DM with `canManage` had no way to approve quests from their own quest detail page — had to navigate to world quest list.

**Option B** — `dm/quests/[id]/+page.server.ts`:
- Added `checkCanApprove()` — verifies DM has `canManage` on quest's world AND is not the quest's own DM (self-approval guard)
- Added `approve` action (`PENDING_APPROVAL → PUBLISHED`) and `reject` action (`PENDING_APPROVAL → CANCELLED`)
- `canApprove` passed to page

**Option C** — `dm/worlds/[worldId]/+page.svelte`:
- Pending quests stat card now links to `?status=PENDING_APPROVAL` instead of unfiltered list


### Session 21 — Import/Export (2026-06-01)

**Architecture**
- Established consistent `data/import` + `data/export` pattern for all data-owning areas
- Each area owns its own import and export — no shared api/export routes
- Structure: `game-systems/[id]/data/import|export`, `game-systems/[id]/progression/data/import|export`, `marketplace/data/import|export`
- Pattern established for future systems: `game-systems/[id]/data/` for system-specific data

**New routes**
- `apps/admin/src/routes/(app)/game-systems/[id]/data/import/+page.server.ts` — moved from `game-systems/[id]/import/`
- `apps/admin/src/routes/(app)/game-systems/[id]/data/import/+page.svelte`
- `apps/admin/src/routes/(app)/game-systems/[id]/data/export/+server.ts` — new, exports classes/features/subclasses/species/backgrounds
- `apps/admin/src/routes/(app)/game-systems/[id]/progression/data/import/+page.server.ts` — new
- `apps/admin/src/routes/(app)/game-systems/[id]/progression/data/import/+page.svelte` — new
- `apps/admin/src/routes/(app)/game-systems/[id]/progression/data/export/+server.ts` — new
- `apps/admin/src/routes/(app)/marketplace/data/import/+page.server.ts` — moved from `marketplace/import/`
- `apps/admin/src/routes/(app)/marketplace/data/import/+page.svelte`
- `apps/admin/src/routes/(app)/marketplace/data/export/+server.ts` — new

**Deleted routes**
- `apps/admin/src/routes/(app)/game-systems/[id]/import/` — replaced by `data/import/`
- `apps/admin/src/routes/(app)/marketplace/import/` — replaced by `data/import/`

**Updated sveltes** (import links updated to new paths)
- `apps/admin/src/routes/(app)/game-systems/+page.svelte`
- `apps/admin/src/routes/(app)/game-systems/[id]/+page.svelte`
- `apps/admin/src/routes/(app)/game-systems/[id]/classes/+page.svelte`
- `apps/admin/src/routes/(app)/game-systems/[id]/progression/+page.svelte`
- `apps/admin/src/routes/(app)/marketplace/items/+page.svelte`

**DB API**
- `shared/database/dbapi/read/marketplace/get-items.ts` — `getAllMarketplaceItemsForExport()` added (no pagination, select only export columns)
- `shared/database/dbapi/write/marketplace/import.ts` — `ImportRow.weight` accepts `null`; weight sanitized on import to prevent NaN storage
- `shared/database/index.ts` — `marketplace.items.getAllForExport` exported

**Bug fixed**
- Marketplace import was storing NaN for weight when source data had empty/non-numeric values (e.g. blank, N/A)
- 327 affected items identified, export handled NaN gracefully, reimport cleaned all to null
- Import now sanitizes weight: only stores numeric values, null otherwise
---

### Session 83 — Unified Progression System (XP + Milestone) (2026-07-27)

**Root cause fixed.** `Character.level` was written by two unrelated writers with two
different meanings — `level-check.ts` wrote the XP-threshold count, while
`approve-character.ts` and `update-classes.ts` wrote `sum(allocatedLevel)` — and a
third algorithm in `submit-result.ts` detected level-ups by threshold identity and
wrote neither. Every level-up/down inconsistency followed from that.

**Schema — level split and milestone progression**
- `enum ProgressionMode { XP MILESTONE }` (`gamesystem` schema)
- `GameSystem.defaultProgressionMode`, `World.progressionMode` (nullable override)
- `ProgressionThreshold.milestoneRequired Int @default(0)`
- `Character.earnedLevel`, `Character.progressionMode`, `Character.totalMilestones`;
  `Character.level` redefined as approved/allocated level only
- `TransactionType` gains `MILESTONE`
- `Quest.milestoneAward`, `QuestResult.milestoneAward`, `QuestResultCharacter.milestonesAwarded`

**Single progression path**
- New `shared/database/dbapi/write/characters/progression.ts` — `resolveEarnedLevel`,
  `applyProgressionChange`, `reconcileProgression`, `setCharacterProgressionMode`,
  `resolveProgressionMode`, `isLadderConfigured`
- Deleted `shared/database/dbapi/write/characters/level-check.ts`
- Idempotency guarded in **both** directions (previously level-up only)
- Rewired: `quests/submit-result.ts`, `characters/adjust-currency.ts`,
  `quests/delete.ts`, `token-store/transactions.ts`, `dnd5e/create-character.ts`,
  `dnd5e/update-classes.ts`, `dnd5e/approve-character.ts`
- An unconfigured milestone ladder (all `milestoneRequired` at 0) is inert rather than
  jumping characters to max level

**Bugs fixed**
- Quest level-up no longer skips `RESTING` — `restUntil` is always written and status
  precedence is decided centrally
- `submitDnd5eStructuralChanges` gained a `reasonMode` parameter so `submitLevelUp`
  preserves `LEVEL_UP_PENDING` / `LEVEL_DOWN_PENDING` instead of overwriting with
  `EDIT_PENDING`
- Quest deletion XP reversal double-decremented before checking for a level-down
- Quest eligibility filter on `quests/[id]/+page.server.ts` summed `allocatedLevel`
  while `quests/signup.ts` gated on `Character.level` — both now read `level`
- Delevel left orphaned `Dnd5eCharacterFeat` rows; `pruneDnd5eFeatsAboveAllocation`
  now removes picks above the new allocation and reverses their ASI stat bumps
- Rejecting an allocation can no longer corrupt `level`, since progression never
  writes it
- `Prisma.JsonNull` used for `Quest.encounterPlan` clears (pre-existing type error)

**UI**
- Game system progression admin: default-mode selector, `milestoneRequired` column in
  the inline editor, unconfigured-ladder warning, and the column added to the
  progression import template and export
- World admin: progression mode override (blank = inherit)
- Character admin: milestone stat card, earned-level stat card, `MILESTONE` currency
  adjustment, and a mode switcher that seeds the new total to hold the current level
- DM and admin quest forms: milestone credit input with a per-participant hint
- Character page: progression bar reads the mode and renders credits or XP;
  `availableLevel` sourced from `earnedLevel` instead of client-side threshold math

**Backfill**
- `shared/database/scripts/backfill-progression.ts` (`pnpm --filter @core/database
  backfill:progression [-- --apply]`) — dry-run by default, sets `earnedLevel` from
  the progression totals and `level` from `sum(allocatedLevel)`

---

### Session 84 — Sparse World Progression Ladder Overrides (2026-07-27)

**Schema**
- `WorldProgressionOverride` — sparse per-world diffs on `ProgressionThreshold`
  (`thresholdId`, optional `xpRequired` / `milestoneRequired`; both-null rows are not stored)

**Resolve path**
- `getEffectiveThresholds(gameSystemId, worldId)` merges system ladder + home-world
  overrides; globals (`worldId` null) always use the pure system ladder
- Wired through `reconcileProgression`, mode seeding, character create, token-store
  revoke warning, and character page progression bar

**Write + re-resolve**
- `worlds.progression.upsertOverrides` replace-sets diffs, audits, then
  `reconcileProgression` for every character with that home world

**UI**
- Shared `WorldProgressionLadderEditor` (`@core/ui`)
- Admin world page: ladder override section under progression mode
- DM hub: `/dm/worlds/[worldId]/progression` (canManage) + nav tab; also world
  progression mode for new characters

---

### Session 85 — PM2 ecosystem config filenames (2026-07-29)

Renamed PM2 configs to the pattern PM2 expects (`ecosystem.*.config.js`):
- `ecosystem.dev.config.js` (dev)
- `ecosystem.prod.config.js` (prod)

Updated [docs/setup.md](docs/setup.md), [docs/technical.md](docs/technical.md), and
[docs/dev-environment.md](docs/dev-environment.md) start/redeploy commands accordingly.

### Session 86 — D&D 5e Codex Community tool (2026-07-30)

Community reference browser at `/tools/codex`, gated by `dnd5eDescriptions` / `read`:
- `dnd5e.getCodexData` — available-only classes/species/feats/backgrounds + non-legacy spells
- Structured filter rows (field / operator / value) with per-row **AND / OR**; nested results under parents
- Friendly field labels; multi-prop fields (e.g. Skills, Size, Grants ASI, feat Description+snippet)
- Community nav **Codex** link only when `canViewDescriptions` is true
- Docs: [tools/codex.md](docs/tools/codex.md), feature note under §31
- Mobile nav: all sections independently collapse (Adventure / Campaign / Community / DM / Account); active section opens on menu open; menu scrolls on short viewports
- Codex spell results use shared `Dnd5eSpellDetail` (casting time, range, duration, components, AoE, saves/attacks, damage, cantrip scaling, upcast, lists/tags) matching the spellbook card
- `DescriptionText` + `looksLikeMarkdown`: auto-render Markdown in descriptions when detected (Codex, wizard, spell detail, sheet); plain text otherwise — no corpus rewrite
- Spell damage parsing: `/` between types = choose one (`1d8 Acid / Cold / Fire`); `+` between dice groups = additive (`1d10 Piercing + 2d6 Cold`) — Codex, spellbook, Discord
- `SpellDamageBadges`: neutral dice pill + emoji + type name (Codex, spellbook, spell detail, cantrip scaling); `choose one` before slash-separated types
- Codex: entity types start unchecked — user selects what to search

### Session 87 — World Neural Map lore board (2026-08-02)

DM/Admin plot envisioning tool (authored connections, not DB-relation graph):
- Schema: `NeuralEntityType`, `NeuralMapNode`, `NeuralMapEdge` (world-scoped; soft entity IDs)
- API: `worlds.neural` — getMap, listCandidates, add/update/remove node & edge
- UI: `WorldNeuralMap` (`@core/ui`) — pan/zoom, drag nodes, connect mode, sidebar picker, edge labels
- Placeable types: Region, Location, Faction, NPC, Quest, Character, Journal
- DM hub: `/dm/worlds/[worldId]/neural` (canManage tab); Admin: `/world/[id]/neural`
- Node click opens the entity’s existing detail page

### Session 88 — Plot Quests foundation (2026-08-02)

World lore plot layer (separate from system play-session Quests; Session rename deferred):
- Schema: `PlotQuest`, `PlotQuestQuest`; `FactionQuest` / `NpcQuest` now use `plotQuestId` (old session links cleared)
- API: `worlds.plotQuests` CRUD + link/unlink system Quests; faction/NPC plot links
- DM/Admin: `/…/plot-quests` list + detail (link Quests, factions, NPCs); Neural map `PLOT_QUEST`
- Faction/NPC editors: “Associated plot quests”; player faction page no longer lists system Quests
- RBAC resource `PlotQuest` in world seed (re-seed or grant in admin if needed)
- Timeline-ready: `deadlineAt` on PlotQuest for a future world timeline / world calendar

### Session 89 — DM world hub sectioned nav (2026-08-02)

- Replaced flat world-hub tab strip with two-line nav: section (Play, Economy, World Building, Configuration) + page links for the open section
- Dashboard under Play; Quest DMs only see allowed items; horizontal scroll on narrow screens
- Plot Quest deadline UI notes future world timeline + calendar binding

### Session 90 — Neural map remove-node fix (2026-08-02)

- Node × was swallowed by board pan pointer-capture; exclude remove control from pan and stop propagation
- Remove confirmation uses an in-map panel (same pattern as connection delete); also available via selected-node panel
- Fixed `preventDefault` on × pointerdown suppressing the click; failed remove actions now throw instead of silently no-oping

### Session 91 — World Timeline + Calendar Phase 1 (2026-08-02)

- Schema: `WorldCalendar` (+ months/weekdays/eras/moons), `TimelineEvent`; `PlotQuest.deadlineAt` → `deadlineDay` (absolute day)
- Calendar engine + Gregorian ensure-on-read; `worlds.calendar.*` / `worlds.timeline.*`
- DM Play: Timeline (all assigned DMs) + Calendar editor (`canManage`); Admin + player `/world/[slug]/timeline`
- Timeline List + Calendar views; Events CRUD (wars/etc); Plot Quest fantasy date picker
- Phase 2 deferred: Gantt, region weather, NPC schedules

### Session 92 — World Timeline Phase 2 (2026-08-02)

- Schema: `RegionWeather`, `NpcSchedule`; Gantt view enabled in calendar settings
- Timeline aggregates weather + NPC schedules; CRUD for both (canManage / Admin)
- Gantt view in `WorldTimeline`; moon phase emoji on Calendar day cells
- New calendars default `enableGanttView: true`

### Session 93 — World calendar current date (2026-08-02)

- `WorldCalendar.currentDay` — world “today”; set in Calendar editor Overview
- Timeline shows current date on all views: persistent Today bar; Calendar cell highlight; List divider + “today” on spanning entries; Gantt vertical marker when in range
- Timeline Calendar view opens on the month containing the current date

### Session 94 — Timeline entry date pickers (2026-08-02)

- Event / weather / NPC schedule forms use `FantasyDateField` (year/month/day) instead of raw absolute-day numbers
- New entries default start date to world `currentDay`

### Session 95 — Timeline today markers on List/Gantt (2026-08-02)

- Gantt range always includes world `currentDay` (was missing the today line when today fell outside event span)
- List/Gantt mark entries that span today with a Today badge; Gantt shows a labeled today axis line

### Session 96 — Calendar date format corruption (2026-08-02)

- Fix `formatDate`: token replace no longer rewrites letters inside month names (`May`→`5ay`, `November`→`Nove0ber`)
- Harden `FantasyDateField` numeric year/month/day; optional end date seeds from start/current day

### Session 97 — FantasyDateField day/month order + sync (2026-08-02)

- Date fields use Day → Month → Year (D/M/Y) so “1/05–3/05” is not typed into the Year box
- Remove bidirectional `$effect` loops that could stomp in-progress edits; commit on input
- Preview line shows the resolved formatted date (`= May 3rd, 0001 CE`)

### Session 98 — Gantt today-line alignment (2026-08-02)

- Fix Gantt today marker drift: axis + rows share a fixed actions column and matching track border box so `left:%` lines up

### Session 99 — Region weather (not timeline events) (2026-08-02)

- Weather CRUD moves to region pages (`RegionWeatherPanel`); timeline only displays weather and links to the region
- Remove Timeline “+ Weather” authoring

### Session 100 — Default world on first DM approval (2026-08-02)

- Approving a DM role request creates a default world for first-time DMs and assigns them `canManage`
- If the DM already has world assignments, skip creation and notify admins (`DM_REAPPROVED_WITH_WORLDS`)
- Move `DM_REQUEST_PENDING` admin notify to request submit (was incorrectly fired on approve)

### Session 101 — Plot Quest progression graph (2026-08-02)

- PlotQuest progression DAG: objectives, failure package, scenes/discoveries/decisions/exits/endings, Requires/Unlocks/Blocks (incl. cross-plot), node runtime state + analysis
- Shared editor `PlotQuestProgressionEditor` on DM/Admin plot detail; `failureTimeoutDay` on summary
- Neural map layers Lore | Progression; place `PLOT_NODE`s; overlay plot edges when endpoints are placed
- Session quest detail: linked plot quests tab (DM) / card (Admin)
- API: `worlds.plotQuests.getProgression`, node/edge/state CRUD, `listBySystemQuest`

### Session 102 — Progression entry reqs, neural status, effects (2026-08-03)

- Entry requirements evaluated in analysis (`NPC_ALIVE`, `QUEST_ACCEPTED`, node/objective complete); Entry tab + unmet/blocked reporting
- Neural Progression nodes show available / entry-blocked / impossible from the same analysis
- Effects/rewards authoring UI; apply renown / NPC status / lock-plot on COMPLETED|FAILED
- Failure timeout due banner + `applyFailureTimeout`

### Session 103 — Progression UI rebuild to product tree (2026-08-03)

- Rebuild authoring UI: Objectives / Failure / Progression / Analysis with human labels (no Kind enum dump)
- Plot `deadlineDay` = global fail timer; remove Summary “Failure timeout”
- Per-scene and per-objective `PlotNode.failureTimeoutDay`; overdue node apply action
- Deadline apply uses `deadlineDay` for the Failure package

### Session 104 — Per-piece progression connections (2026-08-03)

- Remove global “How pieces connect” block from Progression tab
- Unlock / Require / Block forms live on each piece (discovery, option, exit, scene, ending) so scope is obvious

### Session 105 — Progression scene card panels (2026-08-03)

- Scene authoring is card-based: Entry / Discoveries / Decisions / Exits / Links panels load in place
- Entry requirement and consequence forms open on the owning card (no form dumped at page bottom)
- “Add scene” is a button that expands the form in place (same pattern as other adds)
- Endings is its own top-level tab (with Objectives / Failure / Progression / Analysis)
- Links: Unlocks/Blocks = “when completed”; Requires = separate “needs…” prerequisite (not a completion effect)
- Discovery / Decision / Exit nodes: description field in Progression editor (create + edit)

### Session 106 — Plot playthrough, Analysis, add-button UX (2026-08-03)

- Add objective / failure condition: button then expand form (same as scene)
- Analysis: playable-only open scenes; titles + empty hints; blocked endings
- Engine: ungated LOCKED is not available; COMPLETED/terminal excluded from available
- Play tab: advance beats with DM/player notes; Complete auto-applies unlocks/blocks
- `PlotNodeState.playerNote` + `playerNoteVisible`; `advancePlotNode` API
- Player plot log: `/world/[slug]/plots` + revealed beats detail

### Session 107 — Neural Progression auto-populate (2026-08-04)

- Progression layer auto-fills from each plot’s PlotNodes (`syncProgressionLayer`)
- Sync on neural map load + plot node create/delete; preserves existing positions
- Per-plot column layout for new nodes; prune orphan PLOT_NODE placements
- Default to Progression when plot pieces exist; auto-fit; show Scene/Discovery/… + plot title (Lore = factions/NPCs/plot cards)

### Session 108 — Plot flowchart authoring (2026-08-04)

- Progression tab = plot-scoped flowchart (`PlotFlowchartEditor`): add pieces, Connect → PlotEdge, inspector drawer
- Left→right layered layout (`layoutPlotFlowchart`) + opt-in `relayoutProgressionLayer` (Relayout on plot + Neural)
- Neural Progression Connect writes PlotEdge (Unlocks/Blocks/Needs); Lore Connect unchanged
- World Neural stays multi-plot overview, auto-synced from plot pieces
- Flowchart UX: top palette is + Scene only; discoveries/decisions/exits added inside a selected scene; endings stay on Endings tab; scene inspector (title/desc/status/failure/entry); deletes use `confirmModal`
- Plot page: Details | Links side-by-side; Plot structure full-width below; scene description multi-line; canvas shows scene children + branch links (decision→option)
- Compound scene cards: discoveries/decisions/options/exits nested inside scene cards; edges between scenes/endings from exits/options; richer inspector
- Restored consequences (PlotEffect) on discoveries, decision options, exits, and endings in the flowchart inspector
- Restored Unlock/Block/Needs on scene pieces; exit shortcuts to ending/scene; ending shortcuts to finish objectives, open scene, finish plot
- Ending→objective UNLOCKS completes the objective; CUSTOM `{ finishPlot: true }` marks the plot COMPLETED

### Session 109 — Two-layer Progression UX (Scene graph + Scene flow) (2026-08-05)

- Progression flowchart split into **Scene graph** (scenes/endings + Connect) and **Scene flow** (per-scene editor)
- Scene flow: left palette (+ Discovery / Decision / Option / Exit), center canvas, right inspector
- Always-present **Start Node** owns entry requirements and scene-level Unlock / Block / Needs / Consequences
- In-scene pieces as separate nodes; dashed parent links + solid PlotEdges; ghost targets for outbound links
- Progression plumbing kept on Start, Discovery, Decision, Option, Exit, Ending (not buried)

### Session 110 — Lore-only Neural, directed connectors, Play on flowchart (2026-08-05)

- Neural map is Lore-only (Progression chip/sync/overlay removed from UI); plot flowchart remains progression source of truth
- Stronger directed connectors (larger arrows, side docking, parent-link arrows, Flip direction)
- Play tab uses Scene graph / Scene flow: select option/piece → Taken / Complete / Fail / Miss or set Available/Blocked
- Play on Draft clarified as DM testing (not blocked); Active = go live for players
- Play path chooser on decisions; flow paints Taken (purple) / Open (green) / Blocked (red) / Closed (gray); element type colors
- Play records path state: Taken + miss siblings + close decision; UNLOCKS jump to ACTIVE (current step); canvas Current paint
- Decision Yes/No is always a step jump (no Unlocks required); Current advances structurally in-scene when no Unlocks
- Play **Revert step** (confirm dialog): clears that choice + every later choice, restores Current; does not undo world effects
- Play tab Finish objective / go-to / unlock shortcuts actually save (edge create was unwired in playMode)
- Play path paint: bright green only on connectors into Current (not outbound option branches)
- Play path paint: Locked = red, Blocked = amber (distinct); Missed/not-yet-chosen stay gray
- Progression canvas: fix node drag (suppress native browser drag; pointer capture on board)
- Out-of-scene ghost targets (e.g. Finish objective chips) are draggable and persist position
- Plot **Encounter** pieces (Combat / Puzzles / Traps / Social) under Scene; Social faction/NPC from plot Links; full Unlocks/Needs/Blocks/description surface
- Flowchart drops deleted out-of-scene ghosts (e.g. removed objective) instead of leaving a stale card
- Scene flow no longer deletes Objectives/Endings via ghost chips — only remove the link; manage those on their tabs
- **Finish objective** on every linkable piece; Unlocks→Objective always marks COMPLETED (not Current); Decision finish edges fire when a path is taken; Play status Complete/Fail uses advance cascade
- Scene-flow edit labels: Unlocks→Objective shows as **Finish** on canvas captions, ghost chips, and selected-edge inspector (not only Play chips)
- Play path paint: soft green only for next step (Current → Available); not the whole Available chain to the end
- Play **Set as Current** (scene/Start or any open piece): moves sole Current marker; does not wipe Taken history — use to restart from Start after revert
- Taking an **Exit** completes the parent scene (resolves it) and applies scene Unlocks; Current follows jumps (e.g. Scene 2), not in-scene structural next
- Scene flow UX: Finish-objective is card/inspector only (`Finishes: …`) — no board connector or objective ghost; path arrows stay for real jumps- Play: decision/option inspector gets Continue to (in-scene) + Go to scene/ending; after taking an option Current always moves to Exit/next in-scene step; Set as Current is primary + clearer errors
- Play: stop fanning green Current from Available Start; structural next no longer force-opens every Locked Exit after an unrelated path
- Play: Current is exactly one step — never all Exits at once; extra Unlocks open as Available
- Play: path choice with no Continue-to clears Current and warns the DM to fix the graph (no scene/Exit fan-out hack)
- Play path paint: pieces/edges not reachable from Current show as Blocked (amber), not open green
- Play: Start Node inspector offers **Set Start as Current** (was labeled only as Set scene as Current)
- Session quests (not plot quests): **Quest notes** tab — DM-only + player WorldJournal notes when quest has a world (region); publish toggle for players; links to full journal editor
- DM quest page: tab panels isolate content (rewards/players only on Details); Quest notes editable after COMPLETED/CANCELLED
- Neural Lore: fix Select/Connect/Open (pointer capture was swallowing clicks after drag fix); remove stale layerInitialized fit guard
- Quest notes: one WorldJournal per quest with DM Notes (DM_ONLY) + Player Notes (WORLD) sections — not two journals
- Play: taking a decision option keeps Current in-scene (Exit / next piece); out-of-scene Unlocks open as Available until an Exit is taken
