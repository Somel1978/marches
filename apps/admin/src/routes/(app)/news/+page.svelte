<!-- apps/admin/src/routes/(app)/news/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const typeColors: Record<string, string> = {
		NEWS: 'badge-muted', EVENT: 'badge-accent', WARNING: 'badge-warning', STATUS: 'badge-success',
	};
	function formatDate(d: Date | string) {
		return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}
</script>

<div class="page">
	<div class="page__header">
		<h2 class="page__title">News & Announcements</h2>
		<form method="post" action="?/create" use:enhance>
			<button type="submit" class="btn btn-primary btn-sm">+ New announcement</button>
		</form>
	</div>
	<div class="card">
		{#if (data as any).announcements?.length}
			<div class="table-wrap">
				<table class="table">
				<thead><tr><th>Title</th><th>Type</th><th>Published</th><th>Date</th><th></th></tr></thead>
				<tbody>
					{#each (data as any).announcements as a}
						<tr>
							<td><a href="/news/{a.id}" style="font-weight:600;">{a.title}</a></td>
							<td><span class="badge {typeColors[(a as any).type] ?? 'badge-muted'}">{(a as any).type}</span></td>
							<td>{a.isPublished ? '✓' : '—'}</td>
							<td class="table__muted">{formatDate(a.createdAt)}</td>
							<td><a href="/news/{a.id}" class="btn btn-ghost btn-sm">Edit</a></td>
						</tr>
					{/each}
				</tbody>
			</table>
</div>
		{:else}
			<p class="table__empty">No announcements yet.</p>
		{/if}
	</div>
</div>