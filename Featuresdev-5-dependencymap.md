# Marches — Codebase Dependency Map

> Auto-generated. Update when adding/removing imports.
> Format: **file** → exports → callers


## DB Read — Characters

### `shared/database/dbapi/read/characters/get-all.ts`
**Exports:** `GetAllCharactersOptions`, `getAllCharacters`

**Called by:**
- `shared/database/index.ts` — uses `getAllCharacters`

### `shared/database/dbapi/read/characters/get-by-id.ts`
**Exports:** `getCharacterById`, `getCharactersByUserId`

**Called by:**
- `shared/database/index.ts` — uses `getCharacterById`, `getCharactersByUserId`

### `shared/database/dbapi/read/characters/get-inventory.ts`
**Exports:** `getCharacterInventory`

**Called by:**
- `shared/database/index.ts` — uses `getCharacterInventory`

### `shared/database/dbapi/read/characters/get-public.ts`
**Exports:** `getPublicCharacterById`, `getPublicCharacters`

**Called by:**
- `shared/database/index.ts` — uses `getPublicCharacters`, `getPublicCharacterById`

### `shared/database/dbapi/read/characters/get-slot-info.ts`
**Exports:** `getAllSlotInfo`, `getSlotInfo`

**Called by:**
- `shared/database/dbapi/write/characters/create.ts` — uses `getSlotInfo`
- `shared/database/index.ts` — uses `getSlotInfo`, `getAllSlotInfo`

### `shared/database/dbapi/read/characters/get-transactions.ts`
**Exports:** `getCharacterTransactions`

**Called by:**
- `shared/database/index.ts` — uses `getCharacterTransactions`

## DB Write — Characters

### `shared/database/dbapi/write/characters/adjust-currency.ts`
**Exports:** `CurrencyType`, `adjustCurrency`

**Called by:**
- `shared/database/index.ts` — uses `adjustCurrency`

### `shared/database/dbapi/write/characters/approve.ts`
**Exports:** `approveCharacter`, `dispatchApproveCharacter`, `dispatchRejectCharacter`, `rejectCharacter`

**Called by:**
- `shared/database/dbapi/write/dnd5e/approve-character.ts` — uses `approveCharacter`, `rejectCharacter`
- `shared/database/index.ts` — uses `approveCharacter`, `rejectCharacter`, `dispatchApproveCharacter`, `dispatchRejectCharacter`

### `shared/database/dbapi/write/characters/check-rest.ts`
**Exports:** `checkAndClearRest`, `clearAllExpiredRest`

**Called by:**
- `shared/database/index.ts` — uses `checkAndClearRest`, `clearAllExpiredRest`

### `shared/database/dbapi/write/characters/create.ts`
**Exports:** `createCharacter`

**Called by:**
- `shared/database/dbapi/write/dnd5e/create-character.ts` — uses `createCharacter`
- `shared/database/index.ts` — uses `createCharacter`

### `shared/database/dbapi/write/characters/delete.ts`
**Exports:** `deleteCharacter`

**Called by:**
- `shared/database/index.ts` — uses `deleteCharacter`

### `shared/database/dbapi/write/characters/inventory.ts`
**Exports:** `addToInventory`, `removeFromInventory`

**Called by:**
- `shared/database/index.ts` — uses `removeFromInventory`, `addToInventory`

### `shared/database/dbapi/write/characters/level-check.ts`
**Exports:** `checkLevelChange`

**Called by:**
- `shared/database/dbapi/write/characters/adjust-currency.ts` — uses `checkLevelChange`
- `shared/database/dbapi/write/quests/delete.ts` — uses `checkLevelChange`
- `shared/database/dbapi/write/token-store/transactions.ts` — uses `checkLevelChange`

### `shared/database/dbapi/write/characters/slot-grant.ts`
**Exports:** `grantCharacterSlot`

**Called by:**
- `shared/database/index.ts` — uses `grantCharacterSlot`

