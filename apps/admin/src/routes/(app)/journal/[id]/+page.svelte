<!-- apps/admin/src/routes/(app)/journal/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const journal    = $derived((data as any).journal);
	const allWorlds  = $derived((data as any).allWorlds ?? []);
	const allRoles   = $derived((data as any).allRoles  ?? []);
	const activePage = $derived((data as any).activePage);

	let editContent  = $state('');
	let editTitle    = $state('');
	let showPreview  = $state(false);

	// Enricher search popup
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

	// Watch for [[ trigger
	function onContentInput(e: Event) {
		const ta = e.currentTarget as HTMLTextAreaElement;
		editContent = ta.value;
		cursorPos   = ta.selectionStart ?? 0;

		// Find [[ before cursor
		const before = ta.value.slice(0, cursorPos);
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
		const val    = textareaEl.value;
		const before = val.slice(0, cursorPos);
		const after  = val.slice(cursorPos);
		const triggerIdx = before.lastIndexOf('[[');
		const newVal = before.slice(0, triggerIdx) + `[[${item.type}:${item.id}]]` + after;
		editContent     = newVal;
		enricherVisible = false;
		enricherResults = [];
		// Restore focus
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
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/journal" class="back-link">← Journals</a>
			<h2 class="page__title">{journal.icon ?? '📖'} {journal.title}</h2>
		</div>
	</div>

	{#if (form as any)?.success}<div class="form-success" style="margin-bottom:0.75rem;">Saved.</div>{/if}

	<div class="sections">
		<!-- Left: structure tree -->
		<div>
			<!-- Journal settings -->
			<div class="card" style="margin-bottom:1rem;">
				<h3 class="section-title">Journal settings</h3>
				<form method="post" action="?/updateJournal" use:enhance>
					<div class="fields">
						<div style="display:flex; gap:0.75rem;">
							<div class="field" style="flex:0 0 60px;">
								<label class="label" for="j-icon">Icon</label>
								<input id="j-icon" name="icon" type="text" class="input" value={journal.icon ?? ''} placeholder="📖" style="text-align:center; font-size:1.25rem;" />
							</div>
							<div class="field" style="flex:1;">
								<label class="label" for="j-title">Title</label>
								<input id="j-title" name="title" type="text" class="input" value={journal.title} required />
							</div>
						</div>
						<div class="field">
							<label class="label" for="j-desc">Description <span class="optional">(optional)</span></label>
							<textarea id="j-desc" name="description" class="input" rows="2">{journal.description ?? ''}</textarea>
						</div>
						<div class="field">
							<label class="label" for="j-pub">Published</label>
							<select id="j-pub" name="isPublished" class="input input--select">
								<option value="false" selected={!journal.isPublished}>Draft</option>
								<option value="true"  selected={journal.isPublished}>Published</option>
							</select>
						</div>
						<div class="field">
							<p class="label">World restrictions <span class="optional">(empty = all worlds)</span></p>
							<div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
								{#each allWorlds as w}
									<label style="display:flex; align-items:center; gap:0.375rem; cursor:pointer; font-size:0.8125rem;">
										<input type="checkbox" name="worldIds" value={w.id} checked={journal.worldIds?.includes(w.id)} />
										{w.name}
									</label>
								{/each}
							</div>
						</div>
						<div class="field">
							<p class="label">Role restrictions <span class="optional">(empty = all roles)</span></p>
							<div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
								{#each allRoles as r}
									<label style="display:flex; align-items:center; gap:0.375rem; cursor:pointer; font-size:0.8125rem;">
										<input type="checkbox" name="roleIds" value={r.id} checked={journal.roleIds?.includes(r.id)} />
										{r.name}
									</label>
								{/each}
							</div>
						</div>
					</div>
					<div class="form-actions"><button type="submit" class="btn btn-primary btn-sm">Save settings</button></div>
				</form>
			</div>

			<!-- Sections + pages tree -->
			<div class="card">
				<h3 class="section-title">Structure</h3>
				{#each journal.sections ?? [] as section}
					<div style="margin-bottom:0.75rem; padding:0.5rem; background:var(--bg-overlay); border-radius:var(--radius-md);">
						<!-- Section header with inline rename -->
						<form method="post" action="?/updateSection" use:enhance={() => {
							return async ({ update }) => { await update(); await invalidateAll(); };
						}} style="display:flex; align-items:center; gap:0.375rem; margin-bottom:0.375rem;">
							<input type="hidden" name="id" value={section.id} />
							<input name="icon" type="text" class="input" value={section.icon ?? ''}
								style="width:36px; text-align:center; font-size:1rem; padding:0.125rem; flex-shrink:0;" placeholder="📂" />
							<input name="title" type="text" class="input" value={section.title}
								style="flex:1; font-size:0.875rem; font-weight:600; padding:0.25rem 0.5rem;" required />
							<button type="submit" class="btn btn-ghost btn-sm" style="font-size:0.75rem; padding:0.25rem 0.5rem;">✓</button>
							<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger); font-size:0.75rem;"
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
						<!-- Pages -->
						{#each section.pages ?? [] as pg}
							<button type="button"
								style="display:block; width:100%; text-align:left; padding:0.25rem 0.5rem 0.25rem 1.5rem; font-size:0.8125rem; background:{activePage?.id === pg.id ? 'var(--bg-active)' : 'none'}; border:none; border-radius:var(--radius-sm); cursor:pointer; color:{activePage?.id === pg.id ? 'var(--color-accent)' : 'var(--text-secondary)'};"
								onclick={() => goto(`/journal/${journal.id}?page=${pg.id}`)}>
								{pg.title}
							</button>
						{/each}
						<!-- Add page -->
						<form method="post" action="?/createPage" use:enhance={() => {
							return async ({ update }) => { await update(); await invalidateAll(); };
						}} style="margin-top:0.25rem;">
							<input type="hidden" name="sectionId" value={section.id} />
							<button type="submit" class="btn btn-ghost btn-sm" style="font-size:0.75rem; padding:0.125rem 0.5rem 0.125rem 1.5rem;">+ Add page</button>
						</form>
					</div>
				{/each}
				<!-- Add section -->
				<form method="post" action="?/createSection" use:enhance={() => {
					return async ({ update }) => { await update(); await invalidateAll(); };
				}}>
					<input type="hidden" name="title" value="New Section" />
					<button type="submit" class="btn btn-ghost btn-sm" style="width:100%; margin-top:0.5rem;">+ Add section</button>
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
								<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.375rem;">
									<label class="label" for="pg-content" style="margin:0;">Content (Markdown)</label>
									<div style="display:flex; gap:0.5rem; align-items:center;">
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
										<button type="button" class="btn btn-ghost btn-sm" onclick={() => showPreview = !showPreview}>
											{showPreview ? 'Edit' : 'Preview'}
										</button>
									</div>
								</div>

								{#if showPreview}
									<div class="prose" style="min-height:400px; padding:1rem; background:var(--bg-overlay); border-radius:var(--radius-md);">
										{editContent || '<em style="color:var(--text-muted)">Nothing to preview</em>'}
									</div>
								{:else}
									<div style="position:relative;">
										<textarea id="pg-content" name="content" class="input" rows="22"
											style="font-family:monospace; font-size:0.875rem;"
											bind:this={textareaEl}
											bind:value={editContent}
											oninput={onContentInput}></textarea>

										<!-- Enricher popup -->
										{#if enricherVisible && enricherResults.length}
											<div style="position:absolute; left:0; bottom:100%; width:100%; max-height:280px; overflow-y:auto; background:var(--bg-surface); border:1px solid var(--border-muted); border-radius:var(--radius-md); box-shadow:var(--shadow-lg); z-index:50;">
												{#each enricherResults as item}
													<button type="button"
														style="display:flex; align-items:center; gap:0.625rem; width:100%; padding:0.5rem 0.75rem; background:none; border:none; cursor:pointer; text-align:left; font-size:0.875rem;"
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
				<div class="card" style="display:flex; align-items:center; justify-content:center; min-height:300px; color:var(--text-muted); text-align:center;">
					<div>
						<p style="font-size:2rem; margin:0 0 0.5rem;">📄</p>
						<p>Select a page from the structure tree to edit it.</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
{#if activePage}
	<form id="del-pg-form" method="post" action="?/deletePage" use:enhance={() => {
		return async ({ update }) => { goto(`/journal/${journal.id}`); await update(); };
	}} style="display:none;">
		<input type="hidden" name="id" value={activePage.id} />
	</form>
{/if}