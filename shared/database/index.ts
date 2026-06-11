// shared/database/index.ts
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// ── Users ─────────────────────────────────────────────────────────────────────
import { getAll    as getAllUsers  } from './dbapi/read/users/get-all.ts';
import { getById as getUserById, getUserByDiscordId, getUserRoleIds } from './dbapi/read/users/get-by-id.ts';
import { createUser                } from './dbapi/write/users/create.ts';
import { updateUser, updateUserDiscord } from './dbapi/write/users/update.ts';
import { deleteUser                } from './dbapi/write/users/delete.ts';
import { setPassword               } from './dbapi/write/users/set-password.ts';

// ── Roles ─────────────────────────────────────────────────────────────────────
import { getAll as getAllRoles, } from './dbapi/read/roles/get-all.ts';
import { getWithPermissions, getAllWithPermissions } from './dbapi/read/roles/get-with-permissions.ts';
import { createRole                               } from './dbapi/write/roles/create.ts';
import { updatePermissions, setUserRoles          } from './dbapi/write/roles/update-permissions.ts';
import { deleteRole                               } from './dbapi/write/roles/delete.ts';

// ── Platform ──────────────────────────────────────────────────────────────────
import { getResources, getResourceNames, getResourceNavVisibility } from './dbapi/read/platform/get-resources.ts';
import { getSettings, getSettingsMap                              } from './dbapi/read/platform/get-settings.ts';
import { updateSetting, updateSettings                            } from './dbapi/write/platform/update-setting.ts';

// ── Analytics ─────────────────────────────────────────────────────────────────
import { getPlatformMetrics } from './dbapi/analytics/get-platform-metrics.ts';
import { getUserGrowth       } from './dbapi/analytics/get-user-growth.ts';

// ── Audit ─────────────────────────────────────────────────────────────────────
import { getAuditLogs } from './dbapi/read/audit/get-logs.ts';

// ── Transactions ──────────────────────────────────────────────────────────────
import { registerUser } from './dbapi/transactions/register-user.ts';

// ── GameSystem ────────────────────────────────────────────────────────────────
import { getAllGameSystems, getActiveGameSystems } from './dbapi/read/gamesystem/get-all.ts';
import { getGameSystemById                          } from './dbapi/read/gamesystem/get-by-id.ts';
import { createGameSystem, updateGameSystem, deleteGameSystem } from './dbapi/write/gamesystem/game-system.ts';
import { createProgressionThreshold, updateProgressionThreshold, deleteProgressionThreshold } from './dbapi/write/gamesystem/progression.ts';

import { getPlatformStats, getPublicStats, getUserStats } from './dbapi/read/stats/get-stats.ts';

import { setSlots, clearDay, clearSlot, clearSlots, adminDeleteSlot } from './dbapi/write/availability/slots.ts';
import { getUserAvailability, getAvailableUsersForQuest, getAllAvailability } from './dbapi/read/availability/get-availability.ts';

import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from './dbapi/write/news/announcements.ts';
import { getAnnouncements, getAllAnnouncements, getAnnouncementById } from './dbapi/read/news/get-news.ts';
import { getWorldJournals, getAllWorldJournals, getWorldJournalPage } from './dbapi/read/news/get-world-journals.ts';
import { getWikis, getAllWikis, getWikiById, getWikiPageById } from './dbapi/read/news/get-wiki.ts';
import { createWorldJournal, updateWorldJournal, deleteWorldJournal,
         createWorldJournalSection, updateWorldJournalSection, deleteWorldJournalSection,
         createWorldJournalPage, updateWorldJournalPage, deleteWorldJournalPage } from './dbapi/write/news/world-journals.ts';
import { createWiki, updateWiki, deleteWiki,
         createWikiSection, updateWikiSection, deleteWikiSection,
         createWikiPage, updateWikiPage, deleteWikiPage } from './dbapi/write/news/wiki.ts';
import { resolveEnrichers, searchEnrichablesbyName } from './dbapi/read/news/resolve-enrichers.ts';

import { upsertDiscordServer, deleteDiscordServer, upsertDiscordChannel, deleteDiscordChannel } from './dbapi/write/discord/servers.ts';
import { getAllDiscordServers, getDiscordServerByScope, getChannelForType, getChannelsForType, getPendingNotifications, markNotificationProcessed } from './dbapi/read/discord/get-servers.ts';


