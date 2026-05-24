<!-- apps/frontend/src/routes/(protected)/dm/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const HOURS = Array.from({ length: 48 }, (_, i) => `${Math.floor(i/2).toString().padStart(2,'0')}:${i%2===0?'00':'30'}`);
	const pa    = $derived((data as any).playerAvailability ?? {});
	const dates = $derived(Object.keys(pa).sort());

	const statusColors: Record<string, string> = {
		DRAFT:            'badge-muted',
		PENDING_APPROVAL: 'badge-warning',
		PUBLISHED:        'badge-success',
		IN_PROGRESS:      'badge-accent',
		PENDING_RESULT:            'badge-warning',
		PENDING_RESULT_APPROVAL:   'badge-accent',
		COMPLETED:        'badge-success',
		CANCELLED:        'badge-danger',
	};
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">DM Dashboard</h2>
		</div>
		<div style="display:flex; gap:0.5rem;">
			<a href="/dm/quests/new" class="btn btn-primary btn-sm">+ New quest</a>
			<a href="/dm/profile" class="btn btn-ghost btn-sm">{data.profile ? 'Edit profile' : 'Create profile'}</a>
		</div>
	</div>

	<!-- Player availability next 7 days -->
	{#if dates.length}
	<div class="card" style="margin-bottom:1rem;">
		<h3 class="section-title">Player availability — next 7 days</h3>
		<div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.5rem;">
			{#each dates as dk}
				{@const daySlots = pa[dk]}
				{@const slotNums = Object.keys(daySlots).map(Number).sort((a,b)=>a-b)}
				<div>
					<p style="font-weight:600; font-size:0.875rem; margin:0 0 0.375rem;">
						{new Date(dk).toLocaleDateString('en-GB', { weekday:'long', day:'2-digit', month:'short' })}
					</p>
					<div style="display:flex; flex-direction:column; gap:0.25rem;">
						{#each slotNums as slot}
							{@const players = daySlots[slot]}
							<div style="display:flex; align-items:flex-start; gap:0.75rem; padding:0.375rem 0.625rem; background:var(--bg-overlay); border-radius:var(--radius-sm);">
								<span style="font-size:0.8125rem; font-weight:600; width:40px; flex-shrink:0; color:var(--text-secondary);">{HOURS[slot]}</span>
								<div style="display:flex; flex-wrap:wrap; gap:0.375rem;">
									{#each players as p}
										{#each p.chars as c}
											<span class="character-class-tag" title="{p.scope === 'WORLD' ? 'World-specific' : 'Global'}">
												<span>{c.name}</span>
												<span class="badge badge-muted">Lv {c.totalLevel}</span>
											</span>
										{/each}
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
	{/if}

	{#if data.quests.length === 0}
		<div class="card" style="text-align:center; padding:2rem;">
			<p style="color:var(--text-muted);">No quests yet. Create your first quest!</p>
		</div>
	{:else}
		<div class="table-wrap card">
			<table class="table">
				<thead>
					<tr>
						<th>Quest</th>
						<th>Status</th>
						<th class="col-hide-mobile">Players</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.quests as quest}
						<tr>
							<td><strong>{quest.title}</strong></td>
							<td><span class="badge {statusColors[quest.status] ?? 'badge-muted'}">{quest.status.replace('_', ' ')}</span></td>
							<td class="table__muted col-hide-mobile">{quest.signups.length}/{quest.maxCapacity}</td>
							<td class="table__action"><a href="/dm/quests/{quest.id}" class="btn btn-ghost btn-sm">Manage</a></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>