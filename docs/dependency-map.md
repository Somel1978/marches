# Marches — Codebase Dependency Map

> **Auto-generated** by `pnpm docs:generate-deps`. Do not edit by hand.
> Generated: 2026-07-07
> See [maintenance.md](./maintenance.md).

## DB Analytics — Analytics

### `shared/database/dbapi/analytics/get-platform-metrics.ts`
**Exports:** PlatformMetrics, getPlatformMetrics

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/analytics/get-user-growth.ts`
**Exports:** UserGrowthPoint, getUserGrowth

**Called by:**
- `shared/database/index.ts`

## DB Read — Audit

### `shared/database/dbapi/read/audit/get-logs.ts`
**Exports:** GetAuditLogsOptions, getAuditLogs

**Called by:**
- `shared/database/index.ts`

## DB Read — Availability

### `shared/database/dbapi/read/availability/get-availability.ts`
**Exports:** getAllAvailability, getAvailableUsersForQuest, getUserAvailability

**Called by:**
- `shared/database/index.ts`

## DB Read — Characters

### `shared/database/dbapi/read/characters/get-all.ts`
**Exports:** GetAllCharactersOptions, getAllCharacters

**Called by:**
- `shared/database/dbapi/read/dms/get-all.ts`
- `shared/database/dbapi/read/gamesystem/get-all.ts`
- `shared/database/dbapi/read/quests/get-all.ts`
- `shared/database/dbapi/read/roles/get-all.ts`
- `shared/database/dbapi/read/users/get-all.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/read/characters/get-by-id.ts`
**Exports:** getCharacterById, getCharactersByUserId

**Called by:**
- `shared/database/dbapi/read/dms/get-by-id.ts`
- `shared/database/dbapi/read/gamesystem/get-by-id.ts`
- `shared/database/dbapi/read/quests/get-by-id.ts`
- `shared/database/dbapi/read/users/get-by-id.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/read/characters/get-inventory.ts`
**Exports:** getCharacterInventory

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/read/characters/get-public.ts`
**Exports:** getPublicCharacterById, getPublicCharacters

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/read/characters/get-slot-info.ts`
**Exports:** getAllSlotInfo, getSlotInfo

**Called by:**
- `apps/admin/src/routes/(app)/characters/slots/+page.server.ts`
- `apps/frontend/src/routes/(protected)/characters/+page.server.ts`
- `apps/frontend/src/routes/(protected)/characters/new/+page.server.ts`
- `apps/frontend/src/routes/(protected)/characters/new/dnd5e/+page.server.ts`
- `shared/database/dbapi/write/characters/create.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/read/characters/get-transactions.ts`
**Exports:** getCharacterTransactions

**Called by:**
- `shared/database/dbapi/read/marketplace/get-transactions.ts`
- `shared/database/index.ts`

## DB Read — Discord

### `shared/database/dbapi/read/discord/get-servers.ts`
**Exports:** getAllDiscordServers, getChannelForType, getChannelsForType, getDiscordServerByScope, getPendingNotifications, markNotificationProcessed

**Called by:**
- `shared/database/index.ts`

## DB Read — Dms

### `shared/database/dbapi/read/dms/get-all.ts`
**Exports:** getAllDMProfiles, getAllRoleRequests

**Called by:**
- `shared/database/dbapi/read/characters/get-all.ts`
- `shared/database/dbapi/read/gamesystem/get-all.ts`
- `shared/database/dbapi/read/quests/get-all.ts`
- `shared/database/dbapi/read/roles/get-all.ts`
- `shared/database/dbapi/read/users/get-all.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/read/dms/get-by-id.ts`
**Exports:** getDMProfileById, getDMProfileByUserId, getLatestRoleRequestByUser, getPendingRoleRequestByUser

**Called by:**
- `shared/database/dbapi/read/characters/get-by-id.ts`
- `shared/database/dbapi/read/gamesystem/get-by-id.ts`
- `shared/database/dbapi/read/quests/get-by-id.ts`
- `shared/database/dbapi/read/users/get-by-id.ts`
- `shared/database/index.ts`

## DB Read — Dnd5e

### `shared/database/dbapi/read/dnd5e/enrich-signups.ts`
**Exports:** enrichDnd5eSignups

**Called by:**
- `shared/database/dbapi/read/quests/get-by-id.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/read/dnd5e/feature-names.ts`
**Exports:** isAsiFeatureName, isEpicBoonFeatureName, normalizeFeatureName

**Called by:**
- `shared/database/dbapi/read/dnd5e/get-character-sheet.ts`
- `shared/database/index.ts`
- `shared/database/scripts/check-dnd5e-sync.ts`
- `shared/ui/src/gamesystems/dnd5e/Dnd5eAsiFeatsPanel.svelte`
- `shared/ui/src/gamesystems/dnd5e/feature-names.ts`

### `shared/database/dbapi/read/dnd5e/get-character-sheet.ts`
**Exports:** getDnd5eCharacterSheet

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/read/dnd5e/get-classes.ts`
**Exports:** getAllDnd5eBackgrounds, getAllDnd5eClasses, getAllDnd5eSpecies, getDnd5eBackgrounds, getDnd5eClassById, getDnd5eClasses, getDnd5eSpecies, getDnd5eSystemData, invalidateDnd5eSystemDataCache

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/read/dnd5e/get-feats.ts`
**Exports:** getAllDnd5eFeats, getDnd5eFeatById, getDnd5eFeats

**Called by:**
- `shared/database/dbapi/read/dnd5e/get-classes.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/read/dnd5e/get-score-audit.ts`
**Exports:** getScoreAuditForCharacter, getScoreAuditForStat

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/read/dnd5e/get-spells.ts`
**Exports:** getAllDnd5eSpells, getDnd5eSpellById, getDnd5eSpellSlotProgressionByClass, getDnd5eSpellSlotProgressions, getDnd5eSpellbooks, getDnd5eSpellsForCharacter, getDnd5eSpellsKnownProgressionByClass, getDnd5eSpellsKnownProgressions

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/read/dnd5e/skills.ts`
**Exports:** ALL_SKILLS, ALL_STATS, SKILL_ABILITY, abilityModifier, proficiencyBonus

**Called by:**
- `apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/backgrounds/+page.svelte`
- `apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/FeatNestedPoolsInline.svelte`
- `apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/StepBackground.svelte`
- `apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/StepClasses.svelte`
- `apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/StepReview.svelte`
- `apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/StepSpecies.svelte`
- `shared/database/dbapi/read/dnd5e/get-character-sheet.ts`
- `shared/database/dbapi/write/dnd5e/skills.ts`
- `shared/database/dbapi/write/dnd5e/tools-languages.ts`
- `shared/database/index.ts`
- `shared/database/scripts/check-dnd5e-sync.ts`
- `shared/ui/src/gamesystems/dnd5e/Dnd5eCharacterDetails.svelte`
- `shared/ui/src/gamesystems/dnd5e/MoodEditor.svelte`
- `shared/ui/src/gamesystems/dnd5e/skills.ts`

## DB Read — Factions

### `shared/database/dbapi/read/factions/get-factions.ts`
**Exports:** GetFactionsOptions, getFactionById, getFactionBySlug, getFactionRenownForCharacter, getFactionsByWorld

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/read/factions/get-npcs.ts`
**Exports:** GetNpcsOptions, getNpcById, getNpcsByWorld, getPublicNpcs

