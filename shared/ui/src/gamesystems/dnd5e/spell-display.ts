// shared/ui/src/gamesystems/dnd5e/spell-display.ts
// Shared D&D 5e spell formatting helpers (spellbook + Codex).

const DMG_COLORS: Record<string, string> = {
	acid: '#4caf50', bludgeoning: '#78909c', cold: '#4fc3f7', fire: '#ff6d00',
	force: '#9c27b0', lightning: '#ffd600', necrotic: '#6a1b9a', piercing: '#607d8b',
	poison: '#2e7d32', psychic: '#e91e63', radiant: '#ffb300', slashing: '#546e7a',
	thunder: '#1e88e5',
};

export type SpellDamagePart = { dice: string; type: string; color: string };

export function parseSpellDamage(raw: string | null | undefined): SpellDamagePart[] {
	if (!raw) return [];
	return raw.split('+').map(part => {
		const t = part.trim();
		const match = t.match(/^([\dd\s]+)\s+(.+)$/i);
		if (!match) return { dice: t, type: '', color: '#78909c' };
		const type = match[2].trim();
		return { dice: match[1].trim(), type, color: DMG_COLORS[type.toLowerCase()] ?? '#78909c' };
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
