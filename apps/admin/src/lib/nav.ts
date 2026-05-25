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
        resourceKey: 'World',
        label:       'World',
        href:        '/world',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
        children: [
            { label: 'Worlds',    href: '/world' },
            { label: 'Settings',  href: '/world/settings' },
        ],
    },
       {
        resourceKey: 'Discord',
        label:       'Discord',
        href:        '/discord',
        icon:        `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>`,
        activeMatch: (pathname: string) => pathname.startsWith('/discord'),
    },
    {
        resourceKey: 'MarketplaceItem',
        label:       'Marketplace',
        href:        '/marketplace',
        icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
        children: [
            { label: 'Items',        href: '/marketplace/items' },
            { label: 'Transactions', href: '/marketplace/transactions' },
            { label: 'Import',       href: '/marketplace/import' },
            { label: 'Settings',     href: '/marketplace/settings' },
        ],
    },
    {
        resourceKey: 'Announcement',
        label:       'News',
        href:        '/news',
        icon:        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a4 4 0 0 1-4-4V6"/><path d="M2 13.5A2.5 2.5 0 0 0 4.5 16H6"/><path d="M8 6h8"/><path d="M8 10h8"/><path d="M8 14h4"/></svg>`,
        activeMatch: (pathname: string) => pathname.startsWith('/news'),
    },
    {
        resourceKey: 'Journal',
        label:       'Journals',
        href:        '/journal',
        icon:        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
        activeMatch: (pathname: string) => pathname.startsWith('/journal'),
    },
    {
        resourceKey: 'Availability',
        label:       'Availability',
        href:        '/availability',
        icon:        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
        activeMatch: (pathname: string) => pathname.startsWith('/availability'),
    },
    {
        resourceKey: null,
        label:       'Rewards',
        href:        '/rewards',
        icon:        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
        activeMatch: (pathname: string) => pathname.startsWith('/rewards'),
        children: [
            { label: 'Overview',      href: '/rewards' },
            { label: 'Achievements',  href: '/rewards/achievements' },
            { label: 'Grant reward',  href: '/rewards/grant' },
        ],
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