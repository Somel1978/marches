# Marches — Architecture & Decision Log

> **Living document.** Updated as decisions are made and features are built.
> Last updated: 2026-05-18

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

---

## Monorepo Structure

```
marches/
├── apps/
│   ├── admin/      @apps/admin     (port 5174)
│   ├── frontend/   @apps/frontend  (port 5173)
│   └── discord/    @apps/discord   (persistent process — future)
└── shared/
    ├── database/   @core/database
    ├── rbac/       @core/rbac
    ├── email/      @core/email
    ├── ui/         @core/ui
    └── errors/     @core/errors
```

---

## Database Schema Topology

### Core Infrastructure (built)
```
platform    — Module, Resource, Setting, NavVisibility
users       — User, Role, UserRole, RolePermission
auth        — Session, Account, Verification (better-auth owned)
audit       — AuditLog (append-only)
```

### Feature Schemas (planned)
```
gamesystem  — GameSystem, Class, Subclass, ProgressionThreshold
characters  — Character, CharacterClass, CharacterSlotGrant,
              CharacterTransaction, CharacterInventory
dms         — DMProfile, DMGameSystem, RoleRequest, DMRating
quests      — Quest, QuestDM, QuestSignup, QuestResult,
              QuestResultCharacter, QuestReward
rewards     — Reward
marketplace — Item, Transaction
world       — World, Region, RegionDM, WorldWikiPage,
              WorldWikiRevision, RegionWikiPage, RegionWikiRevision
discord     — DiscordChannelConfig, DiscordMessage
```

### Schema Rules
- `platform` — core infrastructure only, runs regardless of features
- `users` / `auth` / `audit` — core user management and security
- Feature schemas are self-contained and own their data
- Cross-schema references use foreign keys (enforced at DB level)
- `auth.Account` stores Discord OAuth link (no separate DiscordLink table)

---

## Feature Plugin Pattern

Every new feature follows this pattern:

```
1. New schema + Prisma models + migrations
2. New Resource entries in platform seed (with navVisibility)
3. New Setting entries in feature seed file (not 01-platform.seed.ts)
4. New nav entry in apps/admin/src/lib/nav.ts
5. New admin routes under (app)/[feature]/
6. New frontend routes under (protected)/[feature]/
7. Discord surface defined (commands + notifications)
```

### Settings Grouping
Settings page splits by prefix:
```
/settings              — Core only (smtp.*, email.*, site.*)
/[feature]/settings    — Feature settings ([feature].*)
```

### NavVisibility per feature resource
```
ALL  — admin-only list routes (full access required)
ANY  — own-record sections (OWN or ALL grants nav)
NONE — internal/door-key resources (never navigable)
```

---

## Build Order

```
✅ 0. Core platform (RBAC, users, audit, email, settings)
⬜ 1. GameSystem feature
✅ 2. Character Hub (complete)
✅ 3. DM Hub
✅ 3. DM Hub (complete)

### DM Hub ✅

**Schema:** `dms`
**Models:** `DMProfile`, `DMGameSystem`, `RoleRequest`, `DMRating`

**Admin routes:**
```
/role-requests         — pending requests (approve/reject/delete) + resolved history
/dms                   — list of DM profiles
/dms/[id]              — edit profile (bio, specialties, rules, preferred systems, public/active) + revoke DM role
/dms/settings          — dm.ratingsEnabled toggle
```

**Nav sub-menu under DM Hub:** DM Profiles | Role Requests | Settings

**Frontend routes:**
```
/dm                    — DM dashboard (requires DM role); quests/regions placeholder
/dm/profile            — DM edits own profile (creates on first save if none exists)
/dm-request            — request DM role; shows pending/approved/rejected state
```

**DM Rules field:** stored on `DMProfile.rules`, pre-populates quest rules on creation, editable inline before submission.

**dbapi:**
```
dms.profiles.{getAll, getById, getByUserId, create, update, revoke}
dms.roleRequests.{getAll, getPending, getLatestByUser, create, approve, reject, delete}
```

**Key decisions:**
- DM role ≠ DM profile. A user can have the DM role without a DM profile. A DM profile requires the DM role.
- Nav checks `hasDMProfile` (active DM profile) not the DM role. Active profile → "DM Hub". No active profile → "Become a DM".
- `/dm-request` redirects to `/dm` only if user has an active DM profile.
- `/dm` requires DM role but not a profile — profile is optional and created on demand at `/dm/profile`.
- Approving a role request: assigns the role, creates DMProfile if none exists, calls `invalidateUserPermissions` to clear the permission cache immediately.
- Revoking DM role: deactivates DMProfile, removes UserRole, updates approved role request to REJECTED so player sees correct state on `/dm-request`.
- Feature settings (`dm.ratingsEnabled`) live in `05-dms.seed.ts`, not in platform seed.

⬜ 4. Quest System
⬜ 5. Rewards Engine
⬜ 6. Marketplace
⬜ 7. World System
⬜ 8. Discord (shell + per-feature expansion)
```

