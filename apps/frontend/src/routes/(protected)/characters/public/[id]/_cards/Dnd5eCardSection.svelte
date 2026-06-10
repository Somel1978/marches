<!-- apps/frontend/src/routes/(protected)/characters/public/[id]/_cards/Dnd5eCardSection.svelte -->
<script lang="ts">
	import { Dnd5eCharacterCard } from '@core/ui';
	let { character, charSheet, systemData }: { character: any; charSheet: any; systemData: any } = $props();
</script>

<Dnd5eCharacterCard {character} {charSheet} {systemData} />