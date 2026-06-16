<!-- apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/spells/known/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const system  = $derived((data as any).system);
	const classes = $derived((data as any).classes as any[]);

	let classId  = $state('');
	const rows   = $derived((data as any).rows as any[] ?? []);

	$effect(() => { classId = (data as any).classId ?? ''; });

	const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);
	const selectedClass  = $derived(classes.find((c: any) => c.id === classId) ?? null);
	const castingClasses = $derived(classes.filter((c: any) => c.canCastSpells));

	function getRow(level: number) { return rows.find(r => r.classLevel === level); }
	function val(level: number, field: string) {
		const v = getRow(level)?.[field];
		return v == null ? '' : String(v);
	}

	function changeClass(id: string) {
		classId = id;
		goto(`?classId=${id}`, { replaceState: true });
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/game-systems/{system.id}/dnd5e/spells" style="font-size:0.8125rem;color:var(--text-muted);">← Spells</a>
			<h2 class="page__title">Spells Known / Prepared</h2>
			<p style="margin:0;font-size:0.875rem;color:var(--text-muted);">{system.name} · Cantrips, prepared, and additional spells per level</p>
		</div>
		<div style="display:flex;gap:0.5rem;">
			<a href="/game-systems/{system.id}/dnd5e/spells/slots" class="btn btn-ghost btn-sm">Spell Slots</a>
		</div>
	</div>

	{#if form?.success}<div class="form-success" style="margin-bottom:1rem;">Saved.</div>{/if}
	{#if (form as any)?.message}<div class="form-error" style="margin-bottom:1rem;">{(form as any).message}</div>{/if}

	<div style="margin-bottom:1rem;">
		<div class="field" style="margin:0;max-width:220px;">
			<label class="label" for="class-sel">Spellcasting Class</label>
			<select id="class-sel" class="input input--select" value={classId} onchange={(e) => changeClass((e.target as HTMLSelectElement).value)}>
				<option value="">— Select class —</option>
				{#each castingClasses as c}
					<option value={c.id}>{c.name}</option>
				{/each}
			</select>
		</div>
	</div>

	{#if classId && selectedClass}
		<form method="post" action="?/save" use:enhance>
			<input type="hidden" name="classId"   value={classId} />
			<input type="hidden" name="className"  value={selectedClass.name} />

			<div style="margin-bottom:0.75rem;padding:0.625rem 0.875rem;background:var(--bg-overlay);border-radius:var(--radius-md);font-size:0.8125rem;color:var(--text-muted);">
				Leave <strong>Cantrips</strong> or <strong>Prepared</strong> blank if the class doesn't use that column.
				Use <strong>Note</strong> for formula-based classes (e.g. "WIS mod + Cleric level").
			</div>

			<div class="card" style="padding:0;overflow-x:auto;">
				<table class="table" style="min-width:600px;">
					<thead>
						<tr>
							<th style="width:60px;">Level</th>
							<th style="text-align:center;width:90px;">Cantrips</th>
							<th style="text-align:center;width:90px;">Prepared</th>
							<th style="text-align:center;width:90px;">Additional</th>
							<th>Note</th>
						</tr>
					</thead>
					<tbody>
						{#each LEVELS as lvl}
							<tr>
								<td style="font-weight:700;color:var(--text-muted);">{lvl}</td>
								<td style="padding:0.25rem;">
									<input name="cantrips_{lvl}"   type="number" min="0" class="input"
										style="text-align:center;padding:0.25rem;font-size:0.875rem;"
										value={val(lvl, 'cantrips')} placeholder="—" />
								</td>
								<td style="padding:0.25rem;">
									<input name="prepared_{lvl}"   type="number" min="0" class="input"
										style="text-align:center;padding:0.25rem;font-size:0.875rem;"
										value={val(lvl, 'prepared')} placeholder="—" />
								</td>
								<td style="padding:0.25rem;">
									<input name="additional_{lvl}" type="number" min="0" class="input"
										style="text-align:center;padding:0.25rem;font-size:0.875rem;"
										value={val(lvl, 'additional')} placeholder="—" />
								</td>
								<td style="padding:0.25rem;">
									<input name="note_{lvl}" type="text" class="input"
										style="font-size:0.8125rem;padding:0.25rem 0.375rem;"
										value={val(lvl, 'note')} placeholder="e.g. WIS mod + Cleric level" />
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div style="margin-top:1rem;">
				<button type="submit" class="btn btn-primary">Save Progression</button>
			</div>
		</form>
	{:else if !classId}
		<div class="card"><p class="table__empty">Select a spellcasting class to edit its spells known progression.</p></div>
	{/if}
</div>