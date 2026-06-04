# Marches — Feature Specifications (Part 2)

### 7. Notification System ✅

**Schema:** `platform` (Notification model added to existing schema)

**Model:**
```
Notification — userId, type, title, message, actionUrl, isRead, createdAt
               @@index([userId, isRead])
```

**Triggers — fires on:**
| Event | Notified |
|---|---|
| Character submitted (create) | All SUPERADMIN users |
| Character approved/rejected | Player (character owner) |
| Quest submitted for approval | All SUPERADMIN users |
| Quest approved | DM |
| Quest rejected | DM |
| Quest result submitted | All SUPERADMIN users |
| Quest result approved | DM |
| Quest result rejected | DM |
| DM role request submitted | All SUPERADMIN users |
| Marketplace purchase created | All SUPERADMIN users |
| Marketplace purchase approved | Player |
| Marketplace purchase rejected | Player |

**UI:**
- Bell icon with red unread count badge in admin Header and frontend nav
- Click bell → dropdown panel shows unread notifications
- Unread items highlighted with accent left border
- Click notification → POST to `/notifications?id=X&to=URL&/read` → marks read + redirects to actionUrl
- "Mark all read" button in panel header
- Panel closes on outside click via `use:clickOutside` action

**Admin routes:** `(app)/notifications/+page.server.ts` (actions only, +page.svelte redirects to /)
**Frontend routes:** `(protected)/notifications/+page.server.ts` (actions only, +page.svelte redirects to /)

**Key decisions:**
- Notifications loaded on every page load (no polling/SSE) — acceptable for this use case
- `createNotificationsForAdmins` queries SUPERADMIN role users at runtime
- `use:clickOutside` action used instead of `svelte:window onclick` due to Svelte 5 type constraints
- Notification action URLs use `?id=X&to=URL&/read` format (SvelteKit named action with query params before action name)
- Both apps share `NotificationBell` component from `@core/ui`

---


### 8. Quest Completion Workflow ✅

**Triggered by:** Admin approving a quest result (`approveQuestResult`)

**Per participating character:**
1. XP awarded → `CharacterTransaction(XP)` + `character.totalXp` incremented
2. Gold awarded → `CharacterTransaction(GOLD)` + `character.totalGold` incremented
3. Tokens awarded → `CharacterTransaction(TOKEN)` + `character.totalTokens` incremented
4. `character.restUntil` set to `now + character.restDays` days
5. Level-up detection: compare new XP against `ProgressionThreshold` for character's game system
   - Crossed threshold → status `LEVEL_UP_PENDING` + `LEVEL_UP` notification to player
   - Not crossed → status `RESTING` + `QUEST_COMPLETE` notification to player
6. `CharacterTransaction(STATUS)` written with rest end date

**DM Rating:**
- Players can rate DM 1-5 stars + optional comment on completed quests they participated in
- Gated by `dm.ratingsEnabled` setting — hidden everywhere when disabled
- DMs cannot rate their own quests
- DM sees all ratings on their quest detail page (anonymous — no player name shown)
- DM sees aggregate ratings on their profile page
- Admin sees full ratings table on DM admin page with quest title + average
- Stored in `dms.dm_ratings` — supports future stats: filter by dmProfileId + quest main DM

**Sign-up enforcement:**
- Character level (sum of `allocatedLevel` across classes) must be within quest min/max
- Enforced in `quests.signup()` dbapi before creating the signup record

---


### 9. Rewards Engine ✅

**Schema:** `rewards`

**Models:** Achievement, CharacterAchievement

---


### 10. Discord Integration ✅

**Schema:** `discord`

**See:** Discord Setup Guide section.

---


### 11–13. Statistics, Availability, News/Journal ✅

See previous session notes / implemented features.

---


### 14. GameSystem Refactor ✅

See GameSystem section (§1) above — full dnd5e schema and import details.

---


### 15. Character System Expansion ✅

See Character Hub section (§2) above — full details of new fields, edit workflow, character sheet.

---


### 16. Frontend Navigation Redesign ✅

**Structure:** Top nav with 3 hover-dropdown groups + standalone DM Hub link + right-side actions unchanged.

```
Adventure:  Characters, Quests, World, Journal, Statistics
Campaign:   Availability, Marketplace
Community:  News
[DM Hub | Become a DM]  — standalone, checks hasDMProfile
[Notifications bell] [Profile] [Sign out]
```

**Implementation:**
- Groups use CSS hover-based dropdowns (`.nav-group`, `.nav-group__trigger`, `.nav-group__menu`)
- Nav links centered via `position: absolute; left: 50%; transform: translateX(-50%)` on `.nav-bar__links`
- `.nav-bar` uses `position: relative` to anchor the absolute centering
- Active group trigger highlighted when any child route is current (`groupActive()` helper)
- Invisible `::after` pseudo-element bridges gap between trigger and menu to prevent premature close
- `padding-top` on `.nav-group__menu` adds extra hover area
- Mobile hamburger expands full menu with group section headers (`.nav-mobile__group-title` in `nav-mobile.css`)
- All dropdown CSS in `shared/ui/styles/components/site.css`
- Mobile group titles in `shared/ui/styles/components/nav-mobile.css`

---


### 20–22. World Marketplace ✅ (session 15–16)

**Schema additions:**
```
WorldMarketplaceItem     — worldId, itemId, stock Int?, isAvailable Boolean?, priceOverride Int?
                           @@unique([worldId, itemId])
WorldMarketplaceSetting  — worldId @@unique, sellPricePercent Int?, stockEnabled Boolean?,
                           levelRestrictions Json?
MarketplaceTransaction   — add worldId String?
CharacterInventory       — add worldId String?
```

**Resolution hierarchy (3 layers, null = fall through):**
```
WorldMarketplaceItem.priceOverride  → MarketplaceItem.buyPrice
WorldMarketplaceItem.stock          → MarketplaceItem.stock
WorldMarketplaceItem.isAvailable    → MarketplaceItem.isAvailable
WorldMarketplaceSetting.*           → platform.Setting (marketplace.*)
```

**Resolution helper:** `resolveMarketplaceContext(itemId, worldId?)` — returns effective price,
stock, availability, sell%, levelRestrictions. All workflows call this, no duplication.

**Buy workflow:**
1. `createBuyTransaction` — resolve context, check world level restrictions, check world stock, use world price
2. `approveTransaction(buy)` — decrement stock on WorldMarketplaceItem row (or global), tag CharacterInventory.worldId

**Sell workflow:**
1. `createSellTransaction` — resolve sell% from inventory.worldId context
2. `approveTransaction(sell)` — restore stock to origin row (inventory.worldId)

**Admin removal:** restore stock to origin row (inventory.worldId), tag marketplace transaction with worldId

**Global character (worldId=null):** always falls back to global catalogue and settings

**Frontend marketplace:** world filter (persistent URL param), items priced/filtered by world context

**Admin world pages:** new Marketplace section under each world — manage WorldMarketplaceItem rows
(add from catalogue, set stock/price/availability) + WorldMarketplaceSetting (sell%, restrictions)

**Stock origin rule:** stock always restored to where it was bought (inventory.worldId). Never cross-world.


---