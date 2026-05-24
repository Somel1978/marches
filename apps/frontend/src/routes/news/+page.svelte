<!-- apps/frontend/src/routes/news/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const typeColors: Record<string, string> = {
		NEWS:    'badge-muted',
		EVENT:   'badge-accent',
		WARNING: 'badge-warning',
		STATUS:  'badge-success',
	};

	const TYPES = ['NEWS', 'EVENT', 'WARNING', 'STATUS'];

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}
	function formatDateTime(d: Date | string) {
		return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}
</script>

<div class="page">
	<div class="page__header">
		<h2 class="page__title">News & Announcements</h2>
	</div>

	<!-- Type filter -->
	<div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1rem;">
		<a href="/news" class="btn btn-sm {!data.type ? 'btn-primary' : 'btn-ghost'}">All</a>
		{#each TYPES as t}
			<a href="/news?type={t}" class="btn btn-sm {data.type === t ? 'btn-primary' : 'btn-ghost'}">{t}</a>
		{/each}
	</div>

	{#if (data as any).announcements?.length}
		<div style="display:flex; flex-direction:column; gap:1rem;">
			{#each (data as any).announcements as a}
				<a href="/news/{a.id}" style="text-decoration:none;">
					<div class="card" style="border:1px solid var(--border-muted);">
						<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; flex-wrap:wrap;">
							<div style="flex:1;">
								<div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.375rem;">
									<span class="badge {typeColors[a.type] ?? 'badge-muted'}">{a.type}</span>
									{#each a.tags as tag}
										<span class="badge badge-muted">{tag}</span>
									{/each}
								</div>
								<h3 style="font-size:1.0625rem; font-weight:700; margin:0 0 0.25rem;">{a.title}</h3>
								{#if a.type === 'EVENT' && a.scheduledAt}
									<p style="font-size:0.8125rem; color:var(--color-accent); margin:0;">📅 {formatDateTime(a.scheduledAt)}</p>
								{/if}
							</div>
							<span class="table__muted" style="font-size:0.8125rem; white-space:nowrap;">{formatDate(a.createdAt)}</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="card"><p class="table__empty">No announcements found.</p></div>
	{/if}
</div>