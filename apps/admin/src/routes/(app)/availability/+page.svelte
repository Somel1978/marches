<!-- apps/admin/src/routes/(app)/availability/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const HOURS = Array.from({ length: 48 }, (_, i) => {
		const h = Math.floor(i / 2).toString().padStart(2, '0');
		const m = i % 2 === 0 ? '00' : '30';
		return `${h}:${m}`;
	});

	const bySlot  = $derived((data as any).bySlot  ?? {});
	const dayStr  = $derived((data as any).dayStr  ?? '');
	const slots   = $derived(Object.keys(bySlot).map(Number).sort((a, b) => a - b));

	// Compute total unique users available today
	const totalUsers = $derived(() => {
		const ids = new Set<string>();
		for (const entries of Object.values(bySlot) as any[][]) {
			for (const e of entries) ids.add(e.userId);
		}
		return ids.size;
	});

	function prevDay() {
		const d = new Date(dayStr);
		d.setDate(d.getDate() - 1);
		goto(`/availability?day=${d.toISOString().split('T')[0]}`);
	}
	function nextDay() {
		const d = new Date(dayStr);
		d.setDate(d.getDate() + 1);
		goto(`/availability?day=${d.toISOString().split('T')[0]}`);
	}

	function formatDay(ds: string) {
		return new Date(ds).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
	}

	let selectedSlot = $state<number | null>(null);
</script>

<div class="page">
	<div class="page__header">
		<h2 class="page__title">Player Availability</h2>
	</div>

	<!-- Day picker -->
	<div class="card" style="margin-bottom:1rem;">
		<div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
			<button type="button" class="btn btn-ghost btn-sm" onclick={prevDay}>← Prev</button>
			<input type="date" class="input" style="width:180px;"
				value={dayStr}
				onchange={(e) => goto(`/availability?day=${(e.currentTarget as HTMLInputElement).value}`)} />
			<button type="button" class="btn btn-ghost btn-sm" onclick={nextDay}>Next →</button>
			<span style="color:var(--text-muted); font-size:0.875rem;">{formatDay(dayStr)}</span>
			{#if slots.length}
				<span class="badge badge-muted">{totalUsers()} player{totalUsers() !== 1 ? 's' : ''} available</span>
			{/if}
		</div>
	</div>

	{#if !slots.length}
		<div class="card">
			<p class="table__empty">No availability set for this day.</p>
		</div>
	{:else}
		<div class="sections">
			<!-- Slot list -->
			<div class="card">
				<h3 class="section-title">Available slots</h3>
				<div style="display:flex; flex-direction:column; gap:0.375rem;">
					{#each slots as slotIdx}
						{@const entries = bySlot[slotIdx] ?? []}
						<button type="button"
							style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0.75rem; background:{selectedSlot === slotIdx ? 'var(--bg-active)' : 'var(--bg-overlay)'}; border:1px solid {selectedSlot === slotIdx ? 'var(--color-accent)' : 'var(--border-muted)'}; border-radius:var(--radius-md); cursor:pointer; text-align:left; width:100%; flex-wrap:wrap"
							onclick={() => selectedSlot = selectedSlot === slotIdx ? null : slotIdx}>
							<span style="font-weight:600; font-size:0.875rem;">{HOURS[slotIdx]}</span>
							<span class="badge badge-muted">{entries.length} player{entries.length !== 1 ? 's' : ''}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Detail panel -->
			{#if selectedSlot !== null && bySlot[selectedSlot]}
				<div class="card">
					<h3 class="section-title">{HOURS[selectedSlot]} — {bySlot[selectedSlot].length} player{bySlot[selectedSlot].length !== 1 ? 's' : ''}</h3>
					<div style="display:flex; flex-direction:column; gap:0.75rem;">
						{#each bySlot[selectedSlot] as entry}
							<div style="padding:0.625rem; background:var(--bg-overlay); border-radius:var(--radius-md); border:1px solid var(--border-muted);">
								<div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.375rem;">
									<div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap">
										<span style="font-weight:600; font-size:0.875rem;">{entry.userName}</span>
										<span class="badge {entry.scope === 'GLOBAL' ? 'badge-success' : 'badge-accent'}">{entry.scope}</span>
										{#if entry.scope === 'WORLD' && entry.worldIds?.length}
											<span style="font-size:0.75rem; color:var(--text-muted);">{entry.worldIds.join(', ')}</span>
										{/if}
									</div>
									<form method="post" action="?/deleteSlot" use:enhance={() => {
										return async ({ update }) => { await update(); await invalidateAll(); };
									}}>
										<input type="hidden" name="id" value={entry.id} />
										<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger);">Remove</button>
									</form>
								</div>
								{#if entry.chars?.length}
									<div style="display:flex; flex-wrap:wrap; gap:0.375rem;">
										{#each entry.chars as c}
											<a href="/characters/{c.id}" class="character-class-tag" style="text-decoration:none;">
												<span>{c.name}</span>
												<span class="badge badge-muted">Lv {c.totalLevel ?? '?'}</span>
											</a>
										{/each}
									</div>
								{:else}
									<span class="table__muted" style="font-size:0.8125rem;">No active characters</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>