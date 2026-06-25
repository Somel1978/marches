<!-- shared/ui/src/gamesystems/dnd5e/Dnd5eSkillsPanel.svelte -->
<script lang="ts">
	import { SKILL_DISPLAY, STAT_ABBR } from './skills';

	type Proficiency = 'NONE' | 'HALF_PROFICIENT' | 'PROFICIENT' | 'EXPERT';

	let {
		charSheet,
		canEdit       = false,
		onToggleSkill,
		onToggleSave,
	}: {
		charSheet:       any;
		canEdit?:        boolean;
		onToggleSkill?:  (skill: string, next: Proficiency, note?: string) => Promise<void>;
		onToggleSave?:   (stat: string, proficient: boolean, note?: string) => Promise<void>;
	} = $props();

	const skills       = $derived((charSheet?.skills       ?? []) as any[]);
	const savingThrows = $derived((charSheet?.savingThrows ?? []) as any[]);
	const pb           = $derived(charSheet?.proficiencyBonus ?? 2);
	const passive      = $derived(charSheet?.passivePerception ?? 10);

	// Split skills into 2 columns of 9
	const col1 = $derived(skills.slice(0, 9));
	const col2 = $derived(skills.slice(9));

	// Saving throws in 2 rows of 3
	const saveRow1 = $derived(savingThrows.slice(0, 3));
	const saveRow2 = $derived(savingThrows.slice(3));

	function fmtMod(n: number) { return n >= 0 ? `+${n}` : `${n}`; }

	// Convert Float value (0/0.5/1/2) → display proficiency string
	function valueToProf(value: number): Proficiency {
		if (value >= 2)   return 'EXPERT';
		if (value >= 1)   return 'PROFICIENT';
		if (value > 0)    return 'HALF_PROFICIENT';
		return 'NONE';
	}

	// Cycle through proficiency levels for canEdit toggle
	function profCycle(prof: Proficiency): Proficiency {
		if (prof === 'NONE')            return 'HALF_PROFICIENT';
		if (prof === 'HALF_PROFICIENT') return 'PROFICIENT';
		if (prof === 'PROFICIENT')      return 'EXPERT';
		return 'NONE';
	}

	function handleSkillClick(skill: string, currentProf: Proficiency) {
		if (!canEdit) return;
		const next = profCycle(currentProf);
		const note = window.prompt(`Override reason for ${skill} → ${next.replace(/_/g, ' ').toLowerCase()} (optional):`, '');
		// null = user cancelled the prompt → abort
		if (note === null) return;
		onToggleSkill?.(skill, next, note.trim() || undefined);
	}

	function handleSaveClick(stat: string, currentlyProficient: boolean) {
		if (!canEdit) return;
		const next = !currentlyProficient;
		const note = window.prompt(`Override reason for ${stat} save → ${next ? 'proficient' : 'not proficient'} (optional):`, '');
		if (note === null) return;
		onToggleSave?.(stat, next, note.trim() || undefined);
	}

	function pipClass(prof: Proficiency) {
		if (prof === 'EXPERT')          return 'pip pip--expert';
		if (prof === 'PROFICIENT')      return 'pip pip--prof';
		if (prof === 'HALF_PROFICIENT') return 'pip pip--half';
		return 'pip';
	}

	function rowClass(prof: Proficiency) {
		if (prof === 'EXPERT')          return 'sk-row sk-row--expert';
		if (prof === 'PROFICIENT')      return 'sk-row sk-row--prof';
		if (prof === 'HALF_PROFICIENT') return 'sk-row sk-row--half';
		return 'sk-row';
	}
</script>

<!-- ── Saving Throws ───────────────────────────────────────────────── -->
<div class="section-hdr">
	<span class="section-title">Saving Throws</span>
	<span class="section-meta">PB +{pb}</span>
