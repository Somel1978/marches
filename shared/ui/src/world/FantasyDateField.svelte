<!-- shared/ui/src/world/FantasyDateField.svelte -->
<script lang="ts">
	import { untrack } from 'svelte';
	import type { CalendarDef } from './calendar-types.ts';
	import { formatDate, fromAbsoluteDay, sortedMonths, toAbsoluteDay } from './calendar-engine.ts';

	let {
		calendar,
		name = 'deadlineDay',
		label = 'Deadline',
		value = $bindable<number | null>(null),
		disabled = false,
		required = false,
		hint = '',
		/** When the optional date is first enabled, seed from this absolute day. */
		defaultDay = null as number | null,
		onchange,
	}: {
		calendar: CalendarDef;
		name?: string;
		label?: string;
		value?: number | null;
		disabled?: boolean;
		/** When true, date is always set (no “Set date” checkbox). */
		required?: boolean;
		hint?: string;
		defaultDay?: number | null;
		onchange?: (day: number | null) => void;
	} = $props();

	const months = $derived(sortedMonths(calendar));
	const firstYear = $derived(calendar.erasStartOnZero ? 0 : 1);

	let enabled = $state(untrack(() => required || value != null));
	let year = $state(untrack(() => firstYear));
	let monthIndex = $state(0);
	let day = $state(1);
	/** Absolute day we last wrote or hydrated — skips echo re-hydration. */
	let syncedAbs = $state<number | null | undefined>(undefined);

	function clampDayForMonth(d: number, mIdx: number) {
		const max = months[mIdx]?.dayCount ?? 1;
		return Math.max(1, Math.min(max, d));
	}

	function readParts(absolute: number) {
		const parts = fromAbsoluteDay(calendar, absolute);
		year = parts.year;
		monthIndex = parts.monthIndex;
		day = parts.day;
	}

	function computeAbs(y: number, mIdx: number, d: number) {
		return toAbsoluteDay(calendar, {
			year: y,
			monthIndex: mIdx,
			day: clampDayForMonth(d, mIdx),
		});
	}

	function commit(nextYear: number, nextMonth: number, nextDay: number) {
		if (!enabled && !required) {
			syncedAbs = null;
			if (value != null) {
				value = null;
				onchange?.(null);
			}
			return;
		}
		const y = Number.isFinite(nextYear) ? nextYear : firstYear;
		const m = Number.isFinite(nextMonth) ? nextMonth : 0;
		const d = Number.isFinite(nextDay) ? nextDay : 1;
		day = clampDayForMonth(d, m);
		year = y;
		monthIndex = m;
		const abs = computeAbs(y, m, day);
		syncedAbs = abs;
		if (value !== abs) {
			value = abs;
			onchange?.(abs);
		}
	}

	/** Hydrate from parent `value` only when it changed externally. */
	$effect(() => {
		const v = value;
		if (v === syncedAbs) return;
		syncedAbs = v;
		if (v == null) {
			if (!required) enabled = false;
			return;
		}
		enabled = true;
		readParts(v);
	});

	function onEnableChange(checked: boolean) {
		enabled = checked;
		if (!checked) {
			syncedAbs = null;
			value = null;
			onchange?.(null);
			return;
		}
		const seed = defaultDay ?? calendar.currentDay ?? 0;
		readParts(seed);
		commit(year, monthIndex, day);
	}

	function onDayInput(raw: string) {
		const n = Number(raw);
		commit(year, monthIndex, Number.isFinite(n) ? n : 1);
	}
	function onMonthInput(raw: string) {
		const n = Number(raw);
		commit(year, Number.isFinite(n) ? n : 0, day);
	}
	function onYearInput(raw: string) {
		const n = Number(raw);
		commit(Number.isFinite(n) ? n : firstYear, monthIndex, day);
	}

	const preview = $derived(
		(enabled || required) && value != null ? formatDate(calendar, value) : '',
	);
</script>

<div class="field fdf">
	<span class="label" id="{name}-label">{label}</span>
	{#if !required}
		<label class="fdf__enable">
			<input
				id="{name}-enable"
				type="checkbox"
				checked={enabled}
				{disabled}
				onchange={(e) => onEnableChange(e.currentTarget.checked)}
			/>
			<span>Set date</span>
		</label>
	{/if}
	{#if enabled || required}
		<div class="fdf__row" role="group" aria-labelledby="{name}-label">
			<div>
				<label class="label" for="{name}-day">Day</label>
				<input
					id="{name}-day"
					class="input"
					type="number"
					min="1"
					max={months[monthIndex]?.dayCount ?? 1}
					value={day}
					{disabled}
					oninput={(e) => onDayInput(e.currentTarget.value)}
				/>
			</div>
			<div>
				<label class="label" for="{name}-month">Month</label>
				<select
					id="{name}-month"
					class="input input--select"
					value={String(monthIndex)}
					{disabled}
					onchange={(e) => onMonthInput(e.currentTarget.value)}
				>
					{#each months as m, i}
						<option value={String(i)}>{m.name}</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="label" for="{name}-year">Year</label>
				<input
					id="{name}-year"
					class="input"
					type="number"
					value={year}
					{disabled}
					oninput={(e) => onYearInput(e.currentTarget.value)}
				/>
			</div>
		</div>
		{#if preview}<p class="field-hint">= {preview}</p>{/if}
		{#if hint}<p class="field-hint">{hint}</p>{/if}
		{#if name}<input type="hidden" {name} value={value ?? ''} />{/if}
	{:else}
		{#if name}<input type="hidden" {name} value="" />{/if}
	{/if}
</div>

<style>
	.fdf__enable { display: flex; align-items: center; gap: 0.4rem; margin: 0.35rem 0 0.5rem; font-size: 0.875rem; }
	/* Day / Month / Year — matches D/M/Y entry (e.g. 1/05) */
	.fdf__row { display: grid; grid-template-columns: 5rem 1fr 6rem; gap: 0.5rem; }
	@media (max-width: 600px) {
		.fdf__row { grid-template-columns: 1fr; }
	}
</style>