---

## Feature Specifications

---

### 1. GameSystem Feature

**Schema:** `gamesystem`

**Purpose:** Plugin system that extends character options per game system (D&D 5e, Vampire: The Masquerade, Daggerheart, etc.). Each game system defines its own classes, subclasses and progression.

**Models:**
```prisma
GameSystem {
  id, name, description, isAvailable, sortOrder
}

Class {
  id, gameSystemId, name, description
  source   // e.g. "Player's Handbook", "Xanathar's Guide"
  link     // URL to source reference
  isAvailable, sortOrder
}

Subclass {
  id, classId, name, description
  source   // source book reference
  link     // URL to source reference
  isAvailable, sortOrder
}

Species {
  id, gameSystemId, name, description
  source, link
  isAvailable, sortOrder
}

ProgressionThreshold {
  id, gameSystemId, label, xpRequired, description, sortOrder
  // label = system-specific name (e.g. "Level 1", "Tier 2", "Neonate")
  // xpRequired = total XP needed to reach this threshold
}
```

**Admin UI:**
```
/game-systems              — list all game systems
/game-systems/new          — create game system
/game-systems/[id]         — edit system + manage classes/subclasses/species/progression inline
```

All data managed inline on the detail page:
- Game system details (name, description, availability)
- Classes — add, edit (name, description, source, link, availability), delete
- Subclasses — add per class, edit (name, description, source, link, availability), delete
- Species — add, edit (name, description, source, link, availability), delete
- Progression thresholds — add, edit (label, xpRequired, description), delete

Source and link fields on classes/subclasses allow referencing the source book and URL.

**Resources:**
```
GameSystem    navVisibility: ALL
Class         navVisibility: ALL
Subclass      navVisibility: ALL
```

**Key decisions:**
- GameSystem is a plugin — adding a new system is purely a data operation
- Classes/Subclasses are admin-managed catalogue entries
- `isAvailable` hides entries from players without deleting (historical characters keep their classes)
- Progression label is customisable per system (not hardcoded as "level")
- XP is universal internal currency regardless of system

---

### 2. Character Hub ✅

**Schema:** `characters`

**Purpose:** Players manage their characters. Each character belongs to a game system, has classes, tracks XP/gold/tokens, and has a full audit trail.

**Models:**
```prisma
Character {
  id, userId, gameSystemId
  name             // unique globally
  avatarUrl        // circular display image
  portraitUrl      // full portrait image
  status           // PENDING | ACTIVE | RESTING | SUSPENDED | RETIRED | DECEASED | REJECTED
  statusReason     // LEVEL_UP_PENDING | QUEST_REST | ADMIN | SYSTEM | null
  statusChangedAt
  totalXp
  totalGold
  totalTokens
  restUntil        // nullable DateTime — set on quest completion
  createdAt, updatedAt
}

CharacterClass {
  id, characterId, classId, subclassId (nullable), allocatedLevel
}

CharacterSlotGrant {
  id, userId, delta (+/-), reason, grantedBy, createdAt
  // Total slots = base (settings) + SUM(delta)
}

CharacterTransaction {
  id, characterId
  type      // XP | GOLD | TOKEN | STATUS | ITEM | REWARD
  delta     // nullable (XP/gold/token changes)
  fromValue // nullable (status changes)
  toValue   // nullable (status changes)
  sourceType // QUEST | MARKETPLACE | ADMIN | REWARD | SYSTEM
  sourceId   // nullable — references source entity
  note, createdBy, createdAt
}

CharacterInventory {
  id, characterId, itemId, quantity
  acquiredAt
  sourceType // PURCHASE | REWARD
}
```

**Settings:**
```
character.baseSlots      // base character slots per player (global)
character.startingGold   // starting gold for each new character
character.restDays       // rest period in days after quest completion
```