</div>
<div class="saves-grid">
	{#each [saveRow1, saveRow2] as row}
		<div class="saves-row">
			{#each row as sv}
				<button
					type="button"
					class="save-cell {sv.proficient ? 'save-cell--prof' : ''}"
					disabled={!canEdit}
					onclick={() => handleSaveClick(sv.stat, sv.proficient)}
					aria-label="{sv.stat} {sv.proficient ? 'proficient' : 'none'}"
				>
					<span class="pip {sv.proficient ? 'pip--prof' : ''}">
						{#if sv.proficient}
							<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.5" fill="currentColor"/></svg>
						{:else}
							<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
						{/if}
					</span>
					<span class="save-mod">{fmtMod(sv.modifier)}</span>
					<span class="save-stat">{STAT_ABBR[sv.stat] ?? sv.stat}</span>
				</button>
			{/each}
		</div>
	{/each}
</div>

<!-- ── Skills ─────────────────────────────────────────────────────── -->
<div class="section-hdr" style="margin-top:0.875rem;">
	<span class="section-title">Skills</span>
	<span class="section-meta">Passive Perception {passive}</span>
</div>
<div class="skills-grid">
	{#each [col1, col2] as col}
		<div class="skills-col">
			{#each col as sk}
				{@const value = sk.value ?? 0}
				{@const prof  = valueToProf(value)}
				<button
					type="button"
					class={rowClass(prof)}
					disabled={!canEdit}
					onclick={() => handleSkillClick(sk.skill, prof)}
					aria-label="{sk.skill} {prof}"
					title="{SKILL_DISPLAY[sk.skill] ?? sk.skill}: {prof.replace(/_/g, ' ').toLowerCase()}"
				>
					<span class={pipClass(prof)}>
						{#if prof === 'EXPERT'}
							<svg width="10" height="10" viewBox="0 0 10 10">
								<circle cx="5" cy="5" r="4.5" fill="currentColor"/>
								<circle cx="5" cy="5" r="1.75" fill="var(--bg-surface)"/>
							</svg>
						{:else if prof === 'PROFICIENT'}
							<svg width="10" height="10" viewBox="0 0 10 10">
								<circle cx="5" cy="5" r="4.5" fill="currentColor"/>
							</svg>
						{:else if prof === 'HALF_PROFICIENT'}
							<svg width="10" height="10" viewBox="0 0 10 10">
								<circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
								<path d="M5 1 A4 4 0 0 1 5 9 Z" fill="currentColor"/>
							</svg>
						{:else}
							<svg width="10" height="10" viewBox="0 0 10 10">
								<circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
							</svg>
						{/if}
					</span>
					<span class="sk-mod">{fmtMod(sk.modifier)}</span>
					<span class="sk-name">{SKILL_DISPLAY[sk.skill] ?? sk.skill}</span>
					<span class="sk-attr">({STAT_ABBR[sk.ability] ?? sk.ability})</span>
				</button>
			{/each}
		</div>
	{/each}
</div>

<!-- ── Legend ─────────────────────────────────────────────────────── -->
<div class="legend">
	<span class="legend-item">
		<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
		None
	</span>
	<span class="legend-item legend-item--half">
		<svg width="10" height="10" viewBox="0 0 10 10">
			<circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
			<path d="M5 1 A4 4 0 0 1 5 9 Z" fill="currentColor"/>
		</svg>
		Half
	</span>
	<span class="legend-item legend-item--prof">
		<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.5" fill="currentColor"/></svg>
		Proficient
	</span>
	<span class="legend-item legend-item--expert">
		<svg width="10" height="10" viewBox="0 0 10 10">
			<circle cx="5" cy="5" r="4.5" fill="currentColor"/>
			<circle cx="5" cy="5" r="1.75" fill="var(--bg-surface)"/>
		</svg>
		Expertise
	</span>
</div>

<style>
.section-hdr {
	display: flex; align-items: center; justify-content: space-between;
	padding-bottom: 0.25rem;
	border-bottom: 1px solid var(--border-muted);
	margin-bottom: 0.375rem;
}
.section-title { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--accent-light); }
.section-meta  { font-size: 0.6875rem; color: var(--text-muted); }

.saves-grid  { display: flex; flex-direction: column; gap: 0.125rem; }
.saves-row   { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.125rem; }

.save-cell {
	display: flex; align-items: center; gap: 0.3rem;
	padding: 0.25rem 0.375rem; border-radius: 4px;
	background: none; border: none; cursor: default;
	color: var(--text-muted); font-size: 0.75rem;
	transition: background var(--transition-fast);
	text-align: left;
}
.save-cell--prof { color: var(--text-primary); }
.save-cell:not(:disabled) { cursor: pointer; }
.save-cell:not(:disabled):hover { background: var(--bg-overlay); }

.save-mod  { font-weight: 700; font-variant-numeric: tabular-nums; min-width: 1.75rem; text-align: right; font-size: 0.8125rem; }
.save-stat { font-weight: 600; font-size: 0.6875rem; }

.skills-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 0.5rem; }
.skills-col  { display: flex; flex-direction: column; }

.sk-row {
	display: flex; align-items: center; gap: 0.25rem;
	padding: 0.125rem 0.25rem; border-radius: 3px;
	background: none; border: none; cursor: default;
	color: var(--text-muted); font-size: 0.75rem;
	text-align: left; width: 100%;
	transition: background var(--transition-fast);
}
.sk-row--half   { color: var(--text-secondary); }
.sk-row--prof   { color: var(--text-primary); }
.sk-row--expert { color: var(--accent-light); }
.sk-row:not(:disabled) { cursor: pointer; }
.sk-row:not(:disabled):hover { background: var(--bg-overlay); }

.sk-mod  { min-width: 1.75rem; text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; font-size: 0.75rem; flex-shrink: 0; }
.sk-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sk-attr { font-size: 0.625rem; color: var(--text-disabled); flex-shrink: 0; }

.pip       { display: flex; align-items: center; justify-content: center; width: 14px; height: 14px; flex-shrink: 0; color: var(--text-disabled); }
.pip--half { color: var(--color-warning); }
.pip--prof { color: var(--color-success); }
.pip--expert { color: var(--accent-light); }

.legend {
	display: flex; flex-direction: row; align-items: center; gap: 0.875rem; flex-wrap: wrap;
	width: 100%;
	margin-top: 0.625rem; padding-top: 0.5rem;
	border-top: 1px solid var(--border-muted);
}
.legend-item {
	display: flex; align-items: center; gap: 0.25rem;
	font-size: 0.6875rem; color: var(--text-muted);
}
.legend-item--half   { color: var(--color-warning); }
.legend-item--prof   { color: var(--color-success); }
.legend-item--expert { color: var(--accent-light); }
</style>