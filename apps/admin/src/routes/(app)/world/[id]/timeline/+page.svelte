<!-- apps/admin/src/routes/(app)/world/[id]/timeline/+page.svelte -->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { ConfirmModal, FantasyDateField, WorldTimeline, type TimelineEntryView } from '@core/ui';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type FormKind = 'event' | 'npc' | null;
	let formKind = $state<FormKind>(null);
	let editing = $state<TimelineEntryView | null>(null);

	let title = $state('');
	let summary = $state('');
	let eventType = $state('OTHER');
	let npcId = $state('');
	let locationNote = $state('');
	let startDay = $state(0);
	let endDay = $state<number | null>(null);
	let visibility = $state('PUBLIC');
	let error = $state('');
	let busy = $state(false);

	let _confirmOpen = $state(false);
	let _confirmCb = $state<() => void>(() => {});

	const TYPES = ['WAR', 'FESTIVAL', 'DISASTER', 'POLITICAL', 'OTHER'];

	function hrefFor(entry: TimelineEntryView) {
		if (entry.kind === 'PLOT_QUEST') return `/world/${data.world.id}/plot-quests/${entry.hrefKey}`;
		if (entry.kind === 'NPC_SCHEDULE' && entry.npcId) return `/world/${data.world.id}/npcs/${entry.npcId}`;
		if (entry.kind === 'WEATHER' && entry.regionId) return `/world/${data.world.id}/regions/${entry.regionId}`;
		return null;
	}

	function defaultStartDay() {
		return data.calendar.currentDay ?? data.calendar.timelineStartDay ?? 0;
	}

	function resetCommon() {
		title = ''; summary = ''; eventType = 'OTHER';
		npcId = data.npcs[0]?.id ?? '';
		locationNote = '';
		startDay = defaultStartDay();
		endDay = null; visibility = 'PUBLIC'; error = '';
	}

	function openCreate(kind: FormKind) {
		editing = null;
		resetCommon();
		formKind = kind;
	}

	function openEdit(entry: TimelineEntryView) {
		if (entry.kind === 'WEATHER') return;
		editing = entry;
		title = entry.title;
		summary = entry.summary ?? '';
		startDay = entry.startDay;
		endDay = entry.endDay;
		visibility = entry.visibility ?? 'PUBLIC';
		error = '';
		if (entry.kind === 'EVENT') {
			formKind = 'event';
			eventType = entry.eventType ?? 'OTHER';
		} else if (entry.kind === 'NPC_SCHEDULE') {
			formKind = 'npc';
			npcId = entry.npcId ?? data.npcs[0]?.id ?? '';
		} else {
			formKind = null;
		}
	}

	async function post(action: string, fields: Record<string, string | number | null | undefined>) {
		const fd = new FormData();
		for (const [k, v] of Object.entries(fields)) {
			if (v === undefined || v === null) continue;
			fd.set(k, String(v));
		}
		const res = await fetch(`?/${action}`, { method: 'POST', body: fd });
		if (!res.ok) throw new Error(await res.text() || 'Request failed');
	}

	async function submitForm() {
		if (!formKind) return;
		busy = true;
		error = '';
		try {
			if (formKind === 'event') {
				const action = editing ? 'updateEvent' : 'createEvent';
				await post(action, {
					eventId: editing?.hrefKey,
					title, summary, eventType, startDay,
					endDay: endDay ?? '',
					visibility,
				});
			} else {
				const action = editing ? 'updateNpcSchedule' : 'createNpcSchedule';
				await post(action, {
					scheduleId: editing?.hrefKey,
					npcId, title, summary, locationNote, startDay,
					endDay: endDay ?? '',
					visibility,
				});
			}
			formKind = null;
			await invalidateAll();
		} catch (e: any) {
			error = e?.message ?? 'Save failed';
		} finally {
			busy = false;
		}
	}

	function askDelete(entry: TimelineEntryView) {
		if (entry.kind === 'WEATHER') return;
		_confirmCb = async () => {
			if (entry.kind === 'EVENT') await post('deleteEvent', { eventId: entry.hrefKey });
			else if (entry.kind === 'NPC_SCHEDULE') await post('deleteNpcSchedule', { scheduleId: entry.hrefKey });
			await invalidateAll();
		};
		_confirmOpen = true;
	}
