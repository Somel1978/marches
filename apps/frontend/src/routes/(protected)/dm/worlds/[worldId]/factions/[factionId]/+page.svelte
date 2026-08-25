<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/factions/[factionId]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { ConfirmModal } from '@core/ui';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();

	const world     = $derived((data as any).world);
	const faction   = $derived((data as any).faction);
	const canManage = $derived((data as any).canManage === true);

	const tierLabel: Record<string, string> = { LOCAL: 'Local', REGIONAL: 'Regional', WORLD: 'World' };
	const relLabel: Record<string, string>  = { RIVAL: 'Rival', ALLY: 'Ally' };

	const linkedPlotQuestIds = $derived(new Set(faction.quests.map((q: any) => q.plotQuestId)));
	const territoryKeys  = $derived(new Set(faction.territories.map((t: any) => `${t.entityType}:${t.entityId}`)));
	const relatedIds     = $derived(new Set(faction.relations.map((r: any) => r.other?.id)));
	const renownCharIds  = $derived(new Set(faction.renown.map((r: any) => r.characterId)));

	function reload() {
		return async ({ update }: any) => { await update(); await invalidateAll(); };
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

<div>
	<div class="page__header">
		<div>
			<a href="/dm/worlds/{world.id}/factions" class="back-link">← Factions</a>
			<h2 class="page__title">🛡 {faction.name}</h2>
			<span class="badge badge-tier--{faction.powerTier}">{tierLabel[faction.powerTier] ?? faction.powerTier}</span>
			{#if !faction.isVisible}<span class="badge badge-muted">🔒 Hidden from players</span>{/if}
		</div>
		{#if canManage}
			<form method="post" action="?/delete" use:enhance={({ cancel }) => {
				askConfirm('Confirm', `Delete faction "${faction.name}"?`, () => { cancel(); }); return;
				return async ({ update }) => { await update(); };
			}}>
				<button type="submit" class="btn btn-danger btn-sm">Delete faction</button>
			</form>
		{/if}
	</div>

	{#if (form as any)?.message}<div class="form-error">{(form as any).message}</div>{/if}
	{#if (form as any)?.updateSuccess}<div class="form-success">Faction updated.</div>{/if}

	<div class="sections">
		<!-- Identifiers + lore -->
		<div class="card">
			<h3 class="section-title">Details</h3>
			{#if canManage}
				<form method="post" action="?/update" use:enhance={reload}>
					<div class="fields">
						<div class="field">
							<label class="label" for="fname">Name</label>
							<input id="fname" name="name" type="text" class="input" value={faction.name} required />
						</div>
						<div class="field">
							<label class="label" for="fdesig">Designation</label>
							<input id="fdesig" name="designation" type="text" class="input" value={faction.designation ?? ''} placeholder="Codename / secondary designation" />
						</div>
						<div class="field">
							<label class="label" for="fherald">Heraldry image URL</label>
							<input id="fherald" name="heraldryUrl" type="text" class="input" value={faction.heraldryUrl ?? ''} />
						</div>
						<div class="field">
							<label class="label" for="fcolors">Primary colors</label>
							<input id="fcolors" name="primaryColors" type="text" class="input" value={faction.primaryColors ?? ''} placeholder="e.g. Crimson & Gold" />
						</div>
						<div class="field">
							<label class="label" for="fmotto">Motto</label>
							<input id="fmotto" name="motto" type="text" class="input" value={faction.motto ?? ''} />
						</div>
						<div class="field">
							<label class="label" for="ftier">Tier of power</label>
							<select id="ftier" name="powerTier" class="input">
								<option value="LOCAL"    selected={faction.powerTier === 'LOCAL'}>Local</option>
								<option value="REGIONAL" selected={faction.powerTier === 'REGIONAL'}>Regional</option>
								<option value="WORLD"    selected={faction.powerTier === 'WORLD'}>World</option>
							</select>
						</div>
						<div class="field">
							<label class="label" for="fvisible">Visible to players</label>
							<select id="fvisible" name="isVisible" class="input">
								<option value="true"  selected={faction.isVisible}>Yes</option>
								<option value="false" selected={!faction.isVisible}>No — hidden</option>
							</select>
						</div>
						<div class="field">
							<label class="label" for="flore">Lore (markdown)</label>
							<textarea id="flore" name="lore" class="input" rows="6">{faction.lore ?? ''}</textarea>
						</div>
						<div class="field">
							<label class="label" for="fideals">Ideals</label>
							<textarea id="fideals" name="ideals" class="input" rows="3">{faction.ideals ?? ''}</textarea>
						</div>
						<div class="field">
							<label class="label" for="ftaboos">Taboos</label>
							<textarea id="ftaboos" name="taboos" class="input" rows="3">{faction.taboos ?? ''}</textarea>
						</div>
						<div class="field">
							<label class="label" for="fhooks">Induction & hooks (markdown)</label>
							<textarea id="fhooks" name="inductionHooks" class="input" rows="4">{faction.inductionHooks ?? ''}</textarea>
						</div>
						<div class="field">
							<label class="label" for="fbounties">Bounties / quest notes (markdown, free text)</label>
							<textarea id="fbounties" name="bounties" class="input" rows="4">{faction.bounties ?? ''}</textarea>
						</div>
						<div class="field">
							<label class="label" for="fsecrets">Secrets (DM/admin only — never shown to players)</label>
							<textarea id="fsecrets" name="secrets" class="input" rows="4">{faction.secrets ?? ''}</textarea>
						</div>
					</div>
					<button type="submit" class="btn btn-primary" style="margin-top:0.75rem;">Save</button>
				</form>
			{:else}
				<div class="fields">
					{#if faction.designation}<div class="field"><span class="label">Designation</span><p>{faction.designation}</p></div>{/if}
					{#if faction.motto}<div class="field"><span class="label">Motto</span><p style="font-style:italic;">{faction.motto}</p></div>{/if}
					{#if faction.primaryColors}<div class="field"><span class="label">Primary colors</span><p>{faction.primaryColors}</p></div>{/if}
					{#if faction.lore}<div class="field"><span class="label">Lore</span><p style="white-space:pre-wrap;">{faction.lore}</p></div>{/if}
					{#if faction.ideals}<div class="field"><span class="label">Ideals</span><p style="white-space:pre-wrap;">{faction.ideals}</p></div>{/if}
					{#if faction.taboos}<div class="field"><span class="label">Taboos</span><p style="white-space:pre-wrap;">{faction.taboos}</p></div>{/if}
					{#if faction.inductionHooks}<div class="field"><span class="label">Induction & hooks</span><p style="white-space:pre-wrap;">{faction.inductionHooks}</p></div>{/if}
					{#if faction.bounties}<div class="field"><span class="label">Bounties</span><p style="white-space:pre-wrap;">{faction.bounties}</p></div>{/if}
					{#if faction.secrets}<div class="field"><span class="label">Secrets</span><p style="white-space:pre-wrap;">{faction.secrets}</p></div>{/if}
				</div>
			{/if}
		</div>

		<!-- Ranks & progression -->
		<div class="card">
			<h3 class="section-title">Ranks & progression</h3>
			{#if (form as any)?.rankSuccess}<div class="form-success">Ranks updated.</div>{/if}
			{#if canManage}
				{#each faction.ranks as rank (rank.id)}
					<form method="post" action="?/updateRank" use:enhance={reload} class="faction-subrow">
						<input type="hidden" name="rankId" value={rank.id} />
						<input name="level" type="number" class="input" style="width:70px;" value={rank.level} min="1" title="Hierarchy level" />
						<input name="name" type="text" class="input faction-subrow__grow" value={rank.name} required />
						<input name="renownRequired" type="number" class="input" style="width:110px;" value={rank.renownRequired ?? ''} min="-10" max="10" placeholder="Renown ≥" title="Renown required" />
						<input name="description" type="text" class="input faction-subrow__grow" value={rank.description ?? ''} placeholder="Description" />
						<button type="submit" class="btn btn-ghost btn-sm">Save</button>
						<button type="submit" formaction="?/deleteRank" class="btn btn-danger btn-sm">✕</button>
					</form>
				{:else}
					<p class="table__empty">No ranks defined yet.</p>
				{/each}
				<form method="post" action="?/createRank" use:enhance={reload} class="faction-subrow" style="border-top:1px solid var(--border-muted); margin-top:0.5rem; padding-top:0.75rem;">
					<input name="level" type="number" class="input" style="width:70px;" value="1" min="1" title="Hierarchy level" />
					<input name="name" type="text" class="input faction-subrow__grow" placeholder="New rank name" required />
					<input name="renownRequired" type="number" class="input" style="width:110px;" min="-10" max="10" placeholder="Renown ≥" />
					<input name="description" type="text" class="input faction-subrow__grow" placeholder="Description" />
					<button type="submit" class="btn btn-primary btn-sm">+ Add rank</button>
				</form>
			{:else}
				{#each faction.ranks as rank (rank.id)}
					<div class="faction-subrow">
						<span class="badge badge-muted">Lv {rank.level}</span>
						<span class="faction-subrow__grow" style="font-weight:600;">{rank.name}</span>
						{#if rank.renownRequired !== null}<span class="badge badge-muted">Renown ≥ {rank.renownRequired}</span>{/if}
						{#if rank.description}<span style="opacity:0.75; font-size:0.85rem;">{rank.description}</span>{/if}
					</div>
				{:else}
					<p class="table__empty">No ranks defined yet.</p>
				{/each}
			{/if}
		</div>

		<!-- Territories -->
		<div class="card">
			<h3 class="section-title">Territories of influence</h3>
			{#if (form as any)?.territorySuccess}<div class="form-success">Territories updated.</div>{/if}
			{#each faction.territories as t (t.id)}
				<div class="faction-subrow">
					<span class="badge badge-muted">{t.entityType === 'REGION' ? '🏔 Region' : '📍 Location'}</span>
					<span class="faction-subrow__grow" style="font-weight:600;">{t.entity?.name ?? '(deleted)'}</span>
					{#if t.notes}<span style="opacity:0.75; font-size:0.85rem;">{t.notes}</span>{/if}
					{#if canManage}
						<form method="post" action="?/removeTerritory" use:enhance={reload}>
							<input type="hidden" name="territoryId" value={t.id} />
							<button type="submit" class="btn btn-danger btn-sm">✕</button>
						</form>
					{/if}
				</div>
			{:else}
				<p class="table__empty">No territories linked yet.</p>
			{/each}
			{#if canManage}
				<form method="post" action="?/addTerritory" use:enhance={reload} class="faction-subrow" style="border-top:1px solid var(--border-muted); margin-top:0.5rem; padding-top:0.75rem;">
					<select name="target" class="input faction-subrow__grow" required>
						<option value="">— Pick region or location —</option>
						{#each world.regions as region}
							{#if !territoryKeys.has(`REGION:${region.id}`)}
								<option value="REGION:{region.id}">🏔 {region.name}</option>
							{/if}
							{#each region.locations as loc}
								{#if !territoryKeys.has(`LOCATION:${loc.id}`)}
									<option value="LOCATION:{loc.id}">&nbsp;&nbsp;📍 {region.name} › {loc.name}</option>
								{/if}
							{/each}
						{/each}
					</select>
					<input name="notes" type="text" class="input faction-subrow__grow" placeholder="Influence notes (optional)" />
					<button type="submit" class="btn btn-primary btn-sm">+ Add</button>
				</form>
			{/if}
		</div>

		<!-- Rivalries & alliances -->
		<div class="card">
			<h3 class="section-title">Rivalries & alliances</h3>
			{#if (form as any)?.relationSuccess}<div class="form-success">Relations updated.</div>{/if}
			{#each faction.relations as rel (rel.id)}
				<div class="faction-subrow">
					<span class="badge badge-rel--{rel.type}">{relLabel[rel.type] ?? rel.type}</span>
					<span class="faction-subrow__grow" style="font-weight:600;">{rel.other?.name ?? '(deleted)'}</span>
					{#if rel.notes}<span style="opacity:0.75; font-size:0.85rem;">{rel.notes}</span>{/if}
					{#if canManage}
						<form method="post" action="?/removeRelation" use:enhance={reload}>
							<input type="hidden" name="relationId" value={rel.id} />
							<button type="submit" class="btn btn-danger btn-sm">✕</button>
						</form>
					{/if}
				</div>
			{:else}
				<p class="table__empty">No rivalries or alliances yet.</p>
			{/each}
			{#if canManage && (data as any).otherFactions.length}
				<form method="post" action="?/setRelation" use:enhance={reload} class="faction-subrow" style="border-top:1px solid var(--border-muted); margin-top:0.5rem; padding-top:0.75rem;">
					<select name="targetFactionId" class="input faction-subrow__grow" required>
						<option value="">— Pick faction —</option>
						{#each (data as any).otherFactions as f}
							{#if !relatedIds.has(f.id)}
								<option value={f.id}>{f.name}</option>
							{/if}
						{/each}
					</select>
					<select name="type" class="input" style="width:120px;" required>
						<option value="RIVAL">Rival</option>
						<option value="ALLY">Ally</option>
					</select>
					<input name="notes" type="text" class="input faction-subrow__grow" placeholder="Notes (optional)" />
					<button type="submit" class="btn btn-primary btn-sm">+ Add</button>
				</form>
			{/if}
		</div>

		<!-- Renown -->
		<div class="card">
			<h3 class="section-title">Character renown <span style="font-weight:400; font-size:0.85rem; opacity:0.7;">(−10 hostile · 0 neutral · +10 favored — characters not listed are neutral)</span></h3>
			{#if (form as any)?.renownSuccess}<div class="form-success">Renown updated.</div>{/if}
			{#if canManage}
				{#each faction.renown as r (r.id)}
					<form method="post" action="?/setRenown" use:enhance={reload} class="renown-row">
						<input type="hidden" name="characterId" value={r.characterId} />
						<span class="renown-row__char">{r.character?.name ?? '(deleted character)'}</span>
						<div class="renown-row__controls">
							<input name="value" type="range" class="renown-slider" min="-10" max="10" step="1" value={r.value}
								oninput={(e) => { const out = (e.currentTarget.closest('form') as HTMLElement).querySelector('.renown-bar__value'); if (out) out.textContent = String((e.currentTarget as HTMLInputElement).value); }} />
							<span class="renown-bar__value">{r.value}</span>
						</div>
						<input name="note" type="text" class="input faction-subrow__grow" value={r.note ?? ''} placeholder="Note (optional)" />
						<button type="submit" class="btn btn-ghost btn-sm">Save</button>
						<button type="submit" formaction="?/removeRenown" class="btn btn-danger btn-sm" title="Remove — reverts to neutral">✕</button>
					</form>
				{:else}
					<p class="table__empty">No renown set — every character is neutral (0).</p>
				{/each}
				<form method="post" action="?/setRenown" use:enhance={reload} class="renown-row" style="border-top:1px solid var(--border-muted); margin-top:0.5rem; padding-top:0.75rem;">
					<select name="characterId" class="input" style="min-width:200px;" required>
						<option value="">— Pick character —</option>
						{#each (data as any).allCharacters as c}
							{#if !renownCharIds.has(c.id)}
								<option value={c.id}>{c.name} ({c.user?.name ?? '?'})</option>
							{/if}
						{/each}
					</select>
					<div class="renown-row__controls">
						<input name="value" type="range" class="renown-slider" min="-10" max="10" step="1" value="0"
							oninput={(e) => { const out = (e.currentTarget.closest('form') as HTMLElement).querySelector('.renown-bar__value'); if (out) out.textContent = String((e.currentTarget as HTMLInputElement).value); }} />
						<span class="renown-bar__value">0</span>
					</div>
					<input name="note" type="text" class="input faction-subrow__grow" placeholder="Note (optional)" />
					<button type="submit" class="btn btn-primary btn-sm">+ Set renown</button>
				</form>
			{:else}
				{#each faction.renown as r (r.id)}
					<div class="renown-row">
						<span class="renown-row__char">{r.character?.name ?? '(deleted character)'}</span>
						<div class="renown-bar" style="flex:1;">
							<div class="renown-bar__track">
								<div class="renown-bar__marker" style="left: {((r.value + 10) / 20) * 100}%;"></div>
							</div>
							<span class="renown-bar__value">{r.value}</span>
							<span class="renown-bar__label">{r.value < 0 ? 'Hostile' : r.value > 0 ? 'Favored' : 'Neutral'}</span>
						</div>
						{#if r.note}<span style="opacity:0.75; font-size:0.85rem;">{r.note}</span>{/if}
					</div>
				{:else}
					<p class="table__empty">No renown set — every character is neutral (0).</p>
				{/each}
			{/if}
		</div>

		<!-- Plot quests / bounties -->
		<div class="card">
			<h3 class="section-title">Associated plot quests & bounties</h3>
			{#if (form as any)?.questSuccess}<div class="form-success">Plot quest links updated.</div>{/if}
			{#each faction.quests as link (link.id)}
				<div class="faction-subrow">
					<span class="faction-subrow__grow" style="font-weight:600;">
						{#if link.plotQuest}
							<a href="/dm/worlds/{world.id}/plot-quests/{link.plotQuest.id}">{link.plotQuest.title}</a>
						{:else}
							(deleted plot quest)
						{/if}
					</span>
					{#if link.plotQuest}<span class="badge badge-muted">{link.plotQuest.status}</span>{/if}
					{#if canManage}
						<form method="post" action="?/removeQuest" use:enhance={reload}>
							<input type="hidden" name="linkId" value={link.id} />
							<button type="submit" class="btn btn-danger btn-sm">✕</button>
						</form>
					{/if}
				</div>
			{:else}
				<p class="table__empty">No plot quests linked yet.</p>
			{/each}
			{#if canManage && (data as any).worldPlotQuests?.length}
				<form method="post" action="?/addQuest" use:enhance={reload} class="faction-subrow" style="border-top:1px solid var(--border-muted); margin-top:0.5rem; padding-top:0.75rem;">
					<select name="plotQuestId" class="input faction-subrow__grow" required>
						<option value="">— Pick plot quest —</option>
						{#each (data as any).worldPlotQuests as q}
							{#if !linkedPlotQuestIds.has(q.id)}
								<option value={q.id}>{q.title} ({q.status})</option>
							{/if}
						{/each}
					</select>
					<button type="submit" class="btn btn-primary btn-sm">+ Link plot quest</button>
				</form>
			{/if}
		</div>

		<!-- Persons of interest -->
		<div class="card">
			<div class="page__header" style="margin-bottom:1rem;">
				<h3 class="section-title" style="margin:0;">Persons of interest</h3>
				<a href="/dm/worlds/{world.id}/npcs?factionId={faction.id}" class="btn btn-ghost btn-sm">{canManage ? 'Manage NPCs →' : 'View NPCs →'}</a>
			</div>
			{#if faction.npcs?.length}
				<div class="table-wrap">
					<table class="table">
						<thead><tr><th>Name</th><th>Role</th><th>Rank</th><th>Status</th><th>Visible</th><th></th></tr></thead>
						<tbody>
							{#each faction.npcs as npc}
								<tr>
									<td style="font-weight:600;">{npc.name}{#if npc.aliases}<div style="font-size:0.8rem; font-style:italic; opacity:0.7;">{npc.aliases}</div>{/if}</td>
									<td>{npc.factionRole ?? '—'}</td>
									<td>{npc.rank?.name ?? '—'}</td>
									<td><span class="badge badge-npc--{npc.status}">{npc.status}</span></td>
									<td>{npc.isVisible ? '✓' : '🔒'}</td>
									<td><a href="/dm/worlds/{world.id}/npcs/{npc.id}" class="btn btn-ghost btn-sm">{canManage ? 'Manage' : 'View'}</a></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="table__empty">No NPCs aligned to this faction yet.</p>
			{/if}
		</div>
	</div>
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