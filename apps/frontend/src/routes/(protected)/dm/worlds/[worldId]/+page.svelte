<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const world      = $derived((data as any).world);
	const canManage  = $derived((data as any).canManage === true);
	const bySlot     = $derived((data as any).bySlot  ?? {});
	const dayStr     = $derived((data as any).dayStr  ?? new Date().toISOString().split('T')[0]);
	const slots      = $derived(Object.keys(bySlot).map(Number).sort((a, b) => a - b));
	const HOURS      = Array.from({length:48},(_,i)=>`${String(Math.floor(i/2)).padStart(2,'0')}:${i%2===0?'00':'30'}`);
	let selectedSlot = $state<number | null>(null);
</script>

<!-- Stats summary -->
<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
	<div class="card" style="text-align:center;">
		<div style="font-size:1.75rem; font-weight:700; color:var(--color-accent);">{(data as any).regionCount}</div>
		<div class="label" style="margin-top:0.25rem;">Regions</div>
	</div>
	<div class="card" style="text-align:center;">
		<div style="font-size:1.75rem; font-weight:700; color:var(--color-accent);">{(data as any).questStats.total}</div>
		<div class="label" style="margin-top:0.25rem;">Quests</div>
	</div>
	{#if (data as any).questStats.inProgress > 0}
		<div class="card" style="text-align:center; border-color:var(--color-success);">
			<div style="font-size:1.75rem; font-weight:700; color:var(--color-success);">{(data as any).questStats.inProgress}</div>
			<div class="label" style="margin-top:0.25rem;">In Progress</div>
		</div>
	{/if}
	{#if (data as any).questStats.pending > 0}
		<a href="/dm/worlds/{world.id}/quests?status=PENDING_APPROVAL" class="card" style="text-align:center; border-color:var(--color-warning); text-decoration:none;">
			<div style="font-size:1.75rem; font-weight:700; color:var(--color-warning);">{(data as any).questStats.pending}</div>
			<div class="label" style="margin-top:0.25rem;">Quests awaiting approval</div>
		</a>
	{/if}
	{#if canManage && (data as any).pendingTransactions > 0}
		<a href="/dm/worlds/{world.id}/transactions" class="card" style="text-align:center; border-color:var(--color-warning); text-decoration:none;">
			<div style="font-size:1.75rem; font-weight:700; color:var(--color-warning);">{(data as any).pendingTransactions}</div>
			<div class="label" style="margin-top:0.25rem;">Pending transactions</div>
		</a>
	{/if}
	{#if canManage && (data as any).pendingCharacters > 0}
		<a href="/dm/worlds/{world.id}/characters" class="card" style="text-align:center; border-color:var(--color-warning); text-decoration:none;">
			<div style="font-size:1.75rem; font-weight:700; color:var(--color-warning);">{(data as any).pendingCharacters}</div>
			<div class="label" style="margin-top:0.25rem;">Pending characters</div>
		</a>
	{/if}
</div>

<!-- World description -->
{#if world.description}
	<div class="card" style="margin-bottom:1.5rem;">
		<p style="margin:0; color:var(--text-secondary);">{world.description}</p>
	</div>
{/if}

<!-- Player availability -->
<div class="card" style="margin-bottom:1.5rem;">
		<h3 class="section-title">Player availability</h3>
		<div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.75rem;">
			<a href="?day={(() => { const d=new Date(dayStr); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; })()}" class="btn btn-ghost btn-sm">← Prev</a>
			<input type="date" class="input" style="width:160px;" value={dayStr}
				onchange={(e) => { const v=(e.currentTarget as HTMLInputElement).value; if(v) window.location.href=`?day=${v}`; }} />
			<a href="?day={(() => { const d=new Date(dayStr); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0]; })()}" class="btn btn-ghost btn-sm">Next →</a>
			<span style="color:var(--text-muted);font-size:0.875rem;">{new Date(dayStr).toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'long'})}</span>
		</div>
		{#if !slots.length}
			<p class="table__empty">No availability set for this day.</p>
		{:else}
			<div style="display:flex;flex-direction:column;gap:0.375rem;">
				{#each slots as slotIdx}
					{@const entries = bySlot[slotIdx] ?? []}
					<div style="padding:0.5rem 0.75rem;background:var(--bg-overlay);border:1px solid var(--border-muted);border-radius:var(--radius-md);">
						<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.375rem;">
							<span style="font-weight:600;font-size:0.875rem;">{HOURS[slotIdx]}</span>
							<span class="badge badge-muted">{entries.length} player{entries.length !== 1 ? 's' : ''}</span>
						</div>
						<div style="display:flex;flex-direction:column;gap:0.375rem;">
							{#each entries as entry}
								<div style="font-size:0.8125rem;">
									<span style="font-weight:500;">{entry.userName}</span>
									<span class="badge {entry.scope === 'GLOBAL' ? 'badge-success' : 'badge-accent'}" style="margin-left:0.375rem;">{entry.scope}</span>
									{#if entry.chars?.length}
										<div style="display:flex;flex-wrap:wrap;gap:0.375rem;margin-top:0.25rem;">
											{#each entry.chars as char}
												<span class="character-class-tag">
													<span>{char.name}</span>
													<span class="badge badge-muted">Lv {char.totalLevel ?? '?'}</span>
												</span>
											{/each}
										</div>
									{:else}
										<span class="table__muted" style="font-size:0.8125rem;margin-left:0.375rem;">No active characters</span>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

<!-- Regions quick list -->
{#if world.regions?.length}
	<div class="card">
		<h3 class="section-title">Regions ({world.regions.length})</h3>
		<div style="display:flex; flex-direction:column; gap:0.375rem;">
			{#each world.regions as region}
				<a href="/dm/worlds/{world.id}/regions/{region.id}"
					style="display:flex; align-items:center; gap:0.75rem; padding:0.5rem; border-radius:var(--radius-sm); background:var(--bg-elevated); text-decoration:none; flex-wrap:wrap">
					<div style="width:10px; height:10px; border-radius:50%; background:{region.color}; flex-shrink:0;"></div>
					<span style="font-weight:600; color:var(--text-primary);">{region.name}</span>
					<span class="badge badge-muted" style="margin-left:auto;">{region.dangerRating}</span>
					{#if !region.isActive}<span class="badge badge-muted">Inactive</span>{/if}
				</a>
			{/each}
		</div>
	</div>
{/if}