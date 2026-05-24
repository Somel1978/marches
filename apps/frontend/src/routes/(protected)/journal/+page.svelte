<!-- apps/frontend/src/routes/(protected)/journal/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const journals  = $derived((data as any).journals ?? []);
	const activePage = $derived((data as any).activePage);

	// Track open/closed journals in sidebar
	let openJournals = $state<Set<string>>(new Set());

	function toggleJournal(id: string) {
		if (openJournals.has(id)) openJournals.delete(id);
		else openJournals.add(id);
		openJournals = new Set(openJournals);
	}

	function openPage(pageId: string) {
		goto(`/journal?page=${pageId}`);
	}

	// Render enrichers in content
	function renderContent(content: string): string {
		if (!content) return '';
		// Basic markdown to HTML (headings, bold, italic, paragraphs)
		let html = content
			.replace(/^### (.+)$/gm, '<h3>$1</h3>')
			.replace(/^## (.+)$/gm, '<h2>$1</h2>')
			.replace(/^# (.+)$/gm, '<h1>$1</h1>')
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>')
			.replace(/\n\n/g, '</p><p>')
			.replace(/^(.+)$/gm, (line) => line.startsWith('<') ? line : line);
		html = `<p>${html}</p>`;

		// Render enricher tokens [[type:id]] as badges
		// The actual resolved tokens come from server in activePage.tokens if available
		const tokens: any[] = (data as any).activePage?.tokens ?? [];
		for (const t of tokens) {
			const badge = `<a href="${t.href}" class="enricher-badge enricher-${t.type}" title="${t.type}: ${t.label}">
				<span class="enricher-icon">${typeIcon(t.type)}</span>
				<span>${t.label}</span>
				${t.badge ? `<span class="badge badge-muted">${t.badge}</span>` : ''}
			</a>`;
			html = html.replace(new RegExp(`\\[\\[${t.type}:${t.id}\\]\\]`, 'g'), badge);
		}
		// Remove any unresolved tokens
		html = html.replace(/\[\[\w+:[a-f0-9-]{36}\]\]/g, '<span class="badge badge-muted">?</span>');
		return html;
	}

	function typeIcon(type: string): string {
		const icons: Record<string, string> = {
			quest: '⚔', item: '🎒', character: '👤', world: '🌍',
			region: '📍', location: '🏛', user: '👥',
		};
		return icons[type] ?? '🔗';
	}
</script>

<div style="display:grid; grid-template-columns:260px 1fr; min-height:calc(100vh - 4rem); gap:0;">
	<!-- Left sidebar -->
	<aside style="border-right:1px solid var(--border-muted); padding:1.5rem 1rem; background:var(--bg-surface); overflow-y:auto;">
		<h2 style="font-size:0.875rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted); margin:0 0 1rem;">Journals</h2>

		{#if !journals.length}
			<p class="table__muted" style="font-size:0.8125rem;">No journals available.</p>
		{/if}

		{#each journals as journal}
			<div style="margin-bottom:0.25rem;">
				<!-- Journal header -->
				<button type="button"
					style="display:flex; align-items:center; gap:0.5rem; width:100%; padding:0.5rem 0.625rem; border-radius:var(--radius-md); background:none; border:none; cursor:pointer; text-align:left; color:var(--text-primary); font-weight:600; font-size:0.9rem;"
					onclick={() => toggleJournal(journal.id)}>
					<span style="font-size:1.125rem; width:20px; text-align:center;">{journal.icon ?? '📖'}</span>
					<span style="flex:1;">{journal.title}</span>
					<span style="font-size:0.75rem; color:var(--text-muted);">{openJournals.has(journal.id) ? '▾' : '▸'}</span>
				</button>

				<!-- Sections -->
				{#if openJournals.has(journal.id)}
					<div style="margin-left:1.25rem; margin-top:0.125rem;">
						{#each journal.sections as section}
							<div style="margin-bottom:0.125rem;">
								<p style="font-size:0.75rem; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-muted); margin:0.5rem 0 0.25rem; padding:0 0.375rem;">
									{section.icon ? section.icon + ' ' : ''}{section.title}
								</p>
								{#each section.pages as pg}
									{@const isActive = activePage?.id === pg.id}
									<button type="button"
										style="display:block; width:100%; padding:0.3rem 0.625rem; border-radius:var(--radius-sm); background:{isActive ? 'var(--bg-active)' : 'none'}; border:none; cursor:pointer; text-align:left; font-size:0.8125rem; color:{isActive ? 'var(--color-accent)' : 'var(--text-secondary)'}; font-weight:{isActive ? '600' : '400'};"
										onclick={() => openPage(pg.id)}>
										{pg.title}
									</button>
								{/each}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</aside>

	<!-- Right content area -->
	<main style="padding:2.5rem 3rem; overflow-y:auto; max-width:900px;">
		{#if activePage}
			<div style="margin-bottom:2rem;">
				<p style="font-size:0.8125rem; color:var(--text-muted); margin:0 0 0.375rem;">
					{activePage.section?.journal?.title ?? ''} › {activePage.section?.title ?? ''}
				</p>
				<h1 style="font-size:2.25rem; font-weight:800; margin:0; line-height:1.15; letter-spacing:-0.02em;">{activePage.title}</h1>
				<p style="font-size:0.8125rem; color:var(--text-muted); margin:0.5rem 0 0;">
					Last updated {new Date(activePage.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
				</p>
			</div>
			<div class="prose journal-content">{@html renderContent(activePage.content)}</div>
		{:else}
			<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:40vh; color:var(--text-muted); text-align:center;">
				<span style="font-size:3rem; margin-bottom:1rem;">📖</span>
				<h2 style="font-weight:600; margin:0 0 0.5rem;">Select a page</h2>
				<p style="margin:0; font-size:0.9rem;">Choose a journal and section from the sidebar.</p>
			</div>
		{/if}
	</main>
</div>