import { getDnd5eCharacterSheet } from './dbapi/read/dnd5e/get-character-sheet.ts';
import { getDnd5eFeats, getAllDnd5eFeats, getDnd5eFeatById } from './dbapi/read/dnd5e/get-feats.ts';
import { createDnd5eFeat, updateDnd5eFeat, deleteDnd5eFeat } from './dbapi/write/dnd5e/feats.ts';
import { saveDnd5eAbilityScores, applyDnd5eAsiStatBump } from './dbapi/write/dnd5e/update-ability-scores.ts';
import { addDnd5eCharacterFeat, removeDnd5eCharacterFeat } from './dbapi/write/dnd5e/update-character-feats.ts';
import { enrichDnd5eSignups } from './dbapi/read/dnd5e/enrich-signups.ts';
import { getDnd5eClasses, getAllDnd5eClasses, getDnd5eClassById, getDnd5eSpecies, getAllDnd5eSpecies, getDnd5eBackgrounds, getAllDnd5eBackgrounds, getDnd5eSystemData } from './dbapi/read/dnd5e/get-classes.ts';
import { createDnd5eClass, updateDnd5eClass, deleteDnd5eClass, createClassFeature, updateClassFeature, deleteClassFeature, createDnd5eSubclass, updateDnd5eSubclass, deleteDnd5eSubclass, createSubclassFeature, updateSubclassFeature, deleteSubclassFeature } from './dbapi/write/dnd5e/classes.ts';
import { createDnd5eSpecies, updateDnd5eSpecies, deleteDnd5eSpecies, createSpeciesTrait, updateSpeciesTrait, deleteSpeciesTrait, createDnd5eBackground, updateDnd5eBackground, deleteDnd5eBackground } from './dbapi/write/dnd5e/species.ts';
import { createDnd5eCharacter } from './dbapi/write/dnd5e/create-character.ts';
import { approveDnd5eCharacter, rejectDnd5eCharacter } from './dbapi/write/dnd5e/approve-character.ts';
import { submitDnd5eStructuralChanges, updateDnd5eCharacterFields } from './dbapi/write/dnd5e/update-character.ts';
import { updateDnd5eCharacterClasses } from './dbapi/write/dnd5e/update-classes.ts';

// ── Achievements ─────────────────────────────────────────────────────────────────
import { createAchievement, updateAchievement, grantAchievement, revokeAchievement } from './dbapi/write/rewards/achievements.ts';
import { getAllAchievements, getCharacterAchievements } from './dbapi/read/rewards/get-achievements.ts';

// ── Notifications ────────────────────────────────────────────────────────────────
import { queueDiscordNotification } from './dbapi/write/discord/dispatcher.ts';
import { getTokenStoreItems, getTokenStoreItemById, getAllTokenStoreItemsForExport, getTokenStoreTransactions, getTokenStoreTransactionById, getActiveBoostsForCharacter } from './dbapi/read/token-store/get-items.ts';
import { createTokenStoreItem, updateTokenStoreItem, deleteTokenStoreItem, importTokenStoreItems } from './dbapi/write/token-store/items.ts';
import { createTokenStorePurchase, approveTokenStorePurchase, rejectTokenStorePurchase, revokeTokenStorePurchase, recalculateTokenStoreBoost } from './dbapi/write/token-store/transactions.ts';
import { getTavernChannels, getTavernChannel, getTavernChannelByWorldId, getGlobalTavernChannel, getTavernMessages } from './dbapi/read/tavern/get-channels.ts';
import { sendTavernMessage, deleteTavernMessage, ensureGlobalTavernChannel, ensureWorldTavernChannel, updateTavernChannel } from './dbapi/write/tavern/messages.ts';
import { getUnreadNotifications, getNotifications  } from './dbapi/read/notifications/get-notifications.ts';
import { createNotification, createNotificationsForAdmins, createNotificationsForWorldDMs,
         markNotificationRead, markAllNotificationsRead } from './dbapi/write/notifications/notifications.ts';

// ── World ────────────────────────────────────────────────────────────────────────
import { getAllWorlds, getWorldBySlug, getWorldById, getWorldsByDMProfile  } from './dbapi/read/world/get-worlds.ts';
import { getRegionBySlug, getRegionById,
         getLocationBySlug                           } from './dbapi/read/world/get-regions.ts';
import { getWikiPage                                 } from './dbapi/read/world/get-wiki.ts';
import { createWorld, updateWorld, createRegion,
         updateRegion, assignDMToRegion,
         removeDMFromRegion, assignDMToWorld,
         updateWorldDMPermission, removeDMFromWorld, createLocation,
         updateLocation                              } from './dbapi/write/world/worlds.ts';
