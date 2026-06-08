<!-- apps/admin/src/routes/(app)/world/[id]/journal/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const visibilityLabel: Record<string, string> = {
		PUBLIC: '🌐 Public', WORLD: '🌍 World', DM_ONLY: '🎲 DM Only', ADMIN_ONLY: '🔒 Admin Only',
	};
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/world/{(data as any).world.id}" class="back-link">← {(data as any).world.name}</a>
			<h2 class="page__title">📖 World Journal</h2>
		</div>
		<form method="post" action="?/create" use:enhance>
			<button type="submit" class="btn btn-primary btn-sm">+ New journal</button>
		</form>
	</div>
	<div class="card">
		{#if (data as any).journals?.length}
			<div class="table-wrap">
				<table class="table">
					<thead><tr><th>Icon</th><th>Title</th><th>Visibility</th><th>Sections</th><th>Published</th><th></th></tr></thead>
					<tbody>
						{#each (data as any).journals as j}
							<tr>
								<td style="font-size:1.25rem;">{j.icon ?? '📖'}</td>
								<td style="font-weight:600;">{j.title}</td>
								<td><span class="badge badge-muted">{visibilityLabel[j.visibility] ?? j.visibility}</span></td>
								<td>{j.sections?.length ?? 0}</td>
								<td>{j.isPublished ? '✓' : '—'}</td>
								<td><a href="/world/{(data as any).world.id}/journal/{j.id}" class="btn btn-ghost btn-sm">Manage</a></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="table__empty">No journals for this world yet.</p>
		{/if}
	</div>
</div>