**Character status rules:**
| Status | Set by | Cleared by |
|---|---|---|
| PENDING | System (new char / level-up) | Admin approval |
| ACTIVE | System (after approval) | Any other status |
| RESTING/QUEST_REST | System (quest completion) | System (after restDays) or admin |
| RESTING/LEVEL_UP_PENDING | System (XP threshold crossed) | Admin (level-up approval) |
| SUSPENDED | Admin only | Admin only |
| RETIRED | Player or admin | Admin only |
| DECEASED | System (quest death) or admin | Admin only (resurrection) |
| REJECTED | Admin (new character rejection) | Admin only — character never deleted by workflow |

**Character slot calculation:**
```
totalSlots = character.baseSlots (setting) + SUM(CharacterSlotGrant.delta)
```

**Level calculation:**
```
totalLevel = MAX threshold where character.totalXp >= threshold.xpRequired
allocatedLevel = SUM(CharacterClass.allocatedLevel)

if totalLevel > allocatedLevel:
  → character flagged for level-up
  → status set to RESTING (LEVEL_UP_PENDING)
  → player submits class allocation → PENDING
  → admin approves → ACTIVE
```

**Character with unallocated levels:**
- Cannot register for quests
- Status: RESTING (LEVEL_UP_PENDING)
- No time limit — clears only on admin approval

**Multiclassing:**
- Character can have any number of CharacterClass entries
- Max 1 subclass per class entry
- Total allocated level across all classes cannot exceed calculated level

**Character creation flow:**
```
Player creates character → PENDING
Admin approves → ACTIVE (character.startingGold assigned via CharacterTransaction)
Admin rejects → deleted or returned with note
```

**Admin routes:**
```
/characters              — list with status filter, shows player name
/characters/[id]         — approve/reject, edit details, classes, species, currency, status, transactions, delete
/characters/slots        — per-user slot management (summary table + grant form for all users)
/characters/settings     — character feature settings
```

**Nav sub-menu under Characters:**
- All Characters → /characters
- Slots → /characters/slots
- Settings → /characters/settings

**Frontend routes:**
```
/characters              — grid of own characters with slot info
/characters/new          — create character (slot check, game system, species, initial classes)
/characters/[id]         — view/edit, portrait lightbox, class allocation, transactions
```

**Resources:**
```
Character    navVisibility: ANY
```

**Key decisions:**
- Character name is globally unique but ID is the canonical reference
- Two image areas: avatarUrl (circular) and portraitUrl (full)
- Tokens are a second currency alongside gold (future token shop)
- CharacterInventory owned by characters schema, not marketplace
- Rewarded items = marketplace transaction at cost 0

---

### 3. DM Hub

**Schema:** `dms`

**Purpose:** DM workspace. DM is a role in the existing RBAC system — a user can hold PLAYER + DM simultaneously.

**Models:**
```prisma
DMProfile {
  id, userId (unique)
  bio, specialties
  isPublic      // visible to players
  isActive      // set false on role revocation
  createdAt, updatedAt
}

DMGameSystem {
  dmProfileId, gameSystemId
  // informational only — preferred systems
}

RoleRequest {
  id, userId, roleId, reason
  status        // PENDING | APPROVED | REJECTED
  reviewedBy    // nullable
  reviewNote    // nullable
  createdAt, updatedAt
}

DMRating {
  id, dmProfileId, userId, questId
  rating        // 1-5
  comment       // nullable
  createdAt
  // unique: (dmProfileId, questId, userId)
}
```

**Settings:**
```
dm.ratingsEnabled    // true | false — feature flag
```

**DM role request flow:**
```
User submits RoleRequest with reason
Admin reviews in admin panel → approves or rejects
On approval → role assigned via existing setUserRoles
DMProfile created automatically
```

**DM role revocation:**
```
Admin revokes DM role → DMProfile.isActive = false
All active quests and region assignments FROZEN
Admin sees warning on affected quests and regions
Admin manually resolves (reassign, unassign, or reinstate)
No automatic data mutation
```

**Region management split:**
```
Admin    — creates regions, assigns/unassigns DMs
DM       — edits content of assigned regions (name, description, lore, map config)
DM       — cannot assign/unassign themselves from regions
```

**Permission pattern for regions:**
```
Region/ALL  — admin (full CRUD including assignments)
Region/OWN  — DM (edit only regions they are assigned to)
```