### `shared/database/dbapi/write/characters/update-classes.ts`
**Exports:** `ClassAllocation`, `updateCharacterClasses`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/database/dbapi/write/characters/update-status.ts`
**Exports:** `updateCharacterStatus`

**Called by:**
- `shared/database/index.ts` — uses `updateCharacterStatus`

### `shared/database/dbapi/write/characters/update.ts`
**Exports:** `updateCharacter`, `updateCharacterFreeFields`

**Called by:**
- `shared/database/index.ts` — uses `updateCharacter`, `updateCharacterFreeFields`

## DB Read — Quests

### `shared/database/dbapi/read/quests/get-all.ts`
**Exports:** `GetAllQuestsOptions`, `getAllQuests`

**Called by:**
- `shared/database/index.ts` — uses `getAllQuests`

### `shared/database/dbapi/read/quests/get-by-id.ts`
**Exports:** `getQuestById`, `getQuestResultWithCharacters`, `getQuestsByDM`

**Called by:**
- `shared/database/index.ts` — uses `getQuestById`, `getQuestsByDM`, `getQuestResultWithCharacters`

## DB Write — Quests

### `shared/database/dbapi/write/quests/create.ts`
**Exports:** `CreateQuestInput`, `createQuest`

**Called by:**
- `shared/database/index.ts` — uses `createQuest`

### `shared/database/dbapi/write/quests/delete.ts`
**Exports:** `deleteQuest`

**Called by:**
- `shared/database/index.ts` — uses `deleteQuest`

### `shared/database/dbapi/write/quests/item-usage.ts`
**Exports:** `approveItemUsage`, `getItemUsagesForQuest`, `rejectItemUsage`, `submitItemUsages`

**Called by:**
- `shared/database/index.ts` — uses `submitItemUsages`, `approveItemUsage`, `rejectItemUsage`, `getItemUsagesForQuest`

### `shared/database/dbapi/write/quests/signup.ts`
**Exports:** `cancelSignup`, `confirmWaitlistPromotion`, `expireStalePromotions`, `signupForQuest`

**Called by:**
- `shared/database/index.ts` — uses `signupForQuest`, `cancelSignup`, `confirmWaitlistPromotion`, `expireStalePromotions`

### `shared/database/dbapi/write/quests/submit-result.ts`
**Exports:** `approveQuestResult`, `rejectQuestResult`, `submitQuestResult`

**Called by:**
- `shared/database/index.ts` — uses `submitQuestResult`, `approveQuestResult`, `rejectQuestResult`

### `shared/database/dbapi/write/quests/update-status.ts`
**Exports:** `updateQuestStatus`

**Called by:**
- `shared/database/index.ts` — uses `updateQuestStatus`

### `shared/database/dbapi/write/quests/update.ts`
**Exports:** `addCoDM`, `removeCoDM`, `updateQuest`, `updateQuestRewards`

**Called by:**
- `shared/database/index.ts` — uses `updateQuest`, `updateQuestRewards`, `addCoDM`, `removeCoDM`

## DB Read — D&D 5e

### `shared/database/dbapi/read/dnd5e/enrich-signups.ts`
**Exports:** `enrichDnd5eSignups`

**Called by:**
- `shared/database/dbapi/read/quests/get-by-id.ts` — uses `enrichDnd5eSignups`
- `shared/database/index.ts` — uses `enrichDnd5eSignups`

### `shared/database/dbapi/read/dnd5e/feature-names.ts`
**Exports:** `isAsiFeatureName`, `isEpicBoonFeatureName`, `normalizeFeatureName`

**Called by:**
- `shared/database/dbapi/read/dnd5e/get-character-sheet.ts` — uses `isAsiFeatureName`, `isEpicBoonFeatureName`

### `shared/database/dbapi/read/dnd5e/get-character-sheet.ts`
**Exports:** `getDnd5eCharacterSheet`

**Called by:**
- `shared/database/index.ts` — uses `getDnd5eCharacterSheet`

### `shared/database/dbapi/read/dnd5e/get-classes.ts`
**Exports:** `getAllDnd5eBackgrounds`, `getAllDnd5eClasses`, `getAllDnd5eSpecies`, `getDnd5eBackgrounds`, `getDnd5eClassById`, `getDnd5eClasses`, `getDnd5eSpecies`, `getDnd5eSystemData`, `invalidateDnd5eSystemDataCache`

**Called by:**
- `shared/database/index.ts` — uses `getDnd5eClasses`, `getAllDnd5eClasses`, `getDnd5eClassById`, `getDnd5eSpecies`, `getAllDnd5eSpecies`, `getDnd5eBackgrounds`

### `shared/database/dbapi/read/dnd5e/get-feats.ts`
**Exports:** `getAllDnd5eFeats`, `getDnd5eFeatById`, `getDnd5eFeats`

**Called by:**
- `shared/database/dbapi/read/dnd5e/get-classes.ts` — uses `getDnd5eFeats`
- `shared/database/index.ts` — uses `getDnd5eFeats`, `getAllDnd5eFeats`, `getDnd5eFeatById`

### `shared/database/dbapi/read/dnd5e/get-score-audit.ts`
**Exports:** `getScoreAuditForCharacter`, `getScoreAuditForStat`

**Called by:**
- `shared/database/index.ts` — uses `getScoreAuditForCharacter`, `getScoreAuditForStat`

### `shared/database/dbapi/read/dnd5e/get-spells.ts`
**Exports:** `getAllDnd5eSpells`, `getDnd5eSpellById`, `getDnd5eSpellSlotProgressionByClass`, `getDnd5eSpellSlotProgressions`, `getDnd5eSpellbooks`, `getDnd5eSpellsForCharacter`, `getDnd5eSpellsKnownProgressionByClass`, `getDnd5eSpellsKnownProgressions`

**Called by:**
- `shared/database/index.ts` — uses `getAllDnd5eSpells`, `getDnd5eSpellById`, `getDnd5eSpellsForCharacter`, `getDnd5eSpellSlotProgressions`, `getDnd5eSpellSlotProgressionByClass`, `getDnd5eSpellsKnownProgressions`

## DB Write — D&D 5e

### `shared/database/dbapi/write/dnd5e/approve-character.ts`
**Exports:** `approveDnd5eCharacter`, `rejectDnd5eCharacter`

**Called by:**
- `shared/database/dbapi/write/characters/approve.ts` — uses `approveDnd5eCharacter`, `rejectDnd5eCharacter`
- `shared/database/index.ts` — uses `approveDnd5eCharacter`, `rejectDnd5eCharacter`

### `shared/database/dbapi/write/dnd5e/background-feat-grant.ts`
**Exports:** `syncBackgroundFeatGrant`

**Called by:**
- `shared/database/dbapi/write/dnd5e/update-character.ts` — uses `syncBackgroundFeatGrant`

### `shared/database/dbapi/write/dnd5e/classes.ts`
**Exports:** `createClassFeature`, `createDnd5eClass`, `createDnd5eSubclass`, `createSubclassFeature`, `deleteClassFeature`, `deleteDnd5eClass`, `deleteDnd5eSubclass`, `deleteSubclassFeature`, `updateClassFeature`, `updateDnd5eClass`, `updateDnd5eSubclass`, `updateSubclass` ...

**Called by:**
- `shared/database/index.ts` — uses `createDnd5eClass`, `updateDnd5eClass`, `deleteDnd5eClass`, `createClassFeature`, `updateClassFeature`, `deleteClassFeature`

### `shared/database/dbapi/write/dnd5e/create-character.ts`
**Exports:** `ClassAllocationInput`, `Dnd5eCreateCharacterInput`, `createDnd5eCharacter`

**Called by:**
- `shared/database/index.ts` — uses `createDnd5eCharacter`

### `shared/database/dbapi/write/dnd5e/feats.ts`
**Exports:** `createDnd5eFeat`, `deleteDnd5eFeat`, `updateDnd5eFeat`

**Called by:**
- `shared/database/index.ts` — uses `createDnd5eFeat`, `updateDnd5eFeat`, `deleteDnd5eFeat`

### `shared/database/dbapi/write/dnd5e/score-audit.ts`
**Exports:** `ScoreAuditInput`, `addScoreAuditEntries`, `addScoreAuditEntry`, `applyManualScoreAdjustment`

**Called by:**
- `shared/database/dbapi/write/dnd5e/update-ability-scores.ts` — uses `addScoreAuditEntries`
- `shared/database/dbapi/write/dnd5e/update-character-feats.ts` — uses `addScoreAuditEntries`
- `shared/database/index.ts` — uses `addScoreAuditEntry`, `addScoreAuditEntries`, `applyManualScoreAdjustment`

### `shared/database/dbapi/write/dnd5e/species.ts`
**Exports:** `createDnd5eBackground`, `createDnd5eSpecies`, `createSpeciesTrait`, `deleteDnd5eBackground`, `deleteDnd5eSpecies`, `deleteSpeciesTrait`, `updateDnd5eBackground`, `updateDnd5eSpecies`, `updateSpeciesTrait`

**Called by:**
- `shared/database/index.ts` — uses `createDnd5eSpecies`, `updateDnd5eSpecies`, `deleteDnd5eSpecies`, `createSpeciesTrait`, `updateSpeciesTrait`, `deleteSpeciesTrait`

### `shared/database/dbapi/write/dnd5e/spells.ts`
**Exports:** `addSpellbookEntry`, `createSpellbook`, `deleteDnd5eSpell`, `deleteSpellSlotProgressionClass`, `deleteSpellbook`, `deleteSpellsKnownProgressionClass`, `removeSpellbookEntry`, `toggleSpellbookEntryPrepared`, `updateDnd5eSpell`, `updateSpellbook`, `upsertDnd5eSpell`, `upsertSpellSlotProgression` ...

**Called by:**
- `shared/database/index.ts` — uses `upsertDnd5eSpell`, `updateDnd5eSpell`, `deleteDnd5eSpell`, `upsertSpellSlotProgression`, `deleteSpellSlotProgressionClass`, `upsertSpellsKnownProgression`

### `shared/database/dbapi/write/dnd5e/update-ability-scores.ts`
**Exports:** `applyDnd5eAsiStatBump`, `saveDnd5eAbilityScores`

**Called by:**
- `shared/database/dbapi/write/dnd5e/update-character-feats.ts` — uses `applyDnd5eAsiStatBump`
- `shared/database/index.ts` — uses `saveDnd5eAbilityScores`, `applyDnd5eAsiStatBump`

### `shared/database/dbapi/write/dnd5e/update-character-asi.ts`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/database/dbapi/write/dnd5e/update-character-feats.ts`
**Exports:** `addDnd5eCharacterFeat`, `removeDnd5eCharacterFeat`