**Called by:**
- `shared/database/index.ts`

## DB Read — Gamesystem

### `shared/database/dbapi/read/gamesystem/get-all.ts`
**Exports:** getActiveGameSystems, getAllGameSystems

**Called by:**
- `shared/database/dbapi/read/characters/get-all.ts`
- `shared/database/dbapi/read/dms/get-all.ts`
- `shared/database/dbapi/read/quests/get-all.ts`
- `shared/database/dbapi/read/roles/get-all.ts`
- `shared/database/dbapi/read/users/get-all.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/read/gamesystem/get-by-id.ts`
**Exports:** getGameSystemById

**Called by:**
- `shared/database/dbapi/read/characters/get-by-id.ts`
- `shared/database/dbapi/read/dms/get-by-id.ts`
- `shared/database/dbapi/read/quests/get-by-id.ts`
- `shared/database/dbapi/read/users/get-by-id.ts`
- `shared/database/index.ts`

## DB Read — Marketplace

### `shared/database/dbapi/read/marketplace/get-items.ts`
**Exports:** GetItemsOptions, getAllMarketplaceItemsForExport, getMarketplaceItemById, getMarketplaceItemByName, getMarketplaceItems, searchMarketplaceItems

**Called by:**
- `shared/database/dbapi/read/token-store/get-items.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/read/marketplace/get-transactions.ts`
**Exports:** getMarketplaceTransactions

**Called by:**
- `shared/database/dbapi/read/characters/get-transactions.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/read/marketplace/get-world-marketplace.ts`
**Exports:** getWorldMarketplaceItems, getWorldMarketplaceSetting

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/read/marketplace/resolve-context.ts`
**Exports:** MarketplaceContext, resolveMarketplaceContext

**Called by:**
- `shared/database/dbapi/write/marketplace/transactions.ts`
- `shared/database/index.ts`

## DB Read — News

### `shared/database/dbapi/read/news/get-news.ts`
**Exports:** getAllAnnouncements, getAllJournals, getAnnouncementById, getAnnouncements, getJournalPage, getJournalsForUser

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/read/news/get-wiki.ts`
**Exports:** getAllWikis, getWikiById, getWikiPageById, getWikis

**Called by:**
- `shared/database/dbapi/read/news/get-news.ts`
- `shared/database/dbapi/read/world/get-wiki.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/read/news/get-world-journals.ts`
**Exports:** UserContext, getAllWorldJournals, getWorldJournalPage, getWorldJournals

**Called by:**
- `shared/database/dbapi/read/news/get-news.ts`
- `shared/database/dbapi/read/news/get-wiki.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/read/news/resolve-enrichers.ts`
**Exports:** EnricherToken, resolveEnrichers, searchEnrichablesbyName

**Called by:**
- `shared/database/index.ts`

## DB Read — Notifications

### `shared/database/dbapi/read/notifications/get-notifications.ts`
**Exports:** getNotifications, getUnreadNotifications

**Called by:**
- `shared/database/index.ts`

## DB Read — Platform

### `shared/database/dbapi/read/platform/get-resources.ts`
**Exports:** getResourceNames, getResourceNavVisibility, getResources

**Called by:**
- `apps/admin/src/routes/(app)/audit/+page.server.ts`
- `apps/admin/src/routes/(app)/roles/[id]/+page.server.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/read/platform/get-settings.ts`
**Exports:** SettingRow, getSettings, getSettingsMap

**Called by:**
- `apps/admin/src/routes/(app)/+layout.server.ts`
- `apps/admin/src/routes/(app)/characters/settings/+page.server.ts`
- `apps/admin/src/routes/(app)/discord/+page.server.ts`
- `apps/admin/src/routes/(app)/dms/settings/+page.server.ts`
- `apps/admin/src/routes/(app)/marketplace/settings/+page.server.ts`
- `apps/admin/src/routes/(app)/quests/settings/+page.server.ts`
- `apps/admin/src/routes/(app)/settings/+page.server.ts`
- `apps/admin/src/routes/(app)/world/settings/+page.server.ts`
- `apps/admin/src/routes/+layout.server.ts`
- `apps/admin/src/routes/api/discord/+server.ts`
- `apps/admin/src/routes/api/discord/channels/+server.ts`
- `apps/discord/src/commands/buyitem.ts`
- `apps/discord/src/commands/cancelsignup.ts`
- `apps/discord/src/commands/characters.ts`
- `apps/discord/src/commands/charactersinv.ts`
- `apps/discord/src/commands/quest.ts`
- `apps/discord/src/commands/quests.ts`
- `apps/discord/src/commands/sellitem.ts`
- `apps/discord/src/commands/signup.ts`
- `apps/discord/src/index.ts`
- `apps/discord/src/interaction-handler.ts`
- `apps/discord/src/notifications/dispatcher.ts`
- `apps/frontend/src/routes/(protected)/characters/[id]/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/quests/[id]/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/quests/new/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/quests/new/+page.server.ts`
- `apps/frontend/src/routes/(protected)/quests/+page.server.ts`
- `apps/frontend/src/routes/(protected)/quests/[id]/+page.server.ts`
- `apps/frontend/src/routes/(protected)/world/[worldSlug]/+page.server.ts`
- `apps/frontend/src/routes/(protected)/world/[worldSlug]/[regionSlug]/+page.server.ts`
- `apps/frontend/src/routes/(protected)/world/[worldSlug]/[regionSlug]/[locationSlug]/+page.server.ts`
- `apps/frontend/src/routes/+layout.server.ts`
- `apps/frontend/src/routes/auth/discord/+server.ts`
- `apps/frontend/src/routes/auth/discord/callback/+server.ts`
- `shared/database/dbapi/read/characters/get-slot-info.ts`
- `shared/database/dbapi/read/marketplace/resolve-context.ts`
- `shared/database/dbapi/write/characters/create.ts`
- `shared/database/dbapi/write/characters/update-status.ts`
- `shared/database/dbapi/write/quests/create.ts`
- `shared/database/dbapi/write/quests/submit-result.ts`
- `shared/database/dbapi/write/quests/update.ts`
- `shared/database/index.ts`
- `shared/email/client.ts`