**Co-DM assignment:**
```
QuestDM.role: PRIMARY | CO_DM
Primary DM → auto-assigned on quest creation
Co-DMs → direct assignment by primary DM (no invitation needed)
Co-DMs → same quest management rights as primary DM
```

**Resources:**
```
DMProfile     navVisibility: ANY
RoleRequest   navVisibility: ALL
DMRating      navVisibility: ANY  (when dm.ratingsEnabled=true)
```

---

### 4. Quest System

**Schema:** `quests`

**Purpose:** Quests are created by DMs in assigned regions. System-agnostic — DM sets game system filter on character eligibility.

**Models:**
```prisma
Quest {
  id, title, description
  dmProfileId       // primary DM
  regionId
  status            // DRAFT | PUBLISHED | SIGNUPS_CLOSED | RUNNING
                    // | COMPLETED | APPROVED | CANCELLED
  scheduledAt, estimatedDuration
  minCharacters, maxCharacters
  minCharacterLevel, maxCharacterLevel
  xpReward          // base XP per character
  createdAt, updatedAt
  // allowedGameSystems → relation to GameSystem (empty = all allowed)
}

QuestDM {
  id, questId, dmProfileId
  role      // PRIMARY | CO_DM
  assignedAt, assignedBy
}

QuestSignup {
  id, questId, characterId, userId
  status    // PENDING | APPROVED | REJECTED | WAITLISTED | WITHDRAWN
  appliedAt, reviewedAt
  reviewedBy, reviewNote
}

QuestResult {
  id, questId
  summary       // DM narrative
  submittedBy, submittedAt
}

QuestResultCharacter {
  id, questResultId, characterId
  outcome       // SURVIVED | DECEASED
  xpAwarded, goldAwarded
  notes
}

QuestReward {
  id, questId, rewardId
  scope         // ALL | PER_CHARACTER | RANDOM_CHARACTER
  quantity
  assignedBy, assignedAt
  // locked after quest PUBLISHED
}
```

**Quest lifecycle:**
```
DRAFT          → DM working on it, not visible to players
PUBLISHED      → admin approves quest + rewards simultaneously
                 → Discord announcement sent
SIGNUPS_CLOSED → DM closes signups, reviews applicants
RUNNING        → quest active
COMPLETED      → DM submits results (XP/gold per character, outcomes)
APPROVED       → admin reviews results, can adjust XP/gold
                 → platform auto-processes all pre-approved rewards
                 → quest archived to world/region history
CANCELLED      → no rewards distributed, players notified
```

**Character eligibility check:**
```
character.status = ACTIVE
character.gameSystemId IN quest.allowedGameSystems (or quest has no filter)
SUM(CharacterClass.allocatedLevel) >= quest.minCharacterLevel
SUM(CharacterClass.allocatedLevel) <= quest.maxCharacterLevel
```

**Waitlist behaviour:**
```
APPROVED character withdraws
  → first WAITLISTED character auto-promoted to PENDING
  → DM confirms (not auto-approved)
  → player notified of promotion
```

**Quest editing rules:**
```
All fields editable after PUBLISHED
maxCharacters → cannot be lowered below current APPROVED count
allowedGameSystems → if changed, previously approved characters
                     that no longer qualify are flagged (not auto-rejected)
All edits → notify all APPROVED and WAITLISTED players
```

**DM result submission:**
```
DM can adjust:   xpAwarded, goldAwarded per character
DM cannot adjust: pre-approved rewards (items, tokens, slot grants)
```

**Settings:**
```
quest.xpAwardCap     // maximum XP multiplier DM can set (e.g. 1.5x base)
quest.goldAwardCap   // maximum gold DM can award per character
quest.autoPromoteWaitlist  // true | false
quest.editNotifications    // true | false
```

**Notification triggers:**
```
Quest published              → Discord announcement
Signup approved              → notify player
Signup rejected              → notify player + reason
Signup waitlisted            → notify player
Waitlisted auto-promoted     → notify player (now PENDING)
Quest edited                 → notify all approved/waitlisted players
Quest cancelled              → notify all signed up players
Results submitted            → notify admin
Rewards approved             → notify all participating players
Character deceased           → auto-set character status to DECEASED
```

**Resources:**
```
Quest    navVisibility: ANY
```

---

### 5. Rewards Engine

**Schema:** `rewards`

**Purpose:** Admin-defined reward pool available to DMs. Extensible type system — some rewards auto-processed by platform, others flagged for manual fulfilment.

