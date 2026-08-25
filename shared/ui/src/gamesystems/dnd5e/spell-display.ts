// shared/ui/src/gamesystems/dnd5e/spell-display.ts
// Shared D&D 5e spell formatting helpers (spellbook + Codex).

export type SpellDamagePart = {
	dice: string;
	/** Damage type(s). When choice is true, caster picks one. */
	types: string[];
	/** Slash-separated types = choose one; otherwise a single fixed type. */
	choice: boolean;
	/** Compact badge text, e.g. "1d8 Acid / Cold / Fire" or "1d10 Piercing". */
	label: string;
};

/** Unicode emoji for damage types (no icon pack in `@core/ui`). */
const DMG_ICONS: Record<string, string> = {
	acid: '🧪',
	bludgeoning: '🔨',
	cold: '❄️',
	fire: '🔥',
	force: '✨',
	lightning: '⚡',
	necrotic: '💀',
	piercing: '🗡️',
	poison: '🐍',
	psychic: '🧠',
	radiant: '☀️',
	slashing: '⚔️',
	thunder: '💥',
};

/** Emoji for a damage type, or null if unknown (fall back to text only). */
export function spellDamageTypeIcon(type: string): string | null {
	return DMG_ICONS[type.toLowerCase()] ?? null;
}

/** Solid accent colour (legacy / non-UI). */
const DMG_ACCENT: Record<string, string> = {
	acid: '#4caf50', bludgeoning: '#78909c', cold: '#4fc3f7', fire: '#ff6d00',
	force: '#9c27b0', lightning: '#ffd600', necrotic: '#6a1b9a', piercing: '#607d8b',
	poison: '#2e7d32', psychic: '#e91e63', radiant: '#ffb300', slashing: '#546e7a',
	thunder: '#1e88e5',
};

export function spellDamageTypeColor(type: string): string {
	return DMG_ACCENT[type.toLowerCase()] ?? '#78909c';
}

/**
 * Parse spell/cantrip damage strings.
 *
 * - `+` between dice groups = additive (`1d10 Piercing + 2d6 Cold`)
 * - `/` between types on one dice group = choose one (`1d8 Acid / Cold / Fire`)
 */
export function parseSpellDamage(raw: string | null | undefined): SpellDamagePart[] {
	if (!raw?.trim()) return [];

	// Require whitespace around + so "1d8+1" style fragments stay intact if present.
	return raw.split(/\s+\+\s+/).flatMap(part => {
		const t = part.trim();
		if (!t) return [];

		const match = t.match(/^([\dd\s]+)\s+(.+)$/i);
		if (!match) {
			return [{ dice: t, types: [], choice: false, label: t }];
		}

		const dice = match[1].trim();
		const typeRaw = match[2].trim();
		const choice = /\//.test(typeRaw);
		const types = choice
			? typeRaw.split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean)
			: [typeRaw];

		const typeLabel = choice ? types.join(' / ') : (types[0] ?? '');
		return [{
			dice,
			types,
			choice,
			label: typeLabel ? `${dice} ${typeLabel}` : dice,
		}];
	});
}

export function spellOrdinal(n: number): string {
	return `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
}

export function spellLevelLabel(level: number): string {
	return level === 0 ? 'Cantrip' : `${spellOrdinal(level)} level`;
}

export function spellRangeLabel(spell: {
	rangeOrigin?: string | null;
	rangeValue?: number | null;
}): string | null {
	if (spell.rangeOrigin === 'Self') return 'Self';
	if (!spell.rangeOrigin && spell.rangeValue == null) return null;
	return [spell.rangeOrigin, spell.rangeValue != null ? `${spell.rangeValue} ft` : '']
		.filter(Boolean)
		.join(' ');
}

export function spellDurationLabel(spell: {
	durationType?: string | null;
	durationInterval?: number | null;
	durationUnit?: string | null;
}): string | null {
	if (!spell.durationType) return null;
	return [
		spell.durationInterval,
		spell.durationUnit,
		spell.durationType !== 'Timed' ? spell.durationType : '',
	].filter(Boolean).join(' ');
}

export function spellComponentsShort(components: string | null | undefined): string | null {
	if (!components) return null;
	return components.split('(')[0].trim();
}

export function spellMaterialNote(components: string | null | undefined): string | null {
	if (!components?.includes('(')) return null;
	return components.match(/\(([^)]+)\)/)?.[1] ?? null;
}

export function spellDamageRaw(spell: {
	level: number;
	cantripDamage?: string | null;
	spellDamage?: string | null;
}): string | null | undefined {
	return spell.level === 0 ? spell.cantripDamage : spell.spellDamage;
}

export function spellUpcastText(spell: {
	level: number;
	canCastAtHigherLevel?: boolean;
	spellUpcastPerSlot?: string | null;
	spellUpcastEveryTwoSlots?: string | null;
	spellProgression?: string | null;
	spellProgressionNote?: string | null;
}): string | null {
	if (!spell.canCastAtHigherLevel) return null;
	if (spell.spellUpcastPerSlot) {
		return `${spell.spellUpcastPerSlot} for each slot level above ${spellOrdinal(spell.level)}.`;
	}
	if (spell.spellUpcastEveryTwoSlots) {
		return `${spell.spellUpcastEveryTwoSlots} for every two slot levels above ${spellOrdinal(spell.level)}.`;
	}
	if (spell.spellProgressionNote) return spell.spellProgressionNote;
	if (spell.spellProgression) return spell.spellProgression;
	return null;
}
