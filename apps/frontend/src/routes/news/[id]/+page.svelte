<!-- apps/frontend/src/routes/news/[id]/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const a = $derived((data as any).announcement);
	const typeColors: Record<string, string> = {
		NEWS: 'badge-muted', EVENT: 'badge-accent', WARNING: 'badge-warning', STATUS: 'badge-success',
	};
	function formatDateTime(d: Date | string) {
		return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

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

		const tokens: any[] = (data as any).announcement?.tokens ?? [];
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
	<a href="/news" class="back-link">← News</a>
	<div class="page__header" style="margin-top:0.5rem;">
		<div>
			<div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.5rem;">
				<span class="badge {typeColors[a.type] ?? 'badge-muted'}">{a.type}</span>
				{#each a.tags as tag}<span class="badge badge-muted">{tag}</span>{/each}
			</div>
			<h1 style="font-size:2rem; font-weight:800; margin:0 0 0.375rem; line-height:1.2;">{a.title}</h1>
			{#if a.type === 'EVENT' && a.scheduledAt}
				<p style="color:var(--color-accent); font-size:0.9375rem; margin:0;">📅 {formatDateTime(a.scheduledAt)}</p>
			{/if}
			{#if a.expiresAt}
				<p style="color:var(--text-muted); font-size:0.8125rem; margin:0.25rem 0 0;">Expires: {formatDateTime(a.expiresAt)}</p>
			{/if}
		</div>
	</div>
	<div class="card" style="margin-top:1rem;">
		<div class="prose">{@html renderContent(a.content)}</div>
	</div>
</div>