**Models:**
```prisma
Reward {
  id, name, description
  type          // XP_BONUS | GOLD | TOKEN | ITEM | CHARACTER_SLOT | CUSTOM
  gameSystemId  // nullable — null = all systems, set = system-specific
  value         // JSON — type-specific payload
  isAvailable   // DMs can see and assign
  codeHandler   // boolean — platform processes automatically
  createdAt, updatedAt
}
```

**Type-specific value payloads:**
```json
XP_BONUS:        { "percentage": 25 }
GOLD:            { "amount": 100 }
TOKEN:           { "amount": 50 }
ITEM:            { "itemId": "uuid", "rarity": "COMMON", "quantity": 1 }
CHARACTER_SLOT:  { "delta": 1 }
CUSTOM:          { "description": "Manual reward description" }
```

**Processing on quest APPROVED:**
```
codeHandler=true:
  XP_BONUS        → CharacterTransaction (XP, percentage of xpAwarded)
  GOLD            → CharacterTransaction (GOLD)
  TOKEN           → CharacterTransaction (TOKEN)
  ITEM            → Marketplace Transaction (cost 0) → CharacterInventory
  CHARACTER_SLOT  → CharacterSlotGrant

codeHandler=false (CUSTOM):
  → flagged as manual action
  → admin notified to fulfil manually
```

**Reward scope (on QuestReward):**
```
ALL              → every surviving character gets this reward
PER_CHARACTER    → DM assigns to specific characters on completion
RANDOM_CHARACTER → system randomly assigns among survivors
```

**Game system locking:**
```
DMs only see rewards where:
  reward.gameSystemId IS NULL
  OR reward.gameSystemId IN quest.allowedGameSystems
```

**Resources:**
```
Reward    navVisibility: ALL
```

---

### 6. Marketplace

**Schema:** `marketplace`

**Purpose:** Item catalogue and transaction processing. Strictly transactional — inventory is owned by characters schema.

**Models:**
```prisma
Item {
  id, name, description, imageUrl
  price         // gold cost (0 = not purchasable directly)
  isAvailable
  rarity        // COMMON | UNCOMMON | RARE | VERY_RARE | LEGENDARY
  gameSystemId  // nullable — null = all systems
  createdAt, updatedAt
}

Transaction {
  id, characterId, itemId, quantity
  goldCost      // 0 for reward-sourced items
  sourceType    // PLAYER | REWARD
  sourceId      // nullable — rewardId if from reward
  status        // PENDING | APPROVED | REJECTED
  createdBy, createdAt
  reviewedBy, reviewedAt
}
```

**Purchase flow:**
```
Player initiates purchase → Transaction (PENDING)
  → Discord notification to marketplace channel
Admin approves → Transaction (APPROVED)
  → CharacterInventory record created
  → CharacterTransaction (GOLD, negative delta)
  → Discord message updated
Admin rejects → Transaction (REJECTED)
  → Discord message updated
  → Player notified
```

**Reward item flow:**
```
Quest APPROVED + ITEM reward
  → Transaction (APPROVED, goldCost=0, sourceType=REWARD)
  → CharacterInventory record created
  → CharacterTransaction (ITEM, sourceType=REWARD)
```

**Resources:**
```
Item           navVisibility: ALL   (admin manages catalogue)
Transaction    navVisibility: ANY   (players see own, admin sees all)
```

---

### 7. World System

**Schema:** `world`

**Purpose:** Geographic and lore container. Multiple worlds supported as tenants. Regions assigned to DMs who manage content.

**Models:**
```prisma
World {
  id, name, description
  mapImageUrl
  isActive
  createdBy, updatedBy
  createdAt, updatedAt
}

Region {
  id, worldId
  name, description
  mapConfig     // JSON — coordinates, click boundaries, marker position
  isActive
  createdBy, updatedBy
  createdAt, updatedAt
}

RegionDM {
  id, regionId, dmProfileId
  assignedBy, assignedAt
}

WorldWikiPage {
  id, worldId
  title, content    // rich text
  category          // LORE | HISTORY | FACTION | OTHER
  isPublic
  createdBy, updatedBy
  createdAt, updatedAt
}

WorldWikiRevision {
  id, pageId, content, editedBy, editedAt
}

RegionWikiPage {
  id, regionId
  title, content    // rich text
  category          // LORE | NPC | LOCATION | FACTION | HISTORY | OTHER
  isPublic          // DM controls visibility
  createdBy, updatedBy
  createdAt, updatedAt
}

RegionWikiRevision {
  id, pageId, content, editedBy, editedAt
}
```