## DB Read — Quests

### `shared/database/dbapi/read/quests/get-all.ts`
**Exports:** GetAllQuestsOptions, getAllQuests

**Called by:**
- `shared/database/dbapi/read/characters/get-all.ts`
- `shared/database/dbapi/read/dms/get-all.ts`
- `shared/database/dbapi/read/gamesystem/get-all.ts`
- `shared/database/dbapi/read/roles/get-all.ts`
- `shared/database/dbapi/read/users/get-all.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/read/quests/get-by-id.ts`
**Exports:** getQuestById, getQuestResultWithCharacters, getQuestsByDM

**Called by:**
- `shared/database/dbapi/read/characters/get-by-id.ts`
- `shared/database/dbapi/read/dms/get-by-id.ts`
- `shared/database/dbapi/read/gamesystem/get-by-id.ts`
- `shared/database/dbapi/read/users/get-by-id.ts`
- `shared/database/index.ts`

## DB Read — Rewards

### `shared/database/dbapi/read/rewards/get-achievements.ts`
**Exports:** getAllAchievements, getCharacterAchievements

**Called by:**
- `shared/database/index.ts`

## DB Read — Roles

### `shared/database/dbapi/read/roles/get-all.ts`
**Exports:** getAll

**Called by:**
- `shared/database/dbapi/read/characters/get-all.ts`
- `shared/database/dbapi/read/dms/get-all.ts`
- `shared/database/dbapi/read/gamesystem/get-all.ts`
- `shared/database/dbapi/read/quests/get-all.ts`
- `shared/database/dbapi/read/users/get-all.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/read/roles/get-with-permissions.ts`
**Exports:** getAllWithPermissions, getWithPermissions

**Called by:**
- `apps/admin/src/routes/(app)/roles/[id]/+page.server.ts`
- `shared/database/index.ts`

## DB Read — Stats

### `shared/database/dbapi/read/stats/get-stats.ts`
**Exports:** getPlatformStats, getPublicStats, getUserStats

**Called by:**
- `shared/database/index.ts`

## DB Read — Tavern

### `shared/database/dbapi/read/tavern/get-channels.ts`
**Exports:** getGlobalTavernChannel, getTavernChannel, getTavernChannelByWorldId, getTavernChannels, getTavernMessages

**Called by:**
- `shared/database/index.ts`

## DB Read — Token Store

### `shared/database/dbapi/read/token-store/get-items.ts`
**Exports:** getActiveBoostsForCharacter, getAllTokenStoreItemsForExport, getTokenStoreItemById, getTokenStoreItems, getTokenStoreTransactionById, getTokenStoreTransactions

**Called by:**
- `shared/database/dbapi/read/marketplace/get-items.ts`
- `shared/database/index.ts`

## DB Read — Users

### `shared/database/dbapi/read/users/get-all.ts`
**Exports:** GetAllUsersOptions, getAll

**Called by:**
- `shared/database/dbapi/read/characters/get-all.ts`
- `shared/database/dbapi/read/dms/get-all.ts`
- `shared/database/dbapi/read/gamesystem/get-all.ts`
- `shared/database/dbapi/read/quests/get-all.ts`
- `shared/database/dbapi/read/roles/get-all.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/read/users/get-by-id.ts`
**Exports:** getById, getUserByDiscordId, getUserRoleIds

**Called by:**
- `apps/discord/src/interaction-handler.ts`
- `shared/database/dbapi/read/characters/get-by-id.ts`
- `shared/database/dbapi/read/dms/get-by-id.ts`
- `shared/database/dbapi/read/gamesystem/get-by-id.ts`
- `shared/database/dbapi/read/quests/get-by-id.ts`
- `shared/database/index.ts`

## DB Read — World

### `shared/database/dbapi/read/world/get-regions.ts`
**Exports:** getLocationBySlug, getRegionById, getRegionBySlug

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/read/world/get-wiki.ts`
**Exports:** getWikiPage

**Called by:**
- `shared/database/dbapi/read/news/get-wiki.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/read/world/get-worlds.ts`
**Exports:** getAllWorlds, getWorldById, getWorldBySlug, getWorldsByDMProfile

**Called by:**
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/quests/new/+page.server.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/read/world/get-neural-map.ts`
**Exports:** getNeuralMap, listNeuralCandidates, HydratedNeuralNode, HydratedNeuralEdge, NeuralCandidate

**Called by:**
- `shared/database/index.ts` (`worlds.neural`)
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/neural/+page.server.ts`
- `apps/admin/src/routes/(app)/world/[id]/neural/+page.server.ts`

### `shared/database/dbapi/write/world/neural-map.ts`
**Exports:** addNeuralNode, updateNeuralNode, removeNeuralNode, addNeuralEdge, updateNeuralEdge, removeNeuralEdge

**Called by:**
- `shared/database/index.ts` (`worlds.neural`)
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/neural/+page.server.ts`
- `apps/admin/src/routes/(app)/world/[id]/neural/+page.server.ts`

