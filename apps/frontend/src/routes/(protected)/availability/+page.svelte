<!-- apps/frontend/src/routes/(protected)/availability/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
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
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const heatmap      = $derived((data as any).heatmapData as Record<string, number>);
	const dayCounts    = $derived((data as any).dayPlayerCounts as Record<number, number>);
	const playerRows   = $derived((data as any).playerRows ?? []);
	const totalPlayers = $derived((data as any).totalPlayers as number);
	const allWorlds    = $derived((data as any).allWorlds ?? []);
	const worldMap     = $derived((data as any).worldMap ?? {});
	const weekStart    = $derived(new Date((data as any).weekStart));

	const maxCount = $derived(Math.max(1, ...Object.values(heatmap ?? {}).map(Number)));

	const HOUR_MARKS = [0, 6, 12, 18, 24];

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
		const f = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
		return `${f(weekStart)} – ${f(end)}`;
	});

	function prevWeek() {
		const d = new Date(weekStart);
		d.setUTCDate(d.getUTCDate() - 7);
		goto(`/availability?week=${dateKey(d)}`);
	}
	function nextWeek() {
		const d = new Date(weekStart);
		d.setUTCDate(d.getUTCDate() + 7);
		goto(`/availability?week=${dateKey(d)}`);
	}

	const C: [number, number, number][] = [[24, 12, 4], [70, 35, 10], [120, 58, 16], [175, 95, 24], [220, 140, 36], [248, 185, 65]];
	function lerpColor(t: number) {
		const s = Math.max(0, Math.min(1, t)) * 5;
		const lo = Math.floor(s);
		const hi = Math.min(lo + 1, 5);
		const f = s - lo;
		const [r, g, b] = [0, 1, 2].map((i) => Math.round(C[lo][i] + f * (C[hi][i] - C[lo][i])));
		return `rgb(${r},${g},${b})`;
	}

	function densityColor(di: number, si: number) {
		const count = heatmap?.[`${di}:${si}`] ?? 0;
		if (count === 0) return '#180a02';
		return lerpColor(count / maxCount);
	}

	// ── Add / edit modal ───────────────────────────────────────────────────
	type ModalState = {
		mode: 'add' | 'edit';
		date: string;
		startTime: string;
		endTime: string;
		scope: 'GLOBAL' | 'WORLD';
		worldIds: Set<string>;
		editBlock?: AvailBlock;
	};

	let modal = $state<ModalState | null>(null);
	let viewDayIdx = $state(0);

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

	const TIME_OPTIONS = Array.from({ length: 49 }, (_, i) => {
		const label = i === 48 ? '24:00' : slotToTime(i);
		return { value: label, slot: i };
	});

	function openAddModal(dayIdx?: number) {
		const di = dayIdx ?? viewDayIdx;
		const d = dayDate(di);
		viewDayIdx = di;
		modal = {
			mode: 'add',
			date: dateKey(d),
			startTime: '18:00',
			endTime: '22:00',
			scope: 'GLOBAL',
			worldIds: new Set(),
		};
	}

	function openEditBlock(block: AvailBlock) {
		viewDayIdx = block.dayIdx;
		modal = {
			mode: 'edit',
			date: block.date,
			startTime: slotToTime(block.startSlot),
			endTime: slotToTime(block.endSlot + 1),
			scope: (block.scope as 'GLOBAL' | 'WORLD') ?? 'GLOBAL',
			worldIds: new Set(block.worldIds),
			editBlock: block,
		};
	}

	function closeModal() {
		modal = null;
	}

	function densityAtDay(di: number) {
		return dayCounts[di] ?? 0;
	}

	function scopeLabel(scope: string, worldIds: string[]) {
		if (scope === 'GLOBAL') return '🌐 Global';
		const names = worldIds.map((id) => worldMap[id] ?? id).slice(0, 2);
		const extra = worldIds.length > 2 ? ` +${worldIds.length - 2}` : '';
		return `🌍 ${names.join(', ')}${extra}`;
	}

	const LEGEND = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
