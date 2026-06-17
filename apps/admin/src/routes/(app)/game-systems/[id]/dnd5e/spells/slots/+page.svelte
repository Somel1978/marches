<!-- apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/spells/slots/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const system  = $derived((data as any).system);
	const sources = $derived((data as any).sources as any[]);

	let sourceId = $state('');
	const rows      = $derived((data as any).rows      as any[] ?? []);
	const knownRows = $derived((data as any).knownRows as any[] ?? []);

	$effect(() => { sourceId = (data as any).sourceId ?? ''; });

	const CASTER_TYPES = ['FULL', 'HALF', 'THIRD', 'PACT'];
	const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);
	const SLOTS  = [1,2,3,4,5,6,7,8,9];

	const source = $derived((data as any).sources?.find((s: any) => s.id === sourceId) ?? null);
	let casterType = $state('');
	$effect(() => { casterType = rows[0]?.casterType ?? ''; });

	function getSlot(level: number, slot: number) {
		return rows.find((r: any) => r.classLevel === level)?.[`slot${slot}`] ?? 0;
	}
	function getCantrips(level: number) {
		return knownRows.find((r: any) => r.classLevel === level)?.cantrips ?? '';
	}

	function changeSource(id: string) {
		sourceId = id;
		goto(`?sourceId=${id}`, { replaceState: true });
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/game-systems/{system.id}/dnd5e/spells" style="font-size:0.8125rem;color:var(--text-muted);">← Spells</a>
			<h2 class="page__title">Spell Slot Progression</h2>
			<p style="margin:0;font-size:0.875rem;color:var(--text-muted);">{system.name} · Classes and spellcasting subclasses</p>
		</div>
		<a href="/game-systems/{system.id}/dnd5e/spells/known" class="btn btn-ghost btn-sm">Spells Known →</a>
	</div>

	{#if form?.success}<div class="form-success" style="margin-bottom:1rem;">Saved.</div>{/if}
	{#if (form as any)?.message}<div class="form-error" style="margin-bottom:1rem;">{(form as any).message}</div>{/if}

	<div style="display:flex;gap:0.75rem;align-items:flex-end;margin-bottom:1rem;flex-wrap:wrap;">
		<div class="field" style="margin:0;min-width:260px;">
			<label class="label" for="source-sel">Class / Subclass</label>
			<select id="source-sel" class="input input--select" value={sourceId} onchange={(e) => changeSource((e.target as HTMLSelectElement).value)}>
				<option value="">— Select —</option>
				{#each sources as s}
					<option value={s.id}>{s.label}</option>
				{/each}
			</select>
		</div>
		{#if sourceId}
			<div class="field" style="margin:0;min-width:160px;">
				<label class="label" for="caster-type">Caster Type</label>
				<select id="caster-type" class="input input--select" bind:value={casterType}>
					<option value="">— Select type —</option>
					{#each CASTER_TYPES as t}<option value={t}>{t}</option>{/each}
				</select>
			</div>
		{/if}
	</div>

	{#if sourceId && source}
		<form method="post" action="?/save" use:enhance>
			<input type="hidden" name="classId"      value={source.classId} />
			<input type="hidden" name="className"    value={source.className} />
			<input type="hidden" name="subclassId"   value={source.subclassId} />
			<input type="hidden" name="subclassName" value={source.subclassName} />
			<input type="hidden" name="casterType"   value={casterType} />

			<div class="card" style="padding:0;overflow-x:auto;">
				<table class="table" style="min-width:800px;">
					<thead>
						<tr>
							<th style="width:55px;">Level</th>
							<th style="text-align:center;width:70px;">Cantrips</th>
							{#each SLOTS as s}
								{@const ord = s === 1 ? '1st' : s === 2 ? '2nd' : s === 3 ? '3rd' : `${s}th`}
								<th style="text-align:center;width:55px;">{ord}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each LEVELS as lvl}
							<tr>
								<td style="font-weight:700;color:var(--text-muted);">{lvl}</td>
								<td style="padding:0.25rem;">
									<input name="cantrips_{lvl}" type="number" min="0" max="10" class="input"
										style="text-align:center;padding:0.25rem;font-size:0.875rem;"
										value={getCantrips(lvl)} placeholder="—" />
								</td>
								{#each SLOTS as sl}
									<td style="padding:0.25rem;">
										<input name="slot{sl}_{lvl}" type="number" min="0" max="9" class="input"
											style="text-align:center;padding:0.25rem;font-size:0.875rem;"
											value={getSlot(lvl, sl)} />
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div style="margin-top:1rem;">
				<button type="submit" class="btn btn-primary" disabled={!casterType}>Save Progression</button>
			</div>
		</form>
	{:else if !sourceId}
		<div class="card"><p class="table__empty">Select a class or spellcasting subclass to edit its progression.</p></div>
	{/if}
</div>