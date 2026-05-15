// shared/database/seeds/01-platform.seed.ts
import type { PrismaClient } from '@prisma/client';

const MODULES: {
    name:        string;
    description: string;
    sortOrder:   number;
    resources: {
        key:           string;
        displayName:   string;
        description:   string;
        sortOrder:     number;
        navVisibility: 'NONE' | 'ANY' | 'ALL';
    }[];
}[] = [
    {
        name:        'Platform',
        description: 'Core platform administration',
        sortOrder:   0,
        resources: [
            { key: 'System',   displayName: 'System',    description: 'Admin panel access gate',  sortOrder: 0, navVisibility: 'ANY'  },
            { key: 'Module',   displayName: 'Modules',   description: 'Feature module registry', sortOrder: 1, navVisibility: 'NONE' },
            { key: 'Resource', displayName: 'Resources', description: 'Resource registry',       sortOrder: 2, navVisibility: 'NONE' },
            { key: 'AuditLog', displayName: 'Audit Log', description: 'Platform audit trail',    sortOrder: 3, navVisibility: 'ANY'  },
        ],
    },
    {
        name:        'User Management',
        description: 'Users, roles and permissions',
        sortOrder:   1,
        resources: [
            { key: 'User',       displayName: 'Users',       description: 'User accounts',    sortOrder: 0, navVisibility: 'ANY'  },
            { key: 'Role',       displayName: 'Roles',       description: 'Roles',            sortOrder: 1, navVisibility: 'ALL'  },
            { key: 'Permission', displayName: 'Permissions', description: 'Role permissions', sortOrder: 2, navVisibility: 'NONE' },
        ],
    },
];

const SETTINGS: {
    key:         string;
    value:       string | null;
    description: string;
    isSecret:    boolean;
}[] = [
    // SMTP
    { key: 'smtp.host',    value: null,                    description: 'SMTP server hostname',           isSecret: false },
    { key: 'smtp.port',    value: '587',                   description: 'SMTP server port',               isSecret: false },
    { key: 'smtp.user',    value: null,                    description: 'SMTP username',                   isSecret: false },
    { key: 'smtp.pass',    value: null,                    description: 'SMTP password',                   isSecret: true  },
    { key: 'smtp.secure',  value: 'false',                 description: 'Use TLS (true for port 465)',    isSecret: false },
    // Email
    { key: 'email.from',     value: 'noreply@marches.local', description: 'From address for system emails', isSecret: false },
    { key: 'email.fromName', value: 'Marches',               description: 'From name for system emails',   isSecret: false },
    // Site
    { key: 'site.url',  value: 'http://localhost:5173', description: 'Frontend URL — used in email links', isSecret: false },
    { key: 'site.name', value: 'Marches',               description: 'Site name used in emails',          isSecret: false },
];

export async function seedPlatform(db: PrismaClient) {
    console.log('  └─ Seeding Platform...');

    for (const mod of MODULES) {
        const module = await db.module.upsert({
            where:  { name: mod.name },
            update: {},
            create: { name: mod.name, description: mod.description, sortOrder: mod.sortOrder },
        });
        for (const res of mod.resources) {
            await db.resource.upsert({
                where:  { key: res.key },
                update: { displayName: res.displayName, navVisibility: res.navVisibility },
                create: { key: res.key, displayName: res.displayName, description: res.description, sortOrder: res.sortOrder, navVisibility: res.navVisibility, moduleId: module.id },
            });
        }
        console.log(`     Module: ${mod.name} (${mod.resources.length} resources)`);
    }

    for (const setting of SETTINGS) {
        await db.setting.upsert({
            where:  { key: setting.key },
            // Never overwrite an existing value on reseed — admin may have changed it
            update: {},
            create: { key: setting.key, value: setting.value, description: setting.description, isSecret: setting.isSecret },
        });
    }
    console.log(`     Settings: ${SETTINGS.length} seeded`);
}