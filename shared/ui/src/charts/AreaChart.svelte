<!-- shared/ui/src/charts/AreaChart.svelte -->
<!-- Reusable smooth area/line chart. One or more series, each an ordered
     list of { label, value } points sharing the same category axis (e.g.
     item rarity tiers, months). Colours are entirely CSS-token-driven via
     --chart-series-1..6 (see tokens.css) — no series colour is ever
     hardcoded here, so the chart automatically matches whichever theme
     is active, the same way the availability heatmap reads --viz-*.

     Curve technique matches the reference design: a smooth Catmull-Rom
     -> cubic-bezier spline through the data points (not a jagged
     linear polyline), rendered as a low-opacity filled area plus a
     crisp stroked line on top, per series. -->
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

	// Shared category axis — every series must share the same label
	// sequence (they represent the same rarities/months); we derive it
	// from the longest series so a partially-empty series doesn't
	// truncate the axis.
	const categories = $derived.by(() => {
		const longest = series.reduce((a, b) => (b.points.length > a.points.length ? b : a), { points: [] as ChartPoint[] });
		return longest.points.map(p => p.label);
	});

	const maxValue = $derived(Math.max(1, ...series.flatMap(s => s.points.map(p => p.value))));
	const minValue = $derived(Math.min(0, ...series.flatMap(s => s.points.map(p => p.value))));
	const range = $derived(maxValue - minValue || 1);

	const innerH = $derived(height - PAD_TOP - PAD_BOTTOM);
	const innerW = VIEW_W - PAD_LEFT - PAD_RIGHT;

	function xFor(i: number, n: number): number {
		if (n <= 1) return PAD_LEFT + innerW / 2;
		return PAD_LEFT + (innerW * i) / (n - 1);
	}
	function yFor(value: number): number {
		return PAD_TOP + innerH - ((value - minValue) / range) * innerH;
	}

	/** Catmull-Rom -> cubic Bezier smoothing through a set of points. */
	function smoothPath(points: { x: number; y: number }[]): string {
		if (points.length === 0) return '';
		if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
		let d = `M ${points[0].x} ${points[0].y}`;
		for (let i = 0; i < points.length - 1; i++) {
			const p0 = points[i === 0 ? 0 : i - 1];
			const p1 = points[i];
			const p2 = points[i + 1];
			const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
			const c1x = p1.x + (p2.x - p0.x) / 6;
			const c1y = p1.y + (p2.y - p0.y) / 6;
			const c2x = p2.x - (p3.x - p1.x) / 6;
			const c2y = p2.y - (p3.y - p1.y) / 6;
			d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
		}
		return d;
	}

	function linePath(s: ChartSeries): string {
		const pts = s.points.map((p, i) => ({ x: xFor(i, categories.length), y: yFor(p.value) }));
		return smoothPath(pts);
	}
	function areaPath(s: ChartSeries): string {
		const pts = s.points.map((p, i) => ({ x: xFor(i, categories.length), y: yFor(p.value) }));
		if (pts.length === 0) return '';
		const baseline = PAD_TOP + innerH;
		return `${smoothPath(pts)} L ${pts[pts.length - 1].x} ${baseline} L ${pts[0].x} ${baseline} Z`;
	}

	// Y-axis gridline labels — 4 evenly spaced steps from min to max.
	const ySteps = $derived.by(() => {
		const steps = 4;
		return Array.from({ length: steps + 1 }, (_, i) => minValue + (range * (steps - i)) / steps);
	});

	// Series colours cycle through the theme's 6-slot palette.
	const seriesColorVar = (i: number) => `var(--chart-series-${(i % 6) + 1})`;
</script>

<div class="area-chart">
	{#if showLegend && series.length > 1}
		<div class="area-chart__legend">
			{#each series as s, i}
				<span class="area-chart__legend-item">
					<i style="background:{seriesColorVar(i)};"></i>
					{s.name}
				</span>
			{/each}
		</div>
	{/if}

	<div class="area-chart__body">
		<div class="area-chart__y-labels" style="height:{height}px;">
			{#each ySteps as v}
				<span>{yFormat(v)}</span>
			{/each}
		</div>

		<svg viewBox="0 0 {VIEW_W} {height}" preserveAspectRatio="none" class="area-chart__svg" style="height:{height}px;" role="img" aria-label={yLabel || 'Chart'}>
			<!-- gridlines -->
			{#each ySteps as v}
				<line x1={PAD_LEFT} x2={VIEW_W - PAD_RIGHT} y1={yFor(v)} y2={yFor(v)} class="area-chart__grid" />
			{/each}

			{#each series as s, i}
				<path d={areaPath(s)} fill={seriesColorVar(i)} opacity="var(--chart-area-opacity, 0.22)" stroke="none" />
			{/each}
			{#each series as s, i}
				<path d={linePath(s)} fill="none" stroke={seriesColorVar(i)} stroke-width="var(--chart-line-width, 2.5)" stroke-linecap="round" />
			{/each}

			{#each series as s, i}
				{#each s.points as p, pi}
					<circle cx={xFor(pi, categories.length)} cy={yFor(p.value)} r="3" fill={seriesColorVar(i)} class="area-chart__point">
						<title>{s.name} — {p.label}: {yFormat(p.value)}</title>
					</circle>
				{/each}
			{/each}
		</svg>
	</div>

	<div class="area-chart__x-labels">
		{#each categories as label}
			<span>{label}</span>
		{/each}
	</div>
</div>

<style>
	.area-chart { display: flex; flex-direction: column; gap: 0.625rem; }

	.area-chart__legend { display: flex; flex-wrap: wrap; gap: 0.875rem; font-size: 0.75rem; color: var(--text-secondary); }
	.area-chart__legend-item { display: inline-flex; align-items: center; gap: 0.375rem; }
	.area-chart__legend-item i { width: 0.625rem; height: 0.625rem; border-radius: 2px; display: inline-block; }

	.area-chart__body { display: flex; gap: 0.5rem; }

	.area-chart__y-labels {
		display: flex; flex-direction: column; justify-content: space-between;
		font-size: 0.6875rem; color: var(--text-muted); text-align: right;
		flex-shrink: 0; min-width: 2.5rem; padding: 0.125rem 0;
	}

	.area-chart__svg { flex: 1; min-width: 0; display: block; }
	.area-chart__grid { stroke: var(--border-muted); stroke-width: 1; vector-effect: non-scaling-stroke; }
	.area-chart__point { opacity: 0; transition: opacity var(--transition-fast); }
	.area-chart__svg:hover .area-chart__point { opacity: 1; }

	.area-chart__x-labels {
		display: flex; justify-content: space-between;
		font-size: 0.6875rem; color: var(--text-muted);
		padding-left: 3rem; /* roughly align under the plot area, past the y-axis labels */
	}
</style>