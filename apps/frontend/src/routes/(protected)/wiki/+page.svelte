<!-- apps/frontend/src/routes/(protected)/wiki/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { renderMarkdown } from '@core/ui';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const wikis      = $derived((data as any).wikis ?? []);
	const activePage = $derived((data as any).activePage);

	let openWikis     = $state<Set<string>>(new Set<string>());
	let mobileNavOpen = $state(false);

	$effect.pre(() => {
		const ap = (data as any).activePage;
		if (ap?.section?.wikiId) openWikis = new Set([ap.section.wikiId]);
	});

	function toggleWiki(id: string) {
		const s = new Set(openWikis);
		if (s.has(id)) s.delete(id); else s.add(id);
		openWikis = s;
	}

	function openPage(pageId: string) {
		goto(`/wiki?page=${pageId}`);
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
	<div class="journal-mobile-bar">
		<button class="btn btn-ghost btn-sm" onclick={() => mobileNavOpen = !mobileNavOpen}>
			{mobileNavOpen ? '✕ Close' : '📚 Wiki'}
		</button>
		{#if activePage}
			<span class="journal-mobile-title">{activePage.title}</span>
		{/if}
	</div>

	<div class="journal-layout">
		<aside class="journal-sidebar {mobileNavOpen ? 'journal-sidebar--open' : ''}">
			<p class="journal-sidebar__label">Wiki</p>

			{#if !wikis.length}
				<p class="table__muted" style="font-size:0.8125rem;">No wiki entries available.</p>
			{/if}

			{#each wikis as wiki}
				<div class="journal-nav-item">
					<button class="journal-nav-journal" onclick={() => toggleWiki(wiki.id)}>
						<span class="journal-nav-journal__icon">{wiki.icon ?? '📖'}</span>
						<span class="journal-nav-journal__title">{wiki.title}</span>
						<span class="journal-nav-journal__arrow">{openWikis.has(wiki.id) ? '▾' : '▸'}</span>
					</button>

					{#if openWikis.has(wiki.id)}
						<div class="journal-nav-sections">
							{#each wiki.sections as section}
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

		<main class="journal-content-area">
			{#if activePage}
				<div class="journal-content-header">
					<p class="journal-breadcrumb">
						{activePage.section?.wiki?.title ?? ''} › {activePage.section?.title ?? ''}
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
					<p class="journal-empty__sub">Choose a wiki entry and section from the list.</p>
				</div>
			{/if}
		</main>
	</div>
</div>