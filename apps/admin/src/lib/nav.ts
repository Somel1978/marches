// apps/admin/src/lib/nav.ts

// ── Nav Contract ──────────────────────────────────────────────────────────────
// Single source of truth for admin navigation.
// href and activeMatch can be static strings or functions resolved at
// render time by the layout server — the layout svelte only ever sees
// resolved strings and booleans, never functions.
//
// NavContext carries what's needed to resolve dynamic hrefs:
//   userId — the requesting user's ID
//   level  — their resolved permission level for this resource (OWN | ALL)
//
// To add a new route: add one entry here. Nothing else changes.
// ─────────────────────────────────────────────────────────────────────────────

export type PermissionLevel = 'NONE' | 'OWN' | 'ALL';

export type NavContext = {
    userId: string;
    level:  PermissionLevel;
};

export type NavItemDef = {
    label:        string;
    icon:         string;
    resourceKey:  string | null;  // null = always visible, no permission check
    // Static string or function resolved with NavContext
    href:         string | ((ctx: NavContext) => string);
    // Optional: override active check. Default: pathname.startsWith(resolvedHref)
    // Use when OWN and ALL resolve to different hrefs with different active patterns
    activeMatch?: string | ((pathname: string, ctx: NavContext) => boolean);
    // Optional sub-items shown when parent is active
    children?: { label: string; href: string }[];
};

// Resolved nav item — what the layout svelte receives (no functions)
export type ResolvedNavItem = {
    label:    string;
    icon:     string;
    href:     string;
    active:   boolean;
    children?: { label: string; href: string; active: boolean }[];
};

export const NAV_ITEMS: NavItemDef[] = [
    {
        resourceKey: null,
        label:       'Dashboard',
        href:        '/',
        activeMatch: (pathname) => pathname === '/',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    },
    {
        resourceKey: 'User',
        label:       'Users',
        // ALL → full list, OWN → own profile only
        href:        ({ userId, level }) => level === 'OWN' ? `/users/${userId}` : '/users',
        // Active: /users list OR own profile page
        activeMatch: (pathname, { userId, level }) =>
            level === 'OWN'
                ? pathname === `/users/${userId}`
                : pathname.startsWith('/users'),
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    },
    {
        resourceKey: 'Role',
        label:       'Roles & Permissions',
        href:        '/roles',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    },
    {
        resourceKey: 'Quest',
        label:       'Quests',
        href:        '/quests',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
        children: [
            { label: 'All Quests', href: '/quests' },
            { label: 'Settings',   href: '/quests/settings' },
        ],
    },
    {
        resourceKey: 'DMProfile',
        label:       'DM Hub',
        href:        '/dms',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
        children: [
            { label: 'DM Profiles',    href: '/dms' },
            { label: 'Role Requests',  href: '/role-requests' },
            { label: 'Settings',       href: '/dms/settings' },
        ],
    },
    {
        resourceKey: 'Character',
        label:       'Characters',
        href:        '/characters',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        children: [
            { label: 'All Characters', href: '/characters' },
            { label: 'Slots',          href: '/characters/slots' },
            { label: 'Settings',       href: '/characters/settings' },
        ],
    },
    {
        resourceKey: 'GameSystem',
        label:       'Game Systems',
        href:        '/game-systems',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
    },
    {
        resourceKey: 'AuditLog',
        label:       'Audit Log',
        href:        '/audit',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    },
    // ── Add new routes here ────────────────────────────────────────────────────
    // Example with OWN/ALL split:
    // {
    //     resourceKey: 'Quest',
    //     label:       'Quests',
    //     href:        ({ userId, level }) => level === 'OWN' ? `/quests?actor=${userId}` : '/quests',
    //     activeMatch: (pathname) => pathname.startsWith('/quests'),
    //     icon: `...`,
    // },
];

export const FOOTER_ITEMS: NavItemDef[] = [
    {
        resourceKey: 'System',
        label:       'Settings',
        href:        '/settings',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    },
];