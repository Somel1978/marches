<!-- apps/frontend/src/routes/(protected)/availability/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const DAYS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
	const HOURS = Array.from({ length: 48 }, (_, i) => {
		const h = Math.floor(i / 2).toString().padStart(2, '0');
		const m = i % 2 === 0 ? '00' : '30';
		return `${h}:${m}`;
	});

	const weekStart = $derived(new Date(data.weekStart));

	function dayDate(i: number) {
		const d = new Date(weekStart);
		d.setDate(weekStart.getDate() + i);
		return d;
	}

	function dateKey(d: Date) {
		return d.toISOString().split('T')[0];
	}

	// Map: "dateKey:slot" -> saved slot data
	const savedMap = $derived(
		data.slots.reduce((m: Record<string, { scope: string; worldIds: string[] }>, s: any) => {
			const k = new Date(s.date).toISOString().split('T')[0];
			m[`${k}:${s.slot}`] = { scope: s.scope, worldIds: s.worldIds as string[] };
			return m;
		}, {} as Record<string, { scope: string; worldIds: string[] }>)
	);

	// Popup state
	type PopupState = {
		dk:     string;
		slot:   number;
		hour:   string;
		saved:  boolean;
		scope:  'GLOBAL' | 'WORLD';
		worlds: Set<string>;
	};

	let popup = $state<PopupState | null>(null);

	function openSlot(dk: string, slotIdx: number) {
		const existing = savedMap[`${dk}:${slotIdx}`] ?? null;
		popup = {
			dk,
			slot:   slotIdx,
			hour:   HOURS[slotIdx],
			saved:  existing !== null,
			scope:  (existing?.scope as any) ?? 'GLOBAL',
			worlds: new Set(existing?.worldIds ?? []),
		};
	}

	function closePopup() { popup = null; }

	function slotColor(dk: string, slotIdx: number): string {
		const s = savedMap[`${dk}:${slotIdx}`];
		if (!s) return 'transparent';
		return s.scope === 'GLOBAL'
			? 'color-mix(in srgb, var(--color-success) 55%, transparent)'
			: 'color-mix(in srgb, var(--color-accent) 55%, transparent)';
	}

	function prevWeek() {
		const d = new Date(weekStart); d.setDate(d.getDate() - 7);
		goto(`/availability?week=${dateKey(d)}`);
	}
	function nextWeek() {
		const d = new Date(weekStart); d.setDate(d.getDate() + 7);
		goto(`/availability?week=${dateKey(d)}`);
	}
</script>

