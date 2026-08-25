<!-- Read-only availability dashboard for DM views -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { Avatar } from '@core/ui';
	import {
		DAYS,
		SLOTS_PER_DAY,
		slotToTime,
		blockTimeLabel,
		userAccent,
		blockStyle,
		type AvailBlock,
	} from '$lib/availability/utils';
	import type { DmPlayerRow } from '$lib/dm/build-availability-dashboard';

	interface Props {
		weekStart: string;
		heatmapData: Record<string, number>;
		dayPlayerCounts: Record<number, number>;
		playerRows: DmPlayerRow[];
		totalPlayers: number;
		worldMap?: Record<string, string>;
		basePath: string;
		title?: string;
		sectionHint?: string;
		embedded?: boolean;
	}

	let {
		weekStart: weekStartIso,
		heatmapData,
		dayPlayerCounts,
		playerRows,
		totalPlayers,
		worldMap = {},
		basePath,
		title = 'Player availability',
		sectionHint = 'Heatmap and timelines show when players are free for this world. Click a block to see characters.',
		embedded = false,
	}: Props = $props();

	const weekStart = $derived(new Date(weekStartIso));
	const maxCount = $derived(Math.max(1, ...Object.values(heatmapData ?? {}).map(Number)));
	const HOUR_MARKS = [0, 6, 12, 18, 24];

	let viewDayIdx = $state(0);
	let expandedKey = $state<string | null>(null);

	function todayDayIdxInWeek(ws: Date): number {
		const now = new Date();
		const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
		for (let i = 0; i < 7; i++) {
			const d = new Date(ws);
			d.setUTCDate(ws.getUTCDate() + i);
			if (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) === todayUtc) return i;
		}
		return 0;
	}

	$effect.pre(() => {
		viewDayIdx = todayDayIdxInWeek(weekStart);
	});

	function dayDate(i: number) {
		const d = new Date(weekStart);
		d.setUTCDate(weekStart.getUTCDate() + i);
		return d;
	}

	function dateKey(d: Date) {
		return d.toISOString().split('T')[0];
	}

	const weekLabel = $derived.by(() => {
		const end = new Date(weekStart);
		end.setUTCDate(weekStart.getUTCDate() + 6);
		const f = (d: Date) =>
			d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
		return `${f(weekStart)} – ${f(end)}`;
	});

	function prevWeek() {
		const d = new Date(weekStart);
		d.setUTCDate(d.getUTCDate() - 7);
		goto(`${basePath}?week=${dateKey(d)}`);
	}

	function nextWeek() {
		const d = new Date(weekStart);
		d.setUTCDate(d.getUTCDate() + 7);
		goto(`${basePath}?week=${dateKey(d)}`);
	}

	function goToday() {
		goto(basePath);
	}

	const C: [number, number, number][] = [
		[24, 12, 4],
		[70, 35, 10],
		[120, 58, 16],
		[175, 95, 24],
		[220, 140, 36],
		[248, 185, 65],
	];

	function lerpColor(t: number) {
		const s = Math.max(0, Math.min(1, t)) * 5;
		const lo = Math.floor(s);
		const hi = Math.min(lo + 1, 5);
		const f = s - lo;
		const [r, g, b] = [0, 1, 2].map((i) => Math.round(C[lo][i] + f * (C[hi][i] - C[lo][i])));
		return `rgb(${r},${g},${b})`;
	}

	function densityColor(di: number, si: number) {
		const count = heatmapData?.[`${di}:${si}`] ?? 0;
		if (count === 0) return '#180a02';
		return lerpColor(count / maxCount);
	}

	function densityAtDay(di: number) {
		return dayPlayerCounts[di] ?? 0;
	}

	function scopeLabel(scope: string, worldIds: string[]) {
		if (scope === 'GLOBAL') return '🌐 Global';
		const names = worldIds.map((id) => worldMap[id] ?? id).slice(0, 2);
		const extra = worldIds.length > 2 ? ` +${worldIds.length - 2}` : '';
		return `🌍 ${names.join(', ')}${extra}`;
	}

	function blockKey(row: DmPlayerRow, block: AvailBlock) {
		return `${row.userId}:${block.date}:${block.startSlot}`;
	}

	function toggleBlock(row: DmPlayerRow, block: AvailBlock) {
		const key = blockKey(row, block);
		expandedKey = expandedKey === key ? null : key;
	}

	const LEGEND = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
</script>