### `shared/database/dbapi/read/world/get-plot-quests.ts`
**Exports:** listPlotQuestsByWorld, getPlotQuestById, listLinkableSystemQuests

**Called by:**
- `shared/database/index.ts` (`worlds.plotQuests`)
- DM/Admin plot-quests and faction/NPC pages

### `shared/database/dbapi/write/world/plot-quests.ts`
**Exports:** createPlotQuest, updatePlotQuest, deletePlotQuest, linkSystemQuestToPlot, unlinkSystemQuestFromPlot

**Called by:**
- `shared/database/index.ts` (`worlds.plotQuests`)
- DM/Admin plot-quests detail actions

## DB Transactions — Transactions

### `shared/database/dbapi/transactions/register-user.ts`
**Exports:** RegisterUserInput, registerUser

**Called by:**
- `apps/admin/src/routes/(app)/users/new/+page.server.ts`
- `shared/database/index.ts`

## DB Write — Audit

### `shared/database/dbapi/write/audit/log.ts`
**Exports:** AuditLogInput, logAudit

**Called by:**
- `shared/database/dbapi/transactions/register-user.ts`
- `shared/database/dbapi/write/availability/slots.ts`
- `shared/database/dbapi/write/characters/adjust-currency.ts`
- `shared/database/dbapi/write/characters/approve.ts`
- `shared/database/dbapi/write/characters/create.ts`
- `shared/database/dbapi/write/characters/delete.ts`
- `shared/database/dbapi/write/characters/inventory.ts`
- `shared/database/dbapi/write/characters/slot-grant.ts`
- `shared/database/dbapi/write/characters/update-classes.ts`
- `shared/database/dbapi/write/characters/update-status.ts`
- `shared/database/dbapi/write/characters/update.ts`
- `shared/database/dbapi/write/dms/dm-profile.ts`
- `shared/database/dbapi/write/dms/role-request.ts`
- `shared/database/dbapi/write/dnd5e/classes.ts`
- `shared/database/dbapi/write/dnd5e/feats.ts`
- `shared/database/dbapi/write/dnd5e/species.ts`
- `shared/database/dbapi/write/dnd5e/update-character.ts`
- `shared/database/dbapi/write/dnd5e/update-classes.ts`
- `shared/database/dbapi/write/factions/factions.ts`
- `shared/database/dbapi/write/factions/npcs.ts`
- `shared/database/dbapi/write/factions/renown.ts`
- `shared/database/dbapi/write/gamesystem/game-system.ts`
- `shared/database/dbapi/write/gamesystem/progression.ts`
- `shared/database/dbapi/write/marketplace/import.ts`
- `shared/database/dbapi/write/marketplace/items.ts`
- `shared/database/dbapi/write/marketplace/transactions.ts`
- `shared/database/dbapi/write/news/announcements.ts`
- `shared/database/dbapi/write/news/journals.ts`
- `shared/database/dbapi/write/news/wiki.ts`
- `shared/database/dbapi/write/news/world-journals.ts`
- `shared/database/dbapi/write/quests/create.ts`
- `shared/database/dbapi/write/quests/delete.ts`
- `shared/database/dbapi/write/quests/item-usage.ts`
- `shared/database/dbapi/write/quests/signup.ts`
- `shared/database/dbapi/write/quests/submit-result.ts`
- `shared/database/dbapi/write/quests/update-status.ts`
- `shared/database/dbapi/write/quests/update.ts`
- `shared/database/dbapi/write/rewards/achievements.ts`
- `shared/database/dbapi/write/roles/create.ts`
- `shared/database/dbapi/write/roles/delete.ts`
- `shared/database/dbapi/write/roles/update-permissions.ts`
- `shared/database/dbapi/write/token-store/items.ts`
- `shared/database/dbapi/write/token-store/transactions.ts`
- `shared/database/dbapi/write/users/create.ts`
- `shared/database/dbapi/write/users/delete.ts`
- `shared/database/dbapi/write/users/set-password.ts`
- `shared/database/dbapi/write/users/update.ts`
- `shared/database/dbapi/write/world/wiki.ts`
- `shared/database/dbapi/write/world/worlds.ts`

## DB Write — Availability

### `shared/database/dbapi/write/availability/slots.ts`
**Exports:** adminDeleteSlot, clearDay, clearSlot, clearSlots, setSlots

**Called by:**
- `apps/discord/src/commands/availability.ts`
- `apps/frontend/src/routes/(protected)/availability/+page.server.ts`
- `apps/frontend/src/routes/(protected)/availability/+page.svelte`
- `shared/database/index.ts`

## DB Write — Characters

### `shared/database/dbapi/write/characters/adjust-currency.ts`
**Exports:** CurrencyType, adjustCurrency

**Called by:**
- `apps/admin/src/routes/(app)/characters/[id]/+page.server.ts`
- `apps/admin/src/routes/(app)/characters/[id]/+page.svelte`
- `apps/admin/src/routes/(app)/rewards/grant/+page.server.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/characters/approve.ts`
**Exports:** approveCharacter, dispatchApproveCharacter, dispatchRejectCharacter, rejectCharacter

**Called by:**
- `shared/database/dbapi/write/characters/update-status.ts`
- `shared/database/dbapi/write/dnd5e/approve-character.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/characters/check-rest.ts`
**Exports:** checkAndClearRest, clearAllExpiredRest

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/write/characters/create.ts`
**Exports:** createCharacter

**Called by:**
- `apps/frontend/src/routes/(protected)/characters/new/dnd5e/+page.server.ts`
- `shared/database/dbapi/write/dnd5e/create-character.ts`
- `shared/database/dbapi/write/quests/create.ts`
- `shared/database/dbapi/write/roles/create.ts`
- `shared/database/dbapi/write/users/create.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/characters/delete.ts`
**Exports:** deleteCharacter

**Called by:**
- `apps/admin/src/routes/(app)/characters/[id]/+page.server.ts`
- `apps/admin/src/routes/(app)/characters/[id]/+page.svelte`
- `shared/database/dbapi/write/quests/delete.ts`
- `shared/database/dbapi/write/roles/delete.ts`
- `shared/database/dbapi/write/users/delete.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/characters/inventory.ts`
**Exports:** addToInventory, removeFromInventory

**Called by:**
- `shared/database/dbapi/read/characters/get-inventory.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/characters/level-check.ts`
**Exports:** checkLevelChange

**Called by:**
- `shared/database/dbapi/write/characters/adjust-currency.ts`
- `shared/database/dbapi/write/dnd5e/create-character.ts`
- `shared/database/dbapi/write/quests/delete.ts`
- `shared/database/dbapi/write/token-store/transactions.ts`

### `shared/database/dbapi/write/characters/slot-grant.ts`
**Exports:** grantCharacterSlot

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/write/characters/update-classes.ts`
**Exports:** ClassAllocation, updateCharacterClasses

