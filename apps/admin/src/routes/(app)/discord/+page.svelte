<!-- apps/admin/src/routes/(app)/discord/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { ConfirmModal } from '@core/ui';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const servers  = $derived((data as any).servers   ?? []);
	const worlds   = $derived((data as any).allWorlds ?? []);
	const settings = $derived((data as any).settings  ?? {});

	const CHANNEL_TYPES = ['ANNOUNCEMENTS', 'QUESTS', 'MARKET', 'CHARACTERS', 'APPROVALS', 'TAVERN'];

	let botGuilds       = $state<{ id: string; name: string }[]>([]);
	let guildsLoading   = $state(false);
	let guildsError     = $state('');
	let guildChannels   = $state<Record<string, { id: string; name: string }[]>>({});
	let channelsLoading = $state<Record<string, boolean>>({});

	// Track selected channel per serverId:type key
	let selectedChannelId   = $state<Record<string, string>>({});
	let selectedChannelName = $state<Record<string, string>>({});

	function onChannelSelect(serverId: string, type: string, channelId: string, channels: { id: string; name: string }[]) {
		const key = `${serverId}:${type}`;
		const ch  = channels.find(c => c.id === channelId);
		selectedChannelId   = { ...selectedChannelId,   [key]: channelId };
		selectedChannelName = { ...selectedChannelName, [key]: ch?.name ?? '' };
	}

	const configuredGuildIds = $derived(new Set(servers.map((s: any) => s.guildId)));

	const botInviteUrl = $derived(() => {
		const clientId = settings['discord.clientId'];
		if (!clientId) return null;
		return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=2147485696&scope=bot+applications.commands`;
	});

	async function fetchBotGuilds() {
		guildsLoading = true;
		guildsError   = '';
		try {
			const res = await fetch('/api/discord');
			const d   = await res.json();
			if (d.error) { guildsError = d.error; return; }
			botGuilds = d;
		} catch { guildsError = 'Could not reach the Discord API.'; }
		finally   { guildsLoading = false; }
	}

	async function fetchChannels(guildId: string) {
		channelsLoading = { ...channelsLoading, [guildId]: true };
		try {
			const res = await fetch(`/api/discord/channels?guildId=${guildId}`);
			const d   = await res.json();
			if (!d.error) guildChannels = { ...guildChannels, [guildId]: d };
		} finally { channelsLoading = { ...channelsLoading, [guildId]: false }; }
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
		<h2 class="page__title">Discord Integration</h2>
	</div>

	{#if (form as any)?.success && (form as any)?.action === 'sync'}<div class="form-success" style="margin-bottom:1rem;">✓ Slash commands synced to all servers.</div>{/if}
	{#if (form as any)?.success && (form as any)?.action !== 'sync'}<div class="form-success" style="margin-bottom:1rem;">Saved.</div>{/if}
	{#if (form as any)?.message}<div class="form-error" style="margin-bottom:1rem;">{(form as any).message}</div>{/if}

	<!-- Bot setup -->
	<div class="card" style="margin-bottom:1.5rem;">
		<h3 class="section-title">Bot setup</h3>
		<p class="field-hint" style="margin-bottom:0.75rem;">
			Set your bot token and client ID in <a href="/settings">Platform Settings</a> first.
			Then invite the bot to your Discord servers and click <strong>Fetch servers</strong>.
		</p>
		<div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
			{#if botInviteUrl()}
				<a href={botInviteUrl()} target="_blank" rel="noopener" class="btn btn-primary btn-sm">+ Invite bot to a server</a>
			{/if}
			<button type="button" class="btn btn-ghost btn-sm" onclick={fetchBotGuilds} disabled={guildsLoading}>
				{guildsLoading ? 'Fetching…' : '↻ Fetch servers from bot'}
			</button>
			<form method="post" action="?/syncCommands" use:enhance>
				<button type="submit" class="btn btn-ghost btn-sm">⚡ Sync Slash Commands</button>
			</form>
		</div>
		{#if guildsError}<p class="form-error" style="margin-top:0.5rem;">{guildsError}</p>{/if}

		{#if botGuilds.length}
			<div style="margin-top:1rem;">
				<p class="label" style="margin-bottom:0.5rem;">Servers the bot is in:</p>
				<div style="display:flex; flex-direction:column; gap:0.375rem;">
					{#each botGuilds as guild}
						<div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:0.5rem 0.75rem; background:var(--bg-overlay); border-radius:var(--radius-md); flex-wrap:wrap">
							<div>
								<span style="font-weight:600; font-size:0.875rem;">{guild.name}</span>
								<span class="table__muted" style="font-size:0.75rem; margin-left:0.5rem;">{guild.id}</span>
							</div>
							{#if configuredGuildIds.has(guild.id)}
								<span class="badge badge-success">Configured</span>
							{:else}
								<form method="post" action="?/saveServer" use:enhance={() => {
									return async ({ update }) => { await update(); await invalidateAll(); };
								}} style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
									<input type="hidden" name="guildId" value={guild.id} />
									<input type="hidden" name="name"    value={guild.name} />
									<select name="scope" class="input input--select" style="font-size:0.8125rem; width:auto; min-width:140px;">
										<option value="global">Global</option>
										{#each worlds as w}
											<option value={w.id}>{w.name}</option>
										{/each}
									</select>
									<button type="submit" class="btn btn-primary btn-sm">Add</button>
								</form>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Manual fallback -->
	<details class="card" style="margin-bottom:1.5rem;">
		<summary style="cursor:pointer; font-weight:600; font-size:0.875rem; padding:0.25rem 0;">Manual fallback — add by Server ID</summary>
		<div style="margin-top:0.75rem;">
			<form method="post" action="?/saveServer" use:enhance={() => {
				return async ({ update }) => { await update(); await invalidateAll(); };
			}}>
				<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
					<div class="field" style="flex:1 1 180px;">
						<label class="label" for="guildId">Server ID</label>
						<input id="guildId" name="guildId" type="text" class="input" placeholder="123456789012345678" required />
					</div>
					<div class="field" style="flex:1 1 180px;">
						<label class="label" for="sname">Server name</label>
						<input id="sname" name="name" type="text" class="input" placeholder="My D&D Server" required />
					</div>
					<div class="field" style="flex:1 1 180px;">
						<label class="label" for="scope">Scope</label>
						<select id="scope" name="scope" class="input input--select">
							<option value="global">Global</option>
							{#each worlds as w}
								<option value={w.id}>{w.name}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="form-actions"><button type="submit" class="btn btn-primary btn-sm">Add server</button></div>
			</form>
		</div>
	</details>

	<!-- Configured servers -->
	{#each servers as server}
		<div class="card" style="margin-bottom:1rem;">
			<div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem;">
				<div>
					<h3 class="section-title" style="margin:0;">{server.name}</h3>
					<div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.25rem; flex-wrap:wrap;">
						<span class="table__muted" style="font-size:0.8125rem;">ID: {server.guildId} · Scope:</span>
						<form method="post" action="?/saveServer" use:enhance={() => {
							return async ({ update }) => { await update(); await invalidateAll(); };
						}} style="display:flex; align-items:center; gap:0.25rem;">
							<input type="hidden" name="guildId" value={server.guildId} />
							<input type="hidden" name="name"    value={server.name} />
							<select name="scope" class="input input--select" style="font-size:0.8125rem; width:auto; min-width:130px; padding:0.2rem 0.5rem;">
								<option value="global" selected={server.scope === 'global'}>Global</option>
								{#each worlds as w}
									<option value={w.id} selected={server.scope === w.id}>{w.name}</option>
								{/each}
							</select>
							<button type="submit" class="btn btn-ghost btn-sm" style="font-size:0.75rem;">Save</button>
						</form>
					</div>
				</div>
				<div style="display:flex; gap:0.5rem; flex-wrap:wrap">
					<button type="button" class="btn btn-ghost btn-sm"
						onclick={() => fetchChannels(server.guildId)}
						disabled={channelsLoading[server.guildId]}>
						{channelsLoading[server.guildId] ? 'Loading…' : '↻ Fetch channels'}
					</button>
					<form id="cf-edf686" method="post" action="?/deleteServer" use:enhance={() => {
				return async ({ update }) => { await update(); await invalidateAll(); };
			}}>
						<input type="hidden" name="id" value={server.id} />
						<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick={() => window.confirmModal('Confirm', 'Remove this server?').then(ok => { if(ok)(document.getElementById("cf-edf686") as HTMLFormElement).requestSubmit(); })}>Remove</button>
					</form>
				</div>
			</div>

			<h4 style="font-size:0.8125rem; font-weight:600; color:var(--text-secondary); margin:0 0 0.5rem;">Channel mappings</h4>
			<div style="display:flex; flex-direction:column; gap:0.625rem;">
				{#each CHANNEL_TYPES as type}
					{@const existing         = server.channels?.find((c: any) => c.type === type)}
					{@const availableChannels = guildChannels[server.guildId] ?? []}
					{@const key              = `${server.id}:${type}`}
					{@const selId            = selectedChannelId[key]   ?? existing?.channelId   ?? ''}
					{@const selName          = selectedChannelName[key] ?? existing?.channelName ?? ''}
					<form method="post" action="?/saveChannel" use:enhance={() => {
						return async ({ update }) => { await update(); await invalidateAll(); };
					}} style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
						<input type="hidden" name="serverId"    value={server.id} />
						<input type="hidden" name="type"        value={type} />
						<input type="hidden" name="channelName" value={selName} />
						<span class="badge badge-muted" style="width:120px; text-align:center; flex-shrink:0;">{type}</span>
						{#if availableChannels.length}
							<select name="channelId" class="input input--select" style="flex:1; min-width:200px; font-size:0.8125rem;"
								onchange={(e) => onChannelSelect(server.id, type, (e.currentTarget as HTMLSelectElement).value, availableChannels)}>
								<option value="">— Select channel —</option>
								{#each availableChannels as ch}
									<option value={ch.id} selected={ch.id === selId}># {ch.name}</option>
								{/each}
							</select>
						{:else}
							<input name="channelId" type="text" class="input" style="flex:1; min-width:160px; font-size:0.8125rem;"
								value={selId} placeholder="Channel ID" />
							<input name="channelName" type="text" class="input" style="flex:1; min-width:120px; font-size:0.8125rem;"
								value={selName} placeholder="Channel name (optional)" />
						{/if}
						<button type="submit" class="btn btn-primary btn-sm"
							disabled={!selId && !existing}>Save</button>
						{#if existing}
							<span class="badge badge-success" style="font-size:0.75rem; flex-shrink:0;">#{existing.channelName || existing.channelId}</span>
						{/if}
					</form>
				{/each}
			</div>
		</div>
	{/each}

	{#if !servers.length}
		<div class="card"><p class="table__empty">No Discord servers configured yet. Fetch servers from the bot above or add manually.</p></div>
	{/if}
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