import { upsertWikiPage                              } from './dbapi/write/world/wiki.ts';

// ── Marketplace ──────────────────────────────────────────────────────────────────
import { getMarketplaceItems, getMarketplaceItemById, getAllMarketplaceItemsForExport,
         searchMarketplaceItems,
         getMarketplaceItemByName                         } from './dbapi/read/marketplace/get-items.ts';
import { resolveMarketplaceContext                        } from './dbapi/read/marketplace/resolve-context.ts';
import { getMarketplaceTransactions                       } from './dbapi/read/marketplace/get-transactions.ts';
import { getWorldMarketplaceItems, getWorldMarketplaceSetting } from './dbapi/read/marketplace/get-world-marketplace.ts';
import { upsertMarketplaceItem, updateMarketplaceItem,
         deleteMarketplaceItem                           } from './dbapi/write/marketplace/items.ts';
import { createBuyTransaction, createSellTransaction,
         approveTransaction, rejectTransaction,
         cancelTransaction, grantRewardItem               } from './dbapi/write/marketplace/transactions.ts';
import { importMarketplaceItems                           } from './dbapi/write/marketplace/import.ts';
import { upsertWorldMarketplaceItem, deleteWorldMarketplaceItem,
         upsertWorldMarketplaceSetting                     } from './dbapi/write/marketplace/world-marketplace.ts';

// ── Quests ───────────────────────────────────────────────────────────────────────
import { getAllQuests                                     } from './dbapi/read/quests/get-all.ts';
import { getQuestById, getQuestsByDM, getQuestResultWithCharacters } from './dbapi/read/quests/get-by-id.ts';
import { createQuest                                     } from './dbapi/write/quests/create.ts';
import { updateQuest, updateQuestRewards, addCoDM,
         removeCoDM                                      } from './dbapi/write/quests/update.ts';
import { updateQuestStatus                               } from './dbapi/write/quests/update-status.ts';
import { signupForQuest, cancelSignup,
         confirmWaitlistPromotion                        } from './dbapi/write/quests/signup.ts';
import { submitQuestResult, approveQuestResult,
         rejectQuestResult                               } from './dbapi/write/quests/submit-result.ts';
import { deleteQuest                                     } from './dbapi/write/quests/delete.ts';
import { submitItemUsages, approveItemUsage, rejectItemUsage, getItemUsagesForQuest } from './dbapi/write/quests/item-usage.ts';

// ── DMs ──────────────────────────────────────────────────────────────────────────
import { getAllDMProfiles, getAllRoleRequests   } from './dbapi/read/dms/get-all.ts';
import { getDMProfileById, getDMProfileByUserId,
         getPendingRoleRequestByUser,
         getLatestRoleRequestByUser              } from './dbapi/read/dms/get-by-id.ts';
import { submitDMRating, getDMRatingForQuest } from './dbapi/write/dms/rating.ts';
import { createRoleRequest, approveRoleRequest,
         rejectRoleRequest, deleteRoleRequest    } from './dbapi/write/dms/role-request.ts';
import { updateDMProfile, revokeDMRole          } from './dbapi/write/dms/dm-profile.ts';

// ── Characters ────────────────────────────────────────────────────────────────────
import { getAllCharacters                         } from './dbapi/read/characters/get-all.ts';
import { getCharacterById, getCharactersByUserId } from './dbapi/read/characters/get-by-id.ts';
import { getSlotInfo, getAllSlotInfo             } from './dbapi/read/characters/get-slot-info.ts';
import { getPublicCharacters, getPublicCharacterById } from './dbapi/read/characters/get-public.ts';
import { getCharacterTransactions                } from './dbapi/read/characters/get-transactions.ts';
import { getCharacterInventory                   } from './dbapi/read/characters/get-inventory.ts';
import { removeFromInventory, addToInventory      } from './dbapi/write/characters/inventory.ts';
import { createCharacter                         } from './dbapi/write/characters/create.ts';
import { updateCharacter, updateCharacterFreeFields } from './dbapi/write/characters/update.ts';
import { updateCharacterStatus                   } from './dbapi/write/characters/update-status.ts';