</script>

<svelte:head><title>Availability — Marches</title></svelte:head>

<div class="avail-dash">
	<header class="avail-dash__header">
		<div>
			<h2 class="avail-dash__title">Availability</h2>
			<p class="avail-dash__subtitle">{weekLabel}</p>
		</div>
		<div class="avail-dash__header-actions">
			<div class="avail-dash__week-nav">
				<button type="button" class="avail-dash__nav" onclick={prevWeek} aria-label="Previous week">‹</button>
				<button type="button" class="avail-dash__nav avail-dash__nav--text" onclick={() => goto('/availability')}>Today</button>
				<button type="button" class="avail-dash__nav" onclick={nextWeek} aria-label="Next week">›</button>
			</div>
			<button type="button" class="btn btn-primary btn-sm avail-dash__add-btn" onclick={() => openAddModal()}>+ Add availability</button>
		</div>
	</header>

	{#if form?.message}
		<div class="form-error">{form.message}</div>
	{/if}

	<!-- Day picker (mobile primary; highlights day on desktop too) -->
	<div class="avail-dash__day-tabs" role="tablist" aria-label="Day of week">
		{#each DAYS as day, di}
			<button
				type="button"
				role="tab"
				class="avail-dash__day-tab {viewDayIdx === di ? 'avail-dash__day-tab--active' : ''}"
				aria-selected={viewDayIdx === di}
				onclick={() => { viewDayIdx = di; }}
			>
				<span class="avail-dash__day-tab-name">{day}</span>
				<span class="avail-dash__day-tab-date">{dayDate(di).getUTCDate()}/{dayDate(di).getUTCMonth() + 1}</span>
				{#if densityAtDay(di) > 0}
					<span class="avail-dash__day-tab-badge">{densityAtDay(di)}</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Read-only community density overview -->
	<section class="avail-dash__section" aria-label="Community availability overview">
		<h3 class="avail-dash__section-title">Community overview</h3>
		<p class="avail-dash__section-hint">Heatmap shows how many players are free — view only. Use the form to set your times.</p>

		<!-- Mobile: single day strip, full width -->
		<div class="avail-dash__mobile-only">
			<p class="avail-dash__mobile-day-label">{DAYS[viewDayIdx]} · {dayDate(viewDayIdx).getUTCDate()}/{dayDate(viewDayIdx).getUTCMonth() + 1}</p>
			<div class="avail-dash__overview-strip avail-dash__overview-strip--mobile" aria-hidden="true">
				{#each Array(SLOTS_PER_DAY) as _, si}
					<div class="avail-dash__overview-cell" style="background:{densityColor(viewDayIdx, si)}"></div>
				{/each}
			</div>
		</div>

		<!-- Desktop: full week -->
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

	<!-- Player timelines -->
	<section class="avail-dash__section" aria-label="Player availability timelines">
		<h3 class="avail-dash__section-title">Player schedules</h3>

		<!-- Mobile: one card per player, one timeline -->
		<div class="avail-dash__mobile-only avail-dash__mobile-players">
			{#each playerRows as row (row.userId)}
				<article class="avail-dash__mobile-card">
					<div class="avail-dash__player">
						<Avatar name={row.name} image={row.image} size="sm" />
						<div class="avail-dash__player-meta">
							<span class="avail-dash__player-name">{row.name}{row.isMe ? ' (you)' : ''}</span>
							{#if row.isMe}
								<button type="button" class="avail-dash__player-add" onclick={() => openAddModal(viewDayIdx)}>+ Add</button>
							{/if}
						</div>
					</div>
					<div class="avail-dash__day-track avail-dash__day-track--mobile">
						<div class="avail-dash__day-hours" aria-hidden="true">
							{#each HOUR_MARKS as h}
								<span style="left:{(h / 24) * 100}%">{h === 24 ? '0:00' : `${h}:00`}</span>
							{/each}
						</div>
						{#each row.blocks.filter((b: AvailBlock) => b.dayIdx === viewDayIdx) as block (block.date + block.startSlot)}
							<button
								type="button"
								class="avail-dash__block"
								style="{blockStyle(block.startSlot, block.endSlot)} background:{userAccent(row.userId, row.isMe)}"
								disabled={!row.isMe}
								onclick={() => row.isMe && openEditBlock(block)}
							>
								<span class="avail-dash__block-label">{blockTimeLabel(block.startSlot, block.endSlot)}</span>
							</button>
						{:else}
							<span class="avail-dash__empty-day">No availability</span>
						{/each}
					</div>
				</article>
			{/each}
		</div>

		<!-- Desktop: week grid -->
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
							<span class="avail-dash__player-name">{row.name}{row.isMe ? ' (you)' : ''}</span>
							{#if row.isMe}
								<button type="button" class="avail-dash__player-add" onclick={() => openAddModal()}>+ Add</button>
							{/if}
						</div>
					</div>
					{#each DAYS as _, di}
						<div class="avail-dash__day-track {viewDayIdx === di ? 'avail-dash__day-track--active' : ''}">
							<div class="avail-dash__day-hours" aria-hidden="true">
								{#each HOUR_MARKS as h}
									<span style="left:{(h / 24) * 100}%">{h === 24 ? '0:00' : `${h}:00`}</span>
								{/each}
							</div>
							{#each row.blocks.filter((b: AvailBlock) => b.dayIdx === di) as block (block.date + block.startSlot)}
								<button
									type="button"
									class="avail-dash__block"
									style="{blockStyle(block.startSlot, block.endSlot)} background:{userAccent(row.userId, row.isMe)}"
									title="{blockTimeLabel(block.startSlot, block.endSlot)} · {scopeLabel(block.scope, block.worldIds)}"
									disabled={!row.isMe}
									onclick={() => row.isMe && openEditBlock(block)}
								>
									<span class="avail-dash__block-label">{slotToTime(block.startSlot)}</span>
								</button>
							{/each}
						</div>
					{/each}
				{/each}
			</div>
		</div>
	</section>

	<footer class="avail-dash__footer">
		<span class="avail-dash__footer-note">Based on {totalPlayers} active player account{totalPlayers !== 1 ? 's' : ''} this week</span>
		<div class="avail-dash__legend">
			<span class="avail-dash__legend-lbl">Less</span>
			{#each LEGEND as t}
				<div class="avail-dash__legend-swatch" style="background:{lerpColor(t)}"></div>
			{/each}
			<span class="avail-dash__legend-lbl">More</span>
		</div>
	</footer>
</div>

{#if modal}
	<div class="avail-dash__backdrop" role="presentation" onclick={closeModal}
		onkeydown={(e) => { if (e.key === 'Escape') closeModal(); }}>
		<div class="avail-dash__modal" role="dialog" aria-modal="true" aria-label={modal.mode === 'add' ? 'Add availability' : 'Edit availability'}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => { if (e.key === 'Escape') closeModal(); }}
			tabindex="0">
			<div class="avail-dash__modal-hdr">
				<div>
					<h3 class="avail-dash__modal-title">{modal.mode === 'add' ? 'Add availability' : 'Edit availability'}</h3>
					<p class="avail-dash__modal-sub">Set when you can join quests</p>
				</div>
				<button type="button" class="avail-dash__modal-close" onclick={closeModal} aria-label="Close">✕</button>
			</div>

			<form method="post" action={modal.mode === 'edit' ? '?/updateRange' : '?/setRange'} use:enhance={() => {
				return async ({ update, result }) => {
					if (result.type === 'success') { closeModal(); await update(); await invalidateAll(); }
				};
			}}>
				{#if modal.mode === 'edit' && modal.editBlock}
					<input type="hidden" name="oldDate" value={modal.editBlock.date} />
					<input type="hidden" name="oldStartSlot" value={modal.editBlock.startSlot} />
					<input type="hidden" name="oldEndSlot" value={modal.editBlock.endSlot} />
				{/if}
				<div class="field">
					<label class="label" for="avail-date">Date</label>
					<input id="avail-date" class="input" type="date" name="date" required bind:value={modal.date} />
				</div>

				<div class="avail-dash__time-row">
					<div class="field">
						<label class="label" for="avail-start">From</label>
						<select id="avail-start" class="input" name="startTime" bind:value={modal.startTime}>
							{#each TIME_OPTIONS.slice(0, 48) as opt}
								<option value={opt.value}>{opt.value}</option>
							{/each}
						</select>
					</div>
					<div class="field">
						<label class="label" for="avail-end">Until</label>
						<select id="avail-end" class="input" name="endTime" bind:value={modal.endTime}>
							{#each TIME_OPTIONS.slice(1) as opt}
								<option value={opt.value}>{opt.value}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="avail__scopes">
					<label class="avail__scope {modal.scope === 'GLOBAL' ? 'avail__scope--on' : ''}">
						<input type="radio" name="scope" value="GLOBAL" bind:group={modal.scope} />
						<div>
							<p class="avail__scope-name">🌐 Global</p>
							<p class="avail__scope-desc">Available for quests in any world</p>
						</div>
					</label>
					<label class="avail__scope {modal.scope === 'WORLD' ? 'avail__scope--on' : ''}">
						<input type="radio" name="scope" value="WORLD" bind:group={modal.scope} />
						<div>
							<p class="avail__scope-name">🌍 World-specific</p>
							<p class="avail__scope-desc">Only for selected worlds</p>
						</div>
					</label>
				</div>

				{#if modal.scope === 'WORLD' && allWorlds.length}
					<div class="avail__worlds">
						{#each allWorlds as w}
							<label class="avail__world-opt">
								<input type="checkbox" name="worldIds" value={(w as any).id}
									checked={modal.worldIds.has((w as any).id)}
									onchange={(e) => {
										const id = (w as any).id;
										if ((e.currentTarget as HTMLInputElement).checked) modal!.worldIds.add(id);
										else modal!.worldIds.delete(id);
										modal!.worldIds = new Set(modal!.worldIds);
									}} />
								{(w as any).name}
							</label>
						{/each}
					</div>
				{/if}

				{#if modal.date}
					<p class="avail-dash__modal-stat">
						Players free on this day: <strong>{densityAtDay(
							(() => { const d = new Date(modal!.date + 'T00:00:00.000Z'); const dow = d.getUTCDay(); return dow === 0 ? 6 : dow - 1; })()
						)}</strong>
					</p>
				{/if}

				<div class="avail__modal-actions">
					<button type="button" class="btn btn-ghost btn-sm" onclick={closeModal}>Cancel</button>
					<button type="submit" class="btn btn-primary btn-sm"
						disabled={modal.scope === 'WORLD' && modal.worldIds.size === 0}>
						{modal.mode === 'add' ? 'Add slot' : 'Update'}
					</button>
				</div>
			</form>

			{#if modal.mode === 'edit' && modal.editBlock}
				<form method="post" action="?/clearRange" use:enhance={() => {
					return async ({ update, result }) => {
						if (result.type === 'success') { closeModal(); await update(); await invalidateAll(); }
					};
				}}>
					<input type="hidden" name="date" value={modal.editBlock.date} />
					<input type="hidden" name="startSlot" value={modal.editBlock.startSlot} />
					<input type="hidden" name="endSlot" value={modal.editBlock.endSlot} />
					<button type="submit" class="avail__remove-btn">Remove this time block</button>
				</form>
			{/if}
		</div>
	</div>
{/if}
