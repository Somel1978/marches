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
export { renderMarkdown, looksLikeMarkdown } from './src/markdown.ts';
export { default as DescriptionText } from './components/ui/DescriptionText.svelte';
export { default as NotificationBell } from './components/ui/NotificationBell.svelte';
export { default as ConfirmModal } from './components/ui/ConfirmModal.svelte';
export { default as WorldProgressionLadderEditor } from './src/progression/WorldProgressionLadderEditor.svelte';
export { default as WorldNeuralMap } from './src/world/WorldNeuralMap.svelte';
export { default as WorldCalendarEditor } from './src/world/WorldCalendarEditor.svelte';
export { default as WorldTimeline } from './src/world/WorldTimeline.svelte';
export { default as FantasyDateField } from './src/world/FantasyDateField.svelte';
export { default as RegionWeatherPanel } from './src/world/RegionWeatherPanel.svelte';
export type {
	NeuralEntityType,
	NeuralMapNodeView,
	NeuralMapEdgeView,
	NeuralCandidateView,
} from './src/world/neural-map-types.ts';
export type {
	CalendarDef,
	CalendarMonthDef,
	CalendarWeekdayDef,
	CalendarEraDef,
	CalendarMoonDef,
	TimelineEntryView,
	RegionWeatherRow,
} from './src/world/calendar-types.ts';
export {
	formatDate as formatWorldDate,
	fromAbsoluteDay,
	toAbsoluteDay,
	overviewStats,
	sortedMonths,
	moonPhase,
	moonsOnDay,
} from './src/world/calendar-engine.ts';
// Game system components — dnd5e
export { default as Dnd5eCharacterSheet }    from './src/gamesystems/dnd5e/Dnd5eCharacterSheet.svelte';
export { default as Dnd5eCharacterCreation } from './src/gamesystems/dnd5e/Dnd5eCharacterCreation.svelte';
export { default as Dnd5eAsiFeatsPanel }    from './src/gamesystems/dnd5e/Dnd5eAsiFeatsPanel.svelte';
export { default as Dnd5eCharacterCard }     from './src/gamesystems/dnd5e/Dnd5eCharacterCard.svelte';
export { default as Dnd5eSpellbooks }        from './src/gamesystems/dnd5e/Dnd5eSpellbooks.svelte';
export { default as Dnd5eSpellDetail }       from './src/gamesystems/dnd5e/Dnd5eSpellDetail.svelte';
export { default as SpellDamageBadges }      from './src/gamesystems/dnd5e/SpellDamageBadges.svelte';
export {
	parseSpellDamage,
	spellDamageTypeColor,
	spellDamageTypeIcon,
	spellLevelLabel,
	spellDamageRaw,
} from './src/gamesystems/dnd5e/spell-display.ts';
export { generateFantasyName }               from './src/gamesystems/dnd5e/name-generator.ts';
export { isAsiFeatureName, isEpicBoonFeatureName, normalizeFeatureName } from './src/gamesystems/dnd5e/feature-names.ts';