import { approveCharacter, rejectCharacter, dispatchApproveCharacter, dispatchRejectCharacter } from './dbapi/write/characters/approve.ts';
import { deleteCharacter                             } from './dbapi/write/characters/delete.ts';
import { adjustCurrency                              } from './dbapi/write/characters/adjust-currency.ts';
import { grantCharacterSlot                      } from './dbapi/write/characters/slot-grant.ts';
import { checkAndClearRest, clearAllExpiredRest   } from './dbapi/write/characters/check-rest.ts';

// ── Prisma client ─────────────────────────────────────────────────────────────
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const db =
    globalForPrisma.prisma ??
    new PrismaClient({ adapter, log: ['error'] }); // query logging removed — too noisy in dev

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export * from '@prisma/client';

// ── Namespaced API ────────────────────────────────────────────────────────────
export const users = {
    getAll: getAllUsers, getById: getUserById,
    create: createUser, update: updateUser, updateDiscord: updateUserDiscord, delete: deleteUser, setPassword,
    getByDiscordId: getUserByDiscordId,
    getRoleIds: getUserRoleIds,
};

export const roles = {
    getAll: getAllRoles, getWithPermissions, getAllWithPermissions,
    create: createRole, updatePermissions, setUserRoles, delete: deleteRole,
};

export const platform = {
    getResources, getResourceNames, getResourceNavVisibility,
    getSettings, getSettingsMap, updateSetting, updateSettings,
};

export const analytics = { getPlatformMetrics, getUserGrowth };
export const audit      = { getLogs: getAuditLogs };
export const transactions = { registerUser };

export const gameSystems = {
    getAll:    getAllGameSystems,
    getActive: getActiveGameSystems,
    getById:   getGameSystemById,
    create:    createGameSystem,
    update:    updateGameSystem,
    delete:    deleteGameSystem,
    progression: { create: createProgressionThreshold, update: updateProgressionThreshold, delete: deleteProgressionThreshold },
};

export const dms = {
    ratings: {
        submit:          submitDMRating,
        getForQuest:     getDMRatingForQuest,
    },
    profiles: {
        getAll:       getAllDMProfiles,
        getById:      getDMProfileById,
        getByUserId:  getDMProfileByUserId,
        update:       updateDMProfile,
        revoke:       revokeDMRole,
    },
    roleRequests: {
        getAll:    getAllRoleRequests,
        getPending:  getPendingRoleRequestByUser,
        getLatestByUser: getLatestRoleRequestByUser,
        create:    createRoleRequest,
        approve:   approveRoleRequest,
        reject:    rejectRoleRequest,
        delete:    deleteRoleRequest,
    },
};

export const characters = {
    getAll:        getAllCharacters,
    getById:       getCharacterById,
    getByUserId:   getCharactersByUserId,
    getSlotInfo,
    getAllSlotInfo,
    getPublic:     getPublicCharacters,
    getPublicById: getPublicCharacterById,
    getTransactions:  getCharacterTransactions,
    getInventory:     getCharacterInventory,
    addInventory:     addToInventory,
    removeInventory:  removeFromInventory,
    create:           createCharacter,
    update:           updateCharacter,
    updateFreeFields: updateCharacterFreeFields,
    updateStatus:     updateCharacterStatus,
    approve:          approveCharacter,
    reject:           rejectCharacter,
    dispatchApprove:  dispatchApproveCharacter,
    dispatchReject:   dispatchRejectCharacter,
    delete:           deleteCharacter,
    adjustCurrency,
    grantSlot:        grantCharacterSlot,
    checkRest:        checkAndClearRest,
    clearExpiredRest: clearAllExpiredRest,
};

export const quests = {
    itemUsage: {
        submit:   submitItemUsages,
        approve:  approveItemUsage,
        reject:   rejectItemUsage,
        getForQuest: getItemUsagesForQuest,
    },
    getAll:                getAllQuests,
    getById:               getQuestById,
    getResult:             getQuestResultWithCharacters,
    getByDM:               getQuestsByDM,
    create:                createQuest,
    update:                updateQuest,
    updateRewards:         updateQuestRewards,
    updateStatus:          updateQuestStatus,
    addCoDM,
    removeCoDM,
    signup:                signupForQuest,
    cancelSignup,
    confirmWaitlistPromotion,
    submitResult:          submitQuestResult,
    approveResult:         approveQuestResult,
    rejectResult:          rejectQuestResult,
    delete:                deleteQuest,
};