**Ownership:**
```
World creation/config     → admin only
Region creation           → admin only
Region assignment to DMs  → admin only
Region content (wiki)     → assigned DMs (full ownership)
World wiki                → admin only
Map configuration         → admin only
```

**Map interaction:**
```
World map = image with SVG/coordinate region overlays
Click region → opens region wiki/info panel
No external mapping library — coordinate-based click zones
Expandable to full GIS later without schema changes
```

**Region quest history:**
```
No separate table — quests already have regionId
Region history = Quest WHERE regionId=X AND status=APPROVED
Filtered views: available | ongoing | completed
```

**Settings:**
```
world.activeWorldId    // featured world on frontend
```

**Resources:**
```
World        navVisibility: ALL
Region       navVisibility: ANY   (DMs manage own, players view)
WorldWiki    navVisibility: ALL
RegionWiki   navVisibility: ANY
```

---

### 8. Discord Integration

**Schema:** `discord`

**Purpose:** Notification and interaction layer. Platform is primary — Discord mirrors and extends it. Bot runs as a separate persistent process in the monorepo.

**Models:**
```prisma
DiscordChannelConfig {
  id
  feature     // QUEST | MARKETPLACE | CHARACTER | GENERAL | DM
  channelId
  isActive
}

DiscordMessage {
  id
  feature     // QUEST | MARKETPLACE | CHARACTER
  featureId   // UUID — references the platform entity
  channelId
  messageId   // Discord message snowflake ID
  createdAt, updatedAt
}
```

**Discord account linking:**
```
— handled by better-auth Discord OAuth social provider
— no separate DiscordLink table (uses auth.Account)
— auth.Account.providerId = 'discord'
— auth.Account.accountId = Discord user ID
— mandatory for all players
```

**Discord OAuth config in createAuth:**
```typescript
socialProviders: {
  discord: {
    clientId:     env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
  }
}
```

**Per-feature Discord surface:**

| Feature | Commands | Notifications |
|---|---|---|
| Characters | `/characters`, `/character [name]` | Status change, level-up available |
| Quests | `/quests`, `/quest [name]`, `/signup`, `/withdraw` | Published, approved, rejected, edited, cancelled, completed |
| Marketplace | `/shop`, `/buy [item] [character]` | Transaction submitted, approved, rejected |
| DM Hub | `/dm quests`, `/dm quest [name]` | New signup, rating received |

**Command permission:**
```
All commands → check auth.Account WHERE providerId='discord' AND accountId=discordUserId
Unlinked user → "Please link your account at [platform url]"
```

**Message update pattern:**
```
1. Look up DiscordMessage WHERE feature=X AND featureId=Y
2. Edit message via Discord API using stored messageId
3. If deleted on Discord → catch error, create new, update record
```

**Settings:**
```
discord.enabled              // master switch
discord.guildId
discord.botToken             // isSecret: true
discord.clientId
discord.clientSecret         // isSecret: true
discord.questChannelId
discord.marketplaceChannelId
discord.generalChannelId
discord.dmChannelId
```

**Resources:**
```
DiscordConfig    navVisibility: ALL
```

---

## Token System

Tokens are a second platform currency alongside gold.

```
Stored on Character:  totalTokens
Transaction type:     TOKEN (in CharacterTransaction)
Awarded via:          Rewards Engine (TOKEN reward type)
```

Token shop (future feature) — will allow spending tokens on:
- Character modifications
- Additional character slots
- XP boosts
- Other platform perks

For now: tracked as a balance, awarded by rewards, no spending mechanism yet.

---

## Key Architectural Decisions

### Currency adjustments are always transactional
`adjustCurrency` validates the new value won't go below 0, updates the character field, creates a `CharacterTransaction` with `sourceType: ADMIN`, and logs to the audit trail. A note is required. This ensures all XP/Gold/Token changes are traceable and don't conflict with automatic quest rewards (which also create transactions via the same pipeline).

### Character slot management lives at /characters/slots
Slots are a Character Hub concept — not a platform concept (not in /users) and not a per-character concept (not in /characters/[id]). The dedicated /characters/slots page shows all users with their slot summary and allows inline grants per user. `getAllSlotInfo` loads all users in a single pass sharing the `resolveGrantorNames` helper with `getSlotInfo`.

