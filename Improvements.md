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

## Discord
    - Discord server scope was hardcoded to global — FIXED (scope selector on add + inline scope change on existing)
    - CHAR_APPROVED never enqueued — FIXED
    - No pending/approval notifications — FIXED (CHAR_PENDING, QUEST_PENDING_APPROVAL, QUEST_RESULT_PENDING, MARKET_PENDING)
    - No world routing on character/market notifications — FIXED
    - Inconsistent siteUrl links on quest notifications — FIXED
    - APPROVALS channel type missing from schema — FIXED (requires db:push)