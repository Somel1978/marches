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

	const col1 = $derived(skills.slice(0, 9));
	const col2 = $derived(skills.slice(9));
	const saveRow1 = $derived(savingThrows.slice(0, 3));
	const saveRow2 = $derived(savingThrows.slice(3));

	// ── Inline editor state ────────────────────────────────────────────────────
	let editingSkill:  string | null = $state(null); // skill key being edited
	let editingSave:   string | null = $state(null); // stat key being edited
	let editProf:      Proficiency   = $state('NONE');
	let editProficient: boolean      = $state(false);
	let editNote:      string        = $state('');
	let saving:        boolean       = $state(false);

	function openSkillEditor(sk: any) {
		if (!canEdit) return;
		editingSkill  = sk.skill;
		editingSave   = null;
		// Start from the current override value if one exists, otherwise effective value
		editProf      = valueToProf(sk.overrideValue !== null ? sk.overrideValue : sk.value ?? 0);
		editNote      = sk.overrideNote ?? '';
	}

	function openSaveEditor(sv: any) {
		if (!canEdit) return;
		editingSave   = sv.stat;
		editingSkill  = null;
		editProficient = sv.proficient;
		editNote       = '';
	}

	function closeEditor() {
		editingSkill = null;
		editingSave  = null;
		editNote     = '';
	}

	async function commitSkill() {
		if (!editingSkill || saving) return;
		saving = true;
		await onToggleSkill?.(editingSkill, editProf, editNote.trim() || undefined);
		saving = false;
		closeEditor();
	}

	async function commitSave() {
		if (!editingSave || saving) return;
		saving = true;
		await onToggleSave?.(editingSave, editProficient, editNote.trim() || undefined);
		saving = false;
		closeEditor();
	}

	function fmtMod(n: number) { return n >= 0 ? `+${n}` : `${n}`; }

	function valueToProf(value: number): Proficiency {
		if (value >= 2)   return 'EXPERT';
		if (value >= 1)   return 'PROFICIENT';
		if (value > 0)    return 'HALF_PROFICIENT';
		return 'NONE';
	}

	function profLabel(value: number): string {
		if (value >= 2)  return 'Expertise';
		if (value >= 1)  return 'Proficient';
		if (value > 0)   return 'Half proficiency';
		return 'None';
	}

	function buildTooltip(sk: any): string {
		const parts: string[] = [];
		if (sk.overrideValue !== null) {
			parts.push(`Manual override: ${profLabel(sk.overrideValue)}`);
			if (sk.overrideNote) parts.push(`Note: ${sk.overrideNote}`);
			const natural = (sk.grantSources ?? []).map((g: any) => `${g.label} (${profLabel(g.value)})`).join(', ');
			if (natural) parts.push(`Natural grants: ${natural}`);
		} else if ((sk.grantSources ?? []).length) {
			parts.push(...(sk.grantSources as any[]).map((g: any) => `${g.label}: ${profLabel(g.value)}`));
		}
		return parts.join(' | ');
	}

	function buildSaveTooltip(sv: any): string {
		const parts: string[] = [];
		if (sv.hasOverride) {
			parts.push(`Manual override: ${sv.proficient ? 'Proficient' : 'Not proficient'}`);
			if (sv.overrideNote) parts.push(`Note: ${sv.overrideNote}`);
			const natural = (sv.grantSources ?? []).map((g: any) => g.label).join(', ');
			if (natural) parts.push(`Natural grants: ${natural}`);
		} else if ((sv.grantSources ?? []).length) {
			parts.push(...(sv.grantSources as any[]).map((g: any) => g.label));
		}
		return parts.join(' | ');
	}

	function pipClass(prof: Proficiency) {
		if (prof === 'EXPERT')          return 'pip pip--expert';
		if (prof === 'PROFICIENT')      return 'pip pip--prof';
		if (prof === 'HALF_PROFICIENT') return 'pip pip--half';
		return 'pip';
	}

	function rowClass(prof: Proficiency, isEditing: boolean) {
		let cls = 'sk-row';
		if (prof === 'EXPERT')          cls += ' sk-row--expert';
		else if (prof === 'PROFICIENT') cls += ' sk-row--prof';
		else if (prof === 'HALF_PROFICIENT') cls += ' sk-row--half';
		if (isEditing) cls += ' sk-row--editing';
		return cls;
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
				{@const isEditing = editingSave === sv.stat}
				<button
					type="button"
					class="save-cell {sv.proficient ? 'save-cell--prof' : ''} {isEditing ? 'save-cell--editing' : ''}"
					disabled={!canEdit}
					onclick={() => isEditing ? closeEditor() : openSaveEditor(sv)}
					aria-label="{sv.stat} {sv.proficient ? 'proficient' : 'none'}"
					title={buildSaveTooltip(sv) || `${STAT_ABBR[sv.stat] ?? sv.stat}: ${sv.proficient ? 'Proficient' : 'None'}`}
				>
					<span class="pip {sv.proficient ? 'pip--prof' : ''}">
						{#if sv.proficient}
							<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.5" fill="currentColor"/></svg>
						{:else}
							<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
						{/if}
					</span>
					<span class="save-mod">{fmtMod(sv.modifier)}</span>
					<span class="save-stat">
						{STAT_ABBR[sv.stat] ?? sv.stat}
						{#if canEdit && sv.hasOverride}<span class="sk-override-dot" title="Manually overridden">●</span>{/if}
					</span>
				</button>
				{#if isEditing}
					<div class="inline-editor inline-editor--save">
						<span class="inline-editor__label">{STAT_ABBR[sv.stat] ?? sv.stat} Save</span>
						<label class="inline-editor__toggle">
							<input type="checkbox" bind:checked={editProficient} />
							Proficient
						</label>
						<input
							class="inline-editor__note"
							type="text"
							placeholder="Note (optional)"
							bind:value={editNote}
							onkeydown={(e) => { if (e.key === 'Enter') commitSave(); if (e.key === 'Escape') closeEditor(); }}
						/>
						<div class="inline-editor__actions">
							<button type="button" class="btn btn-primary btn-xs" onclick={commitSave} disabled={saving}>
								{saving ? '…' : 'Save'}
							</button>
							<button type="button" class="btn btn-ghost btn-xs" onclick={closeEditor}>Cancel</button>
						</div>
					</div>
				{/if}
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
				{@const isEditing = editingSkill === sk.skill}
				<button
					type="button"
					class={rowClass(prof, isEditing)}
					disabled={!canEdit}
					onclick={() => isEditing ? closeEditor() : openSkillEditor(sk)}
					aria-label="{sk.skill} {prof}"
					title={buildTooltip(sk) || `${SKILL_DISPLAY[sk.skill] ?? sk.skill}: ${prof.replace(/_/g, ' ').toLowerCase()}`}
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
					<span class="sk-name">
						{SKILL_DISPLAY[sk.skill] ?? sk.skill}
						{#if canEdit && sk.overrideValue !== null}
							<span class="sk-override-dot" title="Manually overridden">●</span>
						{/if}
					</span>
					<span class="sk-attr">({STAT_ABBR[sk.ability] ?? sk.ability})</span>
				</button>
			{/each}
		</div>
	{/each}
</div>

{#if editingSkill}
	{@const sk = skills.find(s => s.skill === editingSkill)}
	{#if sk}
		<div class="inline-editor">
			<div class="inline-editor__header">
				<span class="inline-editor__label">{SKILL_DISPLAY[sk.skill] ?? sk.skill}</span>
				<span class="inline-editor__badge">Manual Override</span>
			</div>
			{#if sk.overrideValue !== null}
				<p class="inline-editor__hint">Current: {profLabel(sk.overrideValue)}{sk.overrideNote ? ` — ${sk.overrideNote}` : ''}. Setting to <strong>None</strong> removes the override and restores natural grants.</p>
			{:else if (sk.grantSources ?? []).length}
				<p class="inline-editor__hint">Natural grants: {(sk.grantSources as any[]).map((g: any) => `${g.label} (${profLabel(g.value)})`).join(', ')}. Setting an override will take precedence.</p>
			{:else}
				<p class="inline-editor__hint">No natural grants. Setting to <strong>None</strong> removes any override.</p>
			{/if}
			<div class="inline-editor__prof-btns">
				{#each (['NONE', 'HALF_PROFICIENT', 'PROFICIENT', 'EXPERT'] as Proficiency[]) as p}
					<button
						type="button"
						class="prof-btn {editProf === p ? 'prof-btn--active' : ''}"
						onclick={() => editProf = p}
					>
						{#if p === 'NONE'}None
						{:else if p === 'HALF_PROFICIENT'}Half
						{:else if p === 'PROFICIENT'}Prof
						{:else}Expert{/if}
					</button>
				{/each}
			</div>
			<input
				class="inline-editor__note"
				type="text"
				placeholder="Note (optional)"
				bind:value={editNote}
				onkeydown={(e) => { if (e.key === 'Enter') commitSkill(); if (e.key === 'Escape') closeEditor(); }}
			/>
			<div class="inline-editor__actions">
				<button type="button" class="btn btn-primary btn-xs" onclick={commitSkill} disabled={saving}>
					{saving ? '…' : 'Save'}
				</button>
				<button type="button" class="btn btn-ghost btn-xs" onclick={closeEditor}>Cancel</button>
			</div>
		</div>
	{/if}
{/if}

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
	{#if canEdit}
		<span class="legend-item" style="margin-left:auto;font-style:italic;color:var(--text-disabled);">Click a skill to edit</span>
	{/if}
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
.save-cell--prof    { color: var(--text-primary); }
.save-cell--editing { background: var(--bg-overlay); outline: 1px solid var(--accent-muted); }
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
.sk-row--half    { color: var(--text-secondary); }
.sk-row--prof    { color: var(--text-primary); }
.sk-row--expert  { color: var(--accent-light); }
.sk-row--editing { background: var(--bg-overlay); outline: 1px solid var(--accent-muted); border-radius: 3px; }
.sk-row:not(:disabled) { cursor: pointer; }
.sk-row:not(:disabled):hover { background: var(--bg-overlay); }

.sk-mod  { min-width: 1.75rem; text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; font-size: 0.75rem; flex-shrink: 0; }
.sk-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sk-override-dot { font-size: 0.5rem; vertical-align: super; margin-left: 0.2rem; color: var(--color-warning); opacity: 0.85; }
.sk-attr { font-size: 0.625rem; color: var(--text-disabled); flex-shrink: 0; }

.pip       { display: flex; align-items: center; justify-content: center; width: 14px; height: 14px; flex-shrink: 0; color: var(--text-disabled); }
.pip--half { color: var(--color-warning); }
.pip--prof { color: var(--color-success); }
.pip--expert { color: var(--accent-light); }

/* ── Inline editor ── */
.inline-editor {
	display: flex; flex-direction: column; gap: 0.375rem;
	padding: 0.5rem 0.5rem 0.5rem 0.75rem;
	margin: 0.25rem 0;
	background: var(--bg-overlay);
	border-left: 2px solid var(--accent-muted);
	border-radius: 0 4px 4px 0;
}
.inline-editor__header {
	display: flex; align-items: center; gap: 0.5rem;
}
.inline-editor__label {
	font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
	letter-spacing: 0.05em; color: var(--accent-light);
}
.inline-editor__badge {
	font-size: 0.625rem; font-weight: 600; text-transform: uppercase;
	letter-spacing: 0.05em; color: var(--color-warning);
	background: color-mix(in srgb, var(--color-warning) 15%, transparent);
	padding: 0.1rem 0.375rem; border-radius: 3px;
}
.inline-editor__hint {
	font-size: 0.6875rem; color: var(--text-muted);
	margin: 0; line-height: 1.4;
}
.inline-editor__hint strong { color: var(--text-secondary); }
.inline-editor__prof-btns {
	display: flex; gap: 0.25rem;
}
.prof-btn {
	flex: 1; padding: 0.25rem 0; border-radius: 4px;
	border: 1px solid var(--border-muted);
	background: var(--bg-surface); color: var(--text-muted);
	font-size: 0.6875rem; cursor: pointer;
	transition: all var(--transition-fast);
}
.prof-btn:hover { border-color: var(--accent-muted); color: var(--text-primary); }
.prof-btn--active { background: var(--accent-muted); border-color: var(--accent-light); color: var(--accent-light); font-weight: 700; }
.inline-editor__toggle {
	display: flex; align-items: center; gap: 0.375rem;
	font-size: 0.75rem; color: var(--text-secondary); cursor: pointer;
}
.inline-editor__note {
	font-size: 0.75rem; padding: 0.25rem 0.375rem;
	border: 1px solid var(--border-muted); border-radius: 4px;
	background: var(--bg-surface); color: var(--text-primary);
	width: 100%;
}
.inline-editor__note:focus { outline: none; border-color: var(--accent-muted); }
.inline-editor__actions {
	display: flex; gap: 0.25rem;
}

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