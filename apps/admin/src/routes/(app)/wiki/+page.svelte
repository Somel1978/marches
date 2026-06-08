<!-- apps/admin/src/routes/(app)/wiki/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const visibilityLabel: Record<string, string> = {
		PUBLIC: '🌐 Public', DM_ONLY: '🎲 DM Only', ADMIN_ONLY: '🔒 Admin Only',
	};
</script>

<div class="page">
	<div class="page__header">
		<h2 class="page__title">Wiki</h2>
		<form method="post" action="?/create" use:enhance>
			<button type="submit" class="btn btn-primary btn-sm">+ New wiki</button>
		</form>
	</div>
	<div class="card">
		{#if (data as any).wikis?.length}
			<div class="table-wrap">
				<table class="table">
					<thead><tr><th>Icon</th><th>Title</th><th>Visibility</th><th>Sections</th><th>Published</th><th></th></tr></thead>
					<tbody>
						{#each (data as any).wikis as w}
							<tr>
								<td style="font-size:1.25rem;">{w.icon ?? '📖'}</td>
								<td style="font-weight:600;">{w.title}</td>
								<td><span class="badge badge-muted">{visibilityLabel[w.visibility] ?? w.visibility}</span></td>
								<td>{w.sections?.length ?? 0}</td>
								<td>{w.isPublished ? '✓' : '—'}</td>
								<td><a href="/wiki/{w.id}" class="btn btn-ghost btn-sm">Manage</a></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="table__empty">No wikis yet.</p>
		{/if}
	</div>
</div>