### Characters are never deleted by workflow
`rejectCharacter` checks `statusReason` to determine behaviour:
- `LEVEL_UP_PENDING` → revert to `ACTIVE` (character survives, class allocation discarded)
- New character rejection → set `REJECTED` status (character stays in DB for audit trail)

Admin can manually delete characters from the admin panel as a deliberate action. No automated workflow deletes character records — this protects data integrity and audit history.

### Cross-schema Prisma relations require explicit naming
`CharacterClass` references `Class` and `Subclass` from the `gamesystem` schema. Prisma supports cross-schema relations but requires explicit relation field names (`classRef`, `subclassRef`) and back-relations on both sides. The `@ignore` attribute on back-relations breaks type generation — both sides must be present without `@ignore`. The `db:generate` command must use `--schema=./prisma` explicitly to avoid using a cached schema.

### `GameSystemWithDetails` explicit return type
`getGameSystemById` exports a `GameSystemWithDetails` type using `Prisma.GameSystemGetPayload<{ include: typeof gameSystemInclude }>` with a `satisfies Prisma.GameSystemInclude` const. This ensures SvelteKit's type generator correctly infers `species` and other included relations in `PageData`.

### SUPERADMIN permission bypass
SUPERADMIN role bypasses the permission check engine entirely — no explicit permission grants needed in the roles table. `getUserPermissions` detects the SUPERADMIN role and returns a sentinel map (`__SUPERADMIN__`). `checkPermission` and `canNavigate` detect the sentinel and return `ALL` / `true` for every resource. This means:
- New features automatically work for SUPERADMIN with zero configuration
- No seed updates needed when adding features
- No explicit permission grants needed in the roles table
- The security guard on self-demotion and last-admin deletion remains intact

### Feature isolation
Features are interconnected but not blended. Each feature owns its schema and data. Cross-feature communication happens through well-defined references (foreign keys, service calls) not shared tables.

### Settings split
```
Core settings (/settings)        — smtp.*, email.*, site.*
Feature settings (/[feature]/settings) — [feature].*
Same platform.Setting table, grouped by prefix
```

### Rewards are a push into characters
Rewards don't have their own state — they are processed and pushed into character data (CharacterTransaction, CharacterInventory, CharacterSlotGrant). The rewards schema defines what rewards exist; the execution creates character records.

### Marketplace is strictly transactional
Item catalogue in marketplace schema. Inventory in characters schema. Rewarded items = marketplace transaction at cost 0. The marketplace processes the transaction regardless of cost.

### Discord uses better-auth OAuth
No separate DiscordLink table. `auth.Account` with `providerId='discord'` is the link. Bot reads `auth.Account` to resolve Discord ID → platform user.

### GameSystem is a plugin
Adding a new game system is purely a data operation — no code changes needed. Classes, subclasses and progression thresholds are admin-managed catalogue data.

### Character level is calculated, not set
`totalLevel` = highest ProgressionThreshold where `character.totalXp >= threshold.xpRequired`. Player allocates class levels up to this total. Unallocated levels → character RESTING (LEVEL_UP_PENDING).

### Region content vs region existence
Admin creates and assigns regions. DMs manage content within assigned regions. DMs cannot create, delete, or reassign regions.

### DM role revocation = freeze
When DM role revoked: `DMProfile.isActive = false`. All quests and region assignments frozen. Admin manually resolves. No automated data mutation.

### Multiple worlds as tenants
World is a container for map and global lore. Quests reference regions which reference worlds. Platform supports multiple active worlds simultaneously.

---

## Progress Tracker

### Core Platform ✅
- [x] RBAC engine with navVisibility
- [x] Permission cache with invalidation
- [x] Audit trail on all writes
- [x] Users, roles, permissions CRUD
- [x] Email flows (welcome, reset, verification, email change)
- [x] Runtime settings (SMTP, site config)
- [x] Admin mobile-responsive sidebar
- [x] Frontend: signup, login, profile (name, avatar, discord, mobile)
- [x] Frontend: password change, email change
- [x] Component CSS split into logical files

### Feature Modules ⬜
- [x] GameSystem feature (admin CRUD for systems, classes, subclasses, progression)
- [ ] Character Hub
- [ ] DM Hub
- [ ] Quest System
- [ ] Rewards Engine
- [ ] Marketplace
- [ ] World System
- [ ] Discord integration

---

## Open Questions

None currently — all architectural decisions resolved.
Add new questions here as they arise during implementation.