**Called by:**
- `shared/database/dbapi/write/dnd5e/update-classes.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/characters/update-status.ts`
**Exports:** updateCharacterStatus

**Called by:**
- `shared/database/dbapi/write/quests/update-status.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/characters/update.ts`
**Exports:** updateCharacter, updateCharacterFreeFields

**Called by:**
- `apps/admin/src/routes/(app)/characters/[id]/+page.server.ts`
- `apps/admin/src/routes/(app)/characters/[id]/+page.svelte`
- `shared/database/dbapi/write/quests/update.ts`
- `shared/database/dbapi/write/users/update.ts`
- `shared/database/index.ts`

## DB Write — Discord

### `shared/database/dbapi/write/discord/dispatcher.ts`
**Exports:** queueDiscordNotification

**Called by:**
- `apps/discord/src/notifications/dispatcher.ts`
- `apps/frontend/src/routes/(protected)/tavern/+page.server.ts`
- `shared/database/dbapi/write/characters/approve.ts`
- `shared/database/dbapi/write/characters/create.ts`
- `shared/database/dbapi/write/marketplace/transactions.ts`
- `shared/database/dbapi/write/quests/submit-result.ts`
- `shared/database/dbapi/write/quests/update-status.ts`
- `shared/database/dbapi/write/token-store/transactions.ts`
- `shared/database/index.ts`
- `shared/rbac/auth.ts`

### `shared/database/dbapi/write/discord/servers.ts`
**Exports:** deleteDiscordChannel, deleteDiscordServer, upsertDiscordChannel, upsertDiscordServer

**Called by:**
- `shared/database/dbapi/read/discord/get-servers.ts`
- `shared/database/index.ts`

## DB Write — Dms

### `shared/database/dbapi/write/dms/dm-profile.ts`
**Exports:** revokeDMRole, updateDMProfile

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/write/dms/rating.ts`
**Exports:** getDMRatingForQuest, submitDMRating

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/write/dms/role-request.ts`
**Exports:** approveRoleRequest, createRoleRequest, deleteRoleRequest, rejectRoleRequest

**Called by:**
- `shared/database/index.ts`

## DB Write — Dnd5e

### `shared/database/dbapi/write/dnd5e/approve-character.ts`
**Exports:** approveDnd5eCharacter, rejectDnd5eCharacter

**Called by:**
- `shared/database/dbapi/write/characters/approve.ts`
- `shared/database/dbapi/write/dnd5e/species-trait-grants.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/dnd5e/background-feat-grant.ts`
**Exports:** syncBackgroundFeatGrant

**Called by:**
- `shared/database/dbapi/write/dnd5e/approve-character.ts`
- `shared/database/dbapi/write/dnd5e/update-character.ts`

### `shared/database/dbapi/write/dnd5e/character-details.ts`
**Exports:** CharacterDetailsInput, saveCharacterMood, saveDnd5eCharacterDetails

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/write/dnd5e/classes.ts`
**Exports:** createClassFeature, createDnd5eClass, createDnd5eSubclass, createSubclassFeature, deleteClassFeature, deleteDnd5eClass, deleteDnd5eSubclass, deleteSubclassFeature, updateClassFeature, updateClassSavingThrows, updateClassSkillPool, updateDnd5eClass, updateDnd5eSubclass, updateSubclass, updateSubclassFeature

**Called by:**
- `apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/classes/[classId]/+page.server.ts`
- `apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/classes/[classId]/+page.svelte`
- `shared/database/dbapi/read/dnd5e/get-classes.ts`
- `shared/database/dbapi/write/characters/update-classes.ts`
- `shared/database/dbapi/write/dnd5e/update-classes.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/dnd5e/create-character.ts`
**Exports:** ClassAllocationInput, Dnd5eCreateCharacterInput, createDnd5eCharacter

**Called by:**
- `shared/database/dbapi/write/dnd5e/update-character.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/dnd5e/feats.ts`
**Exports:** createDnd5eFeat, deleteDnd5eFeat, updateDnd5eFeat

**Called by:**
- `shared/database/dbapi/read/dnd5e/get-classes.ts`
- `shared/database/dbapi/read/dnd5e/get-feats.ts`
- `shared/database/dbapi/write/dnd5e/update-character-feats.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/dnd5e/innate-spells.ts`
**Exports:** InnateSpellGrant, addInnateSpellGrants, parseAndFilterInnateSpells, removeInnateSpellGrantsBySource

**Called by:**
- `apps/frontend/src/routes/(protected)/characters/new/dnd5e/+page.server.ts`
- `shared/database/dbapi/write/dnd5e/approve-character.ts`
- `shared/database/dbapi/write/dnd5e/species-trait-grants.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/dnd5e/score-audit.ts`
**Exports:** ScoreAuditInput, addScoreAuditEntries, addScoreAuditEntry, applyManualScoreAdjustment

**Called by:**
- `shared/database/dbapi/read/dnd5e/get-score-audit.ts`
- `shared/database/dbapi/write/dnd5e/update-ability-scores.ts`
- `shared/database/dbapi/write/dnd5e/update-character-feats.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/dnd5e/skills.ts`
**Exports:** SaveGrantInput, SkillGrantInput, addCharacterSavingThrowGrants, addCharacterSkillGrants, removeCharacterSavingThrowGrantsBySource, removeCharacterSkillGrantsBySource, removeOverrideSavingThrowGrant, removeOverrideSkillGrant, replaceCharacterSkillGrants, upsertDmSkillGrant, upsertOverrideSavingThrowGrant, upsertOverrideSkillGrant

**Called by:**
- `apps/admin/src/routes/(app)/characters/[id]/_sheets/dnd5e.actions.server.ts`
- `apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/backgrounds/+page.svelte`
- `apps/frontend/src/routes/(protected)/characters/[id]/_sheets/dnd5e.actions.server.ts`
- `apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/FeatNestedPoolsInline.svelte`
- `apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/StepBackground.svelte`
- `apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/StepClasses.svelte`
- `apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/StepReview.svelte`
- `apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/StepSpecies.svelte`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/_sheets/dnd5e.actions.server.ts`
- `shared/database/dbapi/read/dnd5e/get-character-sheet.ts`
- `shared/database/dbapi/read/dnd5e/skills.ts`
- `shared/database/dbapi/write/dnd5e/innate-spells.ts`
- `shared/database/dbapi/write/dnd5e/tools-languages.ts`
- `shared/database/index.ts`
- `shared/database/scripts/check-dnd5e-sync.ts`
- `shared/ui/src/gamesystems/dnd5e/Dnd5eCharacterDetails.svelte`
- `shared/ui/src/gamesystems/dnd5e/MoodEditor.svelte`
- `shared/ui/src/gamesystems/dnd5e/skills.ts`

