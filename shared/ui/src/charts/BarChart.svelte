<!-- shared/ui/src/charts/BarChart.svelte -->
<!-- Grouped vertical bar chart. Same category-axis data shape and
     --chart-series-* token wiring as AreaChart/LineChart, but discrete
     <rect> geometry rather than a continuous path — deliberately built
     as a separate rendering approach (not just "AreaChart with square
     corners") so the token system gets tested against a genuinely
     different SVG technique, not just a variant of the same one. -->
<script lang="ts">
	export type ChartPoint = { label: string; value: number };
	export type ChartSeries = { name: string; points: ChartPoint[] };

	let {
		series,
		height = 220,
		yFormat = (v: number) => String(Math.round(v)),
		yLabel = '',
		showLegend = true,
	}: {
		series: ChartSeries[];
		height?: number;
		yFormat?: (v: number) => string;
		yLabel?: string;
		showLegend?: boolean;
	} = $props();

	const VIEW_W = 500;
	const PAD_TOP = 12;
	const PAD_BOTTOM = 28;
	const PAD_LEFT = 4;
	const PAD_RIGHT = 4;
	const GROUP_GAP_RATIO = 0.35;  // fraction of each category's slot left as gap between groups
	const BAR_GAP_RATIO = 0.12;    // fraction of a group's width left as gap between bars in the group

	const categories = $derived.by(() => {
		const longest = series.reduce((a, b) => (b.points.length > a.points.length ? b : a), { points: [] as ChartPoint[] });
		return longest.points.map(p => p.label);
	});

	// Bars always start from zero, unlike the line/area charts which can
	// show a non-zero baseline — a bar's length is read as proportional
	// to its value, so a truncated axis would misrepresent the data.
	const maxValue = $derived(Math.max(1, ...series.flatMap(s => s.points.map(p => p.value))));

	const innerH = $derived(height - PAD_TOP - PAD_BOTTOM);
	const innerW = VIEW_W - PAD_LEFT - PAD_RIGHT;

	const slotWidth = $derived(categories.length > 0 ? innerW / categories.length : innerW);
	const groupWidth = $derived(slotWidth * (1 - GROUP_GAP_RATIO));
	const barWidth = $derived(series.length > 0 ? (groupWidth * (1 - BAR_GAP_RATIO)) / series.length : groupWidth);

	function barX(catIndex: number, seriesIndex: number): number {
		const slotStart = PAD_LEFT + catIndex * slotWidth + (slotWidth - groupWidth) / 2;
		return slotStart + seriesIndex * barWidth;
	}
	function barY(value: number): number {
		return PAD_TOP + innerH - (value / maxValue) * innerH;
	}
	function barH(value: number): number {
		return (value / maxValue) * innerH;
	}

	const ySteps = $derived.by(() => {
		const steps = 4;
		return Array.from({ length: steps + 1 }, (_, i) => (maxValue * (steps - i)) / steps);
	});

	const seriesColorVar = (i: number) => `var(--chart-series-${(i % 6) + 1})`;
</script>

<div class="bar-chart">
	{#if showLegend && series.length > 1}
		<div class="bar-chart__legend">
			{#each series as s, i}
				<span class="bar-chart__legend-item">
					<i style="background:{seriesColorVar(i)};"></i>
					{s.name}
				</span>
			{/each}
		</div>
	{/if}

	<div class="bar-chart__body">
		<div class="bar-chart__y-labels" style="height:{height}px;">
			{#each ySteps as v}
				<span>{yFormat(v)}</span>
			{/each}
		</div>

		<svg viewBox="0 0 {VIEW_W} {height}" preserveAspectRatio="none" class="bar-chart__svg" style="height:{height}px;" role="img" aria-label={yLabel || 'Chart'}>
			{#each ySteps as v}
				<line x1={PAD_LEFT} x2={VIEW_W - PAD_RIGHT} y1={barY(v)} y2={barY(v)} class="bar-chart__grid" />
			{/each}

			{#each categories as _, ci}
				{#each series as s, si}
					{@const point = s.points[ci]}
					{#if point}
						<rect
							x={barX(ci, si)}
							y={barY(point.value)}
							width={Math.max(0, barWidth)}
							height={Math.max(0, barH(point.value))}
							fill={seriesColorVar(si)}
							rx="1.5"
							class="bar-chart__bar"
						>
							<title>{s.name} — {point.label}: {yFormat(point.value)}</title>
						</rect>
					{/if}
				{/each}
			{/each}
		</svg>
	</div>

	<div class="bar-chart__x-labels">
		{#each categories as label}
			<span>{label}</span>
		{/each}
	</div>
</div>

<style>
	.bar-chart { display: flex; flex-direction: column; gap: 0.625rem; }

	.bar-chart__legend { display: flex; flex-wrap: wrap; gap: 0.875rem; font-size: 0.75rem; color: var(--text-secondary); }
	.bar-chart__legend-item { display: inline-flex; align-items: center; gap: 0.375rem; }
	.bar-chart__legend-item i { width: 0.625rem; height: 0.625rem; border-radius: 2px; display: inline-block; }

	.bar-chart__body { display: flex; gap: 0.5rem; }

	.bar-chart__y-labels {
		display: flex; flex-direction: column; justify-content: space-between;
		font-size: 0.6875rem; color: var(--text-muted); text-align: right;
		flex-shrink: 0; min-width: 2.5rem; padding: 0.125rem 0;
	}

	.bar-chart__svg { flex: 1; min-width: 0; display: block; }
	.bar-chart__grid { stroke: var(--border-muted); stroke-width: 1; vector-effect: non-scaling-stroke; }
	.bar-chart__bar { transition: opacity var(--transition-fast); }
	.bar-chart__bar:hover { opacity: 0.8; }

	.bar-chart__x-labels {
		display: flex; justify-content: space-between;
		font-size: 0.6875rem; color: var(--text-muted);
		padding-left: 3rem;
	}
</style>
