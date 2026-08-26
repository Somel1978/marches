<!-- shared/ui/src/charts/LineChart.svelte -->
<!-- Multi-series line chart, no fill under the curve. Same category-axis
     data shape, smoothing technique, and --chart-series-* token wiring
     as AreaChart.svelte — use this instead of AreaChart when several
     series would visually overlap/muddy each other as filled areas
     (e.g. comparing 4+ series on one chart), or when a fill would
     misleadingly imply "volume under the curve" for data that isn't
     a quantity (e.g. a ratio or an index). -->
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

	const ySteps = $derived.by(() => {
		const steps = 4;
		return Array.from({ length: steps + 1 }, (_, i) => minValue + (range * (steps - i)) / steps);
	});

	const seriesColorVar = (i: number) => `var(--chart-series-${(i % 6) + 1})`;
</script>

<div class="line-chart">
	{#if showLegend && series.length > 1}
		<div class="line-chart__legend">
			{#each series as s, i}
				<span class="line-chart__legend-item">
					<i style="background:{seriesColorVar(i)};"></i>
					{s.name}
				</span>
			{/each}
		</div>
	{/if}

	<div class="line-chart__body">
		<div class="line-chart__y-labels" style="height:{height}px;">
			{#each ySteps as v}
				<span>{yFormat(v)}</span>
			{/each}
		</div>

		<svg viewBox="0 0 {VIEW_W} {height}" preserveAspectRatio="none" class="line-chart__svg" style="height:{height}px;" role="img" aria-label={yLabel || 'Chart'}>
			{#each ySteps as v}
				<line x1={PAD_LEFT} x2={VIEW_W - PAD_RIGHT} y1={yFor(v)} y2={yFor(v)} class="line-chart__grid" />
			{/each}

			{#each series as s, i}
				<path d={linePath(s)} fill="none" stroke={seriesColorVar(i)} stroke-width="var(--chart-line-width, 2.5)" stroke-linecap="round" />
			{/each}

			{#each series as s, i}
				{#each s.points as p, pi}
					<circle cx={xFor(pi, categories.length)} cy={yFor(p.value)} r="3" fill={seriesColorVar(i)} class="line-chart__point">
						<title>{s.name} — {p.label}: {yFormat(p.value)}</title>
					</circle>
				{/each}
			{/each}
		</svg>
	</div>

	<div class="line-chart__x-labels">
		{#each categories as label}
			<span>{label}</span>
		{/each}
	</div>
</div>

<style>
	.line-chart { display: flex; flex-direction: column; gap: 0.625rem; }

	.line-chart__legend { display: flex; flex-wrap: wrap; gap: 0.875rem; font-size: 0.75rem; color: var(--text-secondary); }
	.line-chart__legend-item { display: inline-flex; align-items: center; gap: 0.375rem; }
	.line-chart__legend-item i { width: 0.625rem; height: 0.625rem; border-radius: 2px; display: inline-block; }

	.line-chart__body { display: flex; gap: 0.5rem; }

	.line-chart__y-labels {
		display: flex; flex-direction: column; justify-content: space-between;
		font-size: 0.6875rem; color: var(--text-muted); text-align: right;
		flex-shrink: 0; min-width: 2.5rem; padding: 0.125rem 0;
	}

	.line-chart__svg { flex: 1; min-width: 0; display: block; }
	.line-chart__grid { stroke: var(--border-muted); stroke-width: 1; vector-effect: non-scaling-stroke; }
	.line-chart__point { opacity: 0; transition: opacity var(--transition-fast); }
	.line-chart__svg:hover .line-chart__point { opacity: 1; }

	.line-chart__x-labels {
		display: flex; justify-content: space-between;
		font-size: 0.6875rem; color: var(--text-muted);
		padding-left: 3rem;
	}
</style>