**Called by:**
- `shared/database/index.ts` — uses `addDnd5eCharacterFeat`, `removeDnd5eCharacterFeat`

### `shared/database/dbapi/write/dnd5e/update-character.ts`
**Exports:** `submitDnd5eStructuralChanges`, `updateDnd5eCharacterFields`

**Called by:**
- `shared/database/index.ts` — uses `submitDnd5eStructuralChanges`, `updateDnd5eCharacterFields`

### `shared/database/dbapi/write/dnd5e/update-classes.ts`
**Exports:** `ClassAllocation`, `updateDnd5eCharacterClasses`

**Called by:**
- `shared/database/index.ts` — uses `updateDnd5eCharacterClasses`

## DB Read — Users

### `shared/database/dbapi/read/users/get-all.ts`
**Exports:** `GetAllUsersOptions`, `getAll`

**Called by:**
- `shared/database/index.ts` — uses `getAll`

### `shared/database/dbapi/read/users/get-by-id.ts`
**Exports:** `getById`, `getUserByDiscordId`, `getUserRoleIds`

**Called by:**
- `shared/database/index.ts` — uses `getById`, `getUserByDiscordId`, `getUserRoleIds`

## DB Write — Users

### `shared/database/dbapi/write/users/create.ts`
**Exports:** `CreateUserInput`, `createUser`

**Called by:**
- `shared/database/index.ts` — uses `createUser`

### `shared/database/dbapi/write/users/delete.ts`
**Exports:** `deleteUser`

**Called by:**
- `shared/database/index.ts` — uses `deleteUser`

### `shared/database/dbapi/write/users/set-password.ts`
**Exports:** `setPassword`

**Called by:**
- `shared/database/index.ts` — uses `setPassword`

### `shared/database/dbapi/write/users/update.ts`
**Exports:** `UpdateUserInput`, `updateUser`, `updateUserDiscord`, `updateUserTheme`

**Called by:**
- `shared/database/index.ts` — uses `updateUser`, `updateUserDiscord`, `updateUserTheme`

## DB Read — Roles

### `shared/database/dbapi/read/roles/get-all.ts`
**Exports:** `getAll`

**Called by:**
- `shared/database/index.ts` — uses `getAll`

### `shared/database/dbapi/read/roles/get-with-permissions.ts`
**Exports:** `getAllWithPermissions`, `getWithPermissions`

**Called by:**
- `shared/database/index.ts` — uses `getWithPermissions`, `getAllWithPermissions`

## DB Write — Roles

### `shared/database/dbapi/write/roles/create.ts`
**Exports:** `CreateRoleInput`, `createRole`

**Called by:**
- `shared/database/index.ts` — uses `createRole`

### `shared/database/dbapi/write/roles/delete.ts`
**Exports:** `deleteRole`

**Called by:**
- `shared/database/index.ts` — uses `deleteRole`

### `shared/database/dbapi/write/roles/update-permissions.ts`
**Exports:** `PermissionInput`, `setUserRoles`, `updatePermissions`

**Called by:**
- `shared/database/index.ts` — uses `updatePermissions`, `setUserRoles`

## DB Read — Platform

### `shared/database/dbapi/read/platform/get-resources.ts`
**Exports:** `getResourceNames`, `getResourceNavVisibility`, `getResources`

**Called by:**
- `shared/database/index.ts` — uses `getResources`, `getResourceNames`, `getResourceNavVisibility`

### `shared/database/dbapi/read/platform/get-settings.ts`
**Exports:** `SettingRow`, `getSettings`, `getSettingsMap`