<div class="page">
	<div class="page__header">
		<h2 class="page__title">My Availability</h2>
		<div style="display:flex; gap:0.5rem;">
			<button type="button" class="btn btn-ghost btn-sm" onclick={prevWeek}>← Prev</button>
			<button type="button" class="btn btn-ghost btn-sm" onclick={nextWeek}>Next →</button>
		</div>
	</div>

	<div style="display:flex; gap:1rem; margin-bottom:0.75rem; font-size:0.8125rem; align-items:center;">
		<span style="display:flex; align-items:center; gap:0.375rem;">
			<span style="width:14px; height:14px; border-radius:2px; background:color-mix(in srgb, var(--color-success) 55%, transparent); display:inline-block;"></span>
			Global
		</span>
		<span style="display:flex; align-items:center; gap:0.375rem;">
			<span style="width:14px; height:14px; border-radius:2px; background:color-mix(in srgb, var(--color-accent) 55%, transparent); display:inline-block;"></span>
			World-specific
		</span>
		<span style="color:var(--text-muted);">Click any slot to set availability</span>
	</div>

	<div class="card" style="overflow-x:auto;">
		<table style="width:100%; border-collapse:collapse; font-size:0.8125rem;">
			<thead>
				<tr>
					<th style="width:48px; padding:0.375rem; color:var(--text-muted); font-weight:400;">Time</th>
					{#each DAYS as day, i}
						<th style="padding:0.375rem; text-align:center; min-width:60px;">
							<div style="font-weight:600;">{day}</div>
							<div style="font-size:0.7rem; color:var(--text-muted);">{dayDate(i).getDate()}/{dayDate(i).getMonth()+1}</div>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each HOURS as hour, slotIdx}
					<tr>
						<td style="padding:0.125rem 0.375rem; color:var(--text-muted); font-size:0.7rem; white-space:nowrap; user-select:none;">{hour}</td>
						{#each DAYS as _, dayIdx}
							{@const dk = dateKey(dayDate(dayIdx))}
							{@const bg = slotColor(dk, slotIdx)}
							<td
								style="padding:1px; cursor:pointer; background:{bg}; border:1px solid var(--border-muted); transition:background 0.1s;"
								onclick={() => openSlot(dk, slotIdx)}
								title="{hour}"
							>&nbsp;</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Slot popup -->
{#if popup}
	<div style="position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:50; display:flex; align-items:center; justify-content:center;"
		role="dialog" aria-modal="true" tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) closePopup(); }}
		onkeydown={(e) => { if (e.key === 'Escape') closePopup(); }}>
		<div class="card" style="width:100%; max-width:420px; margin:1rem; z-index:51;">
			<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem;">
				<h3 class="section-title" style="margin:0;">
					{popup.dk} · {popup.hour}
					{#if popup.saved}<span class="badge badge-success" style="margin-left:0.5rem;">Saved</span>{/if}
				</h3>
				<button type="button" class="btn btn-ghost btn-sm btn-icon" onclick={closePopup} aria-label="Close">✕</button>
			</div>

			<form method="post" action="?/setSlot" use:enhance={() => {
				return async ({ update }) => { closePopup(); await update(); await invalidateAll(); };
			}}>
				<input type="hidden" name="date"  value={popup.dk} />
				<input type="hidden" name="slot"  value={popup.slot} />

				<div class="fields">
					<div class="field">
						<p class="label">Availability scope</p>
						<div style="display:flex; flex-direction:column; gap:0.5rem;">
							<label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; padding:0.625rem; background:var(--bg-overlay); border-radius:var(--radius-md); border:2px solid {popup.scope === 'GLOBAL' ? 'var(--color-success)' : 'var(--border-muted)'};">
								<input type="radio" name="scope" value="GLOBAL" bind:group={popup.scope} />
								<div>
									<p style="font-weight:600; margin:0; font-size:0.875rem;">Global</p>
									<p style="color:var(--text-muted); margin:0; font-size:0.8rem;">Available for quests in any world</p>
								</div>
							</label>
							<label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; padding:0.625rem; background:var(--bg-overlay); border-radius:var(--radius-md); border:2px solid {popup.scope === 'WORLD' ? 'var(--color-accent)' : 'var(--border-muted)'};">
								<input type="radio" name="scope" value="WORLD" bind:group={popup.scope} />
								<div>
									<p style="font-weight:600; margin:0; font-size:0.875rem;">World-specific</p>
									<p style="color:var(--text-muted); margin:0; font-size:0.8rem;">Available only for selected worlds</p>
								</div>
							</label>
						</div>
					</div>

					{#if popup.scope === 'WORLD'}
						<div class="field">
							<p class="label">Select worlds</p>
							<div style="display:flex; flex-direction:column; gap:0.375rem;">
								{#each (data as any).allWorlds as w}
									<label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
										<input type="checkbox" name="worldIds" value={w.id}
											checked={popup.worlds.has(w.id)}
											onchange={(e) => {
												if ((e.currentTarget as HTMLInputElement).checked) popup!.worlds.add(w.id);
												else popup!.worlds.delete(w.id);
												popup!.worlds = new Set(popup!.worlds);
											}} />
										{w.name}
									</label>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<div class="form-actions">
					<button type="button" class="btn btn-ghost btn-sm" onclick={closePopup}>Cancel</button>
					<button type="submit" class="btn btn-primary btn-sm"
						disabled={popup.scope === 'WORLD' && popup.worlds.size === 0}>
						{popup.saved ? 'Update' : 'Save'}
					</button>
				</div>
			</form>
			{#if popup.saved}
				<form method="post" action="?/clearSlot" use:enhance={() => {
					return async ({ update }) => { closePopup(); await update(); await invalidateAll(); };
				}} style="margin-top:0.5rem;">
					<input type="hidden" name="date" value={popup.dk} />
					<input type="hidden" name="slot" value={popup.slot} />
					<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger); width:100%;">Remove this slot</button>
				</form>
			{/if}
		</div>
	</div>
{/if}