<div class="avail-dash {embedded ? 'avail-dash--embedded' : ''}">
	{#if !embedded}
		<header class="avail-dash__header">
			<div>
				<h2 class="avail-dash__title">{title}</h2>
				<p class="avail-dash__subtitle">{weekLabel}</p>
			</div>
			<div class="avail-dash__header-actions">
				<div class="avail-dash__week-nav">
					<button type="button" class="avail-dash__nav" onclick={prevWeek} aria-label="Previous week">‹</button>
					<button type="button" class="avail-dash__nav avail-dash__nav--text" onclick={goToday}>Today</button>
					<button type="button" class="avail-dash__nav" onclick={nextWeek} aria-label="Next week">›</button>
				</div>
			</div>
		</header>
	{:else}
		<div class="avail-dash__embedded-nav">
			<span class="avail-dash__subtitle">{weekLabel}</span>
			<div class="avail-dash__week-nav">
				<button type="button" class="avail-dash__nav" onclick={prevWeek} aria-label="Previous week">‹</button>
				<button type="button" class="avail-dash__nav avail-dash__nav--text" onclick={goToday}>Today</button>
				<button type="button" class="avail-dash__nav" onclick={nextWeek} aria-label="Next week">›</button>
			</div>
		</div>
	{/if}

	<div class="avail-dash__day-tabs" role="tablist" aria-label="Day of week">
		{#each DAYS as day, di}
			<button
				type="button"
				role="tab"
				class="avail-dash__day-tab {viewDayIdx === di ? 'avail-dash__day-tab--active' : ''}"
				aria-selected={viewDayIdx === di}
				onclick={() => {
					viewDayIdx = di;
				}}
			>
				<span class="avail-dash__day-tab-name">{day}</span>
				<span class="avail-dash__day-tab-date">{dayDate(di).getUTCDate()}/{dayDate(di).getUTCMonth() + 1}</span>
				{#if densityAtDay(di) > 0}
					<span class="avail-dash__day-tab-badge">{densityAtDay(di)}</span>
				{/if}
			</button>
		{/each}
	</div>

	<section class="avail-dash__section" aria-label="Community availability overview">
		<h3 class="avail-dash__section-title">Community overview</h3>
		<p class="avail-dash__section-hint">{sectionHint}</p>

		<div class="avail-dash__mobile-only">
			<p class="avail-dash__mobile-day-label">
				{DAYS[viewDayIdx]} · {dayDate(viewDayIdx).getUTCDate()}/{dayDate(viewDayIdx).getUTCMonth() + 1}
			</p>
			<div class="avail-dash__overview-strip avail-dash__overview-strip--mobile" aria-hidden="true">
				{#each Array(SLOTS_PER_DAY) as _, si}
					<div class="avail-dash__overview-cell" style="background:{densityColor(viewDayIdx, si)}"></div>
				{/each}
			</div>
		</div>

		<div class="avail-dash__desktop-only avail-dash__overview-scroll">
			<div class="avail-dash__overview">
				<div class="avail-dash__overview-corner"></div>
				{#each DAYS as day, di}
					<div class="avail-dash__overview-day {viewDayIdx === di ? 'avail-dash__overview-day--active' : ''}">
						<span class="avail-dash__overview-day-name">{day}</span>
						<span class="avail-dash__overview-day-date">{dayDate(di).getUTCDate()}/{dayDate(di).getUTCMonth() + 1}</span>
					</div>
				{/each}
				<div class="avail-dash__overview-label">All players</div>
				{#each DAYS as _, di}
					<div class="avail-dash__overview-strip" aria-hidden="true">
						{#each Array(SLOTS_PER_DAY) as _, si}
							<div class="avail-dash__overview-cell" style="background:{densityColor(di, si)}"></div>
						{/each}
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="avail-dash__section" aria-label="Player availability timelines">
		<h3 class="avail-dash__section-title">Player schedules</h3>

		{#if !playerRows.length}
			<p class="table__empty">No availability set for this week.</p>
		{:else}
			<div class="avail-dash__mobile-only avail-dash__mobile-players">
				{#each playerRows as row (row.userId)}
					<article class="avail-dash__mobile-card">
						<div class="avail-dash__player">
							<Avatar name={row.name} image={row.image} size="sm" />
							<div class="avail-dash__player-meta">
								<span class="avail-dash__player-name">{row.name}</span>
							</div>
						</div>
						<div class="avail-dash__day-track avail-dash__day-track--mobile">
							<div class="avail-dash__day-hours" aria-hidden="true">
								{#each HOUR_MARKS as h}
									<span style="left:{(h / 24) * 100}%">{h === 24 ? '0:00' : `${h}:00`}</span>
								{/each}
							</div>
							{#each row.blocks.filter((b) => b.dayIdx === viewDayIdx) as block (block.date + block.startSlot)}
								<button
									type="button"
									class="avail-dash__block avail-dash__block--dm {expandedKey === blockKey(row, block) ? 'avail-dash__block--active' : ''}"
									style="{blockStyle(block.startSlot, block.endSlot)} background:{userAccent(row.userId)}"
									onclick={() => toggleBlock(row, block)}
								>
									<span class="avail-dash__block-label">{blockTimeLabel(block.startSlot, block.endSlot)}</span>
								</button>
							{:else}
								<span class="avail-dash__empty-day">No availability</span>
							{/each}
						</div>
						{#each row.blocks.filter((b) => b.dayIdx === viewDayIdx && expandedKey === blockKey(row, b)) as block}
							<div class="avail-dash__block-detail">
								<span class="badge {block.scope === 'GLOBAL' ? 'badge-success' : 'badge-accent'}">
									{scopeLabel(block.scope, block.worldIds)}
								</span>
								{#if row.chars.length}
									<div class="avail-dash__char-tags">
										{#each row.chars as char}
											<span class="character-class-tag">
												<span>{char.name}</span>
												<span class="badge badge-muted">Lv {char.totalLevel ?? '?'}</span>
												<span
													class="badge {char.worldId ? 'badge-accent' : 'badge-success'}"
													style="font-size:0.625rem;"
													title="Character scope"
												>
													{char.worldId ? 'World' : 'Global'}
												</span>
											</span>
										{/each}
									</div>
								{:else if row.needsNewChar}
									<span class="table__muted" style="font-size:0.8125rem;">Needs a new character</span>
								{:else}
									<span class="table__muted" style="font-size:0.8125rem;">No characters</span>
								{/if}
							</div>
						{/each}
					</article>
				{/each}
			</div>

			<div class="avail-dash__desktop-only avail-dash__timeline-scroll">
				<div class="avail-dash__timeline-grid">
					<div class="avail-dash__timeline-corner"></div>
					{#each DAYS as day, di}
						<div class="avail-dash__timeline-dayhead {viewDayIdx === di ? 'avail-dash__timeline-dayhead--active' : ''}">
							<span>{day}</span>
							<span class="avail-dash__timeline-daydate">{dayDate(di).getUTCDate()}/{dayDate(di).getUTCMonth() + 1}</span>
						</div>
					{/each}

					{#each playerRows as row (row.userId)}
						<div class="avail-dash__player">
							<Avatar name={row.name} image={row.image} size="sm" />
							<div class="avail-dash__player-meta">
								<span class="avail-dash__player-name">{row.name}</span>
							</div>
						</div>
						{#each DAYS as _, di}
							<div class="avail-dash__day-track {viewDayIdx === di ? 'avail-dash__day-track--active' : ''}">
								<div class="avail-dash__day-hours" aria-hidden="true">
									{#each HOUR_MARKS as h}
										<span style="left:{(h / 24) * 100}%">{h === 24 ? '0:00' : `${h}:00`}</span>
									{/each}
								</div>
								{#each row.blocks.filter((b) => b.dayIdx === di) as block (block.date + block.startSlot)}
									<button
										type="button"
										class="avail-dash__block avail-dash__block--dm {expandedKey === blockKey(row, block) ? 'avail-dash__block--active' : ''}"
										style="{blockStyle(block.startSlot, block.endSlot)} background:{userAccent(row.userId)}"
										title="{blockTimeLabel(block.startSlot, block.endSlot)} · {scopeLabel(block.scope, block.worldIds)}"
										onclick={() => toggleBlock(row, block)}
									>
										<span class="avail-dash__block-label">{slotToTime(block.startSlot)}</span>
									</button>
								{/each}
							</div>
						{/each}
						{#if expandedKey?.startsWith(`${row.userId}:`)}
							<div class="avail-dash__row-detail" style="grid-column: 1 / -1;">
								{#each row.blocks.filter((b) => expandedKey === blockKey(row, b)) as block}
									<div class="avail-dash__block-detail">
										<strong>{blockTimeLabel(block.startSlot, block.endSlot)}</strong>
										<span class="badge {block.scope === 'GLOBAL' ? 'badge-success' : 'badge-accent'}">
											{scopeLabel(block.scope, block.worldIds)}
										</span>
										{#if row.chars.length}
											<div class="avail-dash__char-tags">
												{#each row.chars as char}
													<span class="character-class-tag">
														<span>{char.name}</span>
														<span class="badge badge-muted">Lv {char.totalLevel ?? '?'}</span>
														<span
															class="badge {char.worldId ? 'badge-accent' : 'badge-success'}"
															style="font-size:0.625rem;"
														>
															{char.worldId ? 'World' : 'Global'}
														</span>
													</span>
												{/each}
											</div>
										{:else if row.needsNewChar}
											<span class="table__muted" style="font-size:0.8125rem;">Needs a new character</span>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</section>

	<footer class="avail-dash__footer">
		<span class="avail-dash__footer-note">
			Based on {totalPlayers} active player account{totalPlayers !== 1 ? 's' : ''} this week
		</span>
		<div class="avail-dash__legend">
			<span class="avail-dash__legend-lbl">Less</span>
			{#each LEGEND as t}
				<div class="avail-dash__legend-swatch" style="background:{lerpColor(t)}"></div>
			{/each}
			<span class="avail-dash__legend-lbl">More</span>
		</div>
	</footer>
</div>
