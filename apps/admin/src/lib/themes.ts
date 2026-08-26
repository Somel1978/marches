// apps/admin/src/lib/themes.ts
// Parses available admin-selectable themes from the shared tokens.css file.
// Convention: any [data-theme="admin-*"] block preceded by /* theme-name: X */ is selectable.
// The default [data-theme="admin"] is always included as "Default".
// Mirrors apps/frontend/src/lib/themes.ts — kept separate because admin and
// frontend themes are named with different prefixes and must not cross-list.

import tokensCSS from '@core/ui/styles/tokens.css?raw';

export interface ThemeOption {
    key:         string;
    name:        string;
    bgBase:      string;
    bgSurface:   string;
    accent:      string;
    accentLight: string;
}

let _cache: ThemeOption[] | null = null;

export function getAvailableThemes(): ThemeOption[] {
    if (_cache) return _cache;

    const themes: ThemeOption[] = [];

    // Always include the default admin theme first
    const defaultTokens = extractTokens(tokensCSS, 'admin');
    themes.push({
        key:         'admin',
        name:        'Default',
        bgBase:      defaultTokens['--bg-base']       ?? '#0F1216',
        bgSurface:   defaultTokens['--bg-surface']    ?? '#1B1F25',
        accent:      defaultTokens['--accent']        ?? defaultTokens['--brand-accent'] ?? '#B8734A',
        accentLight: defaultTokens['--accent-light']  ?? defaultTokens['--brand-accent-light'] ?? '#E6A87A',
    });

    // Find all /* theme-name: X */ immediately followed by [data-theme="admin-*"]
    // \s* only — no arbitrary CSS allowed between comment and selector (prevents
    // the Default comment from being matched to a distant admin-* selector)
    const pattern = /\/\*\s*theme-name:\s*([^*]+)\*\/\s*\[data-theme="(admin-[^"]+)"\]/g;
    let match;
    while ((match = pattern.exec(tokensCSS)) !== null) {
        const name   = match[1].trim();
        const key    = match[2].trim();
        const tokens = extractTokens(tokensCSS, key);
        themes.push({
            key,
            name,
            bgBase:      tokens['--bg-base']             ?? '#0F1216',
            bgSurface:   tokens['--bg-surface']          ?? '#1B1F25',
            accent:      tokens['--accent']              ?? tokens['--brand-accent'] ?? '#B8734A',
            accentLight: tokens['--accent-light']        ?? tokens['--brand-accent-light'] ?? '#E6A87A',
        });
    }

    _cache = themes;
    return themes;
}

function extractTokens(css: string, themeKey: string): Record<string, string> {
    // Also extract :root tokens so we can resolve var(--*) references
    const rootMatch = css.match(/:root\s*\{([^}]+)\}/s);
    const rootTokens: Record<string, string> = {};
    if (rootMatch) {
        for (const line of rootMatch[1].split('\n')) {
            const m = line.match(/^\s*(--[\w-]+)\s*:\s*([^;]+);/);
            if (m) rootTokens[m[1].trim()] = m[2].trim();
        }
    }

    const blockPattern = new RegExp(
        `\\[data-theme="${themeKey}"\\]\\s*\\{([^}]+)\\}`, 's'
    );
    const blockMatch = css.match(blockPattern);
    if (!blockMatch) return {};

    const tokens: Record<string, string> = {};
    for (const line of blockMatch[1].split('\n')) {
        const m = line.match(/^\s*(--[\w-]+)\s*:\s*([^;]+);/);
        if (m) tokens[m[1].trim()] = m[2].trim();
    }

    // Resolve var(--*) references — look up in the same theme block first, then :root
    for (const [key, val] of Object.entries(tokens)) {
        const ref = val.match(/^var\(--([\w-]+)\)$/);
        if (ref) {
            const refKey = `--${ref[1]}`;
            tokens[key] = tokens[refKey] ?? rootTokens[refKey] ?? val;
        }
    }

    return tokens;
}

export function validateTheme(theme: string): string {
    const valid = getAvailableThemes().map(t => t.key);
    return valid.includes(theme) ? theme : 'admin';
}
