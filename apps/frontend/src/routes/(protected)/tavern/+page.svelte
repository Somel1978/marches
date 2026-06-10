<!-- apps/frontend/src/routes/(protected)/tavern/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { renderMarkdown } from '@core/ui';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const channels     = $derived((data as any).channels ?? []);
	const messages     = $derived((data as any).messages ?? []);
	const activeChannel = $derived((data as any).activeChannel);
	const activeChars  = $derived((data as any).activeChars ?? []);
	const isAdmin      = $derived((data as any).isAdmin ?? false);
	const user         = $derived((data as any).user);

	// Author picker state — persisted per channel in localStorage
	let authorType  = $state<'CHARACTER' | 'DM' | 'ADMIN'>('CHARACTER');
	let characterId = $state('');
	let messageText = $state('');
	let sending          = $state(false);
	let messagesEl       = $state<HTMLDivElement | null>(null);
	let textareaEl       = $state<HTMLTextAreaElement | null>(null);
	let enricherVisible  = $state(false);
	let enricherResults  = $state<any[]>([]);
	let enricherQuery    = $state('');
	let cursorPos        = $state(0);

	function onMessageInput(e: Event) {
		const ta = e.currentTarget as HTMLTextAreaElement;
		messageText = ta.value;
		cursorPos   = ta.selectionStart ?? 0;
		const before     = ta.value.slice(0, cursorPos);
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
		messageText = newVal; enricherVisible = false; enricherResults = [];
		setTimeout(() => {
			if (textareaEl) {
				textareaEl.focus();
				const newPos = triggerIdx + `[[${item.type}:${item.id}]]`.length;
				textareaEl.setSelectionRange(newPos, newPos);
			}
		}, 10);
	}

	// Load saved author preference on channel change
	$effect(() => {
		if (!browser || !activeChannel) return;
		const saved = localStorage.getItem(`tavern_author_${activeChannel.id}`);
		if (saved) {
			try {
				const p = JSON.parse(saved);
				authorType  = p.authorType  ?? 'CHARACTER';
				characterId = p.characterId ?? '';
			} catch {}
		} else if (activeChars.length) {
			authorType  = 'CHARACTER';
			characterId = activeChars[0]?.id ?? '';
		}
	});

	// Save author preference on change
	$effect(() => {
		if (!browser || !activeChannel) return;
		localStorage.setItem(`tavern_author_${activeChannel.id}`, JSON.stringify({ authorType, characterId }));
	});

	// Scroll to bottom on new messages
	$effect(() => {
		if (messages.length && messagesEl) {
			messagesEl.scrollTop = messagesEl.scrollHeight;
		}
	});

	// Poll every 5s when tab visible
	$effect(() => {
		if (!browser) return;
		let interval: ReturnType<typeof setInterval>;
		const start = () => { interval = setInterval(() => { if (!document.hidden) invalidateAll(); }, 5000); };
		const stop  = () => clearInterval(interval);
		start();
		document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
		return () => stop();
	});

	function switchChannel(id: string) {
		goto(`/tavern?channel=${id}`);
	}

	const globalChannel = $derived(channels.find((c: any) => !c.worldId));
	const worldChannels  = $derived(channels.filter((c: any) => !!c.worldId));

	const authorName = $derived(() => {
		if (authorType === 'CHARACTER') {
			return (activeChars as any[]).find((c: any) => c.id === characterId)?.name ?? user?.name ?? '';
		}
		if (authorType === 'DM') return `${user?.name ?? ''} [DM]`;
		return `${user?.name ?? ''} [Admin]`;
	});

	const characterName = $derived(
		authorType === 'CHARACTER'
			? (activeChars as any[]).find((c: any) => c.id === characterId)?.name ?? ''
			: ''
	);

	const typeIcon: Record<string, string> = {
		quest: '⚔', item: '🎒', character: '👤', world: '🌍',
		region: '📍', location: '🏛', user: '👥',
	};

	// Regex to detect bare image URLs
	const IMAGE_URL_RE = /https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|svg)(\?\S*)?/gi;

	function renderContent(msg: any): string {
		let content = msg.content ?? '';

		// Replace bare image URLs before markdown rendering to avoid them being wrapped in <a> tags
		content = content.replace(IMAGE_URL_RE, (url: string) =>
			`\n![](${url})\n`
		);

		let html = renderMarkdown(content);

		// Substitute enricher tokens
		const tokens: any[] = msg.tokens ?? [];
		for (const t of tokens) {
			const badge = t.href
				? `<a href="${t.href}" class="enricher-badge enricher-${t.type}" title="${t.type}: ${t.label}">${typeIcon[t.type] ?? '🔗'} ${t.label}${t.badge ? ` <span class="badge badge-muted">${t.badge}</span>` : ''}</a>`
				: `<span class="enricher-badge enricher-${t.type}">${typeIcon[t.type] ?? '🔗'} ${t.label}</span>`;
			html = html.replace(new RegExp(`\\[\\[${t.type}:${t.id}\\]\\]`, 'g'), badge);
		}
		html = html.replace(/\[\[\w+:[a-f0-9-]{36}\]\]/g, '<span class="badge badge-muted">?</span>');

		// Constrain images and wrap in link for full-size view
		html = html.replace(/<img src="([^"]+)"[^>]*>/g, (_, src) =>
			`<a href="${src}" target="_blank" rel="noopener noreferrer"><img src="${src}" alt="" style="max-width:150px;max-height:150px;border-radius:var(--radius-md);margin-top:0.375rem;display:inline-block;object-fit:cover;cursor:zoom-in;" loading="lazy" /></a>`
		);

		return html;
	}

	function formatTime(date: string) {
		return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	}

	const authorBadgeStyle: Record<string, string> = {
		CHARACTER: 'background:var(--color-accent);color:#000;',
		DM:        'background:#7c3aed;color:#fff;',
		ADMIN:     'background:var(--color-danger);color:#fff;',
	};