**Called by:**
- `shared/database/dbapi/read/characters/get-slot-info.ts` — uses `getSettingsMap`
- `shared/database/dbapi/read/marketplace/resolve-context.ts` — uses `getSettingsMap`
- `shared/database/dbapi/write/characters/create.ts` — uses `getSettingsMap`
- `shared/database/dbapi/write/characters/update-status.ts` — uses `getSettingsMap`
- `shared/database/dbapi/write/quests/create.ts` — uses `getSettingsMap`
- `shared/database/dbapi/write/quests/submit-result.ts` — uses `getSettingsMap`
- `shared/database/dbapi/write/quests/update.ts` — uses `getSettingsMap`
- `shared/database/index.ts` — uses `getSettings`, `getSettingsMap`

## DB Write — Platform

### `shared/database/dbapi/write/platform/update-setting.ts`
**Exports:** `updateSetting`, `updateSettings`

**Called by:**
- `shared/database/index.ts` — uses `updateSetting`, `updateSettings`

## DB Read — Marketplace

### `shared/database/dbapi/read/marketplace/get-items.ts`
**Exports:** `GetItemsOptions`, `getAllMarketplaceItemsForExport`, `getMarketplaceItemById`, `getMarketplaceItemByName`, `getMarketplaceItems`, `searchMarketplaceItems`

**Called by:**
- `shared/database/index.ts` — uses `getMarketplaceItems`, `getMarketplaceItemById`, `getAllMarketplaceItemsForExport`, `searchMarketplaceItems`, `getMarketplaceItemByName`

### `shared/database/dbapi/read/marketplace/get-transactions.ts`
**Exports:** `getMarketplaceTransactions`

**Called by:**
- `shared/database/index.ts` — uses `getMarketplaceTransactions`

### `shared/database/dbapi/read/marketplace/get-world-marketplace.ts`
**Exports:** `getWorldMarketplaceItems`, `getWorldMarketplaceSetting`

**Called by:**
- `shared/database/index.ts` — uses `getWorldMarketplaceItems`, `getWorldMarketplaceSetting`

### `shared/database/dbapi/read/marketplace/resolve-context.ts`
**Exports:** `resolveMarketplaceContext`

**Called by:**
- `shared/database/dbapi/write/marketplace/transactions.ts` — uses `resolveMarketplaceContext`
- `shared/database/index.ts` — uses `resolveMarketplaceContext`

## DB Write — Marketplace

### `shared/database/dbapi/write/marketplace/import.ts`
**Exports:** `ImportRow`, `importMarketplaceItems`

**Called by:**
- `shared/database/index.ts` — uses `importMarketplaceItems`

### `shared/database/dbapi/write/marketplace/items.ts`
**Exports:** `deleteMarketplaceItem`, `updateMarketplaceItem`, `upsertMarketplaceItem`

**Called by:**
- `shared/database/index.ts` — uses `upsertMarketplaceItem`, `updateMarketplaceItem`, `deleteMarketplaceItem`

### `shared/database/dbapi/write/marketplace/transactions.ts`
**Exports:** `approveTransaction`, `cancelTransaction`, `createBuyTransaction`, `createSellTransaction`, `grantRewardItem`, `rejectTransaction`

**Called by:**
- `shared/database/index.ts` — uses `createBuyTransaction`, `createSellTransaction`, `approveTransaction`, `rejectTransaction`, `cancelTransaction`, `grantRewardItem`

### `shared/database/dbapi/write/marketplace/world-marketplace.ts`
**Exports:** `deleteWorldMarketplaceItem`, `upsertWorldMarketplaceItem`, `upsertWorldMarketplaceSetting`

**Called by:**
- `shared/database/index.ts` — uses `upsertWorldMarketplaceItem`, `deleteWorldMarketplaceItem`, `upsertWorldMarketplaceSetting`

## DB Read — World

### `shared/database/dbapi/read/world/get-regions.ts`
**Exports:** `getLocationBySlug`, `getRegionById`, `getRegionBySlug`

**Called by:**
- `shared/database/index.ts` — uses `getRegionBySlug`, `getRegionById`, `getLocationBySlug`

### `shared/database/dbapi/read/world/get-wiki.ts`
**Exports:** `getWikiPage`

**Called by:**
- `shared/database/index.ts` — uses `getWikiPage`

### `shared/database/dbapi/read/world/get-worlds.ts`
**Exports:** `getAllWorlds`, `getWorldById`, `getWorldBySlug`, `getWorldsByDMProfile`

**Called by:**
- `shared/database/index.ts` — uses `getAllWorlds`, `getWorldBySlug`, `getWorldById`, `getWorldsByDMProfile`

## DB Write — World

### `shared/database/dbapi/write/world/wiki.ts`
**Exports:** `upsertWikiPage`

**Called by:**
- `shared/database/index.ts` — uses `upsertWikiPage`

### `shared/database/dbapi/write/world/worlds.ts`
**Exports:** `assignDMToRegion`, `assignDMToWorld`, `createLocation`, `createRegion`, `createWorld`, `removeDMFromRegion`, `removeDMFromWorld`, `updateLocation`, `updateRegion`, `updateWorld`, `updateWorldDMPermission`

**Called by:**
- `shared/database/index.ts` — uses `createWorld`, `updateWorld`, `createRegion`, `updateRegion`, `assignDMToRegion`, `removeDMFromRegion`

## DB Read — Availability

### `shared/database/dbapi/read/availability/get-availability.ts`
**Exports:** `getAllAvailability`, `getAvailableUsersForQuest`, `getUserAvailability`

**Called by:**
- `shared/database/index.ts` — uses `getUserAvailability`, `getAvailableUsersForQuest`, `getAllAvailability`

## DB Write — Availability

### `shared/database/dbapi/write/availability/slots.ts`
**Exports:** `adminDeleteSlot`, `clearDay`, `clearSlot`, `clearSlots`, `setSlots`

**Called by:**
- `shared/database/index.ts` — uses `setSlots`, `clearDay`, `clearSlot`, `clearSlots`, `adminDeleteSlot`

## DB Read — Discord

### `shared/database/dbapi/read/discord/get-servers.ts`
**Exports:** `getAllDiscordServers`, `getChannelForType`, `getChannelsForType`, `getDiscordServerByScope`, `getPendingNotifications`, `markNotificationProcessed`

