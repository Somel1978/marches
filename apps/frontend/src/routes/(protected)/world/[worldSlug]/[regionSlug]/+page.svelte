<!-- apps/frontend/src/routes/(protected)/world/[worldSlug]/[regionSlug]/+page.svelte -->
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
			<a href="/world" class="back-link">← {data.world.name}</a>
			<h2 class="page__title">{data.region.name}</h2>
			<div class="page__title-row">
				{#if (data as any).showDanger}
					<span class="badge {dangerColors[data.region.dangerRating] ?? 'badge-muted'}">{data.region.dangerRating}</span>
				{/if}
				{#if (data as any).showLevel && data.region.minLevel && data.region.maxLevel}
					<span class="badge badge-muted">Lv {data.region.minLevel}–{data.region.maxLevel}</span>
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

	{#if data.region.imageUrl}
		<img src={data.region.imageUrl} alt={data.region.name} style="width:100%; max-height:300px; object-fit:cover; border-radius:var(--radius-md); margin-bottom:1.5rem;" />
	{/if}

	{#if data.region.description}
		<div class="card" style="margin-bottom:1.5rem;">
			<p style="font-size:0.9375rem; color:var(--text-secondary); margin:0;">{data.region.description}</p>
		</div>
	{/if}

	{#if editingWiki && (data as any).canEditWiki}
		<div class="card" style="margin-bottom:1.5rem;">
			<h3 class="section-title">Edit wiki</h3>
			<form method="post" action="?/saveWiki" use:enhance={() => {
				return async ({ update }) => { editingWiki = false; await update(); await invalidateAll(); };
			}}>
				<div class="fields">
					<div class="field">
						<label class="label" for="wtitle">Title</label>
						<input id="wtitle" name="title" type="text" class="input" value={data.wiki?.title ?? data.region.name} required />
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
		<div class="card" style="margin-bottom:1.5rem;">
			<h3 class="section-title">{data.wiki.title}</h3>
			<div class="markdown-body">{@html renderMarkdown(data.wiki.content)}</div>
		</div>
	{/if}

	{#if data.region.locations.filter((l: any) => l.isActive).length}
		<h3 style="font-size:1rem; font-weight:700; margin:0 0 1rem;">Locations</h3>
		<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px,1fr)); gap:1rem;">
			{#each data.region.locations.filter((l: any) => l.isActive) as loc}
				<a href="/world/{data.world.slug}/{data.region.slug}/{loc.slug}" style="text-decoration:none; color:inherit;">
					<div class="card">
						{#if loc.imageUrl}
							<img src={loc.imageUrl} alt={loc.name} style="width:100%; height:100px; object-fit:cover; border-radius:var(--radius-sm); margin-bottom:0.75rem;" />
						{/if}
						<p style="font-weight:700; font-size:0.9375rem; margin:0 0 0.375rem;">{loc.name}</p>
						<div style="display:flex; gap:0.375rem; flex-wrap:wrap;">
							<span class="badge badge-muted">{loc.type}</span>
							{#if (data as any).showDanger}
								<span class="badge {dangerColors[loc.dangerRating] ?? 'badge-muted'}">{loc.dangerRating}</span>
							{/if}
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>