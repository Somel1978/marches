<!-- apps/admin/src/routes/(app)/world/[id]/calendar/+page.svelte -->
<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { WorldCalendarEditor, type CalendarDef } from '@core/ui';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	async function save(draft: CalendarDef) {
		const fd = new FormData();
		fd.set('payload', JSON.stringify(draft));
		const res = await fetch('?/save', { method: 'POST', body: fd });
		if (!res.ok) throw new Error('Save failed');
		await invalidateAll();
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/world/{data.world.id}" class="back-link">← {data.world.name}</a>
			<h2 class="page__title">Calendar</h2>
		</div>
	</div>
	<WorldCalendarEditor
		calendar={data.calendar}
		canEdit={true}
		onSave={save}
		onCancel={() => goto(`/world/${data.world.id}/timeline`)}
	/>
</div>
