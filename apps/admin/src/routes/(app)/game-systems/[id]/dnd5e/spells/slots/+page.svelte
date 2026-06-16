<!-- apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/spells/slots/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const system  = $derived((data as any).system);
	const classes = $derived((data as any).classes as any[]);

	let classId    = $state('');
	const rows     = $derived((data as any).rows as any[] ?? []);

	const CASTER_TYPES = ['FULL', 'HALF', 'THIRD', 'PACT'];
	const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);
	const SLOTS  = [1,2,3,4,5,6,7,8,9];

	const selectedClass      = $derived(classes.find((c: any) => c.id === classId) ?? null);
	const existingCasterType = $derived(rows[0]?.casterType ?? '');

	let casterType = $state('');
	$effect(() => {
		classId    = (data as any).classId ?? '';
		casterType = rows[0]?.casterType ?? '';
	});

	function getSlot(level: number, slot: number) {
		return rows.find(r => r.classLevel === level)?.[`slot${slot}`] ?? 0;
	}

	function changeClass(id: string) {
		classId = id;
		goto(`?classId=${id}`, { replaceState: true });
	}

	const castingClasses = $derived(classes.filter((c: any) => c.canCastSpells));
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/game-systems/{system.id}/dnd5e/spells" style="font-size:0.8125rem;color:var(--text-muted);">← Spells</a>
			<h2 class="page__title">Spell Slot Progression</h2>
			<p style="margin:0;font-size:0.875rem;color:var(--text-muted);">{system.name} · Define slots per class level</p>
		</div>
		<div style="display:flex;gap:0.5rem;">
			<a href="/game-systems/{system.id}/dnd5e/spells/known" class="btn btn-ghost btn-sm">Spells Known</a>
		</div>
	</div>

	{#if form?.success}<div class="form-success" style="margin-bottom:1rem;">Saved.</div>{/if}
	{#if (form as any)?.message}<div class="form-error" style="margin-bottom:1rem;">{(form as any).message}</div>{/if}

	<div style="display:flex;gap:0.75rem;align-items:center;margin-bottom:1rem;flex-wrap:wrap;">
		<div class="field" style="margin:0;min-width:200px;">
			<label class="label" for="class-sel">Spellcasting Class</label>
			<select id="class-sel" class="input input--select" value={classId} onchange={(e) => changeClass((e.target as HTMLSelectElement).value)}>
				<option value="">— Select class —</option>
				{#each castingClasses as c}
					<option value={c.id}>{c.name}</option>
				{/each}
			</select>
		</div>
		{#if classId}
			<div class="field" style="margin:0;min-width:160px;">
				<label class="label" for="caster-type">Caster Type</label>
				<select id="caster-type" class="input input--select" bind:value={casterType}>
					<option value="">— Select type —</option>
					{#each CASTER_TYPES as t}<option value={t}>{t}</option>{/each}
				</select>
			</div>
		{/if}
	</div>

	{#if classId && selectedClass}
		<form method="post" action="?/save" use:enhance>
			<input type="hidden" name="classId"   value={classId} />
			<input type="hidden" name="className"  value={selectedClass.name} />
			<input type="hidden" name="casterType" value={casterType} />

			<div class="card" style="padding:0;overflow-x:auto;">
				<table class="table" style="min-width:700px;">
					<thead>
						<tr>
							<th style="width:60px;">Level</th>
							{#each SLOTS as s}<th style="text-align:center;width:60px;">{s}st–{s}th</th>{/each}
						</tr>
					</thead>
					<tbody>
						{#each LEVELS as lvl}
							<tr>
								<td style="font-weight:700;color:var(--text-muted);">{lvl}</td>
								{#each SLOTS as sl}
									<td style="padding:0.25rem;">
										<input
											name="slot{sl}_{lvl}"
											type="number" min="0" max="9"
											class="input"
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
	{:else if !classId}
		<div class="card"><p class="table__empty">Select a spellcasting class to edit its slot progression.</p></div>
	{/if}
</div>