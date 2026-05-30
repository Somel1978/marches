<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/audit/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const filters = $derived((data as any).filters);

	const actionColors: Record<string, string> = {
		CREATE: 'badge-success',
		UPDATE: 'badge-accent',
		DELETE: 'badge-danger',
		ASSIGN: 'badge-muted',
		REVOKE: 'badge-muted',
	};

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleString('en-GB', {
			day: '2-digit', month: 'short', year: 'numeric',
			hour: '2-digit', minute: '2-digit',
		});
	}

	function buildUrl(params: Record<string, string>) {
		const p = new URLSearchParams();
		const merged = { ...filters, ...params };
		for (const [k, v] of Object.entries(merged)) {
			if (v) p.set(k, v as string);
		}
		const qs = p.toString();
		return `?${qs}`;
	}
</script>

<div style="margin-bottom:1rem;">
	<p class="page__subtitle">{data.total} log entr{data.total !== 1 ? 'ies' : 'y'}</p>
</div>

<!-- Filters -->
<div class="card" style="margin-bottom:1.5rem; display:flex; gap:0.75rem; flex-wrap:wrap; align-items:flex-end;">
	<div class="field" style="margin:0; flex:1; min-width:160px;">
		<label class="label" for="f-resource">Resource</label>
		<input id="f-resource" type="text" class="input" placeholder="e.g. World, Quest…"
			value={filters.resourceKey}
			onchange={(e) => { window.location.href = buildUrl({ resource: (e.target as HTMLInputElement).value }); }} />
	</div>
	<div class="field" style="margin:0; flex:0 0 auto;">
		<label class="label" for="f-action">Action</label>
		<select id="f-action" class="input input--select"
			onchange={(e) => { window.location.href = buildUrl({ action: (e.target as HTMLSelectElement).value }); }}>
			<option value="">All</option>
			{#each ['CREATE','UPDATE','DELETE','ASSIGN','REVOKE'] as a}
				<option value={a} selected={filters.action === a}>{a}</option>
			{/each}
		</select>
	</div>
	<div class="field" style="margin:0; flex:0 0 auto;">
		<label class="label" for="f-from">From</label>
		<input id="f-from" type="date" class="input" value={filters.from}
			onchange={(e) => { window.location.href = buildUrl({ from: (e.target as HTMLInputElement).value }); }} />
	</div>
	<div class="field" style="margin:0; flex:0 0 auto;">
		<label class="label" for="f-to">To</label>
		<input id="f-to" type="date" class="input" value={filters.to}
			onchange={(e) => { window.location.href = buildUrl({ to: (e.target as HTMLInputElement).value }); }} />
	</div>
	{#if filters.resourceKey || filters.action || filters.from || filters.to}
		<a href="?" class="btn btn-ghost btn-sm" style="margin-bottom:0;">Clear</a>
	{/if}
</div>

<div class="card">
	<table class="table">
		<thead>
			<tr>
				<th>When</th>
				<th>Actor</th>
				<th>Action</th>
				<th>Resource</th>
				<th>ID</th>
			</tr>
		</thead>
		<tbody>
			{#each data.items as log}
				<tr>
					<td class="table__muted" style="font-size:0.8125rem; white-space:nowrap;">{formatDate(log.createdAt)}</td>
					<td>
						{#if (log as any).actor}
							<span style="font-weight:500;">{(log as any).actor.name}</span>
							<span class="table__muted" style="display:block; font-size:0.75rem;">{(log as any).actor.email}</span>
						{:else}
							<span class="table__muted">System</span>
						{/if}
					</td>
					<td><span class="badge {actionColors[log.action] ?? 'badge-muted'}">{log.action}</span></td>
					<td class="table__muted">{log.resourceKey}</td>
					<td class="table__muted" style="font-size:0.75rem; font-family:monospace;">{log.resourceId.slice(0, 8)}…</td>
				</tr>
			{:else}
				<tr><td colspan="5" class="table__empty">No audit logs found.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