export const marketplace = {
    items: {
        getAll:          getMarketplaceItems,
        getAllForExport:  getAllMarketplaceItemsForExport,
        search:          searchMarketplaceItems,
        getById:         getMarketplaceItemById,
        getByName:    getMarketplaceItemByName,
        upsert:       upsertMarketplaceItem,
        update:       updateMarketplaceItem,
        delete:       deleteMarketplaceItem,
        import:       importMarketplaceItems,
    },
    worldItems: {
        getAll:   getWorldMarketplaceItems,
        upsert:   upsertWorldMarketplaceItem,
        delete:   deleteWorldMarketplaceItem,
    },
    worldSettings: {
        get:    getWorldMarketplaceSetting,
        upsert: upsertWorldMarketplaceSetting,
    },
    resolveContext: resolveMarketplaceContext,
    transactions: {
        getAll:   getMarketplaceTransactions,
        buy:      createBuyTransaction,
        sell:     createSellTransaction,
        approve:  approveTransaction,
        reject:   rejectTransaction,
        cancel:   cancelTransaction,
        reward:   grantRewardItem,
    },
};

export const worlds = {
    getAll:           getAllWorlds,
    getBySlug:        getWorldBySlug,
    getById:          getWorldById,
    getByDMProfile:   getWorldsByDMProfile,
    create:           createWorld,
    update:           updateWorld,
    assignDM:         assignDMToWorld,
    updateDMPermission: updateWorldDMPermission,
    removeDM:         removeDMFromWorld,
    regions: {
        getBySlug:    getRegionBySlug,
        getById:      getRegionById,
        create:       createRegion,
        update:       updateRegion,
        assignDM:     assignDMToRegion,
        removeDM:     removeDMFromRegion,
    },
    locations: {
        getBySlug:    getLocationBySlug,
        create:       createLocation,
        update:       updateLocation,
    },
    wiki: {
        get:          getWikiPage,
        upsert:       upsertWikiPage,
    },
};

export { queueDiscordNotification };

export const tokenStore = {
    items: {
        getAll:         getTokenStoreItems,
        getById:        getTokenStoreItemById,
        getAllForExport: getAllTokenStoreItemsForExport,
        create:         createTokenStoreItem,
        update:         updateTokenStoreItem,
        delete:         deleteTokenStoreItem,
        import:         importTokenStoreItems,
    },
    transactions: {
        getAll:    getTokenStoreTransactions,
        getById:   getTokenStoreTransactionById,
        purchase:  createTokenStorePurchase,
        approve:   approveTokenStorePurchase,
        reject:    rejectTokenStorePurchase,
        revoke:       revokeTokenStorePurchase,
        recalculate:  recalculateTokenStoreBoost,
        getBoosts:    getActiveBoostsForCharacter,
    },
};

export const tavern = {
    channels: {
        getAll:           getTavernChannels,
        getById:          getTavernChannel,
        getByWorldId:     getTavernChannelByWorldId,
        getGlobal:        getGlobalTavernChannel,
        ensureGlobal:     ensureGlobalTavernChannel,
        ensureWorld:      ensureWorldTavernChannel,
        update:           updateTavernChannel,
    },
    messages: {
        get:     getTavernMessages,
        send:    sendTavernMessage,
        delete:  deleteTavernMessage,
    },
};

export const notifications = {
    getUnread:      getUnreadNotifications,
    getAll:         getNotifications,
    create:         createNotification,
    createForAdmins:   createNotificationsForAdmins,
    createForWorldDMs: createNotificationsForWorldDMs,
    markRead:       markNotificationRead,
    markAllRead:    markAllNotificationsRead,
};

export const achievements = {
    getAll:   getAllAchievements,
    getForCharacter: getCharacterAchievements,
    create:   createAchievement,
    update:   updateAchievement,
    grant:    grantAchievement,
    revoke:   revokeAchievement,
};

export const stats = {
    getPlatform: getPlatformStats,
    getPublic:   getPublicStats,
    getUser:     getUserStats,
};

export const availability = {
    setSlots,
    clearDay,
    clearSlot,
    clearSlots,
    adminDelete:    adminDeleteSlot,
    getForUser:     getUserAvailability,
    getForQuest:    getAvailableUsersForQuest,
    getAll:         getAllAvailability,
};

