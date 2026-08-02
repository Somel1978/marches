<!-- shared/ui/src/world/WorldTimeline.svelte -->
<script lang="ts">
	import type { CalendarDef, TimelineEntryView } from './calendar-types.ts';
	import { formatDate, fromAbsoluteDay, moonsOnDay, sortedMonths, toAbsoluteDay } from './calendar-engine.ts';

	let {
		calendar,
		entries = [],
		canEdit = false,
		hrefFor,
		onAddEvent,
		onAddWeather,
		onAddNpcSchedule,
		onEditEvent,
		onDeleteEvent,
	}: {
		calendar: CalendarDef;
		entries?: TimelineEntryView[];
		canEdit?: boolean;
		hrefFor: (entry: TimelineEntryView) => string | null;
		onAddEvent?: () => void;
		onAddWeather?: () => void;
		onAddNpcSchedule?: () => void;
		onEditEvent?: (entry: TimelineEntryView) => void;
		onDeleteEvent?: (entry: TimelineEntryView) => void;
	} = $props();

	type View = 'LIST' | 'CALENDAR' | 'GANTT';

	const initialView = $derived.by((): View => {
		if (calendar.defaultView === 'GANTT' && calendar.enableGanttView) return 'GANTT';
		if (calendar.defaultView === 'CALENDAR' && calendar.enableCalendarView) return 'CALENDAR';
		if (calendar.enableListView) return 'LIST';
		if (calendar.enableCalendarView) return 'CALENDAR';
		if (calendar.enableGanttView) return 'GANTT';
		return 'LIST';
	});
	let view = $state<View>('LIST');
	$effect(() => { view = initialView; });

	const months = $derived(sortedMonths(calendar));
	const firstYear = $derived(calendar.erasStartOnZero ? 0 : 1);

	let year = $state(1);
	let monthIndex = $state(0);

	$effect(() => {
		const parts = fromAbsoluteDay(calendar, calendar.currentDay ?? 0);
		year = parts.eraYear;
		monthIndex = parts.monthIndex;
	});

	const monthMeta = $derived.by(() => {
		const m = months[monthIndex];
		if (!m) return { startDay: 0, dayCount: 0, label: '' };
		const startDay = toAbsoluteDay(calendar, { year, monthIndex, day: 1 });
		return {
			startDay,
			dayCount: m.dayCount,
			label: formatDate(calendar, startDay, { format: 'MMMM YYYY E' }),
		};
	});

	const monthEntries = $derived(
		entries.filter(e => {
			const end = e.endDay ?? e.startDay;
			const start = monthMeta.startDay;
			const last = start + monthMeta.dayCount - 1;
			return e.startDay <= last && end >= start;
		}),
	);

	const today = $derived(calendar.currentDay ?? 0);
	const todayLabel = $derived(formatDate(calendar, today));

	/** Always include world today so the Gantt marker is visible. */
	const ganttRange = $derived.by(() => {
		let start: number;
		let end: number;
		if (!entries.length) {
			start = today - 14;
			end = today + 15;
		} else {
			const starts = entries.map(e => e.startDay);
			const ends = entries.map(e => e.endDay ?? e.startDay);
			start = Math.min(today, ...starts);
			end = Math.max(today, ...ends);
		}
		const pad = Math.max(3, Math.ceil((end - start + 1) * 0.06));
		start -= pad;
		end += pad;
		const span = Math.max(1, end - start + 1);
		return { start, end, span };
	});

	const ganttTodayPct = $derived(
		((today - ganttRange.start) / ganttRange.span) * 100,
	);

	function prevMonth() {
		if (monthIndex > 0) monthIndex -= 1;
		else { monthIndex = Math.max(0, months.length - 1); year -= 1; }
	}
	function nextMonth() {
		if (monthIndex < months.length - 1) monthIndex += 1;
		else { monthIndex = 0; year += 1; }
	}

	function entriesOnDay(dayOfMonth: number) {
		const abs = monthMeta.startDay + dayOfMonth - 1;
		return monthEntries.filter(e => {
			const end = e.endDay ?? e.startDay;
			return e.startDay <= abs && end >= abs;
		});
	}

	function canMutate(entry: TimelineEntryView) {
		// Weather is edited on the region page (timeline only displays it).
		return entry.kind === 'EVENT' || entry.kind === 'NPC_SCHEDULE';
	}

	function barStyle(entry: TimelineEntryView) {
		const end = entry.endDay ?? entry.startDay;
		const left = ((entry.startDay - ganttRange.start) / ganttRange.span) * 100;
		const width = ((end - entry.startDay + 1) / ganttRange.span) * 100;
		return `left:${Math.max(0, left)}%;width:${Math.max(1.5, width)}%;`;
	}

	function entryDateLabel(entry: TimelineEntryView) {
		const start = formatDate(calendar, entry.startDay);
		if (entry.endDay != null && entry.endDay !== entry.startDay) {
			return `${start} → ${formatDate(calendar, entry.endDay)}`;
		}
		return start;
	}

	function spansToday(entry: TimelineEntryView) {
		const end = entry.endDay ?? entry.startDay;
		return entry.startDay <= today && end >= today;
	}

	const kindLabel: Record<string, string> = {
		EVENT: 'Event',
		PLOT_QUEST: 'Plot quest',
		WEATHER: 'Weather',
		NPC_SCHEDULE: 'NPC schedule',
	};

	/** Past (ended before today) → Today → active/future. */
	const listRows = $derived.by(() => {
		type Row =
			| { type: 'today' }
			| { type: 'entry'; entry: TimelineEntryView };
		const rows: Row[] = [];
		let inserted = false;
		for (const entry of entries) {
			const end = entry.endDay ?? entry.startDay;
			if (!inserted && end >= today) {
				rows.push({ type: 'today' });
				inserted = true;
			}
			rows.push({ type: 'entry', entry });
		}
		if (!inserted) rows.push({ type: 'today' });
		return rows;
	});
