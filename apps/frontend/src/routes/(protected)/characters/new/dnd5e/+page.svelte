<!-- apps/frontend/src/routes/(protected)/characters/new/dnd5e/+page.svelte -->
<!--
	Orchestrator only: instantiates WizardState, renders the step ribbon and
	top/bottom nav, and delegates each step's UI to its own component under
	_wizard/. Every choice (skills, tools, languages, saves, expertise, feats,
	ASI/Epic Boon) is now resolved inline in the step where its source is
	picked — see /_wizard/*.svelte and the rebuild plan for details.
	+page.server.ts is untouched; the hidden-input contract it parses is
	preserved exactly (see StepReview.svelte).
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { WizardState } from './_wizard/wizard-state.svelte.ts';
	import * as grants from './_wizard/grants.ts';
	import StepIdentity from './_wizard/StepIdentity.svelte';
	import StepSpecies from './_wizard/StepSpecies.svelte';
	import StepBackground from './_wizard/StepBackground.svelte';
	import StepScores from './_wizard/StepScores.svelte';
	import StepClasses from './_wizard/StepClasses.svelte';
	import StepReview from './_wizard/StepReview.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const sys = $derived((data as any).systemData);
	const canViewDescriptions = $derived((data as any).canViewDescriptions ?? false);

	const STEPS = [
		{ label: 'Identity' },
		{ label: 'Species' },
		{ label: 'Background' },
		{ label: 'Scores' },
		{ label: 'Classes' },
		{ label: 'Review' },
	];

	const ws = new WizardState();

	// Restore persisted state once on mount.
	$effect(() => {
		untrack(() => { ws.restoreState(); });
	});
	// After sys.feats loads, backfill stat1/amount1 for restored feat-mode ASI choices.
	$effect(() => {
		const feats = sys?.feats;
		untrack(() => { ws.backfillAsiFeatStats(feats); });
	});
	// Keep ASI/Epic Boon slots in sync with the currently allocated classes.
	$effect(() => {
		void ws.classAllocs;
		untrack(() => { grants.syncAsiChoices(sys, ws); });
	});
	// Drop expertise picks that no longer match proficient skills.
	$effect(() => {
		void [ws.chosenClassSkills, ws.chosenPoolSkills, ws.classAllocs, ws.featureFeatPicks, ws.speciesId, ws.backgroundId];
		untrack(() => { grants.trimInvalidExpertiseChoices(sys, ws); });
	});
	// Persist on every relevant change. untrack() on the write side prevents
	// deep property reads (e.g. inside asiChoices items) from causing loops.
	$effect(() => {
		void [
			ws.step, ws.name, ws.avatarUrl, ws.portraitUrl, ws.worldId,
			ws.speciesId, ws.chosenSize, ws.backgroundId, ws.bgFeatPick,
			ws.featureFeatPicks, ws.chosenDmgMods, ws.scores, ws.rolled, ws.standardArray,
			ws.bonusGranted, ws.bonus, ws.classAllocs, ws.asiChoices,
			ws.chosenClassSkills, ws.chosenPoolSkills, ws.chosenSavePools,
			ws.chosenToolPools, ws.chosenLanguagePools, ws.chosenExpertisePools,
		];
		untrack(() => ws.saveState());
	});

	// $derived.by (not plain $derived) so nested WizardState pool/choice updates
	// reliably re-run validation — matches the old monolithic wizard pattern.
	const canAdvance = $derived.by(() => {
		void ws.step;
		void ws.name;
		void ws.speciesId;
		void ws.chosenSize;
		void ws.backgroundId;
		void ws.bgFeatPick;
		void ws.featureFeatPicks;
		void ws.chosenClassSkills;
		void ws.chosenPoolSkills;
		void ws.chosenSavePools;
		void ws.chosenToolPools;
		void ws.chosenLanguagePools;
		void ws.chosenExpertisePools;
		void ws.chosenDmgMods;
		void ws.scoresValid;
		void ws.classAllocs.length;
		for (const a of ws.classAllocs) { void a.classId; void a.subclassId; void a.allocatedLevel; }
		void ws.asiChoices.length;
		for (const c of ws.asiChoices) {
			void c.mode; void c.stat1; void c.stat2; void c.amount1; void c.amount2;
			void c.featId; void c.featGrantedStat;
		}
		return grants.canAdvanceStep(sys, ws, ws.step);
	});
	const advanceBlockers = $derived.by(() => {
		void canAdvance;
		return grants.advanceBlockersForStep(sys, ws, ws.step);
	});
	const nextLabel  = $derived(ws.step < STEPS.length - 1 ? STEPS[ws.step + 1].label : '');

	function next() { ws.next(canAdvance, STEPS.length); }
</script>

<div class="page">

	<!-- ── Page header ──────────────────────────────────────────────── -->
	<div class="page__header">
		<div>
			<h2 class="page__title">New Character</h2>
			<p style="margin:0;font-size:0.8125rem;color:var(--text-muted);">D&D 5e · {data.slotInfo.available} slot{data.slotInfo.available === 1 ? '' : 's'} remaining</p>
		</div>
		<div style="display:flex;gap:0.5rem;align-items:center;">
			<button class="btn btn-ghost btn-sm" onclick={() => { ws.clearState(); goto('/characters'); }}>✕ Cancel</button>
		</div>
	</div>

	<!-- ── Step ribbon ──────────────────────────────────────────────── -->
	<div class="ribbon">
		{#each STEPS as s, i}
			<button class="ribbon__step"
				class:ribbon__step--active={i === ws.step}
				class:ribbon__step--done={i < ws.step}
				class:ribbon__step--clickable={i < ws.step}
				onclick={() => ws.goTo(i)} disabled={i > ws.step}>
				<span class="ribbon__num">{i < ws.step ? '✓' : `Step ${i + 1}`}</span>
				<span class="ribbon__label">{s.label}</span>
			</button>
		{/each}
	</div>

	{#if form?.message}<div class="form-error" style="margin-bottom:1rem;">{(form as any).message}</div>{/if}

	{#if ws.step === 0}
		<StepIdentity {ws} {sys} activeWorlds={data.activeWorlds} />
	{:else if ws.step === 1}
		<StepSpecies {ws} {sys} {canViewDescriptions} />
	{:else if ws.step === 2}
		<StepBackground {ws} {sys} {canViewDescriptions} />
	{:else if ws.step === 3}
		<StepScores {ws} {sys} />
	{:else if ws.step === 4}
		<StepClasses {ws} {sys} {canViewDescriptions} />
	{:else if ws.step === 5}
		<StepReview {ws} {sys} {data} />
	{/if}

	<!-- ── Bottom navigation ─────────────────────────────────────────── -->
	<div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.25rem;">
		<div>
			{#if ws.step > 0}
				<button class="btn btn-ghost" onclick={() => ws.back()}>← Back</button>
			{/if}
		</div>
		<div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.375rem;">
			{#if !canAdvance && advanceBlockers.length}
				<p style="margin:0;font-size:0.75rem;color:var(--text-muted);max-width:420px;text-align:right;">
					Complete: {advanceBlockers.join(' · ')}
				</p>
			{/if}
			<div style="display:flex;gap:0.5rem;align-items:center;">
				{#if ws.step < STEPS.length - 1}
					<button class="btn btn-primary" onclick={next} disabled={!canAdvance}>Next: {nextLabel} →</button>
				{/if}
			</div>
		</div>
	</div>

</div>
