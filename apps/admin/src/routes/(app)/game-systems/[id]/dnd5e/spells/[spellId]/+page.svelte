<!-- apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/spells/[spellId]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { ConfirmModal } from '@core/ui';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const system = $derived((data as any).system);
	const spell  = $derived((data as any).spell);

	const SCHOOLS = ['Abjuration','Conjuration','Divination','Enchantment','Evocation','Illusion','Necromancy','Transmutation'];

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
		<div>
			<a href="/game-systems/{system.id}/dnd5e/spells" style="font-size:0.8125rem;color:var(--text-muted);">← Spells</a>
			<h2 class="page__title">{spell.name}</h2>
			<p style="margin:0;font-size:0.875rem;color:var(--text-muted);">
				{spell.school} · {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`}
				{#if spell.isLegacy} · <span style="color:var(--text-muted);">Legacy</span>{/if}
			</p>
		</div>
		<form id="del-spell" method="post" action="?/delete" use:enhance>
			<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);"
				onclick={() => askConfirm('Delete spell', `Delete "${spell.name}"? This cannot be undone.`, () => {
					(document.getElementById('del-spell') as HTMLFormElement)?.requestSubmit();
				})}>Delete</button>
		</form>
	</div>

	{#if form?.success}<div class="form-success" style="margin-bottom:1rem;">Saved.</div>{/if}
	{#if form?.message}<div class="form-error"  style="margin-bottom:1rem;">{(form as any).message}</div>{/if}

	<form method="post" action="?/update" use:enhance>
		<div class="card" style="display:flex;flex-direction:column;gap:0.75rem;padding:1rem;">

			<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
				<div class="field">
					<label class="label" for="sp-name">Name</label>
					<input id="sp-name" name="name" type="text" class="input" value={spell.name} required />
				</div>
				<div class="field">
					<label class="label" for="sp-link">Link <span class="table__muted">(optional)</span></label>
					<input id="sp-link" name="link" type="url" class="input" value={spell.link ?? ''} />
				</div>
			</div>

			<div style="display:grid;grid-template-columns:100px 1fr 1fr;gap:0.75rem;">
				<div class="field">
					<label class="label" for="sp-level">Level</label>
					<input id="sp-level" name="level" type="number" class="input" min="0" max="9" value={spell.level} required />
				</div>
				<div class="field">
					<label class="label" for="sp-school">School</label>
					<select id="sp-school" name="school" class="input input--select">
						{#each SCHOOLS as s}<option value={s} selected={spell.school === s}>{s}</option>{/each}
					</select>
				</div>
				<div class="field">
					<label class="label" for="sp-spellList">Spell List <span class="table__muted">(comma-separated)</span></label>
					<input id="sp-spellList" name="spellList" type="text" class="input" value={spell.spellList ?? ''} placeholder="Wizard, Sorcerer" />
				</div>
			</div>

			<div style="display:flex;gap:1rem;flex-wrap:wrap;">
				{#each [['concentration','Concentration'],['ritual','Ritual'],['isHomebrew','Homebrew'],['isLegacy','Legacy'],['requiresSavingThrow','Saving Throw'],['requiresAttackRoll','Attack Roll'],['canCastAtHigherLevel','Higher Level']] as [k, label]}
					<label style="display:flex;align-items:center;gap:0.375rem;font-size:0.875rem;cursor:pointer;">
						<input type="checkbox" name={k} value="true" checked={(spell as any)[k]} onchange={(e) => {
							const inp = e.currentTarget as HTMLInputElement;
							inp.value = inp.checked ? 'true' : 'false';
						}} />
						{label}
					</label>
				{/each}
			</div>

			<hr style="border-color:var(--border-muted);margin:0.25rem 0;" />
			<p style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin:0;">Cantrip Damage (level 0 only)</p>
			<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;">
				{#each [['cantripDamage','Base'],['cantripDamageLvl5','Lv 5'],['cantripDamageLvl11','Lv 11'],['cantripDamageLvl17','Lv 17']] as [k, lbl]}
					<div class="field" style="margin:0;">
						<label class="label" for="sp-{k}">{lbl}</label>
						<input id="sp-{k}" name={k} type="text" class="input" value={(spell as any)[k] ?? ''} placeholder="e.g. 1d6 Fire" />
					</div>
				{/each}
			</div>

			<p style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin:0;">Spell Damage & Upcast</p>
			<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;">
				{#each [['spellDamage','Damage'],['spellUpcastPerSlot','Upcast Per Slot'],['spellUpcastEveryTwoSlots','Upcast Every 2 Slots']] as [k, lbl]}
					<div class="field" style="margin:0;">
						<label class="label" for="sp-{k}">{lbl}</label>
						<input id="sp-{k}" name={k} type="text" class="input" value={(spell as any)[k] ?? ''} />
					</div>
				{/each}
			</div>
			<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
				<div class="field" style="margin:0;">
					<label class="label" for="sp-spellProgression">Progression <span class="table__muted">([3=3d8][5=4d8])</span></label>
					<input id="sp-spellProgression" name="spellProgression" type="text" class="input" value={spell.spellProgression ?? ''} />
				</div>
				<div class="field" style="margin:0;">
					<label class="label" for="sp-spellProgressionNote">Progression Note</label>
					<input id="sp-spellProgressionNote" name="spellProgressionNote" type="text" class="input" value={spell.spellProgressionNote ?? ''} />
				</div>
			</div>

			<p style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin:0;">Range, Area, Duration</p>
			<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:0.5rem;">
				{#each [['rangeOrigin','Origin'],['rangeValue','Range (ft)'],['aoeType','AoE Type'],['aoeValue','AoE (ft)'],['durationType','Duration']] as [k, lbl]}
					<div class="field" style="margin:0;">
						<label class="label" for="sp-{k}">{lbl}</label>
						<input id="sp-{k}" name={k} type="text" class="input" value={(spell as any)[k] ?? ''} />
					</div>
				{/each}
			</div>
			<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
				{#each [['durationInterval','Duration Interval'],['durationUnit','Duration Unit']] as [k, lbl]}
					<div class="field" style="margin:0;">
						<label class="label" for="sp-{k}">{lbl}</label>
						<input id="sp-{k}" name={k} type="text" class="input" value={(spell as any)[k] ?? ''} />
					</div>
				{/each}
			</div>

			<div class="field">
				<label class="label" for="sp-tags">Tags <span class="table__muted">(comma-separated)</span></label>
				<input id="sp-tags" name="tags" type="text" class="input" value={spell.tags ?? ''} placeholder="Damage, Control" />
			</div>

			<button type="submit" class="btn btn-primary">Save Changes</button>
		</div>
	</form>
</div>

<ConfirmModal
	open={_confirmOpen}
	title={_confirmTitle}
	message={_confirmMsg}
	onconfirm={() => { _confirmOpen = false; _confirmCb(); }}
	oncancel={() => { _confirmOpen = false; }}
/>