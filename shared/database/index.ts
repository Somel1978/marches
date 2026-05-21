// shared/database/index.ts
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// ── Users ─────────────────────────────────────────────────────────────────────
import { getAll    as getAllUsers  } from './dbapi/read/users/get-all.ts';
import { getById   as getUserById  } from './dbapi/read/users/get-by-id.ts';
import { createUser                } from './dbapi/write/users/create.ts';
import { updateUser                } from './dbapi/write/users/update.ts';
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
import { getAllGameSystems, getAvailableGameSystems } from './dbapi/read/gamesystem/get-all.ts';
import { getGameSystemById                          } from './dbapi/read/gamesystem/get-by-id.ts';
import { createGameSystem, updateGameSystem, deleteGameSystem } from './dbapi/write/gamesystem/game-system.ts';
import { createClass, updateClass, deleteClass       } from './dbapi/write/gamesystem/class.ts';
import { createSubclass, updateSubclass, deleteSubclass } from './dbapi/write/gamesystem/subclass.ts';
import { createProgressionThreshold, updateProgressionThreshold, deleteProgressionThreshold } from './dbapi/write/gamesystem/progression.ts';
import { createSpecies, updateSpecies, deleteSpecies } from './dbapi/write/gamesystem/species.ts';

// ── World ────────────────────────────────────────────────────────────────────────
import { getAllWorlds, getWorldBySlug, getWorldById  } from './dbapi/read/world/get-worlds.ts';
import { getRegionBySlug, getRegionById,
         getLocationBySlug                           } from './dbapi/read/world/get-regions.ts';
import { getWikiPage                                 } from './dbapi/read/world/get-wiki.ts';
import { createWorld, updateWorld, createRegion,
         updateRegion, assignDMToRegion,
         removeDMFromRegion, createLocation,
         updateLocation                              } from './dbapi/write/world/worlds.ts';
import { upsertWikiPage                              } from './dbapi/write/world/wiki.ts';

// ── Marketplace ──────────────────────────────────────────────────────────────────
import { getMarketplaceItems, getMarketplaceItemById,
         getMarketplaceItemByName                         } from './dbapi/read/marketplace/get-items.ts';
import { getMarketplaceTransactions                       } from './dbapi/read/marketplace/get-transactions.ts';
import { upsertMarketplaceItem, updateMarketplaceItem,
         deleteMarketplaceItem                           } from './dbapi/write/marketplace/items.ts';
import { createBuyTransaction, createSellTransaction,
         approveTransaction, rejectTransaction,
         cancelTransaction, grantRewardItem               } from './dbapi/write/marketplace/transactions.ts';
import { importMarketplaceItems                           } from './dbapi/write/marketplace/import.ts';

// ── Quests ───────────────────────────────────────────────────────────────────────
import { getAllQuests                                     } from './dbapi/read/quests/get-all.ts';
import { getQuestById, getQuestsByDM                     } from './dbapi/read/quests/get-by-id.ts';
import { createQuest                                     } from './dbapi/write/quests/create.ts';
import { updateQuest, updateQuestRewards, addCoDM,
         removeCoDM                                      } from './dbapi/write/quests/update.ts';
import { updateQuestStatus                               } from './dbapi/write/quests/update-status.ts';
import { signupForQuest, cancelSignup,
         confirmWaitlistPromotion                        } from './dbapi/write/quests/signup.ts';
import { submitQuestResult, approveQuestResult,
         rejectQuestResult                               } from './dbapi/write/quests/submit-result.ts';
import { deleteQuest                                     } from './dbapi/write/quests/delete.ts';

// ── DMs ──────────────────────────────────────────────────────────────────────────
import { getAllDMProfiles, getAllRoleRequests   } from './dbapi/read/dms/get-all.ts';
import { getDMProfileById, getDMProfileByUserId,
         getPendingRoleRequestByUser,
         getLatestRoleRequestByUser              } from './dbapi/read/dms/get-by-id.ts';
import { createRoleRequest, approveRoleRequest,
         rejectRoleRequest, deleteRoleRequest    } from './dbapi/write/dms/role-request.ts';
import { updateDMProfile, revokeDMRole          } from './dbapi/write/dms/dm-profile.ts';

// ── Characters ────────────────────────────────────────────────────────────────────
import { getAllCharacters                         } from './dbapi/read/characters/get-all.ts';
import { getCharacterById, getCharactersByUserId } from './dbapi/read/characters/get-by-id.ts';
import { getSlotInfo, getAllSlotInfo             } from './dbapi/read/characters/get-slot-info.ts';
import { getCharacterTransactions                } from './dbapi/read/characters/get-transactions.ts';
import { getCharacterInventory                   } from './dbapi/read/characters/get-inventory.ts';
import { removeFromInventory, addToInventory      } from './dbapi/write/characters/inventory.ts';
import { createCharacter                         } from './dbapi/write/characters/create.ts';
import { updateCharacter                         } from './dbapi/write/characters/update.ts';
import { updateCharacterStatus                   } from './dbapi/write/characters/update-status.ts';
import { updateCharacterClasses                  } from './dbapi/write/characters/update-classes.ts';
import { approveCharacter, rejectCharacter       } from './dbapi/write/characters/approve.ts';
import { deleteCharacter                             } from './dbapi/write/characters/delete.ts';
import { adjustCurrency                              } from './dbapi/write/characters/adjust-currency.ts';
import { grantCharacterSlot                      } from './dbapi/write/characters/slot-grant.ts';
import { checkAndClearRest                       } from './dbapi/write/characters/check-rest.ts';

// ── Prisma client ─────────────────────────────────────────────────────────────
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const db =
    globalForPrisma.prisma ??
    new PrismaClient({ adapter, log: process.env.NODE_ENV === 'development' ? ['query','error','warn'] : ['error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export * from '@prisma/client';

// ── Namespaced API ────────────────────────────────────────────────────────────
export const users = {
    getAll: getAllUsers, getById: getUserById,
    create: createUser, update: updateUser, delete: deleteUser, setPassword,
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
    getAll:       getAllGameSystems,
    getAvailable: getAvailableGameSystems,
    getById:      getGameSystemById,
    create:       createGameSystem,
    update:       updateGameSystem,
    delete:       deleteGameSystem,
    classes:    { create: createClass,    update: updateClass,    delete: deleteClass    },
    subclasses: { create: createSubclass, update: updateSubclass, delete: deleteSubclass },
    progression:{ create: createProgressionThreshold, update: updateProgressionThreshold, delete: deleteProgressionThreshold },
    species:    { create: createSpecies,  update: updateSpecies,  delete: deleteSpecies  },
};

export const dms = {
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
    getTransactions:  getCharacterTransactions,
    getInventory:     getCharacterInventory,
    addInventory:     addToInventory,
    removeInventory:  removeFromInventory,
    create:        createCharacter,
    update:        updateCharacter,
    updateStatus:  updateCharacterStatus,
    updateClasses: updateCharacterClasses,
    approve:       approveCharacter,
    reject:        rejectCharacter,
    delete:        deleteCharacter,
    adjustCurrency,
    grantSlot:     grantCharacterSlot,
    checkRest:     checkAndClearRest,
};

export const quests = {
    getAll:                getAllQuests,
    getById:               getQuestById,
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
        getAll:       getMarketplaceItems,
        getById:      getMarketplaceItemById,
        getByName:    getMarketplaceItemByName,
        upsert:       upsertMarketplaceItem,
        update:       updateMarketplaceItem,
        delete:       deleteMarketplaceItem,
        import:       importMarketplaceItems,
    },
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
    create:           createWorld,
    update:           updateWorld,
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