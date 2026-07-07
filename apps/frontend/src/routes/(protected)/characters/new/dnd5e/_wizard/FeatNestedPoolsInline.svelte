<!-- apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/FeatNestedPoolsInline.svelte -->
<!--
	Choice pools (skills, saves, tools, etc.) granted by a feat pick — rendered
	inline next to wherever that feat was chosen (background, trait, feature, ASI).
-->
<script lang="ts">
	import { SKILL_DISPLAY, STAT_ABBR } from '@core/ui/gamesystems/dnd5e/skills.ts';
	import type { WizardState } from './wizard-state.svelte.ts';
	import * as grants from './grants.ts';
	import ChoicePoolInline from './ChoicePoolInline.svelte';

	let {
		sys,
		ws,
		sourceKey,
	}: {
		sys: any;
		ws: WizardState;
		sourceKey: string;
	} = $props();

	const nested = $derived(grants.featNestedPools(sys, ws, sourceKey));
</script>

{#each nested.skill as fc}
	<div style="margin-top:0.5rem;">
		<ChoicePoolInline label="Feat: {fc.label}" count={fc.count} pool={fc.pool}
			chosen={ws.chosenPoolSkills[fc.sourceId] ?? []}
			onToggle={(v) => ws.togglePoolSkill(fc.sourceId, v, fc.count)}
			displayFn={(v) => SKILL_DISPLAY[v] ?? v}
			isDisabled={(v) => grants.isTakenElsewhere(sys, ws, v, fc.sourceId)} />
	</div>
{/each}
{#each nested.save as sc}
	<div style="margin-top:0.5rem;">
		<ChoicePoolInline label="Feat save: {sc.label}" count={sc.count} pool={sc.pool}
			chosen={ws.chosenSavePools[sc.sourceId] ?? []}
			onToggle={(v) => ws.toggleSavePool(sc.sourceId, v, sc.count)}
			displayFn={(v) => STAT_ABBR[v] ?? v} />
	</div>
{/each}
{#each nested.tool as tc}
	<div style="margin-top:0.5rem;">
		<ChoicePoolInline label="Feat tools: {tc.label}" count={tc.count} pool={tc.pool}
			chosen={ws.chosenToolPools[tc.sourceId] ?? []}
			onToggle={(v) => ws.toggleToolPool(tc.sourceId, v, tc.count)} />
	</div>
{/each}
{#each nested.language as lc}
	<div style="margin-top:0.5rem;">
		<ChoicePoolInline label="Feat languages: {lc.label}" count={lc.count} pool={lc.pool}
			chosen={ws.chosenLanguagePools[lc.sourceId] ?? []}
			onToggle={(v) => ws.toggleLanguagePool(lc.sourceId, v, lc.count)} />
	</div>
{/each}
{#each nested.expertise as ec}
	{@const pool = grants.effectiveExpertisePool(ec, sys, ws)}
	<div style="margin-top:0.5rem;">
		<ChoicePoolInline label="Feat expertise: {ec.label}" count={ec.count} pool={pool}
			chosen={ws.chosenExpertisePools[ec.sourceId] ?? []}
			onToggle={(v) => ws.toggleExpertisePool(ec.sourceId, v, ec.count)}
			displayFn={(v) => SKILL_DISPLAY[v] ?? v}
			hint={pool.length ? '' : 'Choose proficient skills first'} />
	</div>
{/each}
{#each nested.dmgMod as dc}
	<div style="margin-top:0.5rem;">
		<ChoicePoolInline label={dc.label} count={dc.count} pool={dc.pool}
			chosen={ws.chosenDmgMods[dc.sourceId] ?? []}
			onToggle={(v) => ws.toggleDmgModPool(dc.sourceId, v, dc.count)} />
	</div>
{/each}
