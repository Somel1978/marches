<!-- apps/admin/src/routes/(app)/news/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { ConfirmModal } from '@core/ui';
	import { goto } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const a = $derived((data as any).announcement);

	let content     = $state('');
	let showPreview = $state(false);

	// Enricher search popup
	let enricherQuery   = $state('');
	let enricherResults = $state<any[]>([]);
	let enricherVisible = $state(false);
	let textareaEl      = $state<HTMLTextAreaElement | null>(null);
	let cursorPos       = $state(0);

	const typeIcon: Record<string, string> = {
		quest: '⚔️', item: '🎒', character: '🧙', world: '🌍',
		region: '🗺️', location: '📍', user: '👤',
	};

	$effect.pre(() => { content = a.content ?? ''; });

	function onContentInput(e: Event) {
		const ta = e.currentTarget as HTMLTextAreaElement;
		content   = ta.value;
		cursorPos = ta.selectionStart ?? 0;

		const before     = ta.value.slice(0, cursorPos);
		const triggerIdx = before.lastIndexOf('[[');
		if (triggerIdx >= 0 && !before.slice(triggerIdx).includes(']]')) {
			const q = before.slice(triggerIdx + 2);
			if (q.length >= 2) {
				enricherQuery = q;
				searchEnrichers(q);
				enricherVisible = true;
				return;
			}
		}
		enricherVisible = false;
	}

	async function searchEnrichers(q: string) {
		try {
			const res = await fetch(`/api/enrichers?q=${encodeURIComponent(q)}`);
			enricherResults = await res.json();
		} catch { enricherResults = []; }
	}

	function insertEnricher(item: any) {
		if (!textareaEl) return;
		const val        = textareaEl.value;
		const before     = val.slice(0, cursorPos);
		const after      = val.slice(cursorPos);
		const triggerIdx = before.lastIndexOf('[[');
		const newVal     = before.slice(0, triggerIdx) + `[[${item.type}:${item.id}]]` + after;
		content          = newVal;
		enricherVisible  = false;
		enricherResults  = [];
		setTimeout(() => {
			if (textareaEl) {
				textareaEl.focus();
				const newPos = triggerIdx + `[[${item.type}:${item.id}]]`.length;
				textareaEl.setSelectionRange(newPos, newPos);
			}
		}, 0);
	}

	// ── Confirm modal ────────────────────────────────────────────────────────
	let _confirmOpen  = $state(false);
	let _confirmMsg   = $state('');
	let _confirmTitle = $state('');
	let _confirmCb    = $state<() => void>(() => {});
	function askConfirm(title: string, msg: string, cb: () => void) {
		_confirmTitle = title; _confirmMsg = msg; _confirmCb = cb; _confirmOpen = true;
	}
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
						{#each ['quest','item','character','world','region','location','user'] as t}
							<code style="background:var(--bg-surface); padding:0.125rem 0.375rem; border-radius:var(--radius-sm);">[[{t}:id]]</code>
						{/each}
					</div>
					<p style="color:var(--text-muted); margin:0.375rem 0 0; font-size:0.75rem;">Enrichers render as clickable badges in the frontend, linking directly to the referenced entity.</p>
				</div>
				{#if showPreview}
					<div class="prose" style="min-height:300px; padding:0.75rem; background:var(--bg-overlay); border-radius:var(--radius-md);">
						{content || '<em style="color:var(--text-muted)">Nothing to preview</em>'}
					</div>
				{:else}
					<div style="position:relative;">
						<textarea name="content" class="input" rows="18"
							style="font-family:monospace; font-size:0.875rem;"
							bind:this={textareaEl}
							bind:value={content}
							oninput={onContentInput}></textarea>

						<!-- Enricher popup -->
						{#if enricherVisible && enricherResults.length}
							<div style="position:absolute; left:0; bottom:100%; width:100%; max-height:280px; overflow-y:auto; background:var(--bg-surface); border:1px solid var(--border-muted); border-radius:var(--radius-md); box-shadow:var(--shadow-lg); z-index:50;">
								{#each enricherResults as item}
									<button type="button"
										style="display:flex; align-items:center; gap:0.625rem; width:100%; padding:0.5rem 0.75rem; background:none; border:none; cursor:pointer; text-align:left; font-size:0.875rem; flex-wrap:wrap"
										onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--bg-overlay)'}
										onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'none'}
										onclick={() => insertEnricher(item)}>
										<span style="width:20px; text-align:center;">{typeIcon[item.type] ?? '🔗'}</span>
										<span style="flex:1; font-weight:500;">{item.label}</span>
										<span class="badge badge-muted" style="font-size:0.7rem;">{item.type}</span>
										{#if item.badge}<span class="badge badge-muted" style="font-size:0.7rem;">{item.badge}</span>{/if}
									</button>
								{/each}
							</div>
						{/if}
					</div>
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
		askConfirm('Confirm', 'Delete this announcement?', () => { cancel(); }); return;
		return async ({ result }) => { if (result.type === 'success') goto('/news'); };
	}} style="display:none;"></form>
</div>
<ConfirmModal
	open={_confirmOpen}
	title={_confirmTitle}
	message={_confirmMsg}
	confirmLabel="Confirm"
	confirmClass="btn-danger"
	onconfirm={() => { _confirmOpen = false; _confirmCb(); }}
	oncancel={() => { _confirmOpen = false; }}
/>