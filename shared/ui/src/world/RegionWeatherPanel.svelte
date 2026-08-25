<!-- shared/ui/src/world/RegionWeatherPanel.svelte -->
<script lang="ts">
	import FantasyDateField from './FantasyDateField.svelte';
	import type { CalendarDef, RegionWeatherRow } from './calendar-types.ts';
	import { formatDate } from './calendar-engine.ts';

	let {
		calendar,
		weather = [],
		canEdit = false,
		onSaved,
	}: {
		calendar: CalendarDef;
		weather?: RegionWeatherRow[];
		canEdit?: boolean;
		onSaved?: () => void | Promise<void>;
	} = $props();

	const CONDITIONS = ['CLEAR', 'CLOUDY', 'RAIN', 'STORM', 'SNOW', 'FOG', 'HEAT', 'COLD', 'OTHER'];

	let showForm = $state(false);
	let editing = $state<RegionWeatherRow | null>(null);
	let condition = $state('CLEAR');
	let title = $state('');
	let summary = $state('');
	let startDay = $state(0);
	let endDay = $state<number | null>(null);
	let visibility = $state('PUBLIC');
	let error = $state('');
	let busy = $state(false);

	function defaultStart() {
		return calendar.currentDay ?? calendar.timelineStartDay ?? 0;
	}

	function openCreate() {
		editing = null;
		condition = 'CLEAR';
		title = '';
		summary = '';
		startDay = defaultStart();
		endDay = null;
		visibility = 'PUBLIC';
		error = '';
		showForm = true;
	}

	function openEdit(row: RegionWeatherRow) {
		editing = row;
		condition = row.condition;
		title = row.title ?? '';
		summary = row.summary ?? '';
		startDay = row.startDay;
		endDay = row.endDay;
		visibility = row.visibility ?? 'PUBLIC';
		error = '';
		showForm = true;
	}

	function cancel() {
		showForm = false;
		editing = null;
		error = '';
	}

	async function post(action: string, fields: Record<string, string | number | null | undefined>) {
		const fd = new FormData();
		for (const [k, v] of Object.entries(fields)) {
			if (v === undefined || v === null) continue;
			fd.set(k, String(v));
		}
		const res = await fetch(`?/${action}`, { method: 'POST', body: fd });
		if (!res.ok) throw new Error((await res.text()) || 'Request failed');
	}

	async function save() {
		busy = true;
		error = '';
		try {
			const action = editing ? 'updateWeather' : 'createWeather';
			await post(action, {
				weatherId: editing?.id,
				condition,
				title,
				summary,
				startDay,
				endDay: endDay ?? '',
				visibility,
			});
			showForm = false;
			editing = null;
			await onSaved?.();
		} catch (e: any) {
			error = e?.message ?? 'Save failed';
		} finally {
			busy = false;
		}
	}

	async function remove(row: RegionWeatherRow) {
		if (!confirm(`Delete weather period “${row.title || row.condition}”?`)) return;
		busy = true;
		error = '';
		try {
			await post('deleteWeather', { weatherId: row.id });
			await onSaved?.();
		} catch (e: any) {
			error = e?.message ?? 'Delete failed';
		} finally {
			busy = false;
		}
	}

	function rangeLabel(row: RegionWeatherRow) {
		const start = formatDate(calendar, row.startDay);
		if (row.endDay != null && row.endDay !== row.startDay) {
			return `${start} → ${formatDate(calendar, row.endDay)}`;
		}
		return start;
	}
</script>

<div class="card rw">
	<div class="page__header" style="margin-bottom:1rem;">
		<div>
			<h3 class="section-title" style="margin:0;">Weather</h3>
			<p class="field-hint" style="margin:0.25rem 0 0;">
				Set weather periods for this region. They also appear on the world timeline.
			</p>
		</div>
		{#if canEdit}
			<button type="button" class="btn btn-ghost btn-sm" onclick={() => showForm ? cancel() : openCreate()}>
				{showForm ? 'Cancel' : '+ Add weather'}
			</button>
		{/if}
	</div>

	{#if error}<p class="form-error">{error}</p>{/if}

	{#if showForm && canEdit}
		<div class="rw__form">
			<div class="fields">
				<div class="field">
					<label class="label" for="rw-cond">Condition</label>
					<select id="rw-cond" class="input input--select" bind:value={condition}>
						{#each CONDITIONS as c}<option value={c}>{c}</option>{/each}
					</select>
				</div>
				<div class="field">
					<label class="label" for="rw-title">Title (optional)</label>
					<input id="rw-title" class="input" bind:value={title} placeholder="e.g. Midwinter storms" />
				</div>
				<div class="field">
					<label class="label" for="rw-vis">Visibility</label>
					<select id="rw-vis" class="input input--select" bind:value={visibility}>
						<option value="PUBLIC">Public</option>
						<option value="DM_ONLY">DM only</option>
					</select>
				</div>
				<div class="field" style="grid-column:1 / -1;">
					<FantasyDateField
						calendar={calendar}
						name="startDay"
						label="Start date"
						bind:value={startDay}
						required
					/>
				</div>
				<div class="field" style="grid-column:1 / -1;">
					<FantasyDateField
						calendar={calendar}
						name="endDay"
						label="End date"
						bind:value={endDay}
						defaultDay={startDay}
						hint="Optional — leave unset for a one-day period."
					/>
				</div>
				<div class="field" style="grid-column:1 / -1;">
					<label class="label" for="rw-sum">Summary</label>
					<input id="rw-sum" class="input" bind:value={summary} />
				</div>
			</div>
			<div style="display:flex; gap:0.5rem; margin-top:0.75rem;">
				<button type="button" class="btn btn-primary btn-sm" onclick={save} disabled={busy}>Save</button>
				<button type="button" class="btn btn-ghost btn-sm" onclick={cancel}>Cancel</button>
			</div>
		</div>
	{/if}

	{#if weather.length}
		<ul class="rw__list">
			{#each weather as row (row.id)}
				<li class="rw__item">
					<div>
						<div class="rw__when">{rangeLabel(row)}</div>
						<div class="rw__title">{row.title || row.condition}</div>
						<div class="rw__meta">
							<span class="badge">{row.condition}</span>
							{#if row.visibility === 'DM_ONLY'}<span class="badge badge-muted">DM only</span>{/if}
						</div>
						{#if row.summary}<p class="rw__summary">{row.summary}</p>{/if}
					</div>
					{#if canEdit}
						<div class="rw__actions">
							<button type="button" class="btn btn-ghost btn-sm" onclick={() => openEdit(row)} disabled={busy}>Edit</button>
							<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick={() => remove(row)} disabled={busy}>Delete</button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{:else if !showForm}
		<p class="table__empty">No weather periods for this region yet.</p>
	{/if}
</div>

<style>
	.rw__form {
		margin-bottom: 1rem; padding: 1rem;
		background: var(--bg-overlay); border-radius: var(--radius-md);
	}
	.rw__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
	.rw__item {
		display: flex; justify-content: space-between; gap: 0.75rem; align-items: flex-start;
		padding: 0.75rem 0.9rem; border: 1px solid var(--border-base); border-radius: 0.65rem;
		background: var(--bg-surface); border-left: 3px solid #0288d1;
	}
	.rw__when { font-size: 0.75rem; color: var(--text-muted); }
	.rw__title { font-weight: 700; margin-top: 0.1rem; }
	.rw__meta { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.35rem; }
	.rw__summary { margin: 0.35rem 0 0; font-size: 0.8125rem; color: var(--text-secondary); }
	.rw__actions { display: flex; gap: 0.25rem; flex-shrink: 0; }
</style>
