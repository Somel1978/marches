<!-- apps/admin/src/routes/(app)/wiki/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const wiki             = $derived((data as any).wiki);
	const activePage       = $derived((data as any).activePage);
	const visibilityOptions = $derived((data as any).visibilityOptions ?? ['PUBLIC', 'DM_ONLY', 'ADMIN_ONLY']);

	let editContent  = $state('');
	let editTitle    = $state('');
	let showPreview  = $state(false);

	let enricherQuery   = $state('');
	let enricherResults = $state<any[]>([]);
	let enricherVisible = $state(false);
	let textareaEl      = $state<HTMLTextAreaElement | null>(null);
	let cursorPos       = $state(0);

	$effect.pre(() => {
		if (activePage) {
			editContent = activePage.content ?? '';
			editTitle   = activePage.title   ?? '';
		}
	});

	function onContentInput(e: Event) {
		const ta = e.currentTarget as HTMLTextAreaElement;
		editContent = ta.value;
		cursorPos   = ta.selectionStart ?? 0;
		const before = ta.value.slice(0, cursorPos);
		const triggerIdx = before.lastIndexOf('[[');
		if (triggerIdx >= 0 && !before.slice(triggerIdx).includes(']]')) {
			const q = before.slice(triggerIdx + 2);
			if (q.length >= 2) { enricherQuery = q; searchEnrichers(q); enricherVisible = true; return; }
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
		editContent = newVal; enricherVisible = false; enricherResults = [];
		setTimeout(() => {
			if (textareaEl) {
				textareaEl.focus();
				const newPos = triggerIdx + `[[${item.type}:${item.id}]]`.length;
				textareaEl.setSelectionRange(newPos, newPos);
			}
		}, 10);
	}

	const typeIcon: Record<string, string> = {
		quest: '⚔', item: '🎒', character: '👤', world: '🌍',
		region: '📍', location: '🏛', user: '👥',
	};

	const visibilityLabel: Record<string, string> = {
		PUBLIC: '🌐 Public', DM_ONLY: '🎲 DM Only', ADMIN_ONLY: '🔒 Admin Only',
	};
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/wiki" class="back-link">← Wiki</a>
			<h2 class="page__title">{wiki.icon ?? '📖'} {wiki.title}</h2>
		</div>
	</div>

	{#if (form as any)?.success}<div class="form-success" style="margin-bottom:0.75rem;">Saved.</div>{/if}

	<div class="sections">
		<!-- Left: structure + settings -->
		<div>
			<div class="card" style="margin-bottom:1rem;">
				<h3 class="section-title">Wiki settings</h3>
				<form method="post" action="?/updateWiki" use:enhance>
					<div class="fields">
						<div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
							<div class="field" style="flex:0 0 60px;">
								<label class="label" for="w-icon">Icon</label>
								<input id="w-icon" name="icon" type="text" class="input" value={wiki.icon ?? ''} placeholder="📖" style="text-align:center;font-size:1.25rem;" />
							</div>
							<div class="field" style="flex:1;">
								<label class="label" for="w-title">Title</label>
								<input id="w-title" name="title" type="text" class="input" value={wiki.title} required />
							</div>
						</div>
						<div class="field">
							<label class="label" for="w-desc">Description</label>
							<textarea id="w-desc" name="description" class="input" rows="2">{wiki.description ?? ''}</textarea>
						</div>
						<div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
							<div class="field" style="flex:1;">
								<label class="label" for="w-pub">Status</label>
								<select id="w-pub" name="isPublished" class="input input--select">
									<option value="false" selected={!wiki.isPublished}>Draft</option>
									<option value="true"  selected={wiki.isPublished}>Published</option>
								</select>
							</div>
							<div class="field" style="flex:1;">
								<label class="label" for="w-vis">Visibility</label>
								<select id="w-vis" name="visibility" class="input input--select">
									{#each visibilityOptions as v}
										<option value={v} selected={wiki.visibility === v}>{visibilityLabel[v] ?? v}</option>
									{/each}
								</select>
							</div>
						</div>
					</div>
					<div class="form-actions"><button type="submit" class="btn btn-primary btn-sm">Save settings</button></div>
				</form>
			</div>

			<div class="card">
				<h3 class="section-title">Structure</h3>
				{#each wiki.sections ?? [] as section}
					<div style="margin-bottom:0.75rem;padding:0.5rem;background:var(--bg-overlay);border-radius:var(--radius-md);">
						<form method="post" action="?/updateSection" use:enhance={() => {
							return async ({ update }) => { await update(); await invalidateAll(); };
						}} style="display:flex;align-items:center;gap:0.375rem;margin-bottom:0.25rem;flex-wrap:wrap;">
							<input type="hidden" name="id" value={section.id} />
							<input name="icon" type="text" class="input" value={section.icon ?? ''} style="width:36px;text-align:center;font-size:1rem;padding:0.125rem;flex-shrink:0;" placeholder="📂" />
							<input name="title" type="text" class="input" value={section.title} style="flex:1;font-size:0.875rem;font-weight:600;padding:0.25rem 0.5rem;" required />
							<select name="visibility" class="input input--select" style="font-size:0.75rem;flex:0 0 120px;">
								{#each visibilityOptions as v}
									<option value={v} selected={section.visibility === v}>{visibilityLabel[v] ?? v}</option>
								{/each}
							</select>
							<button type="submit" class="btn btn-ghost btn-sm" style="font-size:0.75rem;padding:0.25rem 0.5rem;">✓</button>
							<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);font-size:0.75rem;"
								onclick={() => {
									if (!confirm('Delete section and all pages?')) return;
									(document.getElementById(`del-sec-${section.id}`) as HTMLFormElement)?.requestSubmit();
								}}>✕</button>
						</form>
						<form id="del-sec-{section.id}" method="post" action="?/deleteSection"
							use:enhance={() => { return async ({ update }) => { await update(); await invalidateAll(); }; }}
							style="display:none;">
							<input type="hidden" name="id" value={section.id} />
						</form>
						{#each section.pages ?? [] as pg}
							<button type="button"
								style="display:block;width:100%;text-align:left;padding:0.25rem 0.5rem 0.25rem 1.5rem;font-size:0.8125rem;background:{activePage?.id === pg.id ? 'var(--bg-active)' : 'none'};border:none;border-radius:var(--radius-sm);cursor:pointer;color:{activePage?.id === pg.id ? 'var(--color-accent)' : 'var(--text-secondary)'};"
								onclick={() => goto(`/wiki/${wiki.id}?page=${pg.id}`)}>
								{pg.title}
							</button>
						{/each}
						<form method="post" action="?/createPage" use:enhance={() => {
							return async ({ update }) => { await update(); await invalidateAll(); };
						}} style="margin-top:0.25rem;">
							<input type="hidden" name="sectionId" value={section.id} />
							<button type="submit" class="btn btn-ghost btn-sm" style="font-size:0.75rem;padding:0.125rem 0.5rem 0.125rem 1.5rem;">+ Add page</button>
						</form>
					</div>
				{/each}
				<form method="post" action="?/createSection" use:enhance={() => {
					return async ({ update }) => { await update(); await invalidateAll(); };
				}}>
					<input type="hidden" name="title" value="New Section" />
					<button type="submit" class="btn btn-ghost btn-sm" style="width:100%;margin-top:0.5rem;">+ Add section</button>
				</form>
			</div>
		</div>

		<!-- Right: page editor -->
		<div>
			{#if activePage}
				<div class="card">
					<form method="post" action="?/savePage" use:enhance>
						<input type="hidden" name="id" value={activePage.id} />
						<div class="fields">
							<div class="field">
								<label class="label" for="pg-title">Page title</label>
								<input id="pg-title" name="title" type="text" class="input" bind:value={editTitle} required />
							</div>
							<div class="field">
								<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.375rem;flex-wrap:wrap;">
									<label class="label" for="pg-content" style="margin:0;">Content (Markdown)</label>
									<button type="button" class="btn btn-ghost btn-sm" onclick={() => showPreview = !showPreview}>
										{showPreview ? 'Edit' : 'Preview'}
									</button>
								</div>
								{#if showPreview}
									<div class="prose" style="min-height:400px;padding:1rem;background:var(--bg-overlay);border-radius:var(--radius-md);">
										{editContent || '<em style="color:var(--text-muted)">Nothing to preview</em>'}
									</div>
								{:else}
									<div style="position:relative;">
										<textarea id="pg-content" name="content" class="input" rows="22"
											style="font-family:monospace;font-size:0.875rem;"
											bind:this={textareaEl}
											bind:value={editContent}
											oninput={onContentInput}></textarea>
										{#if enricherVisible && enricherResults.length}
											<div style="position:absolute;left:0;bottom:100%;width:100%;max-height:280px;overflow-y:auto;background:var(--bg-surface);border:1px solid var(--border-muted);border-radius:var(--radius-md);box-shadow:var(--shadow-lg);z-index:50;">
												{#each enricherResults as item}
													<button type="button"
														style="display:flex;align-items:center;gap:0.625rem;width:100%;padding:0.5rem 0.75rem;background:none;border:none;cursor:pointer;text-align:left;font-size:0.875rem;flex-wrap:wrap;"
														onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--bg-overlay)'}
														onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'none'}
														onclick={() => insertEnricher(item)}>
														<span style="width:20px;text-align:center;">{typeIcon[item.type] ?? '🔗'}</span>
														<span style="flex:1;font-weight:500;">{item.label}</span>
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
						<div class="form-actions">
							<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);"
								onclick={() => { if (!confirm('Delete this page?')) return; (document.getElementById('del-pg-form') as HTMLFormElement)?.requestSubmit(); }}>
								Delete page
							</button>
							<button type="submit" class="btn btn-primary">Save page</button>
						</div>
					</form>
				</div>
			{:else}
				<div class="card" style="display:flex;align-items:center;justify-content:center;min-height:300px;color:var(--text-muted);text-align:center;">
					<div><p style="font-size:2rem;margin:0 0 0.5rem;">📄</p><p>Select a page from the structure tree to edit it.</p></div>
				</div>
			{/if}
		</div>
	</div>
</div>
{#if activePage}
	<form id="del-pg-form" method="post" action="?/deletePage" use:enhance={() => {
		return async ({ update }) => { goto(`/wiki/${wiki.id}`); await update(); };
	}} style="display:none;">
		<input type="hidden" name="id" value={activePage.id} />
	</form>
{/if}