**Called by:**
- `shared/database/index.ts` — uses `getAllDiscordServers`, `getDiscordServerByScope`, `getChannelForType`, `getChannelsForType`, `getPendingNotifications`, `markNotificationProcessed`

## DB Write — Discord

### `shared/database/dbapi/write/discord/dispatcher.ts`
**Exports:** `queueDiscordNotification`

**Called by:**
- `shared/database/dbapi/write/characters/approve.ts` — uses `queueDiscordNotification`
- `shared/database/dbapi/write/characters/create.ts` — uses `queueDiscordNotification`
- `shared/database/dbapi/write/marketplace/transactions.ts` — uses `queueDiscordNotification`
- `shared/database/dbapi/write/quests/submit-result.ts` — uses `queueDiscordNotification`
- `shared/database/dbapi/write/quests/update-status.ts` — uses `queueDiscordNotification`
- `shared/database/dbapi/write/token-store/transactions.ts` — uses `queueDiscordNotification`
- `shared/database/index.ts` — uses `queueDiscordNotification`

### `shared/database/dbapi/write/discord/servers.ts`
**Exports:** `deleteDiscordChannel`, `deleteDiscordServer`, `upsertDiscordChannel`, `upsertDiscordServer`

**Called by:**
- `shared/database/index.ts` — uses `upsertDiscordServer`, `deleteDiscordServer`, `upsertDiscordChannel`, `deleteDiscordChannel`

## DB Write — Notifications

### `shared/database/dbapi/write/notifications/notifications.ts`
**Exports:** `createNotification`, `createNotificationsForAdmins`, `createNotificationsForWorldDMs`, `markAllNotificationsRead`, `markNotificationRead`

**Called by:**
- `shared/database/dbapi/write/characters/approve.ts` — uses `createNotification`
- `shared/database/dbapi/write/characters/create.ts` — uses `createNotificationsForAdmins`, `createNotificationsForWorldDMs`
- `shared/database/dbapi/write/characters/level-check.ts` — uses `createNotification`
- `shared/database/dbapi/write/characters/update-status.ts` — uses `createNotification`
- `shared/database/dbapi/write/dms/role-request.ts` — uses `createNotificationsForAdmins`
- `shared/database/dbapi/write/dnd5e/update-character.ts` — uses `createNotificationsForAdmins`
- `shared/database/dbapi/write/marketplace/transactions.ts` — uses `createNotification`, `createNotificationsForAdmins`, `createNotificationsForWorldDMs`
- `shared/database/dbapi/write/quests/item-usage.ts` — uses `createNotificationsForAdmins`, `createNotification`
- `shared/database/dbapi/write/quests/signup.ts` — uses `createNotification`
- `shared/database/dbapi/write/quests/submit-result.ts` — uses `createNotificationsForAdmins`, `createNotification`
- `shared/database/dbapi/write/quests/update-status.ts` — uses `createNotificationsForWorldDMs`, `createNotification`
- `shared/database/dbapi/write/token-store/transactions.ts` — uses `createNotificationsForAdmins`, `createNotificationsForWorldDMs`, `createNotification`
- `shared/database/index.ts` — uses `createNotification`, `createNotificationsForAdmins`, `createNotificationsForWorldDMs`, `markNotificationRead`, `markAllNotificationsRead`

## DB Read — Notifications

### `shared/database/dbapi/read/notifications/get-notifications.ts`
**Exports:** `getNotifications`, `getUnreadNotifications`

**Called by:**
- `shared/database/index.ts` — uses `getUnreadNotifications`, `getNotifications`

## DB Write — Token Store

### `shared/database/dbapi/write/token-store/apply-boosts.ts`
**Exports:** `applyBoostPerQuest`, `applyFutureBoostForQuest`

**Called by:**
- `shared/database/dbapi/write/quests/submit-result.ts` — uses `applyFutureBoostForQuest`
- `shared/database/dbapi/write/token-store/transactions.ts` — uses `applyBoostPerQuest`

### `shared/database/dbapi/write/token-store/items.ts`
**Exports:** `createTokenStoreItem`, `deleteTokenStoreItem`, `importTokenStoreItems`, `updateTokenStoreItem`

**Called by:**
- `shared/database/index.ts` — uses `createTokenStoreItem`, `updateTokenStoreItem`, `deleteTokenStoreItem`, `importTokenStoreItems`

### `shared/database/dbapi/write/token-store/transactions.ts`
**Exports:** `approveTokenStorePurchase`, `createTokenStorePurchase`, `recalculateTokenStoreBoost`, `rejectTokenStorePurchase`, `revokeTokenStorePurchase`

**Called by:**
- `shared/database/index.ts` — uses `createTokenStorePurchase`, `approveTokenStorePurchase`, `rejectTokenStorePurchase`, `revokeTokenStorePurchase`, `recalculateTokenStoreBoost`

## DB Read — Token Store

### `shared/database/dbapi/read/token-store/get-items.ts`
**Exports:** `getActiveBoostsForCharacter`, `getAllTokenStoreItemsForExport`, `getTokenStoreItemById`, `getTokenStoreItems`, `getTokenStoreTransactionById`, `getTokenStoreTransactions`

**Called by:**
- `shared/database/index.ts` — uses `getTokenStoreItems`, `getTokenStoreItemById`, `getAllTokenStoreItemsForExport`, `getTokenStoreTransactions`, `getTokenStoreTransactionById`, `getActiveBoostsForCharacter`

## DB Write — DMs

### `shared/database/dbapi/write/dms/dm-profile.ts`
**Exports:** `revokeDMRole`, `updateDMProfile`

**Called by:**
- `shared/database/index.ts` — uses `updateDMProfile`, `revokeDMRole`

### `shared/database/dbapi/write/dms/rating.ts`
**Exports:** `getDMRatingForQuest`, `submitDMRating`

**Called by:**
- `shared/database/index.ts` — uses `submitDMRating`, `getDMRatingForQuest`

### `shared/database/dbapi/write/dms/role-request.ts`
**Exports:** `approveRoleRequest`, `createRoleRequest`, `deleteRoleRequest`, `rejectRoleRequest`

