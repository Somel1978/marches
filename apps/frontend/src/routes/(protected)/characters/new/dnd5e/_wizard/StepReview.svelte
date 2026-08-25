<!-- apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/StepReview.svelte -->
<!--
	Review summary + the actual <form> with every hidden input the server
	action expects, plus the submit button — this is the only step that needs
	a form, since submission only happens here. Field names are identical to
	the original monolithic wizard except one fix: player-picked damage
	modifiers now submit as `dmgModType` (matching what +page.server.ts
	reads) instead of the old, silently-dropped `dmgModModifierType`.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { SKILL_DISPLAY, STAT_ABBR } from '@core/ui/gamesystems/dnd5e/skills.ts';
	import { STATS, STAT_LABEL } from './types.ts';
	import { mod } from './wizard-state.svelte.ts';
	import type { WizardState } from './wizard-state.svelte.ts';
	import * as grants from './grants.ts';

	let { ws, sys, data }: { ws: WizardState; sys: any; data: any } = $props();

	const selectedSpecies    = $derived(grants.selectedSpecies(sys, ws));
	const selectedBackground = $derived(grants.selectedBackground(sys, ws));

	const backgroundFixedSkills = $derived(grants.backgroundFixedSkills(sys, ws));
	const speciesFixedSkills    = $derived(grants.speciesFixedSkills(sys, ws));
	const speciesAutoHalfSkills = $derived(grants.speciesAutoHalfSkills(sys, ws));
	const featureAutoHalfSkills = $derived(grants.featureAutoHalfSkills(sys, ws));
	const expertiseSubmissions  = $derived(grants.expertiseGrantSubmissions(sys, ws));
	const autoGrantedSkills     = $derived(grants.autoGrantedSkills(sys, ws));
	const classSavingThrows     = $derived(grants.classSavingThrows(sys, ws));
	const extraSavingThrows     = $derived(grants.extraSavingThrows(sys, ws));
	const featAutoSaves         = $derived(grants.featAutoSaves(sys, ws));
	const allSaveChoices        = $derived(grants.allSaveChoices(sys, ws));
	const featureChoices        = $derived(grants.featureChoices(sys, ws));
	const featSkillChoices      = $derived(grants.featSkillChoices(sys, ws));
	const speciesTraitChoices   = $derived(grants.speciesTraitChoices(sys, ws));
	const backgroundChoiceCount = $derived(grants.backgroundChoiceCount(sys, ws));

	const allFeatureGrantSources = $derived(grants.allFeatureGrantSources(sys, ws));
	const allGrantedFeatIds      = $derived(grants.allGrantedFeatIds(sys, ws));

	const sizeChoiceOptions = $derived(grants.sizeChoiceOptions(sys, ws));
	const traitFixedSize    = $derived(grants.traitFixedSize(sys, ws));
	const autoGrantedTools     = $derived(grants.autoGrantedTools(sys, ws));
	const allToolChoices       = $derived(grants.allToolChoices(sys, ws));
	const autoGrantedLanguages = $derived(grants.autoGrantedLanguages(sys, ws));
	const allLanguageChoices   = $derived(grants.allLanguageChoices(sys, ws));
	const allDmgModChoices     = $derived(grants.allDmgModChoices(sys, ws));
	const autoGrantedDamageModifiers = $derived(grants.autoGrantedDamageModifiers(sys, ws));
	const autoGrantedSpeeds  = $derived(grants.autoGrantedSpeeds(sys, ws));
	const autoGrantedSenses  = $derived(grants.autoGrantedSenses(sys, ws));
	const autoGrantedInnateSpells = $derived(grants.autoGrantedInnateSpells(sys, ws));
	const autoGrantedInnateSpellSources = $derived(grants.autoGrantedInnateSpellSources(sys, ws));

	const classSkillCount      = $derived(grants.classSkillCount(sys, ws));
	const availableClassSkills = $derived(grants.availableClassSkills(sys, ws));

	const canSubmitVal = $derived(grants.canSubmit(sys, ws));
</script>

