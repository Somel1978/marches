<!-- apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/feats/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { ConfirmModal } from '@core/ui';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const system = $derived((data as any).system);
	const feats  = $derived((data as any).feats as any[]);

	let expanded   = $state<string | null>(null);
	let editing    = $state<string | null>(null);
	let showCreate = $state(false);
	let search     = $state('');
	const filtered = $derived(search ? feats.filter((f: any) => f.name.toLowerCase().includes(search.toLowerCase())) : feats);

	function toggle(id: string) {
		expanded = expanded === id ? null : id;
		if (editing && editing !== id) editing = null;
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
		<div>
			<a href="/game-systems/{system.id}" class="back-link">← {system.name}</a>
			<h2 class="page__title">Feats</h2>
		</div>
		<div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
			<a href="/game-systems/{system.id}/dnd5e/classes"     class="btn btn-ghost btn-sm">Classes</a>
			<a href="/game-systems/{system.id}/dnd5e/species"     class="btn btn-ghost btn-sm">Species</a>
			<a href="/game-systems/{system.id}/dnd5e/backgrounds" class="btn btn-ghost btn-sm">Backgrounds</a>
			<input type="text" class="input" style="max-width:220px;" placeholder="Search feats…" bind:value={search} />
			<a href="/game-systems/{system.id}/data/import/dnd5e" class="btn btn-ghost btn-sm">Import</a>
			<button class="btn btn-primary btn-sm" onclick={() => showCreate = !showCreate}>+ New Feat</button>
		</div>
	</div>

	{#if (form as any)?.message}
		<div class="form-error" style="margin-bottom:1rem;">{(form as any).message}</div>
	{/if}

	{#if showCreate}
		<div class="card" style="margin-bottom:1rem;">
			<h3 class="section-title">New Feat</h3>
			<form method="post" action="?/create" use:enhance={() => {
				return async ({ update }) => { showCreate = false; await update(); await invalidateAll(); };
			}}>
				<div class="fields">
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:2 1 200px;">
							<label class="label" for="new-name">Name <span class="required">*</span></label>
							<input id="new-name" name="name" type="text" class="input" required />
						</div>
						<div class="field" style="flex:3 1 300px;">
							<label class="label" for="new-snippet">Snippet</label>
							<input id="new-snippet" name="snippet" type="text" class="input" placeholder="One-line summary" />
						</div>
					</div>
					<div class="field">
						<label class="label" for="new-desc">Description</label>
						<textarea id="new-desc" name="description" class="input" rows="3"></textarea>
					</div>
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:2 1 180px;">
							<label class="label" for="new-categories">Categories</label>
							<input id="new-categories" name="categories" type="text" class="input" placeholder="General, Fighting Style…" />
						</div>
						<div class="field" style="flex:2 1 180px;">
							<label class="label" for="new-prereqs">Prerequisites</label>
							<input id="new-prereqs" name="prerequisites" type="text" class="input" placeholder="STR 13 or higher…" />
						</div>
						<div class="field" style="flex:2 1 180px;">
							<label class="label" for="new-url">Details URL</label>
							<input id="new-url" name="detailsUrl" type="text" class="input" placeholder="https://…" />
						</div>
						<div class="field" style="flex:1 1 140px;">
							<label class="label" for="new-source">Source</label>
							<input id="new-source" name="source" type="text" class="input" placeholder="PHB 2024" />
						</div>
						<div class="field" style="flex:0 0 110px;">
							<label class="label" for="new-repeatable">Repeatable</label>
							<select id="new-repeatable" name="repeatable" class="input input--select">
								<option value="false">No</option>
								<option value="true">Yes</option>
							</select>
						</div>
						<div class="field" style="flex:0 0 110px;">
							<label class="label" for="new-epicboon">Epic Boon</label>
							<select id="new-epicboon" name="isEpicBoon" class="input input--select">
								<option value="false">No</option>
								<option value="true">Yes</option>
							</select>
						</div>
						<div class="field" style="flex:0 0 100px;">
							<label class="label" for="new-available">Available</label>
							<select id="new-available" name="isAvailable" class="input input--select">
								<option value="true">Yes</option>
								<option value="false">No</option>
							</select>
						</div>
					</div>
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:0 0 110px;">
							<label class="label" for="new-asi-amount">ASI grant</label>
							<select id="new-asi-amount" name="asiAmount" class="input input--select">
								<option value="">None</option>
								<option value="1">+1</option>
								<option value="2">+2</option>
							</select>
						</div>
						<div class="field" style="flex:1 1 180px;">
							<label class="label" for="new-asi-fixed">Fixed stat <span style="font-weight:400;opacity:0.65;">(empty = player picks)</span></label>
							<select id="new-asi-fixed" name="asiStatFixed" class="input input--select">
								<option value="">— Player picks —</option>
								{#each ['STRENGTH','DEXTERITY','CONSTITUTION','INTELLIGENCE','WISDOM','CHARISMA'] as st}
									<option value={st}>{st.charAt(0)+st.slice(1).toLowerCase()}</option>
								{/each}
							</select>
						</div>
						<div class="field" style="flex:2 1 220px;">
							<label class="label" for="new-asi-choices">Allowed choices <span style="font-weight:400;opacity:0.65;">(comma-sep, empty = any)</span></label>
							<input id="new-asi-choices" name="asiStatChoices" type="text" class="input" placeholder="STRENGTH,DEXTERITY" />
						</div>
					</div>
				</div>
					<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.25rem;">
						<div class="field" style="flex:1 1 140px;">
							<label class="label" for="new-grantsSkills">Grants Skills</label>
							<input id="new-grantsSkills" name="grantsSkills" class="input" placeholder="ATHLETICS,INSIGHT" />
						</div>
						<div class="field" style="flex:1 1 140px;">
							<label class="label" for="new-grantsExpertise">Grants Expertise (auto)</label>
							<input id="new-grantsExpertise" name="grantsExpertise" class="input" placeholder="ARCANA" />
						</div>
						<div class="field" style="flex:0 0 80px;">
							<label class="label" for="new-expertiseChoiceCount">Exp. picks</label>
							<input id="new-expertiseChoiceCount" name="expertiseChoiceCount" type="number" min="0" class="input" />
						</div>
						<div class="field" style="flex:1 1 140px;">
							<label class="label" for="new-expertiseChoicePool">Exp. pool</label>
							<input id="new-expertiseChoicePool" name="expertiseChoicePool" class="input" placeholder="ARCANA,HISTORY or *" />
						</div>
						<div class="field" style="flex:1 1 140px;">
							<label class="label" for="new-grantsHalfSkills">Grants Half Prof</label>
							<input id="new-grantsHalfSkills" name="grantsHalfSkills" class="input" placeholder="STEALTH" />
						</div>
						<div class="field" style="flex:1 1 140px;">
							<label class="label" for="new-grantsSavingThrows">Grants Saves</label>
							<input id="new-grantsSavingThrows" name="grantsSavingThrows" class="input" placeholder="CONSTITUTION" />
						</div>
						<div class="field" style="flex:0 0 80px;">
							<label class="label" for="new-skillChoiceCount">Skill picks</label>
							<input id="new-skillChoiceCount" name="skillChoiceCount" type="number" min="0" class="input" />
						</div>
						<div class="field" style="flex:1 1 140px;">
							<label class="label" for="new-skillChoicePool">Skill pool</label>
							<input id="new-skillChoicePool" name="skillChoicePool" class="input" placeholder="ARCANA,HISTORY" />
						</div>
						<div class="field" style="flex:0 0 80px;">
							<label class="label" for="new-savingThrowChoiceCount">Save picks</label>
							<input id="new-savingThrowChoiceCount" name="savingThrowChoiceCount" type="number" min="0" class="input" />
						</div>
						<div class="field" style="flex:1 1 140px;">
							<label class="label" for="new-savingThrowChoicePool">Save pool</label>
							<input id="new-savingThrowChoicePool" name="savingThrowChoicePool" class="input" placeholder="STRENGTH,CONSTITUTION" />
						</div>
						<div class="field" style="flex:1 1 140px;">
							<label class="label" for="new-grantsTools">Grants Tools</label>
							<input id="new-grantsTools" name="grantsTools" class="input" placeholder="Thieves' Tools" />
						</div>
						<div class="field" style="flex:0 0 70px;">
							<label class="label" for="feat-toolChoiceCount">Tool #</label>
							<input id="feat-toolChoiceCount" name="toolChoiceCount" type="number" min="0" class="input" placeholder="1" />
						</div>
						<div class="field" style="flex:1 1 150px;">
							<label class="label" for="feat-toolChoicePool">Tool pool</label>
							<input id="feat-toolChoicePool" name="toolChoicePool" class="input" placeholder="Thieves's Tools,Smith's Tools" />
						</div>
						<div class="field" style="flex:1 1 140px;">
							<label class="label" for="new-grantsLanguages">Grants Languages</label>
							<input id="new-grantsLanguages" name="grantsLanguages" class="input" placeholder="Elvish,Dwarvish" />
						</div>
						<div class="field" style="flex:0 0 70px;">
							<label class="label" for="feat-langChoiceCount">Lang #</label>
							<input id="feat-langChoiceCount" name="languageChoiceCount" type="number" min="0" class="input" placeholder="1" />
						</div>
						<div class="field" style="flex:1 1 150px;">
							<label class="label" for="feat-langChoicePool">Lang pool</label>
							<input id="feat-langChoicePool" name="languageChoicePool" class="input" placeholder="Any,Elvish,Dwarvish" />
						</div>
						<div class="field" style="flex:1 1 140px;">
							<label class="label" for="new-grantsResistances">Resistances</label>
							<input id="new-grantsResistances" name="grantsResistances" class="input" placeholder="Fire,Cold" />
						</div>
						<div class="field" style="flex:1 1 140px;">
							<label class="label" for="new-grantsImmunities">Immunities</label>
							<input id="new-grantsImmunities" name="grantsImmunities" class="input" placeholder="Necrotic,Radiant" />
						</div>
						<div class="field" style="flex:1 1 140px;">
							<label class="label" for="new-grantsVulnerabilities">Vulnerabilities</label>
							<input id="new-grantsVulnerabilities" name="grantsVulnerabilities" class="input" placeholder="Bludgeoning" />
						</div>
						<div class="field" style="flex:0 0 70px;">
							<label class="label" for="new-rcc">Res.picks</label>
							<input id="new-rcc" name="resistanceChoiceCount" type="number" min="0" class="input" />
						</div>
						<div class="field" style="flex:1 1 100px;">
							<label class="label" for="new-rcp">Res. pool</label>
							<input id="new-rcp" name="resistanceChoicePool" class="input" placeholder="FIRE,COLD" />
						</div>
						<div class="field" style="flex:0 0 70px;">
							<label class="label" for="new-icc">Imm.picks</label>
							<input id="new-icc" name="immunityChoiceCount" type="number" min="0" class="input" />
						</div>
						<div class="field" style="flex:1 1 100px;">
							<label class="label" for="new-icp">Imm. pool</label>
							<input id="new-icp" name="immunityChoicePool" class="input" placeholder="FIRE,COLD" />
						</div>
						<div class="field" style="flex:0 0 70px;">
							<label class="label" for="new-vcc">Vul.picks</label>
							<input id="new-vcc" name="vulnerabilityChoiceCount" type="number" min="0" class="input" />
						</div>
						<div class="field" style="flex:1 1 100px;">
							<label class="label" for="new-vcp">Vul. pool</label>
							<input id="new-vcp" name="vulnerabilityChoicePool" class="input" placeholder="FIRE,COLD" />
						</div>
						<div class="field" style="flex:1 1 160px;">
							<label class="label" for="new-grantsSpeed">Speed Bonuses</label>
							<input id="new-grantsSpeed" name="grantsSpeed" class="input" placeholder="WALK:10,SWIM:30" />
							<p style="font-size:0.6875rem;color:var(--text-muted);margin:0.25rem 0 0;">Format: <code>WALK:10,FLY:30</code> — additive speed bonus in feet per movement type</p>
						</div>
						<div class="field" style="flex:1 1 160px;">
							<label class="label" for="new-grantsSenses">Grants Senses</label>
							<input id="new-grantsSenses" name="grantsSenses" class="input" placeholder="Blindsense 10 ft" />
						</div>
						<div class="field" style="flex:1 1 160px;">
							<label class="label" for="new-grantsSpeed">Speed Bonuses</label>
							<input id="new-grantsSpeed" name="grantsSpeed" class="input" placeholder="WALK:10,SWIM:30" />
							<p style="font-size:0.6875rem;color:var(--text-muted);margin:0.25rem 0 0;">Format: <code>WALK:10,FLY:30</code> — additive speed bonus in feet per movement type</p>
						</div>
						<div class="field" style="flex:1 1 160px;">
							<label class="label" for="new-grantsSenses">Grants Senses</label>
							<input id="new-grantsSenses" name="grantsSenses" class="input" placeholder="Blindsense 10 ft" />
						</div>
						<div class="field" style="flex:2 1 200px;">
							<label class="label" for="new-grantsInnateSpells">Innate Spells</label>
							<input id="new-grantsInnateSpells" name="grantsInnateSpells" class="input" placeholder="Faerie Fire:1:0,Darkness:3:1" />
							<p style="font-size:0.6875rem;color:var(--text-muted);margin:0.25rem 0 0;">Format: <code>SpellName:minLvl:uses[/:true]</code> · uses 0=at will · last seg=can use slots · e.g. <code>Faerie Fire:1:0,Darkness:3:1,Daylight:5:1:true</code></p>
						</div>
					</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => showCreate = false}>Cancel</button>
					<button type="submit" class="btn btn-primary btn-sm">Create</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="card" style="padding:0;">
		{#if feats.length}
			{#each filtered as feat}
				<!-- Row header -->
				<div
					onclick={() => toggle(feat.id)} onkeydown={(e) => e.key === "Enter" && toggle(feat.id)} role="button" tabindex="0"
					style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1rem; cursor:pointer; border-bottom:1px solid var(--border-muted); flex-wrap:wrap; {expanded === feat.id ? 'background:var(--bg-overlay);' : ''}"
				>
					<div style="flex:2 1 160px; min-width:0;">
						<div style="font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{feat.name}</div>
						{#if feat.snippet}<div style="font-size:0.8125rem; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{feat.snippet}</div>{/if}
					</div>
					<div style="flex:2 1 120px; min-width:0; display:flex; flex-wrap:wrap; gap:2px;">
						{#if feat.categories}
							{#each feat.categories.split(',') as cat}
								<span class="badge badge-muted" style="font-size:0.6875rem;">{cat.trim()}</span>
							{/each}
						{/if}
					</div>
					<div style="display:flex; align-items:center; gap:0.375rem; flex-shrink:0; flex-wrap:wrap;">
						{#if feat.isEpicBoon}<span class="badge badge-warning" style="font-size:0.75rem;">Epic</span>{/if}
						{#if feat.repeatable}<span class="badge badge-accent" style="font-size:0.75rem;">Rep.</span>{/if}
						{#if feat.asiAmount}<span class="badge badge-accent" style="font-size:0.75rem;">+{feat.asiAmount} {feat.asiStatFixed ? feat.asiStatFixed.slice(0,3) : 'stat'}</span>{/if}
						{#if feat.isAvailable}<span class="badge badge-success" style="font-size:0.75rem;">✓</span>{:else}<span class="badge badge-muted" style="font-size:0.75rem;">—</span>{/if}
					</div>
					<div onclick={(e) => e.stopPropagation()} role="presentation" style="flex-shrink:0;">
						<form id="cf-e69637" method="post" action="?/delete" use:enhance={() => {
				return async ({ update }) => { await update(); await invalidateAll(); };
			}} style="margin:0;">
							<input type="hidden" name="id" value={feat.id} />
							<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);"  onclick={() => window.confirmModal('Confirm', `Delete "${feat.name}"?`).then(ok => { if(ok)(document.getElementById("cf-e69637") as HTMLFormElement).requestSubmit(); })}>✕</button>
						</form>
					</div>
				</div>

				<!-- Expanded panel -->
				{#if expanded === feat.id}
					<div style="padding:1rem; background:var(--bg-muted); border-bottom:1px solid var(--border-accent); word-break:break-word; overflow-wrap:anywhere;">
						{#if editing === feat.id}
							<form method="post" action="?/update" use:enhance={() => {
								return async ({ update }) => { await update(); await invalidateAll(); editing = null; };
							}}>
								<input type="hidden" name="id" value={feat.id} />
								<div class="fields">
									<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
										<div class="field" style="flex:2 1 200px;">
											<label class="label" for="ename-{feat.id}">Name</label>
											<input id="ename-{feat.id}" name="name" type="text" class="input" value={feat.name} required />
										</div>
										<div class="field" style="flex:3 1 300px;">
											<label class="label" for="esnippet-{feat.id}">Snippet</label>
											<input id="esnippet-{feat.id}" name="snippet" type="text" class="input" value={feat.snippet ?? ''} />
										</div>
									</div>
									<div class="field">
										<label class="label" for="edesc-{feat.id}">Description</label>
										<textarea id="edesc-{feat.id}" name="description" class="input" rows="4">{feat.description ?? ''}</textarea>
									</div>
									<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
										<div class="field" style="flex:2 1 180px;">
											<label class="label" for="ecat-{feat.id}">Categories</label>
											<input id="ecat-{feat.id}" name="categories" type="text" class="input" value={feat.categories ?? ''} />
										</div>
										<div class="field" style="flex:2 1 180px;">
											<label class="label" for="eprereqs-{feat.id}">Prerequisites</label>
											<input id="eprereqs-{feat.id}" name="prerequisites" type="text" class="input" value={feat.prerequisites ?? ''} />
										</div>
										<div class="field" style="flex:2 1 180px;">
											<label class="label" for="eurl-{feat.id}">Details URL</label>
											<input id="eurl-{feat.id}" name="detailsUrl" type="text" class="input" value={feat.detailsUrl ?? ''} />
										</div>
										<div class="field" style="flex:1 1 140px; margin:0;">
											<label class="label" for="esrc-{feat.id}">Source</label>
											<input id="esrc-{feat.id}" name="source" type="text" class="input" value={(feat as any).source ?? ''} />
										</div>
										<div class="field" style="flex:0 0 110px;">
											<label class="label" for="erep-{feat.id}">Repeatable</label>
											<select id="erep-{feat.id}" name="repeatable" class="input input--select">
												<option value="false" selected={!feat.repeatable}>No</option>
												<option value="true"  selected={feat.repeatable}>Yes</option>
											</select>
										</div>
										<div class="field" style="flex:0 0 110px;">
											<label class="label" for="eepic-{feat.id}">Epic Boon</label>
											<select id="eepic-{feat.id}" name="isEpicBoon" class="input input--select">
												<option value="false" selected={!feat.isEpicBoon}>No</option>
												<option value="true"  selected={feat.isEpicBoon}>Yes</option>
											</select>
										</div>
										<div class="field" style="flex:0 0 100px;">
											<label class="label" for="eavail-{feat.id}">Available</label>
											<select id="eavail-{feat.id}" name="isAvailable" class="input input--select">
												<option value="true"  selected={feat.isAvailable}>Yes</option>
												<option value="false" selected={!feat.isAvailable}>No</option>
											</select>
										</div>
									</div>
									<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
										<div class="field" style="flex:0 0 110px;">
											<label class="label" for="easi-amount-{feat.id}">ASI grant</label>
											<select id="easi-amount-{feat.id}" name="asiAmount" class="input input--select">
												<option value="" selected={!feat.asiAmount}>None</option>
												<option value="1" selected={feat.asiAmount === 1}>+1</option>
												<option value="2" selected={feat.asiAmount === 2}>+2</option>
											</select>
										</div>
										<div class="field" style="flex:1 1 180px;">
											<label class="label" for="easi-fixed-{feat.id}">Fixed stat <span style="font-weight:400;opacity:0.65;">(empty = player picks)</span></label>
											<select id="easi-fixed-{feat.id}" name="asiStatFixed" class="input input--select">
												<option value="" selected={!feat.asiStatFixed}>— Player picks —</option>
												{#each ['STRENGTH','DEXTERITY','CONSTITUTION','INTELLIGENCE','WISDOM','CHARISMA'] as st}
													<option value={st} selected={feat.asiStatFixed === st}>{st.charAt(0)+st.slice(1).toLowerCase()}</option>
												{/each}
											</select>
										</div>
										<div class="field" style="flex:2 1 220px;">
											<label class="label" for="easi-choices-{feat.id}">Allowed choices <span style="font-weight:400;opacity:0.65;">(comma-sep, empty = any)</span></label>
											<input id="easi-choices-{feat.id}" name="asiStatChoices" type="text" class="input" value={feat.asiStatChoices ?? ''} placeholder="STRENGTH,DEXTERITY" />
										</div>
									</div>
								</div>
									<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.25rem;">
										<div class="field" style="flex:1 1 140px;">
											<label class="label" for="gs-{feat.id}">Grants Skills</label>
											<input id="gs-{feat.id}" name="grantsSkills" class="input" placeholder="ATHLETICS,INSIGHT" value={feat.grantsSkills ?? ''} />
										</div>
										<div class="field" style="flex:1 1 140px;">
											<label class="label" for="ge-{feat.id}">Expertise (auto)</label>
											<input id="ge-{feat.id}" name="grantsExpertise" class="input" placeholder="ARCANA" value={feat.grantsExpertise ?? ''} />
										</div>
										<div class="field" style="flex:0 0 80px;">
											<label class="label" for="ecc-{feat.id}">Exp. picks</label>
											<input id="ecc-{feat.id}" name="expertiseChoiceCount" type="number" min="0" class="input" value={(feat as any).expertiseChoiceCount ?? ''} />
										</div>
										<div class="field" style="flex:1 1 140px;">
											<label class="label" for="ecp-{feat.id}">Exp. pool</label>
											<input id="ecp-{feat.id}" name="expertiseChoicePool" class="input" placeholder="ARCANA,HISTORY or *" value={(feat as any).expertiseChoicePool ?? ''} />
										</div>
										<div class="field" style="flex:1 1 140px;">
											<label class="label" for="gh-{feat.id}">Grants Half Prof</label>
											<input id="gh-{feat.id}" name="grantsHalfSkills" class="input" placeholder="STEALTH" value={feat.grantsHalfSkills ?? ''} />
										</div>
										<div class="field" style="flex:1 1 140px;">
											<label class="label" for="gsv-{feat.id}">Grants Saves</label>
											<input id="gsv-{feat.id}" name="grantsSavingThrows" class="input" placeholder="CONSTITUTION" value={feat.grantsSavingThrows ?? ''} />
										</div>
										<div class="field" style="flex:0 0 80px;">
											<label class="label" for="scc-{feat.id}">Skill picks</label>
											<input id="scc-{feat.id}" name="skillChoiceCount" type="number" min="0" class="input" value={feat.skillChoiceCount ?? ''} />
										</div>
										<div class="field" style="flex:1 1 140px;">
											<label class="label" for="scp-{feat.id}">Skill pool</label>
											<input id="scp-{feat.id}" name="skillChoicePool" class="input" placeholder="ARCANA,HISTORY" value={feat.skillChoicePool ?? ''} />
										</div>
										<div class="field" style="flex:0 0 80px;">
											<label class="label" for="stcc-{feat.id}">Save picks</label>
											<input id="stcc-{feat.id}" name="savingThrowChoiceCount" type="number" min="0" class="input" value={feat.savingThrowChoiceCount ?? ''} />
										</div>
										<div class="field" style="flex:1 1 140px;">
											<label class="label" for="stcp-{feat.id}">Save pool</label>
											<input id="stcp-{feat.id}" name="savingThrowChoicePool" class="input" placeholder="STRENGTH,CONSTITUTION" value={feat.savingThrowChoicePool ?? ''} />
										</div>
										<div class="field" style="flex:1 1 140px; ">
											<label class="label" for="fe-{feat.id}-gt">Grants Tools</label>
											<input id="fe-{feat.id}-gt" name="grantsTools" class="input" placeholder="Thieves' Tools" value={feat.grantsTools ?? ''} />
										</div>
										<div class="field" style="flex:0 0 70px; margin:0;">
											<label class="label" for="feat-e-toolChoiceCount-{feat.id}">Tool #</label>
											<input id="feat-e-toolChoiceCount-{feat.id}" name="toolChoiceCount" type="number" min="0" class="input" placeholder="1" value={feat.toolChoiceCount ?? ''} />
										</div>
										<div class="field" style="flex:1 1 150px; margin:0;">
											<label class="label" for="feat-e-toolChoicePool-{feat.id}">Tool pool</label>
											<input id="feat-e-toolChoicePool-{feat.id}" name="toolChoicePool" class="input" placeholder="Thieves's Tools,Smith's Tools" value={feat.toolChoicePool ?? ''} />
										</div>
										<div class="field" style="flex:1 1 140px; ">
											<label class="label" for="fe-{feat.id}-gl">Grants Languages</label>
											<input id="fe-{feat.id}-gl" name="grantsLanguages" class="input" placeholder="Elvish,Dwarvish" value={feat.grantsLanguages ?? ''} />
										</div>
										<div class="field" style="flex:0 0 70px; margin:0;">
											<label class="label" for="feat-e-langChoiceCount-{feat.id}">Lang #</label>
											<input id="feat-e-langChoiceCount-{feat.id}" name="languageChoiceCount" type="number" min="0" class="input" placeholder="1" value={feat.languageChoiceCount ?? ''} />
										</div>
										<div class="field" style="flex:1 1 150px; margin:0;">
											<label class="label" for="feat-e-langChoicePool-{feat.id}">Lang pool</label>
											<input id="feat-e-langChoicePool-{feat.id}" name="languageChoicePool" class="input" placeholder="Any,Elvish,Dwarvish" value={feat.languageChoicePool ?? ''} />
										</div>
										<div class="field" style="flex:1 1 140px; ">
											<label class="label" for="fe-{feat.id}-gr">Resistances</label>
											<input id="fe-{feat.id}-gr" name="grantsResistances" class="input" placeholder="Fire,Cold" value={feat.grantsResistances ?? ''} />
										</div>
										<div class="field" style="flex:1 1 140px; ">
											<label class="label" for="fe-{feat.id}-gi">Immunities</label>
											<input id="fe-{feat.id}-gi" name="grantsImmunities" class="input" placeholder="Necrotic,Radiant" value={feat.grantsImmunities ?? ''} />
										</div>
										<div class="field" style="flex:1 1 140px; ">
											<label class="label" for="fe-{feat.id}-gv">Vulnerabilities</label>
											<input id="fe-{feat.id}-gv" name="grantsVulnerabilities" class="input" placeholder="Bludgeoning" value={feat.grantsVulnerabilities ?? ''} />
										</div>
										<div class="field" style="flex:0 0 70px; margin:0;">
											<label class="label" for="ercc-{feat.id}">Res.picks</label>
											<input id="ercc-{feat.id}" name="resistanceChoiceCount" type="number" min="0" class="input" value={(feat as any).resistanceChoiceCount ?? ''} />
										</div>
										<div class="field" style="flex:1 1 100px; margin:0;">
											<label class="label" for="ercp-{feat.id}">Res. pool</label>
											<input id="ercp-{feat.id}" name="resistanceChoicePool" class="input" placeholder="FIRE,COLD" value={(feat as any).resistanceChoicePool ?? ''} />
										</div>
										<div class="field" style="flex:0 0 70px; margin:0;">
											<label class="label" for="eicc-{feat.id}">Imm.picks</label>
											<input id="eicc-{feat.id}" name="immunityChoiceCount" type="number" min="0" class="input" value={(feat as any).immunityChoiceCount ?? ''} />
										</div>
										<div class="field" style="flex:1 1 100px; margin:0;">
											<label class="label" for="eicp-{feat.id}">Imm. pool</label>
											<input id="eicp-{feat.id}" name="immunityChoicePool" class="input" placeholder="FIRE,COLD" value={(feat as any).immunityChoicePool ?? ''} />
										</div>
										<div class="field" style="flex:0 0 70px; margin:0;">
											<label class="label" for="evcc-{feat.id}">Vul.picks</label>
											<input id="evcc-{feat.id}" name="vulnerabilityChoiceCount" type="number" min="0" class="input" value={(feat as any).vulnerabilityChoiceCount ?? ''} />
										</div>
										<div class="field" style="flex:1 1 100px; margin:0;">
											<label class="label" for="evcp-{feat.id}">Vul. pool</label>
											<input id="evcp-{feat.id}" name="vulnerabilityChoicePool" class="input" placeholder="FIRE,COLD" value={(feat as any).vulnerabilityChoicePool ?? ''} />
										</div>
										<div class="field" style="flex:1 1 160px; margin:0;">
											<label class="label" for="fe-{feat.id}-gsp">Speed Bonuses</label>
											<input id="fe-{feat.id}-gsp" name="grantsSpeed" class="input" placeholder="WALK:10,SWIM:30" value={feat.grantsSpeed ?? ''} />
											<p style="font-size:0.6875rem;color:var(--text-muted);margin:0.25rem 0 0;">Format: <code>WALK:10,FLY:30</code> — additive speed bonus in feet per movement type</p>
										</div>
										<div class="field" style="flex:1 1 160px; margin:0;">
											<label class="label" for="fe-{feat.id}-gse">Grants Senses</label>
											<input id="fe-{feat.id}-gse" name="grantsSenses" class="input" placeholder="Blindsense 10 ft" value={feat.grantsSenses ?? ''} />
										</div>
										<div class="field" style="flex:2 1 200px; ">
											<label class="label" for="fe-{feat.id}-gis">Innate Spells</label>
											<input id="fe-{feat.id}-gis" name="grantsInnateSpells" class="input" placeholder="Faerie Fire:1:0,Darkness:3:1" value={feat.grantsInnateSpells ?? ''} />
											<p style="font-size:0.6875rem;color:var(--text-muted);margin:0.25rem 0 0;">Format: <code>SpellName:minLvl:uses[/:true]</code> · uses 0=at will · last seg=can use slots · e.g. <code>Faerie Fire:1:0,Darkness:3:1,Daylight:5:1:true</code></p>
										</div>
									</div>
								<div class="form-actions">
									<button type="button" class="btn btn-ghost btn-sm" onclick={() => editing = null}>Cancel</button>
									<button type="submit" class="btn btn-primary btn-sm">Save</button>
								</div>
							</form>
						{:else}
							<div style="display:grid; gap:0.75rem;">
								{#if feat.description}
									<div>
										<p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.25rem;">Description</p>
										<p style="margin:0; font-size:0.875rem; color:var(--text-secondary); line-height:1.6; white-space:pre-wrap;">{feat.description}</p>
									</div>
								{/if}
								<div style="display:flex; gap:1.5rem; flex-wrap:wrap;">
									{#if feat.prerequisites}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">Prerequisites</p><p style="margin:0; font-size:0.875rem;">{feat.prerequisites}</p></div>
									{/if}
									{#if feat.categories}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">Categories</p><p style="margin:0; font-size:0.875rem;">{feat.categories}</p></div>
									{/if}
									{#if feat.grantsSkills}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">Grants Skills</p><p style="margin:0; font-size:0.875rem;">{feat.grantsSkills}</p></div>
									{/if}
									{#if feat.grantsExpertise}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">Expertise</p><p style="margin:0; font-size:0.875rem;">{feat.grantsExpertise}</p></div>
									{/if}
									{#if feat.grantsHalfSkills}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">Half Prof</p><p style="margin:0; font-size:0.875rem;">{feat.grantsHalfSkills}</p></div>
									{/if}
									{#if feat.grantsSavingThrows}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">Grants Saves</p><p style="margin:0; font-size:0.875rem;">{feat.grantsSavingThrows}</p></div>
									{/if}
									{#if feat.skillChoiceCount}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">Skill Choice</p><p style="margin:0; font-size:0.875rem;">Pick {feat.skillChoiceCount}{feat.skillChoicePool ? ` from ${feat.skillChoicePool}` : ""}</p></div>
									{/if}
									{#if feat.detailsUrl}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">Reference</p><a href={feat.detailsUrl} target="_blank" style="font-size:0.875rem;">↗ Link</a></div>
									{/if}
									{#if (feat as any).source}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">Source</p><p style="margin:0; font-size:0.875rem;">{(feat as any).source}</p></div>
									{/if}
								</div>
								<div><button class="btn btn-ghost btn-sm" onclick={() => editing = feat.id}>Edit</button></div>
							</div>
						{/if}
					</div>
				{/if}
			{/each}
		{:else}
			<p class="table__empty">No feats yet. Create one above or import from XLSX.</p>
		{/if}
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