**Called by:**
- `shared/database/index.ts` — uses `createRoleRequest`, `approveRoleRequest`, `rejectRoleRequest`, `deleteRoleRequest`

## DB Read — DMs

### `shared/database/dbapi/read/dms/get-all.ts`
**Exports:** `getAllDMProfiles`, `getAllRoleRequests`

**Called by:**
- `shared/database/index.ts` — uses `getAllDMProfiles`, `getAllRoleRequests`

### `shared/database/dbapi/read/dms/get-by-id.ts`
**Exports:** `getDMProfileById`, `getDMProfileByUserId`, `getLatestRoleRequestByUser`, `getPendingRoleRequestByUser`

**Called by:**
- `shared/database/index.ts` — uses `getDMProfileById`, `getDMProfileByUserId`, `getPendingRoleRequestByUser`, `getLatestRoleRequestByUser`

## DB Read — Factions

### `shared/database/dbapi/read/factions/get-factions.ts`
**Exports:** `GetFactionsOptions`, `getFactionById`, `getFactionBySlug`, `getFactionRenownForCharacter`, `getFactionsByWorld`

**Called by:**
- `shared/database/index.ts` — uses `getFactionsByWorld`, `getFactionById`, `getFactionBySlug`, `getFactionRenownForCharacter`

### `shared/database/dbapi/read/factions/get-npcs.ts`
**Exports:** `GetNpcsOptions`, `getNpcById`, `getNpcsByWorld`, `getPublicNpcs`

**Called by:**
- `shared/database/index.ts` — uses `getNpcsByWorld`, `getPublicNpcs`, `getNpcById`

## DB Write — Factions

### `shared/database/dbapi/write/factions/factions.ts`
**Exports:** `FactionInput`, `addFactionQuest`, `addFactionTerritory`, `createFaction`, `createFactionRank`, `deleteFaction`, `deleteFactionRank`, `removeFactionQuest`, `removeFactionRelation`, `removeFactionTerritory`, `setFactionRelation`, `updateFaction` ...

**Called by:**
- `shared/database/index.ts` — uses `createFaction`, `updateFaction`, `deleteFaction`, `createFactionRank`, `updateFactionRank`, `deleteFactionRank`

### `shared/database/dbapi/write/factions/npcs.ts`
**Exports:** `NpcInput`, `addNpcQuest`, `createNpc`, `deleteNpc`, `removeNpcQuest`, `updateNpc`

**Called by:**
- `shared/database/index.ts` — uses `createNpc`, `updateNpc`, `deleteNpc`, `addNpcQuest`, `removeNpcQuest`

### `shared/database/dbapi/write/factions/renown.ts`
**Exports:** `removeFactionRenown`, `setFactionRenown`

**Called by:**
- `shared/database/index.ts` — uses `setFactionRenown`, `removeFactionRenown`

## DB Read — News/Wiki/Journals

### `shared/database/dbapi/read/news/get-news.ts`
**Exports:** `getAllAnnouncements`, `getAllJournals`, `getAnnouncementById`, `getAnnouncements`, `getJournalPage`, `getJournalsForUser`

**Called by:**
- `shared/database/index.ts` — uses `getAnnouncements`, `getAllAnnouncements`, `getAnnouncementById`

### `shared/database/dbapi/read/news/get-wiki.ts`
**Exports:** `getAllWikis`, `getWikiById`, `getWikiPageById`, `getWikis`

**Called by:**
- `shared/database/index.ts` — uses `getWikis`, `getAllWikis`, `getWikiById`, `getWikiPageById`

### `shared/database/dbapi/read/news/get-world-journals.ts`
**Exports:** `UserContext`, `getAllWorldJournals`, `getWorldJournalPage`, `getWorldJournals`

**Called by:**
- `shared/database/index.ts` — uses `getWorldJournals`, `getAllWorldJournals`, `getWorldJournalPage`

### `shared/database/dbapi/read/news/resolve-enrichers.ts`
**Exports:** `EnricherToken`, `resolveEnrichers`, `searchEnrichablesbyName`

**Called by:**
- `shared/database/index.ts` — uses `resolveEnrichers`, `searchEnrichablesbyName`

## DB Write — News/Wiki/Journals

### `shared/database/dbapi/write/news/announcements.ts`
**Exports:** `createAnnouncement`, `deleteAnnouncement`, `updateAnnouncement`

**Called by:**
- `shared/database/index.ts` — uses `createAnnouncement`, `updateAnnouncement`, `deleteAnnouncement`