</script>

<div class="page__header" style="margin-bottom:0.75rem;">
	<div>
		<h3 class="page__title" style="font-size:1.15rem; margin:0;">Timeline</h3>
		<p style="margin:0.25rem 0 0; color:var(--text-muted); font-size:0.875rem;">
			Events, NPC schedules, and plot deadlines on the {data.world.name} calendar.
			Weather is set per <strong>region</strong>.
			{#if data.canEdit}
				<a href="/world/{data.world.id}/calendar">Edit calendar</a>
				<span style="opacity:0.5;">·</span>
				Enable Gantt under Calendar → Settings if you don’t see it.
			{/if}
		</p>
	</div>
</div>

{#if formKind}
	<div class="card" style="margin-bottom:1rem;">
		<h4 style="margin:0 0 0.75rem;">
			{editing ? 'Edit' : 'New'}
			{formKind === 'event' ? 'event' : 'NPC schedule'}
		</h4>
		{#if error}<p class="form-error">{error}</p>{/if}
		<div class="fields">
			{#if formKind === 'event'}
				<div class="field">
					<label class="label" for="ev-title">Title</label>
					<input id="ev-title" class="input" bind:value={title} />
				</div>
				<div class="field">
					<label class="label" for="ev-type">Type</label>
					<select id="ev-type" class="input input--select" bind:value={eventType}>
						{#each TYPES as t}<option value={t}>{t}</option>{/each}
					</select>
				</div>
			{:else}
				<div class="field">
					<label class="label" for="n-npc">NPC</label>
					<select id="n-npc" class="input input--select" bind:value={npcId}>
						{#each data.npcs as n}<option value={n.id}>{n.name}</option>{/each}
					</select>
				</div>
				<div class="field">
					<label class="label" for="n-title">Title</label>
					<input id="n-title" class="input" bind:value={title} />
				</div>
				<div class="field">
					<label class="label" for="n-loc">Location note</label>
					<input id="n-loc" class="input" bind:value={locationNote} />
				</div>
			{/if}
			<div class="field" style="grid-column:1 / -1;">
				<FantasyDateField
					calendar={data.calendar}
					name="startDay"
					label="Start date"
					bind:value={startDay}
					required
				/>
			</div>
			<div class="field" style="grid-column:1 / -1;">
				<FantasyDateField
					calendar={data.calendar}
					name="endDay"
					label="End date"
					bind:value={endDay}
					defaultDay={startDay}
					hint="Optional — leave unset for a one-day entry."
				/>
			</div>
			<div class="field">
				<label class="label" for="x-vis">Visibility</label>
				<select id="x-vis" class="input input--select" bind:value={visibility}>
					<option value="PUBLIC">Public</option>
					<option value="DM_ONLY">DM only</option>
				</select>
			</div>
			<div class="field" style="grid-column:1 / -1;">
				<label class="label" for="x-sum">Summary</label>
				<input id="x-sum" class="input" bind:value={summary} />
			</div>
		</div>
		<div style="display:flex; gap:0.5rem; margin-top:0.75rem;">
			<button type="button" class="btn btn-primary btn-sm" onclick={submitForm} disabled={busy}>Save</button>
			<button type="button" class="btn btn-ghost btn-sm" onclick={() => formKind = null}>Cancel</button>
		</div>
	</div>
{/if}

<WorldTimeline
	calendar={data.calendar}
	entries={data.entries}
	canEdit={data.canEdit}
	{hrefFor}
	onAddEvent={() => openCreate('event')}
	onAddNpcSchedule={() => openCreate('npc')}
	onEditEvent={openEdit}
	onDeleteEvent={askDelete}
/>

<ConfirmModal
	open={_confirmOpen}
	title="Delete entry"
	message="Remove this entry from the timeline?"
	confirmLabel="Delete"
	confirmClass="btn-danger"
	onconfirm={() => { _confirmOpen = false; _confirmCb(); }}
	oncancel={() => { _confirmOpen = false; }}
/>
