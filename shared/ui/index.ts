// shared/ui/index.ts

// Layout components
export { default as AppShell }       from './components/layout/AppShell.svelte';
export { default as Sidebar }        from './components/layout/Sidebar.svelte';
export { default as NavItem }        from './components/layout/NavItem.svelte';
export { default as Header }         from './components/layout/Header.svelte';
export { default as NavBar }         from './components/layout/NavBar.svelte';
export { default as Footer }         from './components/layout/Footer.svelte';

// UI primitives
export { default as Button }         from './components/ui/Button.svelte';
export { default as Card }           from './components/ui/Card.svelte';
export { default as Badge }          from './components/ui/Badge.svelte';
export { default as Avatar }         from './components/ui/Avatar.svelte';
export { default as PermissionCell } from './components/ui/PermissionCell.svelte';

// Markdown
export { renderMarkdown } from './src/markdown.ts';