### `shared/database/dbapi/write/dnd5e/species-trait-grants.ts`
**Exports:** syncSpeciesTraitGrants

**Called by:**
- `shared/database/dbapi/write/dnd5e/approve-character.ts`
- `shared/database/dbapi/write/dnd5e/update-character.ts`

### `shared/database/dbapi/write/dnd5e/species.ts`
**Exports:** createDnd5eBackground, createDnd5eSpecies, createSpeciesTrait, deleteDnd5eBackground, deleteDnd5eSpecies, deleteSpeciesTrait, updateDnd5eBackground, updateDnd5eSpecies, updateSpeciesTrait, updateSpeciesTraitSpeeds

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/write/dnd5e/spells.ts`
**Exports:** addSpellbookEntry, createSpellbook, deleteDnd5eSpell, deleteSpellSlotProgressionClass, deleteSpellbook, deleteSpellsKnownProgressionClass, removeSpellbookEntry, toggleSpellbookEntryPrepared, updateDnd5eSpell, updateSpellbook, upsertDnd5eSpell, upsertSpellSlotProgression, upsertSpellsKnownProgression

**Called by:**
- `apps/frontend/src/routes/(protected)/characters/[id]/+page.server.ts`
- `apps/frontend/src/routes/(protected)/characters/[id]/_sheets/Dnd5eSheetSection.svelte`
- `apps/frontend/src/routes/(protected)/characters/[id]/_sheets/dnd5e.actions.server.ts`
- `shared/database/dbapi/read/dnd5e/get-spells.ts`
- `shared/database/dbapi/write/dnd5e/approve-character.ts`
- `shared/database/dbapi/write/dnd5e/innate-spells.ts`
- `shared/database/dbapi/write/dnd5e/species-trait-grants.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/dnd5e/tools-languages.ts`
**Exports:** DamageModifierType, addCharacterDamageModifierGrants, addCharacterLanguageGrants, addCharacterToolGrants, removeCharacterDamageModifierGrantsBySource, removeCharacterLanguageGrantsBySource, removeCharacterToolGrantsBySource, removeOverrideDamageModifierGrant, removeOverrideLanguageGrant, removeOverrideToolGrant, upsertOverrideDamageModifierGrant, upsertOverrideLanguageGrant, upsertOverrideToolGrant

**Called by:**
- `apps/admin/src/routes/(app)/characters/[id]/_sheets/dnd5e.actions.server.ts`
- `apps/frontend/src/routes/(protected)/characters/[id]/_sheets/dnd5e.actions.server.ts`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/characters/[charId]/_sheets/dnd5e.actions.server.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/dnd5e/update-ability-scores.ts`
**Exports:** applyDnd5eAsiStatBump, saveDnd5eAbilityScores

**Called by:**
- `shared/database/dbapi/write/dnd5e/update-character-feats.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/dnd5e/update-character-feats.ts`
**Exports:** addDnd5eCharacterFeat, removeDnd5eCharacterFeat

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/write/dnd5e/update-character.ts`
**Exports:** submitDnd5eStructuralChanges, updateDnd5eCharacterFields

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/write/dnd5e/update-classes.ts`
**Exports:** ClassAllocation, updateDnd5eCharacterClasses

**Called by:**
- `shared/database/dbapi/write/characters/update-classes.ts`
- `shared/database/index.ts`

## DB Write — Factions

### `shared/database/dbapi/write/factions/factions.ts`
**Exports:** FactionInput, addFactionQuest, addFactionTerritory, createFaction, createFactionRank, deleteFaction, deleteFactionRank, removeFactionQuest, removeFactionRelation, removeFactionTerritory, setFactionRelation, updateFaction, updateFactionRank

**Called by:**
- `shared/database/dbapi/read/factions/get-factions.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/factions/npcs.ts`
**Exports:** NpcInput, addNpcQuest, createNpc, deleteNpc, removeNpcQuest, updateNpc

**Called by:**
- `shared/database/dbapi/read/factions/get-npcs.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/factions/renown.ts`
**Exports:** removeFactionRenown, setFactionRenown

**Called by:**
- `shared/database/index.ts`

## DB Write — Gamesystem

### `shared/database/dbapi/write/gamesystem/game-system.ts`
**Exports:** createGameSystem, deleteGameSystem, updateGameSystem

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/write/gamesystem/progression.ts`
**Exports:** createProgressionThreshold, deleteProgressionThreshold, updateProgressionThreshold

**Called by:**
- `shared/database/index.ts`

## DB Write — Marketplace

### `shared/database/dbapi/write/marketplace/import.ts`
**Exports:** ImportRow, importMarketplaceItems

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/write/marketplace/items.ts`
**Exports:** deleteMarketplaceItem, updateMarketplaceItem, upsertMarketplaceItem

