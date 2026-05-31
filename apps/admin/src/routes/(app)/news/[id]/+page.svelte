<!-- apps/admin/src/routes/(app)/news/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const a = $derived((data as any).announcement);

	let content     = $state('');
	let showPreview = $state(false);

	$effect.pre(() => { content = a.content ?? ''; });
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/news" class="back-link">← Announcements</a>
			<h2 class="page__title">{a.title}</h2>
		</div>
	</div>

	{#if (form as any)?.success}<div class="form-success">Saved.</div>{/if}
	{#if (form as any)?.message}<div class="form-error">{(form as any).message}</div>{/if}

	<form method="post" action="?/update" use:enhance>
		<div class="sections">
			<div class="card">
				<h3 class="section-title">Details</h3>
				<div class="fields">
					<div class="field">
						<label class="label" for="title">Title</label>
						<input id="title" name="title" type="text" class="input" value={a.title} required />
					</div>
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:1 1 140px;">
							<label class="label" for="type">Type</label>
							<select id="type" name="type" class="input input--select">
								{#each ['NEWS','EVENT','WARNING','STATUS'] as t}
									<option value={t} selected={a.type === t}>{t}</option>
								{/each}
							</select>
						</div>
						<div class="field" style="flex:2 1 200px;">
							<label class="label" for="tags">Tags <span class="optional">(comma separated)</span></label>
							<input id="tags" name="tags" type="text" class="input" value={a.tags?.join(', ') ?? ''} placeholder="update, maintenance" />
						</div>
					</div>
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:1 1 200px;">
							<label class="label" for="scheduledAt">Event date/time <span class="optional">(optional)</span></label>
							<input id="scheduledAt" name="scheduledAt" type="datetime-local" class="input"
								value={a.scheduledAt ? new Date(a.scheduledAt).toISOString().slice(0,16) : ''} />
						</div>
						<div class="field" style="flex:1 1 200px;">
							<label class="label" for="expiresAt">Expires <span class="optional">(optional)</span></label>
							<input id="expiresAt" name="expiresAt" type="datetime-local" class="input"
								value={a.expiresAt ? new Date(a.expiresAt).toISOString().slice(0,16) : ''} />
						</div>
					</div>
					<div class="field">
						<label class="label" for="isPublished">Published</label>
						<select id="isPublished" name="isPublished" class="input input--select">
							<option value="false" selected={!a.isPublished}>Draft</option>
							<option value="true"  selected={a.isPublished}>Published</option>
						</select>
					</div>
				</div>
			</div>

			<div class="card">
				<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem; flex-wrap:wrap">
					<h3 class="section-title" style="margin:0;">Content</h3>
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => showPreview = !showPreview}>
						{showPreview ? 'Edit' : 'Preview'}
					</button>
				</div>
				<div style="background:var(--bg-overlay); border-radius:var(--radius-md); padding:0.75rem; margin-bottom:0.75rem; font-size:0.8125rem; border:1px solid var(--border-muted);">
					<p style="font-weight:600; margin:0 0 0.375rem;">📝 Markdown + Enrichers</p>
					<p style="color:var(--text-secondary); margin:0 0 0.5rem;">Standard Markdown is supported (# headings, **bold**, *italic*, etc). Use enrichers to embed live links to platform entities.</p>
					<p style="font-weight:600; margin:0 0 0.25rem; color:var(--text-secondary);">Enricher syntax — type <code>[[</code> to trigger the search popup:</p>
					<div style="display:flex; flex-wrap:wrap; gap:0.375rem;">
						<code style="background:var(--bg-surface); padding:0.125rem 0.375rem; border-radius:var(--radius-sm);">[[quest:id]]</code>
						<code style="background:var(--bg-surface); padding:0.125rem 0.375rem; border-radius:var(--radius-sm);">[[item:id]]</code>
						<code style="background:var(--bg-surface); padding:0.125rem 0.375rem; border-radius:var(--radius-sm);">[[character:id]]</code>
						<code style="background:var(--bg-surface); padding:0.125rem 0.375rem; border-radius:var(--radius-sm);">[[world:id]]</code>
						<code style="background:var(--bg-surface); padding:0.125rem 0.375rem; border-radius:var(--radius-sm);">[[region:id]]</code>
						<code style="background:var(--bg-surface); padding:0.125rem 0.375rem; border-radius:var(--radius-sm);">[[location:id]]</code>
						<code style="background:var(--bg-surface); padding:0.125rem 0.375rem; border-radius:var(--radius-sm);">[[user:id]]</code>
					</div>
					<p style="color:var(--text-muted); margin:0.375rem 0 0; font-size:0.75rem;">Enrichers render as clickable badges in the frontend, linking directly to the referenced entity.</p>
				</div>
				{#if showPreview}
					<div class="prose" style="min-height:300px; padding:0.75rem; background:var(--bg-overlay); border-radius:var(--radius-md);">
						{content || '<em style="color:var(--text-muted)">Nothing to preview</em>'}
					</div>
				{:else}
					<textarea name="content" class="input" rows="18" style="font-family:monospace; font-size:0.875rem;"
						bind:value={content}></textarea>
				{/if}
			</div>
		</div>

		<div class="form-actions" style="margin-top:1rem;">
			<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);"
				onclick={() => (document.getElementById('del-ann-form') as HTMLFormElement)?.requestSubmit()}>Delete</button>
			<button type="submit" class="btn btn-primary">Save</button>
		</div>
	</form>
<form id="del-ann-form" method="post" action="?/delete" use:enhance={({ cancel }) => {
	if (!confirm('Delete this announcement?')) { cancel(); return; }
	return async ({ result }) => { if (result.type === 'success') goto('/news'); };
}} style="display:none;"></form>
</div>