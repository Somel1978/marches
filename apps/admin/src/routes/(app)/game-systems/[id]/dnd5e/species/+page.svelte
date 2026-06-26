<!-- apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/species/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { ConfirmModal } from '@core/ui';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const system  = $derived((data as any).system);
	const species = $derived((data as any).species ?? []);

	let expandedSpecies = $state<string | null>(null);
	let showNew         = $state(false);
	let editingTrait    = $state<string | null>(null);
	let search          = $state('');
	const filtered = $derived(search ? species.filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase())) : species);

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
			<a href="/game-systems" class="back-link">← Game Systems</a>
			<h2 class="page__title">{system.name} — Species</h2>
		</div>
		<div style="display:flex; gap:0.5rem; flex-wrap:wrap">
			<a href="/game-systems/{system.id}/dnd5e/classes"     class="btn btn-ghost btn-sm">Classes</a>
			<a href="/game-systems/{system.id}/dnd5e/backgrounds" class="btn btn-ghost btn-sm">Backgrounds</a>
			<button type="button" class="btn btn-primary btn-sm" onclick={() => showNew = !showNew}>+ New species</button>
		<input type="text" class="input" style="max-width:220px;" placeholder="Search species…" bind:value={search} />
		</div>
	</div>

	{#if showNew}
		<div class="card" style="margin-bottom:1rem;">
			<h3 class="section-title">New species</h3>
			<form method="post" action="?/create" use:enhance={() => {
				return async ({ update }) => { await update(); await invalidateAll(); showNew = false; };
			}}>
				<div class="fields">
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:2 1 200px;">
							<label class="label" for="sname">Name</label>
							<input id="sname" name="name" type="text" class="input" required />
						</div>
						<div class="field" style="flex:1 1 100px;">
							<label class="label" for="isSubrace">Is subrace</label>
							<select id="isSubrace" name="isSubrace" class="input input--select">
								<option value="false">No</option>
								<option value="true">Yes</option>
							</select>
						</div>
						<div class="field" style="flex:1 1 100px;">
							<label class="label" for="isLegacy">Is legacy</label>
							<select id="isLegacy" name="isLegacy" class="input input--select">
								<option value="false">No</option>
								<option value="true">Yes</option>
							</select>
						</div>
					</div>
					<div class="field">
						<label class="label" for="sdesc">Description <span class="optional">(optional)</span></label>
						<textarea id="sdesc" name="description" class="input" rows="2"></textarea>
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => showNew = false}>Cancel</button>
					<button type="submit" class="btn btn-primary btn-sm">Create</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="card">
		{#if species.length}
			<div style="display:flex; flex-direction:column; gap:0.5rem;">
				{#each filtered as s}
					<div style="border:1px solid var(--border-muted); border-radius:var(--radius-md); overflow:hidden;">
						<div style="display:flex; align-items:center; gap:0.75rem; padding:0.625rem 0.75rem; background:var(--bg-overlay); flex-wrap:wrap">
							<button type="button" style="flex:1; text-align:left; background:none; border:none; cursor:pointer; font-weight:600;"
								onclick={() => expandedSpecies = expandedSpecies === s.id ? null : s.id}>
								{s.name}
								{#if s.isSubrace}<span class="badge badge-muted">Subrace</span>{/if}
								{#if s.isLegacy}<span class="badge badge-warning">Legacy</span>{/if}
								<span class="badge badge-muted">{s.traits?.length ?? 0} traits</span>
							</button>
							<form id="cf-9d8908" method="post" action="?/deleteSpecies" use:enhance={() => {
				return async ({ update }) => { await update(); await invalidateAll(); };
			}} style="margin:0;">
								<input type="hidden" name="id" value={s.id} />
								<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);"  onclick={() => window.confirmModal('Confirm', `Delete "${s.name}"?`).then(ok => { if(ok)(document.getElementById("cf-9d8908") as HTMLFormElement).requestSubmit(); })}>✕</button>
							</form>
						</div>

						{#if expandedSpecies === s.id}
							<div style="padding:0.75rem; border-top:1px solid var(--border-muted);">
								<!-- ── Species edit ──────────────────────────────────────────── -->
								<form method="post" action="?/updateSpecies" use:enhance={() => {
									return async ({ update }) => { await update(); await invalidateAll(); };
								}} style="margin-bottom:0.75rem; padding-bottom:0.75rem; border-bottom:1px solid var(--border-muted);">
									<input type="hidden" name="id" value={s.id} />
									<div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:flex-end; margin-bottom:0.375rem;">
										<div class="field" style="flex:2 1 160px; margin:0;">
											<label class="label" for="sname-{s.id}">Name</label>
											<input id="sname-{s.id}" name="name" type="text" class="input" value={s.name} required />
										</div>
										<div class="field" style="flex:0 0 80px; margin:0;">
											<label class="label" for="ssort-{s.id}">Sort order</label>
											<input id="ssort-{s.id}" name="sortOrder" type="number" class="input" value={s.sortOrder ?? 0} />
										</div>
										<div class="field" style="flex:0 0 90px; margin:0;">
											<label class="label" for="savail-{s.id}">Available</label>
											<select id="savail-{s.id}" name="isAvailable" class="input input--select">
												<option value="true"  selected={s.isAvailable}>Yes</option>
												<option value="false" selected={!s.isAvailable}>No</option>
											</select>
										</div>
										<div class="field" style="flex:0 0 90px; margin:0;">
											<label class="label" for="ssub-{s.id}">Subrace</label>
											<select id="ssub-{s.id}" name="isSubrace" class="input input--select">
												<option value="false" selected={!s.isSubrace}>No</option>
												<option value="true"  selected={s.isSubrace}>Yes</option>
											</select>
										</div>
										<div class="field" style="flex:0 0 90px; margin:0;">
											<label class="label" for="sleg-{s.id}">Legacy</label>
											<select id="sleg-{s.id}" name="isLegacy" class="input input--select">
												<option value="false" selected={!s.isLegacy}>No</option>
												<option value="true"  selected={s.isLegacy}>Yes</option>
											</select>
										</div>
									</div>
									<div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.375rem;">
										<div class="field" style="flex:1 1 160px; margin:0;">
											<label class="label" for="ssource-{s.id}">Source</label>
											<input id="ssource-{s.id}" name="source" type="text" class="input" value={s.source ?? ''} />
										</div>
										<div class="field" style="flex:2 1 200px; margin:0;">
											<label class="label" for="slink-{s.id}">Link</label>
											<input id="slink-{s.id}" name="link" type="url" class="input" value={s.link ?? ''} />
										</div>
									</div>
									<div class="field" style="margin:0;">
										<label class="label" for="sdesc-{s.id}">Description</label>
										<textarea id="sdesc-{s.id}" name="description" class="input" rows="2">{s.description ?? ''}</textarea>
									</div>
									<div style="display:flex; justify-content:flex-end; margin-top:0.375rem;">
										<button type="submit" class="btn btn-primary btn-sm">Save species</button>
									</div>
								</form>
								{#if s.traits?.length}
									<div style="display:flex; flex-direction:column; gap:0.25rem; margin-bottom:0.5rem;">
										{#each s.traits as t}
											<div style="background:var(--bg-surface); border-radius:var(--radius-sm); overflow:hidden;">
												<div style="display:flex; align-items:center; gap:0.5rem; padding:0.375rem 0.5rem; flex-wrap:wrap">
													{#if t.requiredLevel}<span class="badge badge-muted">Lv {t.requiredLevel}</span>{/if}
													<span style="flex:1; font-size:0.8125rem; font-weight:500;">{t.name}</span>
													{#if t.description && editingTrait !== t.id}<span style="font-size:0.75rem; color:var(--text-muted); flex:2;">{t.description}</span>{/if}
													<button type="button" class="btn btn-ghost btn-sm" style="font-size:0.75rem;"
														onclick={() => editingTrait = editingTrait === t.id ? null : t.id}>
														{editingTrait === t.id ? 'Cancel' : 'Edit'}
													</button>
													<form method="post" action="?/deleteTrait" use:enhance={() => {
														return async ({ update }) => { await update(); await invalidateAll(); };
													}} style="margin:0;">
														<input type="hidden" name="id" value={t.id} />
														<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger); font-size:0.75rem;">✕</button>
													</form>
												</div>
												{#if editingTrait === t.id}
													<form method="post" action="?/updateTrait" use:enhance={() => {
														return async ({ update }) => { await update(); await invalidateAll(); editingTrait = null; };
													}} style="padding:0.5rem 0.625rem; border-top:1px solid var(--border-muted); background:var(--bg-muted);">
														<input type="hidden" name="id" value={t.id} />
														<div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:flex-end;">
															<div class="field" style="flex:0 0 55px; margin:0;">
																<label class="label" for="tl-{t.id}">Level</label>
																<input id="tl-{t.id}" name="requiredLevel" type="number" class="input" min="1" max="20" value={t.requiredLevel ?? ''} placeholder="—" />
															</div>
															<div class="field" style="flex:1 1 140px; margin:0;">
																<label class="label" for="tn-{t.id}">Name</label>
																<input id="tn-{t.id}" name="name" type="text" class="input" value={t.name} required />
															</div>
															<div class="field" style="flex:2 1 180px; margin:0;">
																<label class="label" for="td-{t.id}">Description</label>
																<textarea id="td-{t.id}" name="description" class="input" rows="2">{t.description ?? ''}</textarea>
															</div>
														<div class="field" style="flex:1 1 100%; margin:0.25rem 0 0;">
															<div style="display:flex;gap:0.375rem;flex-wrap:wrap;">
																<div class="field" style="flex:1 1 140px; margin:0;">
																	<label class="label" for="tgs-{t.id}">Grants Skills</label>
																	<input id="tgs-{t.id}" name="grantsSkills" class="input" placeholder="ATHLETICS,INSIGHT" value={t.grantsSkills ?? ''} />
																</div>
																<div class="field" style="flex:1 1 140px; margin:0;">
																	<label class="label" for="tge-{t.id}">Expertise</label>
																	<input id="tge-{t.id}" name="grantsExpertise" class="input" placeholder="ARCANA" value={t.grantsExpertise ?? ''} />
																</div>
																<div class="field" style="flex:1 1 140px; margin:0;">
																	<label class="label" for="tgh-{t.id}">Half Prof</label>
																	<input id="tgh-{t.id}" name="grantsHalfSkills" class="input" placeholder="* or STEALTH" value={t.grantsHalfSkills ?? ''} />
																</div>
																<div class="field" style="flex:0 0 80px; margin:0;">
																	<label class="label" for="tscc-{t.id}">Skill picks</label>
																	<input id="tscc-{t.id}" name="skillChoiceCount" class="input" type="number" min="0" value={t.skillChoiceCount ?? ''} />
																</div>
																<div class="field" style="flex:1 1 140px; margin:0;">
																	<label class="label" for="tscp-{t.id}">Skill pool</label>
																	<input id="tscp-{t.id}" name="skillChoicePool" class="input" placeholder="ARCANA,HISTORY" value={t.skillChoicePool ?? ''} />
																</div>
																<div class="field" style="flex:0 0 80px; margin:0;">
																	<label class="label" for="tstcc-{t.id}">Save picks</label>
																	<input id="tstcc-{t.id}" name="savingThrowChoiceCount" class="input" type="number" min="0" value={t.savingThrowChoiceCount ?? ''} />
																</div>
																<div class="field" style="flex:1 1 140px; margin:0;">
																	<label class="label" for="tstcp-{t.id}">Save pool</label>
																	<input id="tstcp-{t.id}" name="savingThrowChoicePool" class="input" placeholder="STRENGTH,CONSTITUTION" value={t.savingThrowChoicePool ?? ''} />
																</div>
																<div class="field" style="flex:0 0 110px; margin:0;">
																	<label class="label" for="tsize-{t.id}">Size</label>
																	<input id="tsize-{t.id}" name="size" class="input" placeholder="Medium" value={t.size ?? ''} />
																</div>
																<div class="field" style="flex:1 1 140px; margin:0;">
																	<label class="label" for="tsizech-{t.id}">Size choices</label>
																	<input id="tsizech-{t.id}" name="sizeChoices" class="input" placeholder="Small,Medium" value={t.sizeChoices ?? ''} />
																</div>
																<div class="field" style="flex:2 1 180px; margin:0;">
																	<label class="label" for="tsenses-{t.id}">Senses</label>
																	<input id="tsenses-{t.id}" name="senses" class="input" placeholder="Darkvision 60 ft" value={t.senses ?? ''} />
																</div>
																<div style="flex:1 1 100%; margin:0.25rem 0 0;">
																	<p class="label" style="margin-bottom:0.25rem; font-size:0.75rem;">Movement Speeds</p>
																	<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
																		{#each ['WALK','FLY','SWIM','CLIMB','BURROW'] as mType}
																			{@const sp = (t.speeds ?? []).find((s: any) => s.movementType === mType)}
																			<div style="display:flex;align-items:center;gap:0.25rem;">
																				<span style="font-size:0.7rem;color:var(--text-muted);width:52px;text-transform:uppercase;">{mType}</span>
																				<input type="hidden" name="speedType" value={mType} />
																				<input name="speedValue" type="number" min="0" step="5" class="input" style="width:72px;" placeholder="0" value={sp?.speed ?? 0} />
																			</div>
																		{/each}
																	</div>
																</div>
																<div class="field" style="flex:1 1 140px; margin:0;">
																	<label class="label" for="tg-{t.id}-gt">Grants Tools</label>
																	<input id="tg-{t.id}-gt" name="grantsTools" class="input" placeholder="Thieves's Tools" value={t.grantsTools ?? ''} />
																</div>
																<div class="field" style="flex:1 1 140px; margin:0;">
																	<label class="label" for="tg-{t.id}-gl">Grants Languages</label>
																	<input id="tg-{t.id}-gl" name="grantsLanguages" class="input" placeholder="Elvish,Dwarvish" value={t.grantsLanguages ?? ''} />
																</div>
																<div class="field" style="flex:1 1 140px; margin:0;">
																	<label class="label" for="tg-{t.id}-gr">Resistances</label>
																	<input id="tg-{t.id}-gr" name="grantsResistances" class="input" placeholder="Fire,Cold" value={t.grantsResistances ?? ''} />
																</div>
																<div class="field" style="flex:1 1 140px; margin:0;">
																	<label class="label" for="tg-{t.id}-gi">Immunities</label>
																	<input id="tg-{t.id}-gi" name="grantsImmunities" class="input" placeholder="Necrotic,Radiant" value={t.grantsImmunities ?? ''} />
																</div>
																<div class="field" style="flex:1 1 140px; margin:0;">
																	<label class="label" for="tg-{t.id}-gv">Vulnerabilities</label>
																	<input id="tg-{t.id}-gv" name="grantsVulnerabilities" class="input" placeholder="Bludgeoning" value={t.grantsVulnerabilities ?? ''} />
																</div>
																<div class="field" style="flex:2 1 200px; margin:0;">
																	<label class="label" for="tg-{t.id}-gis">Innate Spells</label>
																	<input id="tg-{t.id}-gis" name="grantsInnateSpells" class="input" placeholder="Faerie Fire:1:0,Darkness:3:1" value={t.grantsInnateSpells ?? ''} />
																	<p style="font-size:0.6875rem;color:var(--text-muted);margin:0.25rem 0 0;">Format: <code>SpellName:minLvl:uses[/:true]</code> · uses 0=at will · last seg=can use slots · e.g. <code>Faerie Fire:1:0,Darkness:3:1,Daylight:5:1:true</code></p>
																</div>
															</div>
														</div>
															<button type="submit" class="btn btn-primary btn-sm">Save</button>
														</div>
													</form>
												{/if}
											</div>
										{/each}
									</div>
								{/if}
								<form method="post" action="?/addTrait" use:enhance={() => {
									return async ({ update }) => { await update(); await invalidateAll(); };
								}}>
									<input type="hidden" name="speciesId" value={s.id} />
									<div style="display:flex; gap:0.5rem; align-items:flex-end; flex-wrap:wrap;">
										<div class="field" style="flex:0 0 55px; margin:0;">
											<label class="label" for="tl-{s.id}">Level</label>
											<input id="tl-{s.id}" name="requiredLevel" type="number" class="input" min="1" max="20" placeholder="—" />
										</div>
										<div class="field" style="flex:1 1 140px; margin:0;">
											<label class="label" for="tn-{s.id}">Trait name</label>
											<input id="tn-{s.id}" name="name" type="text" class="input" required />
										</div>
										<div class="field" style="flex:2 1 180px; margin:0;">
											<label class="label" for="td-{s.id}">Description</label>
											<input id="td-{s.id}" name="description" type="text" class="input" />
										</div>
									</div>
									<!-- Trait physical + grant fields -->
									<div style="display:flex;gap:0.375rem;flex-wrap:wrap;margin-top:0.375rem;">
										<div class="field" style="flex:0 0 100px; margin:0;"><label class="label" for="ntsize-{s.id}">Size</label><input id="ntsize-{s.id}" name="size" class="input" placeholder="Medium" /></div>
										<div class="field" style="flex:1 1 140px; margin:0;"><label class="label" for="ntsizech-{s.id}">Size choices</label><input id="ntsizech-{s.id}" name="sizeChoices" class="input" placeholder="Small,Medium" /></div>
										<div class="field" style="flex:2 1 180px; margin:0;"><label class="label" for="ntsenses-{s.id}">Senses</label><input id="ntsenses-{s.id}" name="senses" class="input" placeholder="Darkvision 60 ft" /></div>
										<div style="flex:1 1 100%; margin:0.25rem 0 0; display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
											<span style="font-size:0.75rem;color:var(--text-muted);font-weight:600;">Speeds:</span>
											{#each ['WALK','FLY','SWIM','CLIMB','BURROW'] as mType}
												<div style="display:flex;align-items:center;gap:0.25rem;">
													<span style="font-size:0.7rem;color:var(--text-muted);width:52px;text-transform:uppercase;">{mType}</span>
													<input type="hidden" name="speedType" value={mType} />
													<input name="speedValue" type="number" min="0" step="5" class="input" style="width:72px;" placeholder="0" />
												</div>
											{/each}
										</div>
										<div class="field" style="flex:1 1 130px; margin:0;"><label class="label" for="ntgt-{s.id}">Grants Tools</label><input id="ntgt-{s.id}" name="grantsTools" class="input" placeholder="Thieves's Tools" /></div>
										<div class="field" style="flex:1 1 130px; margin:0;"><label class="label" for="ntgl-{s.id}">Grants Languages</label><input id="ntgl-{s.id}" name="grantsLanguages" class="input" placeholder="Elvish,Dwarvish" /></div>
										<div class="field" style="flex:1 1 130px; margin:0;"><label class="label" for="ntgr-{s.id}">Resistances</label><input id="ntgr-{s.id}" name="grantsResistances" class="input" placeholder="Fire,Cold" /></div>
										<div class="field" style="flex:1 1 130px; margin:0;"><label class="label" for="ntgi-{s.id}">Immunities</label><input id="ntgi-{s.id}" name="grantsImmunities" class="input" placeholder="Necrotic,Radiant" /></div>
										<div class="field" style="flex:1 1 130px; margin:0;"><label class="label" for="ntgv-{s.id}">Vulnerabilities</label><input id="ntgv-{s.id}" name="grantsVulnerabilities" class="input" placeholder="Bludgeoning" /></div>
										<div class="field" style="flex:2 1 200px; margin:0;"><label class="label" for="ntgis-{s.id}">Innate Spells</label><input id="ntgis-{s.id}" name="grantsInnateSpells" class="input" placeholder="Faerie Fire:1:0,Darkness:3:1" /><p style="font-size:0.6875rem;color:var(--text-muted);margin:0.25rem 0 0;">Format: <code>SpellName:minLvl:uses[/:true]</code> · uses 0=at will · last seg=can use slots · e.g. <code>Faerie Fire:1:0,Darkness:3:1,Daylight:5:1:true</code></p></div>
									</div>
									<div style="display:flex;justify-content:flex-end;margin-top:0.375rem;">
										<button type="submit" class="btn btn-ghost btn-sm">Add trait</button>
									</div>
								</form>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<p class="table__empty">No species yet.</p>
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