</script>

<div class="tavern-layout">
	<!-- Channel sidebar -->
	<aside class="tavern-sidebar">
		<p class="tavern-sidebar__label">🍺 Tavern</p>

		{#if globalChannel}
			<button
				class="tavern-channel-btn {activeChannel?.id === globalChannel.id ? 'tavern-channel-btn--active' : ''}"
				onclick={() => switchChannel(globalChannel.id)}>
				🌍 Global
			</button>
		{/if}

		{#if worldChannels.length}
			<p class="tavern-sidebar__group">Worlds</p>
			{#each worldChannels as ch}
				<button
					class="tavern-channel-btn {activeChannel?.id === ch.id ? 'tavern-channel-btn--active' : ''}"
					onclick={() => switchChannel(ch.id)}>
					{#if ch.isPrivate}🔒{:else}🌐{/if}
					{ch.name}
				</button>
			{/each}
		{/if}
	</aside>

	<!-- Main chat area -->
	<div class="tavern-main">
		<!-- Channel header -->
		<div class="tavern-header">
			<span class="tavern-header__title">
				{activeChannel?.worldId ? '🌐' : '🌍'} {activeChannel?.name ?? 'Select a channel'}
			</span>
			{#if activeChannel?.isPrivate}
				<span class="badge badge-muted" style="font-size:0.6875rem;">🔒 World members only</span>
			{/if}
		</div>

		<!-- Message feed -->
		<div class="tavern-messages" bind:this={messagesEl}>
			{#if !messages.length}
				<div class="tavern-empty">
					<p>No messages yet. Be the first to speak!</p>
				</div>
			{/if}
			{#each messages as msg}
				<div class="tavern-msg">
					<div class="tavern-msg__avatar">
						{#if msg.authorAvatar}
							<img src={msg.authorAvatar} alt={msg.authorName} />
						{:else}
							<div class="tavern-msg__avatar-placeholder">🧙</div>
						{/if}
					</div>
					<div class="tavern-msg__body">
						<div class="tavern-msg__meta">
							<span class="tavern-msg__name">
								{#if msg.characterName}
									{msg.characterName}
									<span class="tavern-msg__player">({msg.authorName})</span>
								{:else}
									{msg.authorName}
								{/if}
							</span>
							<span class="badge" style="font-size:0.6rem;padding:0.1rem 0.375rem;{authorBadgeStyle[msg.authorType] ?? ''}">
								{msg.authorType}
							</span>
							<span class="tavern-msg__time">{formatTime(msg.createdAt)}</span>
							{#if isAdmin}
								<form method="post" action="?/delete" use:enhance={() => {
									return async ({ update }) => { await update(); await invalidateAll(); };
								}} style="display:inline;">
									<input type="hidden" name="id" value={msg.id} />
									<button type="submit" class="tavern-msg__delete" title="Delete message">✕</button>
								</form>
							{/if}
						</div>
						<div class="tavern-msg__content">{@html renderContent(msg)}</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Composer -->
		{#if activeChannel}
			<form method="post" action="?/send"
				use:enhance={() => {
					sending = true;
					return async ({ update }) => {
						messageText = '';
						sending = false;
						await update();
						await invalidateAll();
					};
				}}
				class="tavern-composer">

				<input type="hidden" name="channelId"     value={activeChannel.id} />
				<input type="hidden" name="authorType"    value={authorType} />
				<input type="hidden" name="characterId"   value={authorType === 'CHARACTER' ? characterId : ''} />
				<input type="hidden" name="characterName" value={characterName} />

				<!-- Author picker -->
				<div class="tavern-composer__author">
					<select class="input input--select" style="font-size:0.75rem;padding:0.25rem 0.5rem;"
						bind:value={authorType}
						onchange={() => { if (authorType === 'CHARACTER' && activeChars.length) characterId = activeChars[0].id; }}>
						{#if activeChars.length}
							<option value="CHARACTER">As character…</option>
						{/if}
						{#if (data as any).isDM}
							<option value="DM">As DM</option>
						{/if}
						{#if isAdmin}
							<option value="ADMIN">As Admin</option>
						{/if}
					</select>
					{#if authorType === 'CHARACTER' && activeChars.length}
						<select class="input input--select" style="font-size:0.75rem;padding:0.25rem 0.5rem;"
							bind:value={characterId}>
							{#each activeChars as char}
								<option value={char.id}>{char.name}</option>
							{/each}
						</select>
					{/if}
				</div>

				<!-- Message input -->
				<div class="tavern-composer__input-row">
					<div style="position:relative;flex:1;">
						<textarea
							name="content"
							class="input tavern-composer__textarea"
							placeholder="Say something… (type [[ to insert an enricher)"
							rows="2"
							bind:this={textareaEl}
							bind:value={messageText}
							oninput={onMessageInput}
							onkeydown={(e) => {
								if (e.key === 'Escape') { enricherVisible = false; }
								if (e.key === 'Enter' && !e.shiftKey && !enricherVisible) {
									e.preventDefault();
									if (messageText.trim()) (e.currentTarget.closest('form') as HTMLFormElement)?.requestSubmit();
								}
							}}></textarea>
						{#if enricherVisible && enricherResults.length}
							<div style="position:absolute;left:0;bottom:100%;width:100%;max-height:240px;overflow-y:auto;background:var(--bg-surface);border:1px solid var(--border-muted);border-radius:var(--radius-md);box-shadow:var(--shadow-lg);z-index:50;margin-bottom:0.25rem;">
								{#each enricherResults as item}
									<button type="button"
										style="display:flex;align-items:center;gap:0.5rem;width:100%;padding:0.5rem 0.75rem;background:none;border:none;cursor:pointer;text-align:left;font-size:0.875rem;"
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
					<button type="submit" class="btn btn-primary" disabled={sending || !messageText.trim()}>
						{sending ? '…' : 'Send'}
					</button>
				</div>

				{#if (form as any)?.message}
					<p style="font-size:0.8125rem;color:var(--color-danger);margin:0.25rem 0 0;">{(form as any).message}</p>
				{/if}
			</form>
		{/if}
	</div>
</div>