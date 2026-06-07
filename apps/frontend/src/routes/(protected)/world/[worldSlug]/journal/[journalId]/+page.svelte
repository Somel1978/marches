<!-- apps/frontend/src/routes/(protected)/world/[worldSlug]/journal/[journalId]/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const world      = $derived((data as any).world);
	const journal    = $derived((data as any).journal);
	const activePage = $derived((data as any).activePage);
	const tokens     = $derived((data as any).tokens ?? []);

	const typeIcon: Record<string, string> = {
		quest: '⚔', item: '🎒', character: '👤', world: '🌍',
		region: '📍', location: '🏛', user: '👥',
	};

	function renderContent(content: string): string {
		if (!content) return '';
		let html = content
			.replace(/^### (.+)$/gm, '<h3>$1</h3>')
			.replace(/^## (.+)$/gm, '<h2>$1</h2>')
			.replace(/^# (.+)$/gm, '<h1>$1</h1>')
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>')
			.replace(/\n\n/g, '</p><p>');
		html = `<p>${html}</p>`;

		for (const t of tokens) {
			const inner = t.href
				? `<a href="${t.href}" class="enricher-badge enricher-${t.type}" title="${t.type}: ${t.label}">${typeIcon[t.type] ?? '🔗'} ${t.label}${t.badge ? ` <span class="badge badge-muted">${t.badge}</span>` : ''}</a>`
				: `<span class="enricher-badge enricher-${t.type}">${typeIcon[t.type] ?? '🔗'} ${t.label}</span>`;
			html = html.replace(new RegExp(`\\[\\[${t.type}:${t.id}\\]\\]`, 'g'), inner);
		}
		html = html.replace(/\[\[\w+:[a-f0-9-]{36}\]\]/g, '<span class="badge badge-muted">?</span>');
		return html;
	}
</script>

<div class="page">
	<a href="/world/{world.slug}/journal" class="back-link">← Journals</a>

	<div class="sections" style="margin-top:1rem;">
		<!-- Sidebar: section/page navigation -->
		<div style="min-width:200px; max-width:260px;">
			<div class="card" style="position:sticky; top:1rem;">
				<div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
					{#if journal.icon}<span style="font-size:1.25rem;">{journal.icon}</span>{/if}
					<span style="font-weight:700; font-size:1rem;">{journal.title}</span>
				</div>
				{#each journal.sections ?? [] as section}
					<div style="margin-bottom:0.75rem;">
						<div style="display:flex; align-items:center; gap:0.375rem; font-size:0.8125rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.25rem; padding:0 0.25rem;">
							{#if section.icon}<span>{section.icon}</span>{/if}
							<span>{section.title}</span>
						</div>
						{#each section.pages ?? [] as pg}
							<button type="button"
								style="display:block; width:100%; text-align:left; padding:0.25rem 0.5rem 0.25rem 1rem; font-size:0.8125rem; background:{activePage?.id === pg.id ? 'var(--bg-active)' : 'none'}; border:none; border-radius:var(--radius-sm); cursor:pointer; color:{activePage?.id === pg.id ? 'var(--color-accent)' : 'var(--text-secondary)'}; transition:background 0.1s;"
								onmouseenter={(e) => { if (activePage?.id !== pg.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg-overlay)'; }}
								onmouseleave={(e) => { if (activePage?.id !== pg.id) (e.currentTarget as HTMLElement).style.background = 'none'; }}
								onclick={() => goto(`/world/${world.slug}/journal/${journal.id}?page=${pg.id}`)}>
								{pg.title}
							</button>
						{/each}
					</div>
				{/each}
			</div>
		</div>

		<!-- Main: page content -->
		<div style="flex:1; min-width:0;">
			{#if activePage}
				<div class="card">
					<h2 style="font-size:1.375rem; font-weight:700; margin:0 0 1rem;">{activePage.title}</h2>
					<div class="prose markdown-body">
						{@html renderContent(activePage.content ?? '')}
					</div>
				</div>
			{:else}
				<div class="card" style="display:flex; align-items:center; justify-content:center; min-height:300px; color:var(--text-muted); text-align:center;">
					<div>
						<p style="font-size:2rem; margin:0 0 0.5rem;">📄</p>
						<p>This journal has no pages yet.</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