<div class="card">

	<!-- Character header -->
	<div style="display:flex;gap:1rem;align-items:flex-start;flex-wrap:wrap;margin-bottom:1rem;">
		{#if ws.avatarUrl}
			<img src={ws.avatarUrl} alt={ws.name} style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid var(--border-accent);" />
		{/if}
		<div>
			<h3 style="margin:0;font-size:1.25rem;font-weight:700;">{ws.name}</h3>
			<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.375rem;">
				<span class="badge badge-accent">Level {ws.totalLevel}</span>
				<span class="badge badge-muted">{selectedSpecies?.name ?? '—'}</span>
				<span class="badge badge-muted">{selectedBackground?.name ?? '—'}</span>
				<span class="badge badge-muted">{data.activeWorlds.find((w: any) => w.id === ws.worldId)?.name ?? 'Global'}</span>
			</div>
		</div>
	</div>

	<!-- Ability Scores -->
	<h4 class="section-title">Ability Scores</h4>
	<div class="wizard-review-stats" style="display:grid;grid-template-columns:repeat(6,1fr);gap:0.5rem;text-align:center;margin-bottom:1rem;">
		{#each STATS as st}
			{@const base = ws.total[st]}
			{@const final = ws.finalScores[st]}
			{@const asiBump = ws.asiChoices.filter(c => c.mode === 'stat' && (c.stat1 === st || c.stat2 === st)).reduce((n, c) => n + (c.stat1 === st ? (c.amount1 || 0) : (c.amount2 || 0)), 0)}
			{@const featBump = ws.asiChoices.filter(c => (c.mode === 'feat' || c.type === 'epic_boon') && c.stat1 === st && c.amount1).reduce((n, c) => n + (c.amount1 || 0), 0)}
			<div class="wizard-stat-box" style="padding:0.5rem;">
				<p class="wizard-stat-box__label">{STAT_LABEL[st]}</p>
				<p class="wizard-stat-box__value" style="font-size:1.375rem;">{final}</p>
				<div style="min-height:1rem;">
					{#if asiBump > 0}<p style="font-size:0.6875rem;color:var(--color-success);margin:0;">+{asiBump} ASI</p>{/if}
					{#if featBump > 0}<p style="font-size:0.6875rem;color:var(--accent-light);margin:0;">+{featBump} Feat</p>{/if}
					<p style="font-size:0.6875rem;color:var(--text-muted);margin:0;">base {base}</p>
				</div>
				<p class="wizard-stat-box__mod">{mod(final)}</p>
			</div>
		{/each}
	</div>

	<!-- Classes -->
	<h4 class="section-title">Classes</h4>
	<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">
		{#each ws.classAllocs as a}
			{@const cls = (sys?.classes ?? []).find((c: any) => c.id === a.classId)}
			{@const sub = cls?.subclasses?.find((s: any) => s.id === a.subclassId)}
			<div class="character-class-tag">
				<span>{cls?.name ?? '?'}</span>
				{#if sub}<span class="table__muted">· {sub.name}</span>{/if}
				<span class="badge badge-accent">Lv {a.allocatedLevel}</span>
			</div>
		{/each}
	</div>

	<!-- Background feat -->
	{#if selectedBackground}
		{@const bg = selectedBackground as any}
		{#if bg.grantsFeat || ws.bgFeatPick}
			<h4 class="section-title">Background Feat</h4>
			<div style="margin-bottom:1rem;">
				{#if bg.grantsFeat}
					<span class="badge badge-accent">🏅 {bg.grantsFeat.name}</span>
				{:else if ws.bgFeatPick}
					{@const feat = (sys?.feats ?? []).find((f: any) => f.id === ws.bgFeatPick)}
					{#if feat}<span class="badge badge-accent">🏅 {feat.name}</span>{/if}
				{/if}
			</div>
		{/if}
	{/if}

	<!-- Saves & Skills -->
	{#if classSavingThrows.length || extraSavingThrows.length || allSaveChoices.some(sc => (ws.chosenSavePools[sc.sourceId] ?? []).length > 0) || autoGrantedSkills.length || ws.chosenClassSkills.length || Object.keys(ws.chosenPoolSkills).some(k => (ws.chosenPoolSkills[k] ?? []).length > 0) || expertiseSubmissions.length}
		<h4 class="section-title">Saving Throws &amp; Skills</h4>
		<div style="display:flex;flex-direction:column;gap:0.375rem;margin-bottom:1rem;">
			{#if classSavingThrows.length || extraSavingThrows.length || allSaveChoices.some(sc => (ws.chosenSavePools[sc.sourceId] ?? []).length > 0)}
				<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
					<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Saving Throws</span>
					<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
						{#each classSavingThrows as stat}<span class="badge badge-accent">{STAT_ABBR[stat] ?? stat}</span>{/each}
						{#each extraSavingThrows as { stat }}<span class="badge badge-accent">{STAT_ABBR[stat] ?? stat}</span>{/each}
						{#each allSaveChoices as sc}{#each (ws.chosenSavePools[sc.sourceId] ?? []) as stat}<span class="badge badge-accent">{STAT_ABBR[stat] ?? stat}</span>{/each}{/each}
					</div>
				</div>
			{/if}
			{#if autoGrantedSkills.length}
				<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
					<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Auto Skills</span>
					<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
						{#each autoGrantedSkills as skill}<span class="badge badge-muted">{SKILL_DISPLAY[skill] ?? skill}</span>{/each}
					</div>
				</div>
			{/if}
			{#if ws.chosenClassSkills.length}
				<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
					<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Class Skills</span>
					<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
						{#each ws.chosenClassSkills as skill}<span class="badge badge-success">{SKILL_DISPLAY[skill] ?? skill}</span>{/each}
					</div>
				</div>
			{/if}
			{#each featureChoices.filter(fc => (ws.chosenPoolSkills[fc.sourceId] ?? []).length > 0) as fc}
				<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
					<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">{fc.label}</span>
					<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
						{#each (ws.chosenPoolSkills[fc.sourceId] ?? []) as skill}<span class="badge badge-success">{SKILL_DISPLAY[skill] ?? skill}</span>{/each}
					</div>
				</div>
			{/each}
			{#if featureAutoHalfSkills.length}
				<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
					<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Half Prof</span>
					<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
						{#each featureAutoHalfSkills as h}
							{#if h.skill === '*'}<span class="badge badge-muted">All skills (½)</span>
							{:else}<span class="badge badge-muted">{SKILL_DISPLAY[h.skill] ?? h.skill} ½</span>{/if}
						{/each}
					</div>
				</div>
			{/if}
			{#if expertiseSubmissions.length}
				<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
					<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Expertise</span>
					<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
						{#each expertiseSubmissions as row}
							<span class="badge badge-accent" title={row.label}>{SKILL_DISPLAY[row.skill] ?? row.skill} ×2</span>
						{/each}
					</div>
				</div>
			{/if}
			{#if featAutoSaves.length}
				<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
					<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Feat Saves</span>
					<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
						{#each featAutoSaves as { stat }}<span class="badge badge-accent">{STAT_ABBR[stat] ?? stat}</span>{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Grants: size, tools, languages, modifiers, speeds, senses, innate spells -->
	{#if ws.chosenSize || traitFixedSize}
		<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
			<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Size</span>
			<span class="badge badge-muted">{ws.chosenSize || traitFixedSize}</span>
		</div>
	{/if}
	{#if autoGrantedTools.length || allToolChoices.some(tc => (ws.chosenToolPools[tc.sourceId] ?? []).length > 0)}
		<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
			<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Tools</span>
			<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
				{#each autoGrantedTools as g}<span class="badge badge-muted">{g.tool}</span>{/each}
				{#each allToolChoices as tc}{#each (ws.chosenToolPools[tc.sourceId] ?? []) as t}<span class="badge badge-muted">{t}</span>{/each}{/each}
			</div>
		</div>
	{/if}
	{#if autoGrantedLanguages.length || allLanguageChoices.some(lc => (ws.chosenLanguagePools[lc.sourceId] ?? []).length > 0)}
		<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
			<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Languages</span>
			<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
				{#each autoGrantedLanguages as g}<span class="badge badge-muted">{g.language}</span>{/each}
				{#each allLanguageChoices as lc}{#each (ws.chosenLanguagePools[lc.sourceId] ?? []) as l}<span class="badge badge-muted">{l}</span>{/each}{/each}
			</div>
		</div>
	{/if}
	{#each allDmgModChoices as ch}
		{@const picks = ws.chosenDmgMods[ch.sourceId] ?? []}
		{#if picks.length}
			<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
				<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">{ch.label}</span>
				<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
					{#each picks as d}<span class="badge badge-muted">{d}</span>{/each}
				</div>
			</div>
		{/if}
	{/each}
	{#if autoGrantedDamageModifiers.some(g => g.modifierType === 'RESISTANCE')}
		<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
			<span style="font-size:0.75rem;font-weight:700;color:var(--color-success);min-width:110px;">Resistances</span>
			<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
				{#each autoGrantedDamageModifiers.filter(g => g.modifierType === 'RESISTANCE') as g}
					<span class="badge" style="background:rgba(74,124,89,0.15);color:var(--color-success);">{g.damageType}</span>
				{/each}
			</div>
		</div>
	{/if}
	{#if autoGrantedDamageModifiers.some(g => g.modifierType === 'IMMUNITY')}
		<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
			<span style="font-size:0.75rem;font-weight:700;color:var(--accent-light);min-width:110px;">Immunities</span>
			<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
				{#each autoGrantedDamageModifiers.filter(g => g.modifierType === 'IMMUNITY') as g}
					<span class="badge badge-accent">{g.damageType}</span>
				{/each}
			</div>
		</div>
	{/if}
	{#if autoGrantedDamageModifiers.some(g => g.modifierType === 'VULNERABILITY')}
		<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
			<span style="font-size:0.75rem;font-weight:700;color:var(--color-danger);min-width:110px;">Vulnerabilities</span>
			<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
				{#each autoGrantedDamageModifiers.filter(g => g.modifierType === 'VULNERABILITY') as g}
					<span class="badge" style="background:rgba(196,74,74,0.15);color:var(--color-danger);">{g.damageType}</span>
				{/each}
			</div>
		</div>
	{/if}
	{#if autoGrantedSpeeds.length}
		<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
			<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Speed Bonuses</span>
			<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
				{#each autoGrantedSpeeds as sp}<span class="badge badge-muted">{sp.movementType.charAt(0) + sp.movementType.slice(1).toLowerCase()} +{sp.speed} ft</span>{/each}
			</div>
		</div>
	{/if}
	{#if autoGrantedSenses.length}
		<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
			<span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);min-width:110px;">Senses</span>
			<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
				{#each autoGrantedSenses as s}<span class="badge badge-muted">👁 {s}</span>{/each}
			</div>
		</div>
	{/if}
	{#if autoGrantedInnateSpells.length}
		<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem;">
			<span style="font-size:0.75rem;font-weight:700;color:var(--accent-light);min-width:110px;">Innate Spells</span>
			<div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
				{#each autoGrantedInnateSpells as g}
					<span class="badge badge-accent">{g.name} · Lv{g.minCharLevel} · {g.usesPerDay === null ? 'at will' : `${g.usesPerDay}/day`}</span>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ASI summary -->
	{#if ws.asiChoices.length}
		<h4 class="section-title">ASI / Feats</h4>
		<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">
			{#each ws.asiChoices as c}
				<div style="font-size:0.8125rem;padding:0.25rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-sm);">
					<span class="table__muted">{c.sourceName} Lv {c.sourceLevel}:</span>
					{#if c.mode === 'feat' || c.type === 'epic_boon'}
						{(sys?.feats ?? []).find((f: any) => f.id === c.featId)?.name ?? '—'}
					{:else if c.mode === 'stat'}
						{STAT_LABEL[c.stat1] ?? '—'} +{c.amount1}{c.stat2 ? `, ${STAT_LABEL[c.stat2]} +${c.amount2}` : ''}
					{:else}
						<span style="color:var(--color-warning);">Not chosen</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Validation / submit -->
	{#if !canSubmitVal}
		<div class="form-error" style="margin-bottom:1rem;">
			{#if !ws.scoresValid && !ws.rolled}Point buy not fully spent ({ws.remaining} remaining). {/if}
			{#if ws.totalLevel < 1}At least one class required. {/if}
			{#if !ws.classAllocs.every(c => c.classId)}All class rows need a class. {/if}
			{#if !grants.bgFeatValid(sys, ws)}Background feat selection required. {/if}
			{#if !(ws.chosenClassSkills.length >= Math.min(classSkillCount, availableClassSkills.length))}Class skill selections incomplete. {/if}
			{#if !grants.allPoolsSatisfied(sys, ws)}Some choice pools (skills/tools/languages/saves/expertise/damage modifiers/size) are incomplete. {/if}
			{#if !grants.asiValid(sys, ws)}All ASI/Feat slots must be completed. {/if}
		</div>
	{:else}
		<p style="font-size:0.8125rem;color:var(--text-muted);margin-bottom:1rem;">Submitting creates your character pending DM approval.</p>
	{/if}

	<form method="post" action="?/create" use:enhance={() => { return async ({ update }) => { ws.clearState(); await update(); }; }}>
		<input type="hidden" name="gameSystemId" value={data.gameSystem.id} />
		<input type="hidden" name="name"        value={ws.name} />
		<input type="hidden" name="avatarUrl"   value={ws.avatarUrl} />
		<input type="hidden" name="portraitUrl" value={ws.portraitUrl} />
		<input type="hidden" name="worldId"     value={ws.worldId} />
		<input type="hidden" name="speciesId"   value={ws.speciesId} />
		<input type="hidden" name="backgroundId" value={ws.backgroundId} />
		{#if ws.bgFeatPick}<input type="hidden" name="bgFeatPick" value={ws.bgFeatPick} />{/if}
		{#if (selectedBackground as any)?.grantsFeatId}<input type="hidden" name="bgGrantedFeatId" value={(selectedBackground as any).grantsFeatId} />{/if}
		{#each allFeatureGrantSources as src}
			{@const pick = src.fixedFeatId ?? ws.featureFeatPicks[src.sourceKey]}
			{#if pick}
				<input type="hidden" name="featureGrantedFeatId" value={pick} />
				<input type="hidden" name="featureGrantedFeatSrc" value={src.sourceKey} />
			{/if}
		{/each}
		{#each ws.chosenClassSkills as skill}<input type="hidden" name="chosenClassSkill" value={skill} />{/each}
		{#each backgroundFixedSkills as skill}
			<input type="hidden" name="autoSkill" value={skill} />
			<input type="hidden" name="autoSkillSource" value="Background" />
			<input type="hidden" name="autoSkillValue" value="1" />
		{/each}
		{#each speciesFixedSkills as skill}
			<input type="hidden" name="autoSkill" value={skill} />
			<input type="hidden" name="autoSkillSource" value="Species" />
			<input type="hidden" name="autoSkillValue" value="1" />
		{/each}
		{#each speciesAutoHalfSkills as { skill }}
			<input type="hidden" name="autoSkill" value={skill} />
			<input type="hidden" name="autoSkillSource" value="Species" />
			<input type="hidden" name="autoSkillValue" value="0.5" />
		{/each}
		<!-- Player-picked resistances/immunities/vulnerabilities — uses `dmgModType`
		     (previously submitted as `dmgModModifierType`, which the server never
		     read, silently dropping every player-chosen damage modifier). -->
		{#each allDmgModChoices as ch}
			{#each (ws.chosenDmgMods[ch.sourceId] ?? []) as dmgType}
				<input type="hidden" name="dmgModType" value={ch.modifierType} />
				<input type="hidden" name="dmgModDamageType" value={dmgType} />
				<input type="hidden" name="dmgModSourceType" value={ch.sourceType} />
				<input type="hidden" name="dmgModSourceId" value={ch.sourceId} />
			{/each}
		{/each}
		{#each featureAutoHalfSkills as h}
			<input type="hidden" name="autoSkill" value={h.skill} />
			<input type="hidden" name="autoSkillSource" value="ClassFeature" />
			<input type="hidden" name="autoSkillValue" value="0.5" />
		{/each}
		{#each classSavingThrows as stat}
			<input type="hidden" name="classSave" value={stat} />
			<input type="hidden" name="classSaveSourceType" value="Class" />
			<input type="hidden" name="classSaveSourceId" value="" />
		{/each}
		{#each extraSavingThrows as sv}
			<input type="hidden" name="classSave" value={sv.stat} />
			<input type="hidden" name="classSaveSourceType" value={sv.sourceType ?? 'Feat'} />
			<input type="hidden" name="classSaveSourceId" value={sv.sourceId ?? ''} />
		{/each}
		{#each allSaveChoices as sc}
			{#each (ws.chosenSavePools[sc.sourceId] ?? []) as stat}
				<input type="hidden" name="classSave" value={stat} />
				<input type="hidden" name="classSaveSourceType" value={sc.sourceType ?? 'PlayerChoice'} />
				<input type="hidden" name="classSaveSourceId" value={sc.sourceDbId ?? sc.sourceId ?? ''} />
			{/each}
		{/each}
		{#if backgroundChoiceCount > 0}
			{#each (ws.chosenPoolSkills[ws.backgroundId ?? ''] ?? []) as skill}
				<input type="hidden" name="poolSkill" value={skill} />
				<input type="hidden" name="poolSkillSource" value="Background" />
				<input type="hidden" name="poolSkillSourceId" value={ws.backgroundId ?? ''} />
			{/each}
		{/if}
		{#each speciesTraitChoices as trait}
			{#each (ws.chosenPoolSkills[trait.id] ?? []) as skill}
				<input type="hidden" name="poolSkill" value={skill} />
				<input type="hidden" name="poolSkillSource" value="SpeciesTrait" />
				<input type="hidden" name="poolSkillSourceId" value={trait.id} />
			{/each}
		{/each}
		{#each featSkillChoices as fc}
			{#each (ws.chosenPoolSkills[fc.sourceId] ?? []) as skill}
				<input type="hidden" name="poolSkill" value={skill} />
				<input type="hidden" name="poolSkillSource" value="Feat" />
				<input type="hidden" name="poolSkillSourceId" value={fc.sourceId} />
			{/each}
		{/each}
		{#each featureChoices as fc}
			{#each (ws.chosenPoolSkills[fc.sourceId] ?? []) as skill}
				<input type="hidden" name="poolSkill" value={skill} />
				<input type="hidden" name="poolSkillSource" value={fc.sourceType} />
				<input type="hidden" name="poolSkillSourceId" value={fc.sourceId} />
			{/each}
		{/each}
		{#if ws.chosenSize}<input type="hidden" name="chosenSize" value={ws.chosenSize} />{/if}
		{#each autoGrantedTools as g}
			<input type="hidden" name="autoTool" value={g.tool} />
			<input type="hidden" name="autoToolSourceType" value={g.sourceType} />
			<input type="hidden" name="autoToolSourceId" value={g.sourceId ?? ''} />
		{/each}
		{#each allToolChoices as tc}
			{#each (ws.chosenToolPools[tc.sourceId] ?? []) as tool}
				<input type="hidden" name="autoTool" value={tool} />
				<input type="hidden" name="autoToolSourceType" value={tc.sourceType} />
				<input type="hidden" name="autoToolSourceId" value={tc.sourceDbId ?? tc.sourceId ?? ''} />
			{/each}
		{/each}
		{#each autoGrantedLanguages as g}
			<input type="hidden" name="autoLanguage" value={g.language} />
			<input type="hidden" name="autoLanguageSourceType" value={g.sourceType} />
			<input type="hidden" name="autoLanguageSourceId" value={g.sourceId ?? ''} />
		{/each}
		{#each expertiseSubmissions as row}
			<input type="hidden" name="expertisePoolSkill" value={row.skill} />
			<input type="hidden" name="expertisePoolSourceType" value={row.sourceType} />
			<input type="hidden" name="expertisePoolSourceId" value={row.sourceId} />
		{/each}
		{#each allLanguageChoices as lc}
			{#each (ws.chosenLanguagePools[lc.sourceId] ?? []) as language}
				<input type="hidden" name="autoLanguage" value={language} />
				<input type="hidden" name="autoLanguageSourceType" value={lc.sourceType} />
				<input type="hidden" name="autoLanguageSourceId" value={lc.sourceDbId ?? lc.sourceId ?? ''} />
			{/each}
		{/each}
		{#each autoGrantedInnateSpellSources as src}
			<input type="hidden" name="innateSpellRaw" value={src.raw} />
			<input type="hidden" name="innateSpellSourceType" value={src.sourceType} />
			<input type="hidden" name="innateSpellSourceId" value={src.sourceId} />
		{/each}
		{#each autoGrantedDamageModifiers as g}
			<input type="hidden" name="dmgModType" value={g.modifierType} />
			<input type="hidden" name="dmgModDamageType" value={g.damageType} />
			<input type="hidden" name="dmgModSourceType" value={g.sourceType} />
			<input type="hidden" name="dmgModSourceId" value={g.sourceId ?? ''} />
		{/each}
		{#each ws.asiChoices as c}
			<input type="hidden" name="asi_sourceClassId" value={c.sourceClassId} />
			<input type="hidden" name="asi_sourceLevel" value={c.sourceLevel} />
			<input type="hidden" name="asi_type" value={c.type} />
			<input type="hidden" name="asi_mode" value={c.mode ?? ''} />
			<input type="hidden" name="asi_stat1" value={c.stat1 ?? ''} />
			<input type="hidden" name="asi_amount1" value={c.amount1 ?? ''} />
			<input type="hidden" name="asi_stat2" value={c.stat2 ?? ''} />
			<input type="hidden" name="asi_amount2" value={c.amount2 ?? ''} />
			<input type="hidden" name="asi_featId" value={c.featId ?? ''} />
		{/each}
		{#each ws.classAllocs as a}
			<input type="hidden" name="classId" value={a.classId} />
			<input type="hidden" name="subclassId" value={a.subclassId} />
			<input type="hidden" name="allocatedLevel" value={a.allocatedLevel} />
		{/each}
		{#each STATS as st}
			<input type="hidden" name="score_{st}" value={ws.total[st]} />
		{/each}
		<button type="submit" class="btn btn-primary" disabled={!canSubmitVal}>Create Character</button>
	</form>
</div>
