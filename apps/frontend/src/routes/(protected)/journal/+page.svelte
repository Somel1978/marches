<!-- apps/frontend/src/routes/(protected)/journal/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { renderMarkdown } from '@core/ui';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const journals   = $derived((data as any).journals ?? []);
	const activePage = $derived((data as any).activePage);

	let openJournals = $state<Set<string>>(new Set<string>());

	$effect.pre(() => {
		const ap = (data as any).activePage;
		if (ap?.section?.journalId) openJournals = new Set([ap.section.journalId]);
	});
	let mobileNavOpen = $state(false);

	function toggleJournal(id: string) {
		const s = new Set(openJournals);
		if (s.has(id)) s.delete(id); else s.add(id);
		openJournals = s;
	}

	function openPage(pageId: string) {
		goto(`/journal?page=${pageId}`);
		mobileNavOpen = false;
	}

	function renderContent(content: string): string {
		if (!content) return '';
		const tokens: any[] = (data as any).activePage?.tokens ?? [];
		let html = renderMarkdown(content);
		for (const t of tokens) {
			const icons: Record<string,string> = { quest:'⚔', item:'🎒', character:'👤', world:'🌍', region:'📍', location:'🏛', user:'👥' };
			const badge = `<a href="${t.href}" class="enricher-badge enricher-${t.type}" title="${t.type}: ${t.label}">
				<span>${icons[t.type] ?? '🔗'}</span>
				<span>${t.label}</span>
				${t.badge ? `<span class="badge badge-muted">${t.badge}</span>` : ''}
			</a>`;
			html = html.replace(new RegExp(`\\[\\[${t.type}:${t.id}\\]\\]`, 'g'), badge);
		}
		html = html.replace(/\[\[\w+:[a-f0-9-]{36}\]\]/g, '<span class="badge badge-muted">?</span>');
		return html;
	}
</script>

<div class="journal-page">

	<!-- Mobile nav toggle -->
	<div class="journal-mobile-bar">
		<button class="btn btn-ghost btn-sm" onclick={() => mobileNavOpen = !mobileNavOpen}>
			{mobileNavOpen ? '✕ Close' : '📚 Journals'}
		</button>
		{#if activePage}
			<span class="journal-mobile-title">{activePage.title}</span>
		{/if}
	</div>

	<div class="journal-layout">
		<!-- Sidebar -->
		<aside class="journal-sidebar {mobileNavOpen ? 'journal-sidebar--open' : ''}">
			<p class="journal-sidebar__label">Journals</p>

			{#if !journals.length}
				<p class="table__muted" style="font-size:0.8125rem;">No journals available.</p>
			{/if}

			{#each journals as journal}
				<div class="journal-nav-item">
					<button class="journal-nav-journal" onclick={() => toggleJournal(journal.id)}>
						<span class="journal-nav-journal__icon">{journal.icon ?? '📖'}</span>
						<span class="journal-nav-journal__title">{journal.title}</span>
						<span class="journal-nav-journal__arrow">{openJournals.has(journal.id) ? '▾' : '▸'}</span>
					</button>

					{#if openJournals.has(journal.id)}
						<div class="journal-nav-sections">
							{#each journal.sections as section}
								<p class="journal-nav-section-title">
									{section.icon ? section.icon + ' ' : ''}{section.title}
								</p>
								{#each section.pages as pg}
									{@const isActive = activePage?.id === pg.id}
									<button
										class="journal-nav-page {isActive ? 'journal-nav-page--active' : ''}"
										onclick={() => openPage(pg.id)}>
										{pg.title}
									</button>
								{/each}
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</aside>

		<!-- Content -->
		<main class="journal-content-area">
			{#if activePage}
				<div class="journal-content-header">
					<p class="journal-breadcrumb">
						{activePage.section?.journal?.title ?? ''} › {activePage.section?.title ?? ''}
					</p>
					<h1 class="journal-content-title">{activePage.title}</h1>
					<p class="journal-content-date">
						Last updated {new Date(activePage.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
					</p>
				</div>
				<div class="markdown-body">{@html renderContent(activePage.content)}</div>
			{:else}
				<div class="journal-empty">
					<span class="journal-empty__icon">📖</span>
					<h2 class="journal-empty__title">Select a page</h2>
					<p class="journal-empty__sub">Choose a journal and section from the list.</p>
				</div>
			{/if}
		</main>
	</div>
</div>