</script>

<div class="tl">
	<div class="tl__today-bar" title="World current date (set in Calendar → Overview)">
		<span class="tl__today-bar-label">Today</span>
		<strong>{todayLabel}</strong>
	</div>

	<div class="tl__toolbar">
		<div class="tl__views">
			{#if calendar.enableListView}
				<button type="button" class="btn btn-sm" class:btn-primary={view === 'LIST'} class:btn-ghost={view !== 'LIST'} onclick={() => view = 'LIST'}>List</button>
			{/if}
			{#if calendar.enableCalendarView}
				<button type="button" class="btn btn-sm" class:btn-primary={view === 'CALENDAR'} class:btn-ghost={view !== 'CALENDAR'} onclick={() => view = 'CALENDAR'}>Calendar</button>
			{/if}
			{#if calendar.enableGanttView}
				<button type="button" class="btn btn-sm" class:btn-primary={view === 'GANTT'} class:btn-ghost={view !== 'GANTT'} onclick={() => view = 'GANTT'}>Gantt</button>
			{/if}
		</div>
		{#if canEdit}
			<div class="tl__add">
				{#if onAddEvent}
					<button type="button" class="btn btn-primary btn-sm" onclick={() => onAddEvent?.()}>+ Event</button>
				{/if}
				{#if onAddWeather}
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => onAddWeather?.()}>+ Weather</button>
				{/if}
				{#if onAddNpcSchedule}
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => onAddNpcSchedule?.()}>+ NPC</button>
				{/if}
			</div>
		{/if}
	</div>

	{#if view === 'LIST'}
		{#if entries.length === 0}
			<p class="tl__empty">No timeline entries yet.</p>
			<div class="tl__list-today" role="separator">
				<span>Today — {todayLabel}</span>
			</div>
		{:else}
			<ul class="tl__list">
				{#each listRows as row (row.type === 'today' ? 'today' : row.entry.id)}
					{#if row.type === 'today'}
						<li class="tl__list-today" role="separator">
							<span>Today — {todayLabel}</span>
						</li>
					{:else}
						{@const entry = row.entry}
						{@const href = hrefFor(entry)}
						<li class="tl__item tl__item--{entry.kind.toLowerCase()}" class:tl__item--on-today={spansToday(entry)}>
							<div class="tl__item-main">
								<div class="tl__when">
									{entryDateLabel(entry)}
								</div>
								<div class="tl__title">
									{#if href}
										<a href={href}>{entry.title}</a>
									{:else}
										{entry.title}
									{/if}
									{#if spansToday(entry)}
										<span class="tl__today-badge" title="Includes world today — {todayLabel}">Today</span>
									{/if}
								</div>
								<div class="tl__meta">
									<span class="badge badge-muted">{kindLabel[entry.kind] ?? entry.kind}</span>
									{#if entry.eventType}<span class="badge">{entry.eventType}</span>{/if}
									{#if entry.weatherCondition}<span class="badge">{entry.weatherCondition}</span>{/if}
									{#if entry.regionName}<span class="badge badge-muted">{entry.regionName}</span>{/if}
									{#if entry.npcName}<span class="badge badge-muted">{entry.npcName}</span>{/if}
									{#if entry.plotQuestStatus}<span class="badge badge-muted">{entry.plotQuestStatus}</span>{/if}
									{#if entry.visibility === 'DM_ONLY'}<span class="badge badge-muted">DM only</span>{/if}
								</div>
								{#if entry.summary}<p class="tl__summary">{entry.summary}</p>{/if}
							</div>
							{#if canEdit && canMutate(entry)}
								<div class="tl__item-actions">
									<button type="button" class="btn btn-ghost btn-sm" onclick={() => onEditEvent?.(entry)}>Edit</button>
									<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick={() => onDeleteEvent?.(entry)}>Delete</button>
								</div>
							{/if}
						</li>
					{/if}
				{/each}
			</ul>
		{/if}
	{:else if view === 'CALENDAR'}
		<div class="tl__cal-nav">
			<button type="button" class="btn btn-ghost btn-sm" onclick={prevMonth}>←</button>
			<strong>{monthMeta.label}</strong>
			<button type="button" class="btn btn-ghost btn-sm" onclick={nextMonth}>→</button>
		</div>
		<div class="tl__grid" style="--cols: {Math.min(7, calendar.weekdays.length || 7)}">
			{#each Array(monthMeta.dayCount) as _, i}
				{@const day = i + 1}
				{@const abs = monthMeta.startDay + i}
				{@const dayEntries = entriesOnDay(day)}
				{@const parts = fromAbsoluteDay(calendar, abs)}
				{@const moons = moonsOnDay(calendar, abs)}
				{@const isToday = abs === today}
				<div class="tl__cell" class:tl__cell--today={isToday}>
					<div class="tl__cell-day">
						<span>{day}{#if isToday}<span class="tl__today-mark"> today</span>{/if}</span>
						<span class="tl__cell-right">
							{#if moons.length}
								<span class="tl__moons" title={moons.map(m => `${m.moonName}: ${m.name}`).join(' · ')}>
									{#each moons.slice(0, 2) as m}<span aria-hidden="true">{m.emoji}</span>{/each}
								</span>
							{/if}
							{#if parts.weekday}<span class="tl__wd">{parts.weekday.abbreviation || parts.weekday.name.slice(0, 2)}</span>{/if}
						</span>
					</div>
					{#each dayEntries.slice(0, 3) as entry}
						{@const href = hrefFor(entry)}
						{#if href}
							<a class="tl__chip tl__chip--{entry.kind.toLowerCase()}" href={href}>{entry.title}</a>
						{:else}
							<span class="tl__chip tl__chip--{entry.kind.toLowerCase()}">{entry.title}</span>
						{/if}
					{/each}
					{#if dayEntries.length > 3}
						<span class="tl__more">+{dayEntries.length - 3}</span>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<!-- Gantt -->
		<div class="tl__gantt-meta">
			<span>{formatDate(calendar, ganttRange.start)} → {formatDate(calendar, ganttRange.end)}</span>
			<span class="tl__gantt-today-meta">Today · {todayLabel}</span>
		</div>
		<div class="tl__gantt">
			<!-- Fixed actions column width so every track is the same width (today % lines up). -->
			<div class="tl__gantt-row tl__gantt-row--axis" aria-hidden="true">
				<div class="tl__gantt-label"></div>
				<div class="tl__gantt-track tl__gantt-track--axis">
					<div class="tl__gantt-today-line" style="left:{ganttTodayPct}%;">
						<span class="tl__gantt-today-cap">Today</span>
					</div>
				</div>
				<div class="tl__gantt-actions-slot"></div>
			</div>
			{#if entries.length === 0}
				<p class="tl__empty">No timeline entries yet.</p>
			{:else}
				{#each entries as entry (entry.id)}
					{@const href = hrefFor(entry)}
					{@const onToday = spansToday(entry)}
					<div class="tl__gantt-row" class:tl__gantt-row--on-today={onToday}>
						<div class="tl__gantt-label" title={entry.title}>
							{#if href}<a href={href}>{entry.title}</a>
							{:else}{entry.title}{/if}
							<span class="tl__gantt-kind">
								{kindLabel[entry.kind]}
								{#if onToday}<span class="tl__today-badge">Today</span>{/if}
							</span>
							<span class="tl__gantt-dates">{entryDateLabel(entry)}</span>
						</div>
						<div class="tl__gantt-track">
							<div class="tl__gantt-today-line" style="left:{ganttTodayPct}%;" title="Today — {todayLabel}"></div>
							<div
								class="tl__gantt-bar tl__gantt-bar--{entry.kind.toLowerCase()}"
								class:tl__gantt-bar--on-today={onToday}
								style={barStyle(entry)}
								title="{entryDateLabel(entry)} — {entry.title}"
							>
								<span>{entry.title}</span>
							</div>
						</div>
						<div class="tl__gantt-actions-slot">
							{#if canEdit && canMutate(entry)}
								<div class="tl__item-actions">
									<button type="button" class="btn btn-ghost btn-sm" onclick={() => onEditEvent?.(entry)}>Edit</button>
									<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick={() => onDeleteEvent?.(entry)}>×</button>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</div>

<style>
	.tl__today-bar {
		display: flex; align-items: baseline; gap: 0.5rem; flex-wrap: wrap;
		margin-bottom: 0.75rem; padding: 0.55rem 0.75rem;
		border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--border-base));
		border-radius: 0.55rem;
		background: color-mix(in srgb, var(--accent) 12%, var(--bg-surface));
	}
	.tl__today-bar-label {
		font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent);
	}
	.tl__toolbar { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
	.tl__views, .tl__add { display: flex; gap: 0.35rem; flex-wrap: wrap; }
	.tl__list-today {
		list-style: none; display: flex; align-items: center; gap: 0.75rem;
		margin: 0.5rem 0; padding: 0.45rem 0; color: var(--accent); font-size: 0.8rem; font-weight: 700;
	}
	.tl__list-today::before, .tl__list-today::after {
		content: ''; flex: 1; height: 2px; background: color-mix(in srgb, var(--accent) 55%, transparent);
	}
	.tl__item--on-today {
		border-color: var(--accent);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent);
		background: color-mix(in srgb, var(--accent) 8%, var(--bg-surface));
	}
	.tl__today-badge {
		display: inline-block; margin-left: 0.4rem; padding: 0.1rem 0.4rem;
		border-radius: 0.25rem; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.04em;
		text-transform: uppercase; vertical-align: middle;
		background: var(--accent); color: var(--accent-text, #fff);
	}
	.tl__empty { color: var(--text-muted); }
	.tl__muted { color: var(--text-muted); font-size: 0.8rem; }
	.tl__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
	.tl__item {
		display: flex; justify-content: space-between; gap: 0.75rem; align-items: flex-start;
		padding: 0.75rem 0.9rem; border: 1px solid var(--border-base); border-radius: 0.65rem; background: var(--bg-surface);
	}
	.tl__item--plot_quest { border-left: 3px solid #6a1b9a; }
	.tl__item--event { border-left: 3px solid var(--accent); }
	.tl__item--weather { border-left: 3px solid #0288d1; }
	.tl__item--npc_schedule { border-left: 3px solid #8d6e63; }
	.tl__when { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.15rem; }
	.tl__title { font-weight: 700; }
	.tl__meta { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.35rem; }
	.tl__summary { margin: 0.35rem 0 0; font-size: 0.8125rem; color: var(--text-secondary); }
	.tl__item-actions { display: flex; gap: 0.25rem; flex-shrink: 0; }
	.tl__cal-nav { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: 0.75rem; }
	.tl__grid {
		display: grid;
		grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
		gap: 0.35rem;
	}
	.tl__cell {
		min-height: 5.5rem; border: 1px solid var(--border-base); border-radius: 0.45rem;
		padding: 0.35rem; background: var(--bg-muted); display: flex; flex-direction: column; gap: 0.2rem;
	}
	.tl__cell--today {
		border-color: var(--accent);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent);
		background: color-mix(in srgb, var(--accent) 10%, var(--bg-muted));
	}
	.tl__today-mark { font-size: 0.6rem; font-weight: 600; color: var(--accent); text-transform: uppercase; }
	.tl__cell-day { display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; }
	.tl__cell-right { display: flex; align-items: center; gap: 0.25rem; }
	.tl__moons { font-size: 0.7rem; line-height: 1; }
	.tl__wd { color: var(--text-muted); font-weight: 500; }
	.tl__chip {
		display: block; font-size: 0.65rem; padding: 0.15rem 0.3rem; border-radius: 0.25rem;
		background: color-mix(in srgb, var(--accent) 20%, transparent); color: var(--text-primary);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-decoration: none;
	}
	.tl__chip--plot_quest { background: color-mix(in srgb, #6a1b9a 28%, transparent); }
	.tl__chip--weather { background: color-mix(in srgb, #0288d1 28%, transparent); }
	.tl__chip--npc_schedule { background: color-mix(in srgb, #8d6e63 28%, transparent); }
	.tl__more { font-size: 0.65rem; color: var(--text-muted); }

	.tl__gantt-meta { display: flex; justify-content: space-between; align-items: baseline; gap: 0.75rem; margin-bottom: 0.65rem; font-size: 0.85rem; flex-wrap: wrap; }
	.tl__gantt-today-meta { font-weight: 700; color: var(--accent); }
	.tl__gantt { display: flex; flex-direction: column; gap: 0.35rem; }
	.tl__gantt-row {
		display: grid;
		/* Fixed actions slot so track width matches on axis + data rows */
		grid-template-columns: minmax(7rem, 12rem) minmax(0, 1fr) 7.5rem;
		gap: 0.5rem;
		align-items: center;
	}
	.tl__gantt-row--axis { margin-bottom: 0.15rem; }
	.tl__gantt-row--on-today .tl__gantt-label { color: var(--accent); }
	.tl__gantt-label {
		font-size: 0.8rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.tl__gantt-kind { display: block; font-size: 0.65rem; color: var(--text-muted); font-weight: 500; }
	.tl__gantt-kind .tl__today-badge { margin-left: 0.25rem; }
	.tl__gantt-dates { display: block; font-size: 0.65rem; color: var(--text-muted); font-weight: 500; }
	.tl__gantt-actions-slot {
		width: 7.5rem; display: flex; justify-content: flex-end; align-items: center; min-height: 1.6rem;
	}
	.tl__gantt-track {
		position: relative; height: 1.6rem; border-radius: 0.35rem;
		background: var(--bg-muted); border: 1px solid var(--border-base); overflow: visible;
		box-sizing: border-box;
	}
	.tl__gantt-track--axis {
		height: 1.25rem; background: transparent;
		/* Same 1px border box as data tracks so left:% matches exactly */
		border-color: transparent; border-bottom-color: var(--border-base); border-radius: 0;
	}
	.tl__gantt-today-line {
		position: absolute; top: -2px; bottom: -2px; width: 2px;
		background: var(--accent); left: 0; transform: translateX(-50%);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent);
		z-index: 3; pointer-events: none;
	}
	.tl__gantt-today-cap {
		position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
		margin-bottom: 0.1rem;
		font-size: 0.65rem; font-weight: 700; color: var(--accent); white-space: nowrap;
		text-transform: uppercase; letter-spacing: 0.04em;
	}
	.tl__gantt-bar {
		position: absolute; top: 2px; bottom: 2px; border-radius: 0.25rem;
		display: flex; align-items: center; padding: 0 0.35rem;
		font-size: 0.65rem; font-weight: 600; color: #fff; overflow: hidden; white-space: nowrap;
		background: var(--accent); z-index: 1;
	}
	.tl__gantt-bar--on-today {
		outline: 2px solid color-mix(in srgb, var(--accent-light, #fff) 70%, transparent);
		outline-offset: 1px;
	}
	.tl__gantt-bar--plot_quest { background: #6a1b9a; }
	.tl__gantt-bar--weather { background: #0288d1; }
	.tl__gantt-bar--npc_schedule { background: #8d6e63; }
	.tl__gantt-bar span { overflow: hidden; text-overflow: ellipsis; }

	@media (max-width: 700px) {
		.tl__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.tl__gantt-row { grid-template-columns: 1fr; }
		.tl__gantt-actions-slot { width: auto; }
	}
</style>
