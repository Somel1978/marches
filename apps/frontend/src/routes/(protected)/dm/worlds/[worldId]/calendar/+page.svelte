<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/calendar/+page.svelte -->
<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { WorldCalendarEditor, type CalendarDef } from '@core/ui';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	async function save(draft: CalendarDef) {
		const fd = new FormData();
		fd.set('payload', JSON.stringify(draft));
		const res = await fetch('?/save', { method: 'POST', body: fd });
		const json = await res.json().catch(() => ({}));
		if (!res.ok || json?.type === 'failure') {
			throw new Error(json?.data?.message ?? 'Save failed');
		}
		await invalidateAll();
	}
</script>

<div style="margin-bottom:0.75rem;">
	<p style="margin:0; color:var(--text-muted); font-size:0.875rem;">
		Define months, weeks, eras, and date formatting for {data.world.name}. Used by the Timeline and Plot Quest deadlines.
	</p>
</div>

<WorldCalendarEditor
	calendar={data.calendar}
	canEdit={true}
	onSave={save}
	onCancel={() => goto(`/dm/worlds/${data.world.id}/timeline`)}
/>
