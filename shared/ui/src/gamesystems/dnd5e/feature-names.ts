// shared/ui/src/gamesystems/dnd5e/feature-names.ts
// Normalized matching for special D&D 5e feature/feat names.
// Stray whitespace or casing differences in imported data can cause
// strict === comparisons to silently fail. Always use these helpers.
// NOTE: intentionally duplicated in shared/database/dbapi/read/dnd5e/feature-names.ts
// (@core/database must not depend on @core/ui). Keep both in sync.

export function normalizeFeatureName(name: string | null | undefined): string {
    return (name ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function isAsiFeatureName(name: string | null | undefined): boolean {
    return normalizeFeatureName(name) === 'ability score improvement';
}

export function isEpicBoonFeatureName(name: string | null | undefined): boolean {
    const n = normalizeFeatureName(name);
    return n === 'epic boon' || n === 'epic boon feat';
}