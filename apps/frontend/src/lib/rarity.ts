// apps/frontend/src/lib/rarity.ts
// Single source of truth for D&D 5e item rarity badge classes.
// Uses fixed theme-independent CSS classes so rarity colours
// never change with the user's selected theme.

export const RARITY_BADGE: Record<string, string> = {
	Mundane:   'badge-rarity-common',
	Common:    'badge-rarity-common',
	Uncommon:  'badge-rarity-uncommon',
	Rare:      'badge-rarity-rare',
	Very_Rare: 'badge-rarity-very-rare',
	Legendary: 'badge-rarity-legendary',
	Artifact:  'badge-rarity-artifact',
	Unknown:   'badge-muted',
};

export const RARITIES = [
	'Mundane', 'Common', 'Uncommon', 'Rare',
	'Very_Rare', 'Legendary', 'Artifact',
] as const;

export type Rarity = typeof RARITIES[number];

export function rarityBadge(rarity: string | null | undefined): string {
	return RARITY_BADGE[rarity ?? ''] ?? 'badge-muted';
}

export function rarityLabel(rarity: string | null | undefined): string {
	return (rarity ?? '').replace('_', ' ');
}