export const news = {
    announcements: {
        getAll:    getAllAnnouncements,
        getPublic: getAnnouncements,
        getById:   getAnnouncementById,
        create:    createAnnouncement,
        update:    updateAnnouncement,
        delete:    deleteAnnouncement,
    },
    worldJournals: {
        getAll:           getAllWorldJournals,
        getForUser:       getWorldJournals,
        getPage:          getWorldJournalPage,
        create:           createWorldJournal,
        update:           updateWorldJournal,
        delete:           deleteWorldJournal,
        createSection:    createWorldJournalSection,
        updateSection:    updateWorldJournalSection,
        deleteSection:    deleteWorldJournalSection,
        createPage:       createWorldJournalPage,
        updatePage:       updateWorldJournalPage,
        deletePage:       deleteWorldJournalPage,
    },
    wiki: {
        getAll:           getAllWikis,
        getForUser:       getWikis,
        getById:          getWikiById,
        getPage:          getWikiPageById,
        create:           createWiki,
        update:           updateWiki,
        delete:           deleteWiki,
        createSection:    createWikiSection,
        updateSection:    updateWikiSection,
        deleteSection:    deleteWikiSection,
        createPage:       createWikiPage,
        updatePage:       updateWikiPage,
        deletePage:       deleteWikiPage,
    },
    // legacy alias — remove after all routes migrated
    journals: {
        getAll:        getAllWikis,
        getForUser:    getWikis,
        getPage:       getWikiPageById,
        create:        createWiki,
        update:        updateWiki,
        delete:        deleteWiki,
        createSection:    createWikiSection,
        updateSection:    updateWikiSection,
        deleteSection:    deleteWikiSection,
        createPage:       createWikiPage,
        updatePage:       updateWikiPage,
        deletePage:       deleteWikiPage,
    },
    enrichers: {
        resolve: resolveEnrichers,
        search:  searchEnrichablesbyName,
    },
};

export const discord = {
    servers: {
        getAll:    getAllDiscordServers,
        getByScope: getDiscordServerByScope,
        upsert:    upsertDiscordServer,
        delete:    deleteDiscordServer,
    },
    notifications: {
        getPending: getPendingNotifications,
        markProcessed: markNotificationProcessed,
    },
    channels: {
        getForType:    getChannelForType,
        getAllForType:  getChannelsForType,
        upsert:     upsertDiscordChannel,
        delete:     deleteDiscordChannel,
    },
};

export const dnd5e = {
    classes: {
        getAll:    getAllDnd5eClasses,
        getActive: getDnd5eClasses,
        getById:   getDnd5eClassById,
        create:    createDnd5eClass,
        update:    updateDnd5eClass,
        delete:    deleteDnd5eClass,
    },
    classFeatures: {
        create: createClassFeature,
        update: updateClassFeature,
        delete: deleteClassFeature,
    },
    subclasses: {
        create: createDnd5eSubclass,
        update: updateDnd5eSubclass,
        delete: deleteDnd5eSubclass,
    },
    subclassFeatures: {
        create: createSubclassFeature,
        update: updateSubclassFeature,
        delete: deleteSubclassFeature,
    },
    species: {
        getAll:    getAllDnd5eSpecies,
        getActive: getDnd5eSpecies,
        create:    createDnd5eSpecies,
        update:    updateDnd5eSpecies,
        delete:    deleteDnd5eSpecies,
    },
    speciesTraits: {
        create: createSpeciesTrait,
        update: updateSpeciesTrait,
        delete: deleteSpeciesTrait,
    },
    backgrounds: {
        getAll:    getAllDnd5eBackgrounds,
        getActive: getDnd5eBackgrounds,
        create:    createDnd5eBackground,
        update:    updateDnd5eBackground,
        delete:    deleteDnd5eBackground,
    },
    getSystemData:       getDnd5eSystemData,
    getCharacterSheet:   getDnd5eCharacterSheet,
    enrichSignups:       enrichDnd5eSignups,
    feats: {
        getAll:         getDnd5eFeats,
        getAllForAdmin:  getAllDnd5eFeats,
        getById:        getDnd5eFeatById,
        create:         createDnd5eFeat,
        update:         updateDnd5eFeat,
        delete:         deleteDnd5eFeat,
    },
    saveAbilityScores:   saveDnd5eAbilityScores,
    applyAsiStatBump:    applyDnd5eAsiStatBump,
    addCharacterFeat:    addDnd5eCharacterFeat,
    removeCharacterFeat: removeDnd5eCharacterFeat,
    createCharacter:     createDnd5eCharacter,
    approveCharacter:    approveDnd5eCharacter,
    rejectCharacter:     rejectDnd5eCharacter,
    submitChanges:       submitDnd5eStructuralChanges,
    updateFields:        updateDnd5eCharacterFields,
    updateClasses:       updateDnd5eCharacterClasses,
};