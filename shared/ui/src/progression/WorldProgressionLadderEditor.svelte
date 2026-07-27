<!-- shared/ui/src/progression/WorldProgressionLadderEditor.svelte -->
<!-- Sparse world ladder editor. Empty override cells = inherit system value. -->
<script lang="ts">
	type Threshold = {
		id: string;
		label: string;
		xpRequired: number;
		milestoneRequired: number;
	};
	type Override = {
		thresholdId: string;
		xpRequired: number | null;
		milestoneRequired: number | null;
	};

	let {
		thresholds,
		overrides = [],
		homeCharacterCount = 0,
		action = '?/saveProgressionOverrides',
		readonly = false,
		enhance,
	}: {
		thresholds: Threshold[];
		overrides?: Override[];
		homeCharacterCount?: number;
		action?: string;
		readonly?: boolean;
		enhance?: any;
	} = $props();

	const overrideById = $derived(Object.fromEntries(
		(overrides ?? []).map(o => [o.thresholdId, o]),
	));

	function draftXp(t: Threshold): string {
		const o = overrideById[t.id];
		return o?.xpRequired != null ? String(o.xpRequired) : '';
	}
	function draftMs(t: Threshold): string {
		const o = overrideById[t.id];
		return o?.milestoneRequired != null ? String(o.milestoneRequired) : '';
	}

	function confirmSave(e: SubmitEvent) {
		if (homeCharacterCount <= 0) return;
		const ok = confirm(
			`Saving will re-resolve levels for ${homeCharacterCount} character(s) whose home world is this world. ` +
			`Some may be put into level-up or level-down pending. Continue?`,
		);
		if (!ok) e.preventDefault();
	}
</script>

{#if !thresholds.length}
	<p class="table__empty">No progression thresholds on the active game system yet.</p>
{:else}
	<form method="post" {action} use:enhance={enhance} onsubmit={confirmSave}>
		<p class="field-hint" style="margin-bottom:0.75rem;">
			Leave a world cell blank to inherit the game-system value.
			Overrides apply only to characters whose <strong>home world</strong> is this world
			(not global characters). Saving re-resolves their earned level.
			{#if homeCharacterCount > 0}
				Currently <strong>{homeCharacterCount}</strong> home-world character(s).
			{/if}
		</p>
		<div class="table-wrap">
			<table class="table">
				<thead>
					<tr>
						<th>Label</th>
						<th>System XP</th>
						<th>World XP</th>
						<th>System MS</th>
						<th>World MS</th>
					</tr>
				</thead>
				<tbody>
					{#each thresholds as t}
						<tr>
							<td style="font-weight:600;">{t.label}</td>
							<td class="table__muted">{t.xpRequired.toLocaleString()}</td>
							<td>
								<input type="hidden" name="thresholdId" value={t.id} />
								{#if readonly}
									{(overrideById[t.id]?.xpRequired ?? '—')}
								{:else}
									<input
										name="xpRequired"
										type="number"
										class="input"
										min="0"
										placeholder="inherit"
										value={draftXp(t)}
										style="width:7rem;"
									/>
								{/if}
							</td>
							<td class="table__muted">{(t.milestoneRequired ?? 0).toLocaleString()}</td>
							<td>
								{#if readonly}
									{(overrideById[t.id]?.milestoneRequired ?? '—')}
								{:else}
									<input
										name="milestoneRequired"
										type="number"
										class="input"
										min="0"
										placeholder="inherit"
										value={draftMs(t)}
										style="width:7rem;"
									/>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if !readonly}
			<div class="form-actions" style="margin-top:0.75rem;">
				<button type="submit" class="btn btn-primary btn-sm">Save ladder overrides</button>
			</div>
		{/if}
	</form>
{/if}
