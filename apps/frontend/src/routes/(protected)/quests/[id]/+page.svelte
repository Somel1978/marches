<!-- apps/frontend/src/routes/(protected)/quests/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let saving = $state(false);

	const confirmedCount = $derived(data.quest.signups.filter((s: any) => s.status === 'CONFIRMED').length);
	const isFull         = $derived(confirmedCount >= data.quest.maxCapacity);

	// Range of player counts for reward breakdown
	const playerRange = $derived(
		Array.from(
			{ length: data.quest.maxCapacity - data.quest.minCapacity + 1 },
			(_, i) => data.quest.minCapacity + i
		)
	);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/quests" class="back-link">← Quests</a>
			<h2 class="page__title">{data.quest.title}</h2>
			<p class="page__subtitle">{(data.quest as any).dmName} · Lv {data.quest.minLevel}–{data.quest.maxLevel}</p>
		</div>
	</div>

	{#if (data.quest as any).regionName}
		<div style="display:flex; align-items:center; gap:0.375rem; margin-bottom:0.75rem; font-size:0.875rem;">
			<span>📍</span>
			{#if (data.quest as any).worldName}
				<span style="color:var(--text-secondary);">{(data.quest as any).worldName}</span>
				<span style="color:var(--text-muted);">›</span>
			{/if}
			<span style="color:var(--text-secondary);">{(data.quest as any).regionName}</span>
			{#if (data.quest as any).locationName}
				<span style="color:var(--text-muted);">·</span>
				<span style="color:var(--text-muted);">{(data.quest as any).locationName}</span>
			{/if}
		</div>
	{/if}

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if form?.success}<div class="form-success">Signed up successfully!</div>{/if}
	{#if form?.cancelled}<div class="form-success">Signup cancelled.</div>{/if}

	<div class="sections">
		<div class="card">
			<div class="dashboard__stats">
				<div class="stat-card"><span class="stat-value">{data.quest.missionXp.toLocaleString()}</span><span class="stat-label">Mission XP</span></div>
				<div class="stat-card"><span class="stat-value">{confirmedCount}/{data.quest.maxCapacity}</span><span class="stat-label">Players</span></div>
				<div class="stat-card"><span class="stat-value">Lv {data.quest.minLevel}–{data.quest.maxLevel}</span><span class="stat-label">Level req.</span></div>
			</div>

			{#if data.quest.description}
				<hr class="divider" />
				<p style="font-size:0.9375rem; color:var(--text-secondary); white-space:pre-wrap;">{data.quest.description}</p>
			{/if}

			{#if data.quest.rules}
				<hr class="divider" />
				<h4 style="font-size:0.875rem; font-weight:600; margin:0 0 0.5rem;">DM Rules</h4>
				<p style="font-size:0.875rem; color:var(--text-secondary); white-space:pre-wrap;">{data.quest.rules}</p>
			{/if}
		</div>

		<!-- Rewards per player -->
		<div class="card">
			<h3 class="section-title">Rewards per player</h3>

			<!-- Mission XP always shown -->
			<div style="margin-bottom:0.875rem;">
				<p style="font-size:0.8125rem; font-weight:600; color:var(--text-secondary); margin:0 0 0.375rem;">
					<span class="badge badge-muted" style="margin-right:0.375rem;">XP</span>
					{data.quest.missionXp.toLocaleString()} total
				</p>
				<div style="display:flex; flex-wrap:wrap; gap:0.375rem;">
					{#each playerRange as n}
						<div class="character-class-tag">
							<span class="table__muted">{n}p:</span>
							<strong>{Math.max(1, Math.floor(data.quest.missionXp / n))}</strong>
						</div>
					{/each}
				</div>
			</div>

			<!-- Extra rewards (GOLD, TOKEN, extra XP) -->
			{#each data.quest.rewards.filter((r: any) => r.type !== 'ITEM' && r.amount > 0) as r}
				<div style="margin-bottom:0.875rem;">
					<p style="font-size:0.8125rem; font-weight:600; color:var(--text-secondary); margin:0 0 0.375rem;">
						<span class="badge badge-muted" style="margin-right:0.375rem;">{r.type}</span>
						{r.amount.toLocaleString()} total
					</p>
					<div style="display:flex; flex-wrap:wrap; gap:0.375rem;">
						{#each playerRange as n}
							<div class="character-class-tag">
								<span class="table__muted">{n}p:</span>
								<strong>{Math.max(1, Math.floor(r.amount / n))}</strong>
							</div>
						{/each}
					</div>
				</div>
			{/each}

			<!-- Items -->
			{#each data.quest.rewards.filter((r: any) => r.type === 'ITEM') as r}
				<div class="character-class-tag">
					<span class="badge badge-muted">ITEM</span>
					<span>{r.itemName ?? 'Item'} × 1 per player</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Signup section -->
	{#if data.mySignups.length}
		<div class="card">
			<h3 class="section-title">Your signup</h3>
			{#each data.mySignups as s}
				<div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;">
					<div>
						<span class="badge {s.status === 'CONFIRMED' ? 'badge-success' : s.status === 'WAITLIST' ? 'badge-warning' : 'badge-muted'}">{s.status}</span>
					</div>
					<form method="post" action="?/cancel"
						use:enhance={({ cancel }) => { if (!confirm('Cancel your signup?')) { cancel(); return; } return async ({ update }) => { await update(); await invalidateAll(); }; }}>
						<input type="hidden" name="signupId" value={s.id} />
						<button type="submit" class="btn btn-ghost btn-sm">Cancel signup</button>
					</form>
				</div>
			{/each}
		</div>
	{:else if data.eligible.length}
		<div class="card">
			<h3 class="section-title">{isFull ? 'Join waitlist' : 'Sign up'}</h3>
			<form method="post" action="?/signup" use:enhance={() => {
				saving = true;
				return async ({ update }) => { saving = false; await update(); await invalidateAll(); };
			}}>
				<div class="fields">
					<div class="field">
						<label class="label" for="characterId">Choose character</label>
						<select id="characterId" name="characterId" class="input" required>
							<option value="">Select…</option>
							{#each data.eligible as char}
								<option value={char.id}>{char.name}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary" disabled={saving}>
						{saving ? 'Signing up…' : isFull ? 'Join waitlist' : 'Sign up'}
					</button>
				</div>
			</form>
		</div>
	{:else}
		<div class="card">
			<p class="table__muted">No eligible characters. You need an active character at level {data.quest.minLevel}–{data.quest.maxLevel}.</p>
		</div>
	{/if}

	<!-- Who's signed up -->
	{#if data.quest.signups.filter((s: any) => s.status !== 'CANCELLED').length}
		<div class="card">
			<h3 class="section-title">{confirmedCount} / {data.quest.maxCapacity} players signed up</h3>
			<div style="display:flex; flex-direction:column; gap:0.625rem;">
				{#each data.quest.signups.filter((s: any) => s.status !== 'CANCELLED') as s}
					<div class="signup-card">
						<div class="signup-card__left">
							<div class="signup-card__level">{(s as any).character?.totalLevel ?? '?'}</div>
							<div class="signup-card__info">
								<p class="signup-card__name">{(s as any).character?.name ?? s.characterId}</p>
								<p class="signup-card__player">{(s as any).character?.playerName ?? ''}</p>
								<div class="signup-card__meta">
									{#if (s as any).character?.species}<span>Race: {(s as any).character.species}</span>{/if}
									{#if (s as any).character?.classes?.length}<span>Class: {(s as any).character.classes.map((c: any) => c.subclass ? `${c.name} (${c.subclass})` : c.name).join(' / ')}</span>{/if}
								</div>
							</div>
						</div>
						{#if (s as any).character?.avatarUrl}
							<img src={(s as any).character.avatarUrl} alt="" class="signup-card__avatar" />
						{:else}
							<div class="signup-card__avatar--placeholder">⚔</div>
						{/if}
						<div class="signup-card__status">
							<span class="badge {s.status === 'CONFIRMED' ? 'badge-success' : s.status === 'WAITLIST' ? 'badge-muted' : 'badge-warning'}">{s.status.replace('_', ' ')}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>