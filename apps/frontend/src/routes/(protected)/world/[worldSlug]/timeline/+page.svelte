<!-- apps/frontend/src/routes/(protected)/world/[worldSlug]/timeline/+page.svelte -->
<script lang="ts">
	import { WorldTimeline, type TimelineEntryView } from '@core/ui';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function hrefFor(entry: TimelineEntryView) {
		// Plot quests have no player detail route yet
		return null;
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/world/{data.world.slug}" class="back-link">← {data.world.name}</a>
			<h2 class="page__title">Timeline</h2>
		</div>
	</div>
	<p style="margin:0 0 1rem; color:var(--text-muted); font-size:0.875rem;">
		Events and plot deadlines on the world calendar.
	</p>
	<WorldTimeline
		calendar={data.calendar}
		entries={data.entries}
		canEdit={false}
		{hrefFor}
	/>
</div>