**Called by:**
- `shared/database/dbapi/read/marketplace/get-items.ts`
- `shared/database/dbapi/read/token-store/get-items.ts`
- `shared/database/dbapi/write/token-store/items.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/marketplace/transactions.ts`
**Exports:** approveTransaction, cancelTransaction, createBuyTransaction, createSellTransaction, grantRewardItem, rejectTransaction

**Called by:**
- `apps/frontend/src/routes/(protected)/marketplace/[id]/+page.server.ts`
- `shared/database/dbapi/read/characters/get-transactions.ts`
- `shared/database/dbapi/read/marketplace/get-transactions.ts`
- `shared/database/dbapi/write/token-store/transactions.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/marketplace/world-marketplace.ts`
**Exports:** deleteWorldMarketplaceItem, upsertWorldMarketplaceItem, upsertWorldMarketplaceSetting

**Called by:**
- `shared/database/dbapi/read/marketplace/get-world-marketplace.ts`
- `shared/database/index.ts`

## DB Write — News

### `shared/database/dbapi/write/news/announcements.ts`
**Exports:** createAnnouncement, deleteAnnouncement, updateAnnouncement

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/write/news/journals.ts`
**Exports:** createJournal, createPage, createSection, deleteJournal, deletePage, deleteSection, updateJournal, updatePage, updateSection

**Called by:**
- `shared/database/dbapi/read/news/get-wiki.ts`
- `shared/database/dbapi/read/news/get-world-journals.ts`
- `shared/database/dbapi/write/news/world-journals.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/news/wiki.ts`
**Exports:** createWiki, createWikiPage, createWikiSection, deleteWiki, deleteWikiPage, deleteWikiSection, updateWiki, updateWikiPage, updateWikiSection

**Called by:**
- `apps/admin/src/routes/(app)/wiki/[id]/+page.server.ts`
- `apps/admin/src/routes/(app)/wiki/[id]/+page.svelte`
- `shared/database/dbapi/read/news/get-wiki.ts`
- `shared/database/dbapi/read/world/get-wiki.ts`
- `shared/database/dbapi/write/world/wiki.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/news/world-journals.ts`
**Exports:** createWorldJournal, createWorldJournalPage, createWorldJournalSection, deleteWorldJournal, deleteWorldJournalPage, deleteWorldJournalSection, updateWorldJournal, updateWorldJournalPage, updateWorldJournalSection

**Called by:**
- `shared/database/dbapi/read/news/get-wiki.ts`
- `shared/database/dbapi/read/news/get-world-journals.ts`
- `shared/database/index.ts`

## DB Write — Notifications

### `shared/database/dbapi/write/notifications/notifications.ts`
**Exports:** createNotification, createNotificationsForAdmins, createNotificationsForWorldDMs, markAllNotificationsRead, markNotificationRead

**Called by:**
- `shared/database/dbapi/read/notifications/get-notifications.ts`
- `shared/database/dbapi/write/characters/approve.ts`
- `shared/database/dbapi/write/characters/create.ts`
- `shared/database/dbapi/write/characters/level-check.ts`
- `shared/database/dbapi/write/characters/update-status.ts`
- `shared/database/dbapi/write/dms/role-request.ts`
- `shared/database/dbapi/write/dnd5e/update-character.ts`
- `shared/database/dbapi/write/marketplace/transactions.ts`
- `shared/database/dbapi/write/quests/item-usage.ts`
- `shared/database/dbapi/write/quests/signup.ts`
- `shared/database/dbapi/write/quests/submit-result.ts`
- `shared/database/dbapi/write/quests/update-status.ts`
- `shared/database/dbapi/write/token-store/transactions.ts`
- `shared/database/index.ts`

## DB Write — Platform

### `shared/database/dbapi/write/platform/update-setting.ts`
**Exports:** updateSetting, updateSettings

**Called by:**
- `apps/admin/src/routes/(app)/characters/settings/+page.server.ts`
- `apps/admin/src/routes/(app)/dms/settings/+page.server.ts`
- `apps/admin/src/routes/(app)/marketplace/settings/+page.server.ts`
- `apps/admin/src/routes/(app)/quests/settings/+page.server.ts`
- `apps/admin/src/routes/(app)/settings/+page.server.ts`
- `apps/admin/src/routes/(app)/world/settings/+page.server.ts`
- `shared/database/index.ts`

## DB Write — Quests

### `shared/database/dbapi/write/quests/create.ts`
**Exports:** CreateQuestInput, createQuest

**Called by:**
- `shared/database/dbapi/write/characters/create.ts`
- `shared/database/dbapi/write/dnd5e/create-character.ts`
- `shared/database/dbapi/write/roles/create.ts`
- `shared/database/dbapi/write/users/create.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/quests/delete.ts`
**Exports:** deleteQuest

**Called by:**
- `apps/admin/src/routes/(app)/quests/[id]/+page.server.ts`
- `apps/admin/src/routes/(app)/quests/[id]/+page.svelte`
- `shared/database/dbapi/write/characters/delete.ts`
- `shared/database/dbapi/write/roles/delete.ts`
- `shared/database/dbapi/write/users/delete.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/quests/item-usage.ts`
**Exports:** approveItemUsage, getItemUsagesForQuest, rejectItemUsage, submitItemUsages

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/write/quests/signup.ts`
**Exports:** cancelSignup, confirmWaitlistPromotion, expireStalePromotions, signupForQuest

**Called by:**
- `apps/discord/src/commands/cancelsignup.ts`
- `apps/discord/src/commands/signup.ts`
- `apps/discord/src/index.ts`
- `apps/frontend/src/routes/(protected)/dm/quests/[id]/+page.server.ts`
- `apps/frontend/src/routes/(protected)/quests/[id]/+page.server.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/quests/submit-result.ts`
**Exports:** approveQuestResult, rejectQuestResult, submitQuestResult

**Called by:**
- `shared/database/index.ts`

### `shared/database/dbapi/write/quests/update-status.ts`
**Exports:** updateQuestStatus

**Called by:**
- `shared/database/dbapi/write/characters/update-status.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/quests/update.ts`
**Exports:** addCoDM, removeCoDM, updateQuest, updateQuestRewards

