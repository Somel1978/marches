<!-- shared/ui/src/charts/DonutChart.svelte -->
<!-- Donut/pie chart for parts-of-a-whole data — a fundamentally
     different data shape from AreaChart/LineChart/BarChart (which all
     take parallel series over a shared category axis). A donut takes
     ONE flat list of { label, value } slices. Arc geometry (not paths
     built from point coordinates) is a third distinct SVG technique,
     alongside the smoothed-curve and discrete-rect approaches used by
     the other three chart types — deliberately built this way so all
     four together actually exercise the token system's range, not
     just three variations of the same rendering trick. -->
<script lang="ts">
	export type DonutSlice = { label: string; value: number };

	let {
		slices,
		size = 180,
		thickness = 28,
		centerLabel = '',
		centerValue = '',
		showLegend = true,
	}: {
		slices: DonutSlice[];
		size?: number;
		thickness?: number;
		centerLabel?: string;
		centerValue?: string;
		showLegend?: boolean;
	} = $props();

	const total = $derived(Math.max(1, slices.reduce((sum, s) => sum + s.value, 0)));
	const radius = $derived(size / 2);
	const innerRadius = $derived(radius - thickness);

	function arcPath(startAngle: number, endAngle: number): string {
		const cx = radius, cy = radius;
		const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
		const p = (r: number, angle: number) => ({
			x: cx + r * Math.sin(angle),
			y: cy - r * Math.cos(angle),
		});
		const outerStart = p(radius, startAngle);
		const outerEnd   = p(radius, endAngle);
		const innerStart = p(innerRadius, endAngle);
		const innerEnd   = p(innerRadius, startAngle);
		return [
			`M ${outerStart.x} ${outerStart.y}`,
			`A ${radius} ${radius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
			`L ${innerStart.x} ${innerStart.y}`,
			`A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
			'Z',
		].join(' ');
	}

	const arcs = $derived.by(() => {
		let angle = 0;
		return slices.map((s, i) => {
			const sweep = (s.value / total) * Math.PI * 2;
			const start = angle;
			const end = angle + sweep;
			angle = end;
			return { ...s, path: arcPath(start, end), pct: Math.round((s.value / total) * 100), colorVar: `var(--chart-series-${(i % 6) + 1})` };
		});
	});
</script>

<div class="donut-chart">
	<svg viewBox="0 0 {size} {size}" width={size} height={size} class="donut-chart__svg" role="img" aria-label={centerLabel || 'Donut chart'}>
		{#each arcs as arc}
			<path d={arc.path} fill={arc.colorVar} class="donut-chart__slice">
				<title>{arc.label}: {arc.pct}%</title>
			</path>
		{/each}
		{#if centerLabel || centerValue}
			<text x={radius} y={radius - 4} text-anchor="middle" class="donut-chart__center-value">{centerValue}</text>
			<text x={radius} y={radius + 14} text-anchor="middle" class="donut-chart__center-label">{centerLabel}</text>
		{/if}
	</svg>

	{#if showLegend}
		<div class="donut-chart__legend">
			{#each arcs as arc}
				<span class="donut-chart__legend-item">
					<i style="background:{arc.colorVar};"></i>
					{arc.label} <b>({arc.pct}%)</b>
				</span>
			{/each}
		</div>
	{/if}
</div>

<style>
	.donut-chart { display: flex; flex-direction: column; align-items: center; gap: 0.875rem; }

	.donut-chart__svg { display: block; }
	.donut-chart__slice { transition: opacity var(--transition-fast); }
	.donut-chart__slice:hover { opacity: 0.85; }

	.donut-chart__center-value { font-size: 1.125rem; font-weight: 700; fill: var(--text-primary); }
	.donut-chart__center-label { font-size: 0.5625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; fill: var(--text-muted); }

	.donut-chart__legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.75rem; font-size: 0.75rem; color: var(--text-secondary); }
	.donut-chart__legend-item { display: inline-flex; align-items: center; gap: 0.375rem; }
	.donut-chart__legend-item i { width: 0.625rem; height: 0.625rem; border-radius: 2px; display: inline-block; }
	.donut-chart__legend-item b { color: var(--text-muted); font-weight: 400; }
</style>