### `shared/database/dbapi/write/news/journals.ts`
**Exports:** `createJournal`, `createPage`, `createSection`, `deleteJournal`, `deletePage`, `deleteSection`, `updateJournal`, `updatePage`, `updateSection`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/database/dbapi/write/news/wiki.ts`
**Exports:** `createWiki`, `createWikiPage`, `createWikiSection`, `deleteWiki`, `deleteWikiPage`, `deleteWikiSection`, `updateWiki`, `updateWikiPage`, `updateWikiSection`

**Called by:**
- `shared/database/index.ts` — uses `createWiki`, `updateWiki`, `deleteWiki`, `createWikiSection`, `updateWikiSection`, `deleteWikiSection`

### `shared/database/dbapi/write/news/world-journals.ts`
**Exports:** `createWorldJournal`, `createWorldJournalPage`, `createWorldJournalSection`, `deleteWorldJournal`, `deleteWorldJournalPage`, `deleteWorldJournalSection`, `updateWorldJournal`, `updateWorldJournalPage`, `updateWorldJournalSection`

**Called by:**
- `shared/database/index.ts` — uses `createWorldJournal`, `updateWorldJournal`, `deleteWorldJournal`, `createWorldJournalSection`, `updateWorldJournalSection`, `deleteWorldJournalSection`

## DB Read — Stats

### `shared/database/dbapi/read/stats/get-stats.ts`
**Exports:** `getPlatformStats`, `getPublicStats`, `getUserStats`

**Called by:**
- `shared/database/index.ts` — uses `getPlatformStats`, `getPublicStats`, `getUserStats`

## DB Read — Audit

### `shared/database/dbapi/read/audit/get-logs.ts`
**Exports:** `GetAuditLogsOptions`, `getAuditLogs`

**Called by:**
- `shared/database/index.ts` — uses `getAuditLogs`

## DB Write — Audit

### `shared/database/dbapi/write/audit/log.ts`
**Exports:** `AuditLogInput`, `logAudit`

**Called by:**
- `shared/database/dbapi/transactions/register-user.ts` — uses `logAudit`
- `shared/database/dbapi/write/availability/slots.ts` — uses `logAudit`
- `shared/database/dbapi/write/characters/adjust-currency.ts` — uses `logAudit`
- `shared/database/dbapi/write/characters/approve.ts` — uses `logAudit`
- `shared/database/dbapi/write/characters/create.ts` — uses `logAudit`
- `shared/database/dbapi/write/characters/delete.ts` — uses `logAudit`
- `shared/database/dbapi/write/characters/inventory.ts` — uses `logAudit`
- `shared/database/dbapi/write/characters/slot-grant.ts` — uses `logAudit`
- `shared/database/dbapi/write/characters/update-classes.ts` — uses `logAudit`
- `shared/database/dbapi/write/characters/update-status.ts` — uses `logAudit`
- `shared/database/dbapi/write/characters/update.ts` — uses `logAudit`
- `shared/database/dbapi/write/dms/dm-profile.ts` — uses `logAudit`
- `shared/database/dbapi/write/dms/role-request.ts` — uses `logAudit`
- `shared/database/dbapi/write/dnd5e/classes.ts` — uses `logAudit`
- `shared/database/dbapi/write/dnd5e/feats.ts` — uses `logAudit`
- `shared/database/dbapi/write/dnd5e/species.ts` — uses `logAudit`
- `shared/database/dbapi/write/dnd5e/update-character.ts` — uses `logAudit`
- `shared/database/dbapi/write/dnd5e/update-classes.ts` — uses `logAudit`
- `shared/database/dbapi/write/factions/factions.ts` — uses `logAudit`
- `shared/database/dbapi/write/factions/npcs.ts` — uses `logAudit`
- `shared/database/dbapi/write/factions/renown.ts` — uses `logAudit`
- `shared/database/dbapi/write/gamesystem/game-system.ts` — uses `logAudit`
- `shared/database/dbapi/write/gamesystem/progression.ts` — uses `logAudit`
- `shared/database/dbapi/write/marketplace/import.ts` — uses `logAudit`
- `shared/database/dbapi/write/marketplace/items.ts` — uses `logAudit`
- `shared/database/dbapi/write/marketplace/transactions.ts` — uses `logAudit`
- `shared/database/dbapi/write/news/announcements.ts` — uses `logAudit`
- `shared/database/dbapi/write/news/journals.ts` — uses `logAudit`
- `shared/database/dbapi/write/news/wiki.ts` — uses `logAudit`
- `shared/database/dbapi/write/news/world-journals.ts` — uses `logAudit`
- `shared/database/dbapi/write/quests/create.ts` — uses `logAudit`
- `shared/database/dbapi/write/quests/delete.ts` — uses `logAudit`
- `shared/database/dbapi/write/quests/item-usage.ts` — uses `logAudit`
- `shared/database/dbapi/write/quests/signup.ts` — uses `logAudit`
- `shared/database/dbapi/write/quests/submit-result.ts` — uses `logAudit`
- `shared/database/dbapi/write/quests/update-status.ts` — uses `logAudit`
- `shared/database/dbapi/write/quests/update.ts` — uses `logAudit`
- `shared/database/dbapi/write/rewards/achievements.ts` — uses `logAudit`
- `shared/database/dbapi/write/roles/create.ts` — uses `logAudit`
- `shared/database/dbapi/write/roles/delete.ts` — uses `logAudit`
- `shared/database/dbapi/write/roles/update-permissions.ts` — uses `logAudit`
- `shared/database/dbapi/write/token-store/items.ts` — uses `logAudit`
- `shared/database/dbapi/write/token-store/transactions.ts` — uses `logAudit`
- `shared/database/dbapi/write/users/create.ts` — uses `logAudit`
- `shared/database/dbapi/write/users/delete.ts` — uses `logAudit`
- `shared/database/dbapi/write/users/set-password.ts` — uses `logAudit`
- `shared/database/dbapi/write/users/update.ts` — uses `logAudit`
- `shared/database/dbapi/write/world/wiki.ts` — uses `logAudit`
- `shared/database/dbapi/write/world/worlds.ts` — uses `logAudit`

## DB Write — Rewards

### `shared/database/dbapi/write/rewards/achievements.ts`
**Exports:** `createAchievement`, `grantAchievement`, `revokeAchievement`, `updateAchievement`

**Called by:**
- `shared/database/index.ts` — uses `createAchievement`, `updateAchievement`, `grantAchievement`, `revokeAchievement`

## DB Read — Rewards

### `shared/database/dbapi/read/rewards/get-achievements.ts`
**Exports:** `getAllAchievements`, `getCharacterAchievements`

**Called by:**
- `shared/database/index.ts` — uses `getAllAchievements`, `getCharacterAchievements`

## DB Read — Game System

### `shared/database/dbapi/read/gamesystem/get-all.ts`
**Exports:** `getActiveGameSystems`, `getAllGameSystems`

**Called by:**
- `shared/database/index.ts` — uses `getAllGameSystems`, `getActiveGameSystems`

### `shared/database/dbapi/read/gamesystem/get-by-id.ts`
**Exports:** `getGameSystemById`

**Called by:**
- `shared/database/index.ts` — uses `getGameSystemById`

## DB Write — Game System

### `shared/database/dbapi/write/gamesystem/game-system.ts`
**Exports:** `createGameSystem`, `deleteGameSystem`, `updateGameSystem`

**Called by:**
- `shared/database/index.ts` — uses `createGameSystem`, `updateGameSystem`, `deleteGameSystem`

### `shared/database/dbapi/write/gamesystem/progression.ts`
**Exports:** `createProgressionThreshold`, `deleteProgressionThreshold`, `updateProgressionThreshold`

**Called by:**
- `shared/database/index.ts` — uses `createProgressionThreshold`, `updateProgressionThreshold`, `deleteProgressionThreshold`

## Shared RBAC (@core/rbac)

### `shared/rbac/access.ts`
**Exports:** `NavVisibility`, `PermissionAction`, `PermissionRequest`, `PermissionResult`, `ResolvedPermission`, `UserPermissions`, `assertListPermission`, `assertPermission`, `assertRecordPermission`, `assertWritePermission`, `canNavigate`, `checkPermission` ...

**Called by:**
- `shared/rbac/auth.ts` — uses `invalidateUserPermissions`

### `shared/rbac/auth.ts`
**Exports:** `Auth`, `BaseAuthConfigInput`, `EmailSender`, `getBaseAuthConfig`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/rbac/cache.ts`
**Exports:** `permissionCache`

