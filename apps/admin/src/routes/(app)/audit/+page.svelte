<!-- apps/admin/src/routes/(app)/audit/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Filters
	// $derived initialises from server data; local $state tracks edits before Apply
	const initFilters  = $derived(data.filters);
	let filterResource = $state('');
	let filterAction   = $state('');
	let filterFrom     = $state('');
	let filterTo       = $state('');
	$effect(() => {
		filterResource = initFilters.resourceKey;
		filterAction   = initFilters.action;
		filterFrom     = initFilters.from;
		filterTo       = initFilters.to;
	});

	// Detail panel
	let selected = $state<typeof data.items[0] | null>(null);

	const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'REVOKE'];

	const allResources = $derived(
		data.resources.flatMap(m => m.resources).map(r => ({ key: r.key, label: r.displayName }))
	);

	function applyFilters() {
		const params = new URLSearchParams();
		if (filterResource) params.set('resource', filterResource);
		if (filterAction)   params.set('action',   filterAction);
		if (filterFrom)     params.set('from',      filterFrom);
		if (filterTo)       params.set('to',        filterTo);
		goto(`/audit?${params}`, { replaceState: true });
	}

	function clearFilters() {
		filterResource = '';
		filterAction   = '';
		filterFrom     = '';
		filterTo       = '';
		goto('/audit', { replaceState: true });
	}

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleString('en-GB', {
			day: '2-digit', month: 'short', year: 'numeric',
			hour: '2-digit', minute: '2-digit',
		});
	}

	function actionClass(action: string) {
		return {
			CREATE: 'badge-success',
			UPDATE: 'badge-accent',
			DELETE: 'badge-danger',
			ASSIGN: 'badge-accent',
			REVOKE: 'badge-warning',
		}[action] ?? 'badge-muted';
	}

	function formatJson(val: unknown) {
		if (val === null || val === undefined) return '—';
		try {
			return JSON.stringify(val, null, 2);
		} catch {
			return String(val);
		}
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">Audit Log</h2>
			<p class="page__subtitle">{data.total} event{data.total !== 1 ? 's' : ''}</p>
		</div>
	</div>

	<!-- Filters -->
	<div class="filters card">
		<div class="filters__row">
			<div class="filter-field">
				<label class="label" for="f-resource">Resource</label>
				<select id="f-resource" class="input" bind:value={filterResource}>
					<option value="">All resources</option>
					{#each allResources as r}
						<option value={r.key}>{r.label}</option>
					{/each}
				</select>
			</div>

			<div class="filter-field">
				<label class="label" for="f-action">Action</label>
				<select id="f-action" class="input" bind:value={filterAction}>
					<option value="">All actions</option>
					{#each ACTIONS as a}
						<option value={a}>{a}</option>
					{/each}
				</select>
			</div>

			<div class="filter-field">
				<label class="label" for="f-from">From</label>
				<input id="f-from" type="date" class="input" bind:value={filterFrom} />
			</div>

			<div class="filter-field">
				<label class="label" for="f-to">To</label>
				<input id="f-to" type="date" class="input" bind:value={filterTo} />
			</div>
		</div>

		<div class="filters__actions">
			<button class="btn btn-ghost btn-sm" onclick={clearFilters}>Clear</button>
			<button class="btn btn-primary btn-sm" onclick={applyFilters}>Apply</button>
		</div>
	</div>

	<!-- Table -->
	<div class="table-wrap card">
		<div class="table-wrap">
			<table class="table">
			<thead>
				<tr>
					<th>When</th>
					<th>Actor</th>
					<th>Action</th>
					<th class="col-hide-mobile">Resource</th>
					<th class="col-hide-tablet">ID</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.items as log}
					<tr
						class="table__row"
						class:table__row--active={selected?.id === log.id}
						onclick={() => selected = selected?.id === log.id ? null : log}
					>
						<td class="table__muted">{formatDate(log.createdAt)}</td>
						<td>
							{#if log.actor}
								<div class="actor">
									<span class="actor__name">{log.actor.name}</span>
									<span class="actor__email">{log.actor.email}</span>
								</div>
							{:else}
								<span class="table__muted">System</span>
							{/if}
						</td>
						<td>
							<span class="badge {actionClass(log.action)}">{log.action}</span>
						</td>
						<td class="col-hide-mobile">{log.resourceKey}</td>
						<td class="table__id col-hide-tablet">{log.resourceId.slice(0, 8)}…</td>
						<td class="table__action">
							<button class="btn btn-ghost btn-icon btn-sm" aria-label="View details">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="{selected?.id === log.id ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}"/>
								</svg>
							</button>
						</td>
					</tr>

					{#if selected?.id === log.id}
						<tr class="detail-row">
							<td colspan="6">
								<div class="detail-panel">
									<div class="detail-cols">
										<div class="detail-col">
											<p class="detail-label">Before</p>
											<pre class="detail-json">{formatJson(log.before)}</pre>
										</div>
										<div class="detail-col">
											<p class="detail-label">After</p>
											<pre class="detail-json">{formatJson(log.after)}</pre>
										</div>
									</div>
									{#if log.metadata}
										<div class="detail-meta">
											<p class="detail-label">Metadata</p>
											<pre class="detail-json">{formatJson(log.metadata)}</pre>
										</div>
									{/if}
									<p class="detail-full-id">Full ID: <code>{log.resourceId}</code></p>
								</div>
							</td>
						</tr>
					{/if}
				{/each}

				{#if data.items.length === 0}
					<tr>
						<td colspan="6" class="table__empty">No audit events found.</td>
					</tr>
				{/if}
			</tbody>
		</table>
</div>
	</div>

	<!-- Pagination -->
	{#if data.totalPages > 1}
		<div class="pagination">
			{#each Array.from({ length: data.totalPages }, (_, i) => i + 1) as p}
				<a
					href="/audit?page={p}{filterResource ? `&resource=${filterResource}` : ''}{filterAction ? `&action=${filterAction}` : ''}"
					class="pagination__page"
					class:pagination__page--active={p === data.page}
				>{p}</a>
			{/each}
		</div>
	{/if}
</div>

<!-- Detail panel overlay (click outside to close) -->
{#if selected}
	<button class="overlay" onclick={() => selected = null} aria-label="Close detail panel"></button>
{/if}