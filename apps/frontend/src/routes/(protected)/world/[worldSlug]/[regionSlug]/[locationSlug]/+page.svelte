<!-- apps/frontend/src/routes/(protected)/world/[worldSlug]/[regionSlug]/[locationSlug]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { renderMarkdown } from '@core/ui';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let editingWiki = $state(false);

	const dangerColors: Record<string, string> = {
		Safe: 'badge-success', Low: 'badge-accent',
		Moderate: 'badge-warning', High: 'badge-danger', Extreme: 'badge-danger',
	};
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/world/{data.world.slug}/{data.region.slug}" class="back-link">← {data.region.name}</a>
			<h2 class="page__title">{data.location.name}</h2>
			<div class="page__title-row">
				<span class="badge badge-muted">{data.location.type}</span>
				{#if (data as any).showDanger}
					<span class="badge {dangerColors[data.location.dangerRating] ?? 'badge-muted'}">{data.location.dangerRating}</span>
				{/if}
				{#if (data as any).showLevel && data.location.minLevel && data.location.maxLevel}
					<span class="badge badge-muted">Lv {data.location.minLevel}–{data.location.maxLevel}</span>
				{/if}
			</div>
		</div>
		{#if (data as any).canEditWiki}
			<button class="btn btn-ghost btn-sm" onclick={() => editingWiki = !editingWiki}>
				{editingWiki ? 'Cancel' : data.wiki ? 'Edit wiki' : 'Create wiki'}
			</button>
		{/if}
	</div>

	{#if (form as any)?.message}<div class="form-error">{(form as any).message}</div>{/if}
	{#if (form as any)?.wikiSuccess}<div class="form-success">Wiki saved.</div>{/if}

	{#if data.location.imageUrl}
		<img src={data.location.imageUrl} alt={data.location.name} style="width:100%; max-height:260px; object-fit:cover; border-radius:var(--radius-md); margin-bottom:1.5rem;" />
	{/if}

	{#if data.location.description}
		<div class="card" style="margin-bottom:1.5rem;">
			<p style="font-size:0.9375rem; color:var(--text-secondary); margin:0;">{data.location.description}</p>
		</div>
	{/if}

	{#if editingWiki && (data as any).canEditWiki}
		<div class="card">
			<h3 class="section-title">Edit wiki</h3>
			<form method="post" action="?/saveWiki" use:enhance={() => {
				return async ({ update }) => { editingWiki = false; await update(); await invalidateAll(); };
			}}>
				<div class="fields">
					<div class="field">
						<label class="label" for="wtitle">Title</label>
						<input id="wtitle" name="title" type="text" class="input" value={data.wiki?.title ?? data.location.name} required />
					</div>
					<div class="field">
						<label class="label" for="wcontent">Content (Markdown)</label>
						<textarea id="wcontent" name="content" class="input" rows="12"
							style="font-family:monospace; font-size:0.875rem;">{data.wiki?.content ?? ''}</textarea>
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary btn-sm">Save</button>
				</div>
			</form>
		</div>
	{:else if data.wiki}
		<div class="card">
			<h3 class="section-title">{data.wiki.title}</h3>
			<div class="markdown-body">{@html renderMarkdown(data.wiki.content)}</div>
		</div>
	{/if}
</div>