<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/journal/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const journals  = $derived((data as any).journals ?? []);
	const canManage = $derived((data as any).canManage === true);
	const world     = $derived((data as any).world);
</script>

<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap">
	<p class="page__subtitle">{journals.length} journal{journals.length !== 1 ? 's' : ''}</p>
	{#if canManage}
		<form method="post" action="?/create" use:enhance>
			<button type="submit" class="btn btn-primary btn-sm">+ New journal</button>
		</form>
	{/if}
</div>

{#if form?.message}<div class="form-error">{(form as any).message}</div>{/if}

{#if journals.length}
	<div style="display:flex; flex-direction:column; gap:0.75rem;">
		{#each journals as journal}
			<a href="/dm/worlds/{world.id}/journal/{journal.id}"
				style="display:flex; align-items:center; gap:0.75rem; text-decoration:none; flex-wrap:wrap"
				class="card">
				{#if journal.icon}
					<span style="font-size:1.25rem;">{journal.icon}</span>
				{/if}
				<div style="flex:1;">
					<div style="font-weight:600; color:var(--text-primary);">{journal.title}</div>
					{#if journal.description}
						<div class="table__muted" style="font-size:0.8125rem;">{journal.description}</div>
					{/if}
					<div class="table__muted" style="font-size:0.75rem; margin-top:0.25rem;">
						{journal.sections?.length ?? 0} section{(journal.sections?.length ?? 0) !== 1 ? 's' : ''}
					</div>
				</div>
				<span class="badge {journal.isPublished ? 'badge-success' : 'badge-muted'}">
					{journal.isPublished ? 'Published' : 'Draft'}
				</span>
			</a>
		{/each}
	</div>
{:else}
	<div class="card">
		<p class="table__empty">No journals for this world yet.{canManage ? ' Create one to get started.' : ''}</p>
	</div>
{/if}