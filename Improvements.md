### Improvements and BUGS TO BE FIXED ###

# Platform

# RBAC

# Database

# UI - Non Specific to Features
    - Mobile: Tables all over the app break on mobile — FIXED (table-wrap class + min-width:0 on .sections grid children)
    - Mobile: Flex rows without flex-wrap — FIXED (added flex-wrap:wrap to all inline flex rows)

# Feature Specific
## Availability
    - Frontend:
        - Mobile: tooltip with availability button placed outside viewport — FIXED (flip below cell when near top of screen)

## Characters
    - Frontend:
        - New character creation missing world selector — FIXED
        - DM Hub character detail does not list character features and their details — FIXED
        - Deleted characters show raw UUID instead of name in quest rewards table, signups list, and other references — need graceful fallback (e.g. "Deleted character")

    - Admin:

## Navigation
    - Frontend:

    - Admin:

## Gamesystem

## World
    - Admin/Frontend:
        - World item overrides table breaks on mobile — FIXED (table-wrap + layout.css min-width:0)

## Quests
    - Frontend:
        - Completed quests still show edit/signup UI — FIXED (isReadOnly fieldset + status guard on signup action)
        - Player quest signup button showing for non-PUBLISHED quests — FIXED

## Journal
    - Frontend:
        - Sidebar overlays menu on mobile — FIXED (z-index:200, backdrop, padding-top for nav clearance)

## Import/Export
    - Marketplace import stored NaN for non-numeric weight values — FIXED (sanitize on import, handle on export)

## Discord
    - Discord server scope was hardcoded to global — FIXED (scope selector on add + inline scope change on existing)
    - CHAR_APPROVED never enqueued — FIXED
    - No pending/approval notifications — FIXED (CHAR_PENDING, QUEST_PENDING_APPROVAL, QUEST_RESULT_PENDING, MARKET_PENDING)
    - No world routing on character/market notifications — FIXED
    - Inconsistent siteUrl links on quest notifications — FIXED
    - APPROVALS channel type missing from schema — FIXED (requires db:push)

## Notifications
- DMs receive some in-app notifications with wrong links (admin paths) because they come from `createNotificationsForAdmins`.
  Solution: add `createNotificationsForWorldDMs(worldId, type, title, body, link)` to `notifications.ts` — sends to all DMs with management capability for the given world with correct `/dm/worlds/[worldId]/...` paths.
  For each relevant event, fire BOTH channels for DMs:
  - `createNotificationsForWorldDMs(worldId, ...)` — in-app bell notification with DM path
  - `queueDiscordNotification(...)` to world APPROVALS channel — already wired, keep as-is
  Affected write functions: character create (pending approval), quests/update-status (pending approval, result pending), marketplace/transactions (purchase/sell pending).

## Quest Approval
- No self-approval guard on quest approval. A DM with `canManage` can approve their own quest. Need to check that the quest's `dmProfileId` does not belong to the approving user before allowing `PENDING_APPROVAL → PUBLISHED`. Fix in `dm/worlds/[worldId]/quests/+page.server.ts` approve action — fetch the quest, compare `quest.dmProfileId` against the current user's DM profile id, reject with 403 if they match.

## World DM Permissions
- Quest approval requires `canManage = true` on the WorldDM assignment. DMs with "Quest only" access cannot approve quests — they only see "Awaiting approval". This is intentional but may be confusing. Consider renaming "Quest only" / "Full access" labels to make it clearer that "Full access" includes quest approval capability. Also consider showing the DM their own permission level somewhere in the DM hub.