**Called by:**
- `apps/frontend/src/routes/(protected)/dm/quests/[id]/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/quests/[id]/+page.svelte`
- `shared/database/dbapi/write/characters/update.ts`
- `shared/database/dbapi/write/users/update.ts`
- `shared/database/index.ts`

## DB Write — Rewards

### `shared/database/dbapi/write/rewards/achievements.ts`
**Exports:** createAchievement, grantAchievement, revokeAchievement, updateAchievement

**Called by:**
- `apps/admin/src/routes/(app)/rewards/+page.server.ts`
- `apps/admin/src/routes/(app)/rewards/+page.svelte`
- `apps/admin/src/routes/(app)/rewards/grant/+page.server.ts`
- `apps/admin/src/routes/(app)/rewards/grant/+page.svelte`
- `shared/database/dbapi/read/rewards/get-achievements.ts`
- `shared/database/index.ts`

## DB Write — Roles

### `shared/database/dbapi/write/roles/create.ts`
**Exports:** CreateRoleInput, createRole

**Called by:**
- `shared/database/dbapi/write/characters/create.ts`
- `shared/database/dbapi/write/dnd5e/create-character.ts`
- `shared/database/dbapi/write/quests/create.ts`
- `shared/database/dbapi/write/users/create.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/roles/delete.ts`
**Exports:** deleteRole

**Called by:**
- `shared/database/dbapi/write/characters/delete.ts`
- `shared/database/dbapi/write/quests/delete.ts`
- `shared/database/dbapi/write/users/delete.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/roles/update-permissions.ts`
**Exports:** PermissionInput, setUserRoles, updatePermissions

**Called by:**
- `apps/admin/src/routes/(app)/roles/[id]/+page.server.ts`
- `apps/admin/src/routes/(app)/users/[id]/+page.server.ts`
- `shared/database/index.ts`

## DB Write — Tavern

### `shared/database/dbapi/write/tavern/messages.ts`
**Exports:** deleteTavernMessage, ensureGlobalTavernChannel, ensureWorldTavernChannel, sendTavernMessage, updateTavernChannel

**Called by:**
- `apps/admin/src/routes/(app)/world/[id]/+page.server.ts`
- `apps/admin/src/routes/(app)/world/[id]/+page.svelte`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/edit/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/edit/+page.svelte`
- `shared/database/index.ts`

## DB Write — Token Store

### `shared/database/dbapi/write/token-store/apply-boosts.ts`
**Exports:** applyBoostPerQuest, applyFutureBoostForQuest

**Called by:**
- `shared/database/dbapi/write/quests/submit-result.ts`
- `shared/database/dbapi/write/token-store/transactions.ts`

### `shared/database/dbapi/write/token-store/items.ts`
**Exports:** createTokenStoreItem, deleteTokenStoreItem, importTokenStoreItems, updateTokenStoreItem

**Called by:**
- `shared/database/dbapi/read/marketplace/get-items.ts`
- `shared/database/dbapi/read/token-store/get-items.ts`
- `shared/database/dbapi/write/marketplace/items.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/token-store/transactions.ts`
**Exports:** approveTokenStorePurchase, createTokenStorePurchase, recalculateTokenStoreBoost, rejectTokenStorePurchase, revokeTokenStorePurchase

**Called by:**
- `shared/database/dbapi/read/characters/get-transactions.ts`
- `shared/database/dbapi/read/marketplace/get-transactions.ts`
- `shared/database/dbapi/write/marketplace/transactions.ts`
- `shared/database/index.ts`

## DB Write — Users

### `shared/database/dbapi/write/users/create.ts`
**Exports:** CreateUserInput, createUser

**Called by:**
- `shared/database/dbapi/write/characters/create.ts`
- `shared/database/dbapi/write/dnd5e/create-character.ts`
- `shared/database/dbapi/write/quests/create.ts`
- `shared/database/dbapi/write/roles/create.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/users/delete.ts`
**Exports:** deleteUser

**Called by:**
- `apps/admin/src/routes/(app)/users/[id]/+page.server.ts`
- `apps/admin/src/routes/(app)/users/[id]/+page.svelte`
- `shared/database/dbapi/write/characters/delete.ts`
- `shared/database/dbapi/write/quests/delete.ts`
- `shared/database/dbapi/write/roles/delete.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/users/set-password.ts`
**Exports:** setPassword

**Called by:**
- `apps/admin/src/routes/(app)/users/[id]/+page.server.ts`
- `shared/database/index.ts`
- `shared/email/index.ts`
- `shared/email/templates/reset-password.ts`

### `shared/database/dbapi/write/users/update.ts`
**Exports:** UpdateUserInput, updateUser, updateUserDiscord, updateUserTheme

**Called by:**
- `shared/database/dbapi/write/characters/update.ts`
- `shared/database/dbapi/write/quests/update.ts`
- `shared/database/index.ts`

## DB Write — World

### `shared/database/dbapi/write/world/wiki.ts`
**Exports:** upsertWikiPage

**Called by:**
- `shared/database/dbapi/read/news/get-wiki.ts`
- `shared/database/dbapi/read/world/get-wiki.ts`
- `shared/database/dbapi/write/news/wiki.ts`
- `shared/database/index.ts`

### `shared/database/dbapi/write/world/worlds.ts`
**Exports:** assignDMToRegion, assignDMToWorld, createLocation, createRegion, createWorld, removeDMFromRegion, removeDMFromWorld, updateLocation, updateRegion, updateWorld, updateWorldDMPermission

**Called by:**
- `apps/admin/src/routes/(app)/world/[id]/+page.server.ts`
- `apps/admin/src/routes/(app)/world/[id]/+page.svelte`
- `apps/admin/src/routes/(app)/world/[id]/regions/[regionId]/+page.server.ts`
- `apps/admin/src/routes/(app)/world/[id]/regions/[regionId]/+page.svelte`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/edit/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/edit/+page.svelte`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/regions/[regionId]/+page.server.ts`
- `apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/regions/[regionId]/+page.svelte`
- `shared/database/dbapi/read/world/get-worlds.ts`
- `shared/database/index.ts`