**Called by:**
- `shared/rbac/access.ts` — uses `permissionCache`

### `shared/rbac/index.ts`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

## Shared UI (@core/ui)

### `shared/ui/components/layout/AppShell.svelte`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/components/layout/Footer.svelte`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/components/layout/Header.svelte`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/components/layout/NavBar.svelte`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/components/layout/NavItem.svelte`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/components/layout/Sidebar.svelte`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/components/ui/Avatar.svelte`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/components/ui/Badge.svelte`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/components/ui/Button.svelte`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/components/ui/Card.svelte`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/components/ui/ConfirmModal.svelte`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/components/ui/NotificationBell.svelte`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/components/ui/PermissionCell.svelte`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/components/ui/confirm-modal-singleton.ts`
**Exports:** `confirmModal`, `registerConfirmModal`, `unregisterConfirmModal`

**Called by:**
- `shared/ui/components/ui/ConfirmModal.svelte` — uses `registerConfirmModal`, `unregisterConfirmModal`
- `shared/ui/src/gamesystems/dnd5e/Dnd5eSpellbooks.svelte` — uses `confirmModal`

### `shared/ui/index.ts`
**Exports:** ` confirmModal `, ` default as AppShell `, ` default as Avatar `, ` default as Badge `, ` default as Button `, ` default as Card `, ` default as ConfirmModal `, ` default as Dnd5eAsiFeatsPanel `, ` default as Dnd5eCharacterCard `, ` default as Dnd5eCharacterCreation `, ` default as Dnd5eCharacterSheet `, ` default as Dnd5eSpellbooks ` ...

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/src/gamesystems/dnd5e/Dnd5eAsiFeatsPanel.svelte`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/src/gamesystems/dnd5e/Dnd5eCharacterCard.svelte`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/src/gamesystems/dnd5e/Dnd5eCharacterCreation.svelte`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/src/gamesystems/dnd5e/Dnd5eCharacterSheet.svelte`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/src/gamesystems/dnd5e/Dnd5eSpellbooks.svelte`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/src/gamesystems/dnd5e/feature-names.ts`
**Exports:** `isAsiFeatureName`, `isEpicBoonFeatureName`, `normalizeFeatureName`

**Called by:**
- `shared/ui/src/gamesystems/dnd5e/Dnd5eAsiFeatsPanel.svelte` — uses `isAsiFeatureName`

### `shared/ui/src/gamesystems/dnd5e/name-generator.ts`
**Exports:** `generateFantasyName`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `shared/ui/src/markdown.ts`
**Exports:** `renderMarkdown`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

## Discord Bot

### `apps/discord/src/commands/availability.ts`
**Exports:** `handleSetAvailableCommand`, `handleUnsetAvailableCommand`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/discord/src/commands/buyitem.ts`
**Exports:** `handleBuyItemCommand`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/discord/src/commands/cancelsignup.ts`
**Exports:** `handleCancelSignupCommand`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/discord/src/commands/characters.ts`
**Exports:** `handleCharactersCommand`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/discord/src/commands/charactersinv.ts`
**Exports:** `handleCharsInvCommand`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/discord/src/commands/item.ts`
**Exports:** `handleItemCommand`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/discord/src/commands/quest.ts`
**Exports:** `handleQuestCommand`, `handleQuestDetailButton`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/discord/src/commands/quests.ts`
**Exports:** `handleQuestsCommand`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/discord/src/commands/sellitem.ts`
**Exports:** `handleSellItemCommand`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/discord/src/commands/signup.ts`
**Exports:** `handleSignupCommand`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/discord/src/commands/spell.ts`
**Exports:** `handleSpellInfoCommand`, `handleSpellListCommand`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/discord/src/commands/spellbook.ts`
**Exports:** `handleSpellbookListCommand`, `handleSpellbookPreparedCommand`, `handleSpellbookSlotsCommand`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/discord/src/commands/tavern.ts`
**Exports:** `handleTavernCommand`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/discord/src/index.ts`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/discord/src/interaction-handler.ts`
**Exports:** `handleInteraction`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/discord/src/notifications/dispatcher.ts`
**Exports:** `notifyAnnouncement`, `notifyCharacterApproved`, `notifyCharacterPendingApproval`, `notifyCharacterRejected`, `notifyInvite`, `notifyItemPurchased`, `notifyItemSold`, `notifyMarketplacePending`, `notifyQuestPendingApproval`, `notifyQuestPublished`, `notifyQuestResult`, `notifyQuestResultPending` ...

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/discord/src/notifications/process-queue.ts`
**Exports:** `processQueue`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/discord/src/register-commands.ts`
**Exports:** `commands`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

## Frontend Utilities

### `apps/frontend/src/lib/index.ts`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/frontend/src/lib/rarity.ts`
**Exports:** `RARITIES`, `RARITY_BADGE`, `Rarity`, `rarityBadge`, `rarityLabel`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/frontend/src/lib/server/auth.ts`
**Exports:** `auth`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/frontend/src/lib/themes.ts`
**Exports:** `getAvailableThemes`, `validateTheme`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/frontend/src/lib/vitest-examples/greet.spec.ts`

> ⚠ No direct import callers found (may be called via `@core/database` barrel only)

### `apps/frontend/src/lib/vitest-examples/greet.ts`
**Exports:** `greet`

**Called by:**
- `apps/frontend/src/lib/vitest-examples/greet.spec.ts` — uses `greet`