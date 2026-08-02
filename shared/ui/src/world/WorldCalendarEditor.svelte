<!-- shared/ui/src/world/WorldCalendarEditor.svelte -->
<script lang="ts">
	import type { CalendarDef } from './calendar-types.ts';
	import { formatDate, overviewStats } from './calendar-engine.ts';
	import FantasyDateField from './FantasyDateField.svelte';

	type Section = 'overview' | 'months' | 'week' | 'days' | 'eras' | 'moons' | 'settings';

	/** JSON clone — structuredClone fails on Svelte $state/$props proxies. */
	function cloneCalendar(src: CalendarDef): CalendarDef {
		const c = JSON.parse(JSON.stringify(src)) as CalendarDef;
		if (typeof c.currentDay !== 'number' || !Number.isFinite(c.currentDay)) c.currentDay = 0;
		return c;
	}

	let {
		calendar,
		canEdit = true,
		onSave,
		onCancel,
	}: {
		calendar: CalendarDef;
		canEdit?: boolean;
		onSave?: (draft: CalendarDef) => Promise<void> | void;
		onCancel?: () => void;
	} = $props();

	let section = $state<Section>('overview');
	let draft = $state<CalendarDef>(cloneCalendar(calendar));
	let busy = $state(false);
	let error = $state('');
	let previewDay = $state(0);

	$effect(() => {
		draft = cloneCalendar(calendar);
	});

	const stats = $derived(overviewStats(draft));
	const previewLabel = $derived(formatDate(draft, previewDay));
	const months = $derived([...draft.months].sort((a, b) => a.sortOrder - b.sortOrder));
	const weekdays = $derived([...draft.weekdays].sort((a, b) => a.sortOrder - b.sortOrder));
	const eras = $derived([...draft.eras].sort((a, b) => a.sortOrder - b.sortOrder));
	const moons = $derived([...draft.moons].sort((a, b) => a.sortOrder - b.sortOrder));

	const SECTIONS: { id: Section; label: string }[] = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'months', label: 'Months' },
		{ id: 'week', label: 'Week' },
		{ id: 'days', label: 'Days' },
		{ id: 'eras', label: 'Years / Eras' },
		{ id: 'moons', label: 'Moons' },
		{ id: 'settings', label: 'Settings' },
	];

	function moveItem<T extends { sortOrder: number }>(list: T[], index: number, dir: -1 | 1) {
		const j = index + dir;
		if (j < 0 || j >= list.length) return;
		const tmp = list[index]!.sortOrder;
		list[index]!.sortOrder = list[j]!.sortOrder;
		list[j]!.sortOrder = tmp;
		draft = { ...draft };
	}

	function addMonth() {
		const next = draft.months.length;
		draft.months = [...draft.months, { name: `Month ${next + 1}`, abbreviation: `M${next + 1}`, dayCount: 30, sortOrder: next }];
	}
	function removeMonth(i: number) {
		draft.months = draft.months.filter((_, idx) => idx !== i).map((m, idx) => ({ ...m, sortOrder: idx }));
	}
	function addWeekday() {
		const next = draft.weekdays.length;
		draft.weekdays = [...draft.weekdays, { name: `Day ${next + 1}`, abbreviation: `D${next + 1}`, sortOrder: next }];
	}
	function removeWeekday(i: number) {
		draft.weekdays = draft.weekdays.filter((_, idx) => idx !== i).map((w, idx) => ({ ...w, sortOrder: idx }));
		if (draft.epochWeekdayIndex >= draft.weekdays.length) draft.epochWeekdayIndex = 0;
	}
	function addEra(direction: 'FORWARD' | 'BACKWARD') {
		const next = draft.eras.length;
		draft.eras = [...draft.eras, {
			name: direction === 'FORWARD' ? 'New Era' : 'Prior Era',
			abbreviation: 'NE',
			direction,
			startDay: direction === 'FORWARD' ? 0 : -365,
			sortOrder: next,
		}];
	}
	function removeEra(i: number) {
		draft.eras = draft.eras.filter((_, idx) => idx !== i).map((e, idx) => ({ ...e, sortOrder: idx }));
	}
	function addMoon() {
		const next = draft.moons.length;
		draft.moons = [...draft.moons, { name: `Moon ${next + 1}`, cycleLengthDays: 28, offsetDays: 0, sortOrder: next }];
	}
	function removeMoon(i: number) {
		draft.moons = draft.moons.filter((_, idx) => idx !== i).map((m, idx) => ({ ...m, sortOrder: idx }));
	}

	async function save() {
		if (!canEdit || busy) return;
		busy = true;
		error = '';
		try {
			await onSave?.(cloneCalendar(draft));
		} catch (e: any) {
			error = e?.message ?? 'Save failed.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="cal-ed" class:cal-ed--busy={busy}>
	<aside class="cal-ed__side">
		<div class="cal-ed__brand">
			<span class="cal-ed__star" aria-hidden="true">✦</span>
			<div>
				<div class="cal-ed__title">Time System Editor</div>
				<div class="cal-ed__ver">World calendar</div>
			</div>
		</div>

		<nav class="cal-ed__nav" aria-label="Calendar sections">
			{#each SECTIONS as s}
				<button
					type="button"
					class="cal-ed__nav-item"
					class:cal-ed__nav-item--on={section === s.id}
					onclick={() => section = s.id}
				>{s.label}</button>
			{/each}
		</nav>

		{#if canEdit}
			<div class="cal-ed__actions">
				<button type="button" class="btn btn-ghost" onclick={() => onCancel?.()} disabled={busy}>Cancel</button>
				<button type="button" class="btn btn-primary" onclick={save} disabled={busy}>Save</button>
			</div>
		{/if}
	</aside>

	<main class="cal-ed__main">
		{#if error}<p class="form-error">{error}</p>{/if}

		{#if section === 'overview'}
			<h2 class="cal-ed__h">Overview</h2>
			<div class="cal-ed__now card" style="margin-bottom:1.25rem; padding:1rem;">
				<div class="cal-ed__card-label">Current world date</div>
				<p style="margin:0.25rem 0 0.75rem; font-size:1.15rem; font-weight:700;">{stats.currentLabel}</p>
				{#if canEdit}
					<FantasyDateField
						calendar={draft}
						label="Set current date"
						required
						value={draft.currentDay}
						hint="This is “today” for the timeline and world clock. Save to apply."
						onchange={(day) => { if (day != null) draft.currentDay = day; }}
					/>
				{/if}
			</div>
			<div class="cal-ed__cards">
				<div class="cal-ed__card"><div class="cal-ed__card-label">Hours per day</div><div class="cal-ed__card-val">{stats.hoursPerDay}</div></div>
				<div class="cal-ed__card"><div class="cal-ed__card-label">Days per week</div><div class="cal-ed__card-val">{stats.daysPerWeek}</div></div>
				<div class="cal-ed__card"><div class="cal-ed__card-label">Months per year</div><div class="cal-ed__card-val">{stats.monthsPerYear}</div></div>
			</div>
			<div class="cal-ed__stats">
				<div><span>Minutes per hour</span><strong>{stats.minutesPerHour}</strong></div>
				<div><span>Hours per week</span><strong>{stats.hoursPerWeek}</strong></div>
				<div><span>Hours per month</span><strong>{stats.avgHoursPerMonth}</strong></div>
				<div><span>Days per month</span><strong>{stats.avgDaysPerMonth}</strong></div>
				<div><span>Days per year</span><strong>{stats.daysPerYear}</strong></div>
				<div><span>Eras</span><strong>{draft.eras.length}</strong></div>
			</div>
			<hr class="cal-ed__hr" />
			<div class="cal-ed__bounds">
				<div><span>Current date</span><strong>{stats.currentLabel}</strong></div>
				{#if stats.earliestLabel}<div><span>Earliest date</span><strong>{stats.earliestLabel}</strong></div>{/if}
				{#if stats.latestLabel}<div><span>Latest date</span><strong>{stats.latestLabel}</strong></div>{/if}
			</div>
		{:else if section === 'months'}
			<div class="cal-ed__head">
				<h2 class="cal-ed__h">Months</h2>
				{#if canEdit}<button type="button" class="btn btn-sm btn-primary" onclick={addMonth}>+ Month</button>{/if}
			</div>
			<div class="cal-ed__table">
				<div class="cal-ed__row cal-ed__row--head"><span></span><span>Month</span><span>Length</span><span></span></div>
				{#each months as m, i (m.sortOrder + m.name)}
					<div class="cal-ed__row">
						<span class="cal-ed__idx">{i + 1}</span>
						{#if canEdit}
							<input class="input" bind:value={m.name} />
							<input class="input" type="number" min="1" style="max-width:6rem;" bind:value={m.dayCount} />
							<span class="cal-ed__row-actions">
								<button type="button" class="btn btn-ghost btn-sm" onclick={() => moveItem(draft.months, draft.months.indexOf(m), -1)}>↑</button>
								<button type="button" class="btn btn-ghost btn-sm" onclick={() => moveItem(draft.months, draft.months.indexOf(m), 1)}>↓</button>
								<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick={() => removeMonth(draft.months.indexOf(m))}>×</button>
							</span>
						{:else}
							<span>{m.name}</span>
							<span>{m.dayCount}</span>
							<span></span>
						{/if}
					</div>
				{/each}
			</div>
		{:else if section === 'week'}
			<div class="cal-ed__head">
				<h2 class="cal-ed__h">Weekdays</h2>
				{#if canEdit}<button type="button" class="btn btn-sm btn-primary" onclick={addWeekday}>+ Day</button>{/if}
			</div>
			<div class="cal-ed__table">
				{#each weekdays as w, i}
					<div class="cal-ed__row">
						<span class="cal-ed__idx">{i + 1}</span>
						{#if canEdit}
							<input class="input" bind:value={w.name} />
							<span class="cal-ed__row-actions">
								<button type="button" class="btn btn-ghost btn-sm" onclick={() => moveItem(draft.weekdays, draft.weekdays.indexOf(w), -1)}>↑</button>
								<button type="button" class="btn btn-ghost btn-sm" onclick={() => moveItem(draft.weekdays, draft.weekdays.indexOf(w), 1)}>↓</button>
								<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick={() => removeWeekday(draft.weekdays.indexOf(w))}>×</button>
							</span>
						{:else}
							<span>{w.name}</span>
						{/if}
					</div>
				{/each}
			</div>
			<div class="cal-ed__field-block">
				<label class="label" for="epoch-wd">Epoch weekday</label>
				<p class="field-hint">Starting weekday of the first year</p>
				<select id="epoch-wd" class="input input--select" bind:value={draft.epochWeekdayIndex} disabled={!canEdit}>
					{#each weekdays as w, i}
						<option value={i}>{w.name}</option>
					{/each}
				</select>
			</div>
			<label class="cal-ed__toggle">
				<input type="checkbox" bind:checked={draft.weekdaysResetEachMonth} disabled={!canEdit} />
				<span>
					<strong>Weekdays reset each month</strong>
					<small>Weekday numbering resets at the start of each month</small>
				</span>
			</label>
		{:else if section === 'days'}
			<h2 class="cal-ed__h">Days</h2>
			<div class="fields" style="max-width:20rem;">
				<div class="field">
					<label class="label" for="hpd">Hours in a day</label>
					<input id="hpd" class="input" type="number" min="1" max="240" bind:value={draft.hoursPerDay} disabled={!canEdit} />
				</div>
				<div class="field">
					<label class="label" for="mph">Minutes in an hour</label>
					<input id="mph" class="input" type="number" min="1" max="600" bind:value={draft.minutesPerHour} disabled={!canEdit} />
				</div>
			</div>
		{:else if section === 'eras'}
			<h2 class="cal-ed__h">Years / Eras</h2>
			<div class="cal-ed__era-block">
				<div class="cal-ed__head"><h3>Forward eras</h3>
					{#if canEdit}<button type="button" class="btn btn-sm btn-ghost" onclick={() => addEra('FORWARD')}>+ Add era</button>{/if}
				</div>
				{#each eras.filter(e => e.direction === 'FORWARD') as e}
					<div class="cal-ed__era">
						{#if canEdit}
							<input class="input" style="max-width:5rem;" bind:value={e.abbreviation} title="Abbreviation" />
							<input class="input" bind:value={e.name} />
							<label class="cal-ed__mini">Start day <input class="input" type="number" bind:value={e.startDay} /></label>
							<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick={() => removeEra(draft.eras.indexOf(e))}>×</button>
						{:else}
							<span class="badge">{e.abbreviation}</span>
							<span>{e.name}</span>
							<span class="cal-ed__muted">day {e.startDay}</span>
						{/if}
					</div>
				{/each}
			</div>
			<div class="cal-ed__era-block">
				<div class="cal-ed__head"><h3>Backward eras (optional)</h3>
					{#if canEdit}<button type="button" class="btn btn-sm btn-ghost" onclick={() => addEra('BACKWARD')}>+ Add era</button>{/if}
				</div>
				{#each eras.filter(e => e.direction === 'BACKWARD') as e}
					<div class="cal-ed__era">
						{#if canEdit}
							<input class="input" style="max-width:5rem;" bind:value={e.abbreviation} />
							<input class="input" bind:value={e.name} />
							<label class="cal-ed__mini">Start day <input class="input" type="number" bind:value={e.startDay} /></label>
							<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick={() => removeEra(draft.eras.indexOf(e))}>×</button>
						{:else}
							<span class="badge">{e.abbreviation}</span>
							<span>{e.name}</span>
						{/if}
					</div>
				{/each}
			</div>
			<label class="cal-ed__toggle">
				<input type="checkbox" bind:checked={draft.erasStartOnZero} disabled={!canEdit} />
				<span>
					<strong>Eras start on zero year</strong>
					<small>When enabled, the first year of each era will be 0, instead of 1.</small>
				</span>
			</label>
			<div class="fields" style="max-width:24rem; margin-top:1rem;">
				<div class="field">
					<label class="label" for="tsd">Timeline start day</label>
					<input id="tsd" class="input" type="number" value={draft.timelineStartDay ?? ''}
						oninput={(e) => { const v = (e.target as HTMLInputElement).value; draft.timelineStartDay = v === '' ? null : Number(v); }}
						disabled={!canEdit} />
				</div>
				<div class="field">
					<label class="label" for="ted">Timeline end day</label>
					<input id="ted" class="input" type="number" value={draft.timelineEndDay ?? ''}
						oninput={(e) => { const v = (e.target as HTMLInputElement).value; draft.timelineEndDay = v === '' ? null : Number(v); }}
						disabled={!canEdit} />
				</div>
			</div>
		{:else if section === 'moons'}
			<div class="cal-ed__head">
				<h2 class="cal-ed__h">Moons</h2>
				{#if canEdit}<button type="button" class="btn btn-sm btn-primary" onclick={addMoon}>+ Moon</button>{/if}
			</div>
			{#if moons.length === 0}
				<div class="cal-ed__empty">
					<p>No moons yet</p>
					<p class="cal-ed__muted">Add your first moon to begin tracking lunar cycles</p>
					{#if canEdit}<button type="button" class="btn btn-primary" onclick={addMoon}>+ Add Moon</button>{/if}
				</div>
			{:else}
				{#each moons as m}
					<div class="cal-ed__era">
						{#if canEdit}
							<input class="input" bind:value={m.name} />
							<label class="cal-ed__mini">Cycle days <input class="input" type="number" step="0.1" bind:value={m.cycleLengthDays} /></label>
							<label class="cal-ed__mini">Offset <input class="input" type="number" step="0.1" bind:value={m.offsetDays} /></label>
							<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick={() => removeMoon(draft.moons.indexOf(m))}>×</button>
						{:else}
							<span>{m.name}</span>
							<span class="cal-ed__muted">{m.cycleLengthDays}d cycle</span>
						{/if}
					</div>
				{/each}
			{/if}
		{:else if section === 'settings'}
			<h2 class="cal-ed__h">Settings</h2>
			<div class="field">
				<label class="label" for="date-fmt">Date display</label>
				<input id="date-fmt" class="input" bind:value={draft.dateFormat} disabled={!canEdit} />
				<p class="field-hint">Preview: <strong>{previewLabel}</strong></p>
				<label class="label" for="prev-day" style="margin-top:0.5rem;">Preview day (absolute)</label>
				<input id="prev-day" class="input" type="number" bind:value={previewDay} style="max-width:10rem;" />
			</div>
			<div class="field" style="margin-top:1rem;">
				<label class="label" for="time-fmt">Time format</label>
				<select id="time-fmt" class="input input--select" bind:value={draft.timeFormat} disabled={!canEdit}>
					<option value="H24">24 hour</option>
					<option value="H12">12 hour</option>
				</select>
			</div>
			<div class="cal-ed__field-block">
				<div class="label">Timeline View</div>
				<label class="cal-ed__check"><input type="checkbox" bind:checked={draft.enableListView} disabled={!canEdit} /> List
					{#if draft.defaultView === 'LIST'}<span class="cal-ed__muted">Default</span>{/if}
				</label>
				<label class="cal-ed__check"><input type="checkbox" bind:checked={draft.enableCalendarView} disabled={!canEdit} /> Calendar
					{#if draft.defaultView === 'CALENDAR'}<span class="cal-ed__muted">Default</span>{/if}
				</label>
				<label class="cal-ed__check"><input type="checkbox" bind:checked={draft.enableGanttView} disabled={!canEdit} /> Gantt
					{#if draft.defaultView === 'GANTT'}<span class="cal-ed__muted">Default</span>{/if}
				</label>
				{#if canEdit}
					<label class="label" for="def-view" style="margin-top:0.5rem;">Default view</label>
					<select id="def-view" class="input input--select" bind:value={draft.defaultView}>
						{#if draft.enableListView}<option value="LIST">List</option>{/if}
						{#if draft.enableCalendarView}<option value="CALENDAR">Calendar</option>{/if}
						{#if draft.enableGanttView}<option value="GANTT">Gantt</option>{/if}
					</select>
				{/if}
			</div>
			<details class="cal-ed__codes">
				<summary>Display codes</summary>
				<ul>
					<li><code>E</code> era abbr · <code>EE</code> era name</li>
					<li><code>YY</code> / <code>YYYY</code> year</li>
					<li><code>M</code>–<code>MMMM</code> month</li>
					<li><code>D</code> / <code>DD</code> day · <code>^</code> ordinal</li>
					<li><code>H</code>/<code>HH</code> hour · <code>m</code>/<code>mm</code> minute</li>
					<li><code>[Text]</code> literal</li>
				</ul>
			</details>
		{/if}
	</main>
</div>

<style>
	.cal-ed {
		display: grid;
		grid-template-columns: 220px 1fr;
		min-height: 70vh;
		border: 1px solid var(--border-base);
		border-radius: 0.75rem;
		overflow: hidden;
		background: var(--bg-surface);
	}
	.cal-ed--busy { opacity: 0.85; pointer-events: none; }
	.cal-ed__side {
		display: flex;
		flex-direction: column;
		border-right: 1px solid var(--border-base);
		background: var(--bg-muted);
		padding: 1rem 0.75rem;
		gap: 0.75rem;
	}
	.cal-ed__brand { display: flex; gap: 0.5rem; align-items: center; padding: 0 0.35rem; }
	.cal-ed__star { color: var(--accent); font-size: 1.1rem; }
	.cal-ed__title { font-weight: 700; font-size: 0.9rem; }
	.cal-ed__ver { font-size: 0.7rem; color: var(--text-muted); }
	.cal-ed__nav { display: flex; flex-direction: column; gap: 0.15rem; flex: 1; }
	.cal-ed__nav-item {
		appearance: none; border: none; background: transparent; text-align: left;
		color: var(--text-secondary); font: inherit; font-size: 0.875rem; font-weight: 600;
		padding: 0.45rem 0.65rem; border-radius: 0.5rem; cursor: pointer;
	}
	.cal-ed__nav-item:hover { color: var(--text-primary); background: color-mix(in srgb, var(--bg-surface) 70%, transparent); }
	.cal-ed__nav-item--on { background: var(--bg-surface); color: var(--text-primary); }
	.cal-ed__actions { display: flex; gap: 0.35rem; padding-top: 0.5rem; border-top: 1px solid var(--border-base); }
	.cal-ed__actions .btn { flex: 1; }
	.cal-ed__main { padding: 1.25rem 1.5rem; overflow: auto; }
	.cal-ed__h { margin: 0 0 1rem; font-size: 1.35rem; }
	.cal-ed__head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
	.cal-ed__head h3 { margin: 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
	.cal-ed__cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.25rem; }
	.cal-ed__card { background: var(--bg-muted); border-radius: 0.65rem; padding: 1rem; border: 1px solid var(--border-base); }
	.cal-ed__card-label { font-size: 0.75rem; color: var(--text-muted); }
	.cal-ed__card-val { font-size: 1.75rem; font-weight: 700; margin-top: 0.25rem; }
	.cal-ed__stats, .cal-ed__bounds { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem 1.5rem; }
	.cal-ed__stats span, .cal-ed__bounds span { display: block; font-size: 0.75rem; color: var(--text-muted); }
	.cal-ed__hr { border: none; border-top: 1px solid var(--border-base); margin: 1.25rem 0; }
	.cal-ed__table { display: flex; flex-direction: column; gap: 0.35rem; }
	.cal-ed__row { display: grid; grid-template-columns: 2rem 1fr 6rem auto; gap: 0.5rem; align-items: center; }
	.cal-ed__row--head { font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.04em; }
	.cal-ed__idx { color: var(--text-muted); font-size: 0.8rem; text-align: center; }
	.cal-ed__row-actions { display: flex; gap: 0.15rem; }
	.cal-ed__field-block { margin-top: 1.25rem; }
	.cal-ed__toggle, .cal-ed__check { display: flex; gap: 0.65rem; align-items: flex-start; margin-top: 1rem; cursor: pointer; }
	.cal-ed__toggle small, .cal-ed__muted { display: block; color: var(--text-muted); font-size: 0.75rem; font-weight: 400; }
	.cal-ed__era-block { margin-bottom: 1.25rem; }
	.cal-ed__era { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin-bottom: 0.4rem; padding: 0.5rem; border: 1px solid var(--border-base); border-radius: 0.5rem; }
	.cal-ed__mini { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem; }
	.cal-ed__mini .input { width: 6rem; }
	.cal-ed__empty { border: 1px dashed var(--border-base); border-radius: 0.75rem; padding: 2.5rem 1rem; text-align: center; }
	.cal-ed__codes { margin-top: 1.5rem; font-size: 0.8125rem; color: var(--text-secondary); }
	.cal-ed__codes ul { padding-left: 1.1rem; }
	@media (max-width: 800px) {
		.cal-ed { grid-template-columns: 1fr; }
		.cal-ed__cards { grid-template-columns: 1fr; }
		.cal-ed__row { grid-template-columns: 2rem 1fr; }
	}
</style>
