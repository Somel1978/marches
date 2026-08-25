<!-- apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/classes/[classId]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { ConfirmModal } from '@core/ui';
	import { goto, invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const system    = $derived((data as any).system);
	const cls       = $derived((data as any).classData);

	let expandedSubclass = $state<string | null>(null);
	let editingFeature   = $state<string | null>(null);
	let editingSubFeat   = $state<string | null>(null);
	let deleteForm = $state<HTMLFormElement | undefined>();

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
			<a href="/game-systems/{system.id}/dnd5e/classes" class="back-link">← Classes</a>
			<h2 class="page__title">{cls.name}</h2>
		</div>
	</div>

	{#if (form as any)?.success && (form as any)?.action === 'class'}<div class="form-success" style="margin-bottom:1rem;">Saved.</div>{/if}

	<div class="sections">
		<!-- Class details -->
		<div class="card">
			<h3 class="section-title">Class details</h3>
			<form method="post" action="?/updateClass" use:enhance>
				<div class="fields">
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:2 1 180px;">
							<label class="label" for="name">Name</label>
							<input id="name" name="name" type="text" class="input" value={cls.name} required />
						</div>
						<div class="field" style="flex:1 1 80px;">
							<label class="label" for="hitDice">Hit dice</label>
							<input id="hitDice" name="hitDice" type="number" class="input" min="4" max="12" step="2" value={cls.hitDice ?? ''} placeholder="d8" />
						</div>
						<div class="field" style="flex:1 1 100px;">
							<label class="label" for="canCastSpells">Can cast spells</label>
							<select id="canCastSpells" name="canCastSpells" class="input input--select">
								<option value="false" selected={!cls.canCastSpells}>No</option>
								<option value="true"  selected={cls.canCastSpells}>Yes</option>
							</select>
						</div>
						<div class="field" style="flex:1 1 100px;">
							<label class="label" for="subclassAvailableAtLevel">Subclass at level</label>
							<input id="subclassAvailableAtLevel" name="subclassAvailableAtLevel" type="number" class="input" min="1" max="20" value={cls.subclassAvailableAtLevel ?? 3} />
						</div>
						<div class="field" style="flex:1 1 80px;">
							<label class="label" for="sortOrder">Sort order</label>
							<input id="sortOrder" name="sortOrder" type="number" class="input" value={cls.sortOrder} />
						</div>
						<div class="field" style="flex:1 1 100px;">
							<label class="label" for="isAvailable">Available</label>
							<select id="isAvailable" name="isAvailable" class="input input--select">
								<option value="true"  selected={cls.isAvailable}>Yes</option>
								<option value="false" selected={!cls.isAvailable}>No</option>
							</select>
						</div>
					</div>
					<div class="field">
						<label class="label" for="primaryAbilities">Primary abilities</label>
						<input id="primaryAbilities" name="primaryAbilities" type="text" class="input" value={cls.primaryAbilities ?? ''} placeholder="Strength, Constitution" />
					</div>
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:1 1 200px;">
							<label class="label" for="grantsSavingThrows">Saving throws granted <span class="optional">(comma-sep)</span></label>
							<input id="grantsSavingThrows" name="grantsSavingThrows" type="text" class="input"
								value={((cls.savingThrows ?? []).map((s: any) => s.stat)).join(',')}
								placeholder="WISDOM,CHARISMA" />
						</div>
						<div class="field" style="flex:0 0 100px;">
							<label class="label" for="skillChoiceCount">Skill choices</label>
							<input id="skillChoiceCount" name="skillChoiceCount" type="number" class="input" min="0" max="6" value={cls.skillChoiceCount ?? ''} placeholder="2" />
						</div>
						<div class="field" style="flex:2 1 260px;">
							<label class="label" for="skillPool">Skill pool <span class="optional">(comma-sep enum)</span></label>
							<input id="skillPool" name="skillPool" type="text" class="input"
								value={((cls.skillOptions ?? []).map((o: any) => o.skill)).join(',')}
								placeholder="ARCANA,HISTORY,INSIGHT,MEDICINE,NATURE,RELIGION" />
						</div>
					</div>
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:1 1 200px;">
							<label class="label" for="source">Source <span class="optional">(optional)</span></label>
							<input id="source" name="source" type="text" class="input" value={cls.source ?? ''} />
						</div>
						<div class="field" style="flex:1 1 200px;">
							<label class="label" for="link">Link <span class="optional">(optional)</span></label>
							<input id="link" name="link" type="text" class="input" value={cls.link ?? ''} />
						</div>
					</div>
					<div class="field">
						<label class="label" for="description">Description</label>
						<textarea id="description" name="description" class="input" rows="3">{cls.description ?? ''}</textarea>
					</div>
					<div class="field">
						<label class="label" for="equipmentDescription">Equipment description</label>
						<textarea id="equipmentDescription" name="equipmentDescription" class="input" rows="3">{cls.equipmentDescription ?? ''}</textarea>
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);" 
						onclick={() => { askConfirm('Confirm', 'Delete this class and all its data?', () => { deleteForm?.requestSubmit(); }); }}>
						Delete class
					</button>
					<button type="submit" class="btn btn-primary">Save</button>
				</div>
			</form>
		</div>

		<form bind:this={deleteForm} method="post" action="?/deleteClass" use:enhance={() => {
			return async ({ update }) => { goto(`/game-systems/${system.id}/dnd5e/classes`); await update(); };
		}} style="display:none;"></form>

		<!-- Class Features -->
		<div class="card">
			<h3 class="section-title">Class features ({cls.features?.length ?? 0})</h3>
			{#if cls.features?.length}
				<div style="display:flex; flex-direction:column; gap:0.375rem; margin-bottom:0.75rem;">
					{#each cls.features as f}
						<div style="background:var(--bg-overlay); border-radius:var(--radius-md); overflow:hidden;">
							<div style="display:flex; align-items:center; gap:0.75rem; padding:0.5rem 0.75rem; flex-wrap:wrap">
								<span class="badge badge-muted">Lv {f.requiredLevel}</span>
								<span style="flex:1; font-weight:500;">{f.name}</span>
								{#if f.url}<a href={f.url} target="_blank" class="btn btn-ghost btn-sm" style="font-size:0.75rem;">↗</a>{/if}
								<button type="button" class="btn btn-ghost btn-sm" style="font-size:0.75rem;"
									onclick={() => editingFeature = editingFeature === f.id ? null : f.id}>
									{editingFeature === f.id ? 'Cancel' : 'Edit'}
								</button>
								<form method="post" action="?/deleteFeature" use:enhance={() => {
									return async ({ update }) => { await update(); await invalidateAll(); };
								}} style="margin:0;">
									<input type="hidden" name="id" value={f.id} />
									<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger);" >✕</button>
								</form>
							</div>
							{#if editingFeature === f.id}
								<form method="post" action="?/updateFeature" use:enhance={() => {
									return async ({ update }) => { await update(); await invalidateAll(); editingFeature = null; };
								}} style="padding:0.625rem 0.75rem; border-top:1px solid var(--border-muted); background:var(--bg-muted);">
									<input type="hidden" name="id" value={f.id} />
									<div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:flex-end;">
										<div class="field" style="flex:0 0 60px; margin:0;">
											<label class="label" for="ef-lv-{f.id}">Level</label>
											<input id="ef-lv-{f.id}" name="requiredLevel" type="number" class="input" min="1" max="20" value={f.requiredLevel} required />
										</div>
										<div class="field" style="flex:1 1 160px; margin:0;">
											<label class="label" for="ef-name-{f.id}">Name</label>
											<input id="ef-name-{f.id}" name="name" type="text" class="input" value={f.name} required />
										</div>
										<div class="field" style="flex:2 1 200px; margin:0;">
											<label class="label" for="ef-desc-{f.id}">Description</label>
											<input id="ef-desc-{f.id}" name="description" type="text" class="input" value={f.description ?? ''} />
										</div>
										<div class="field" style="flex:1 1 160px; margin:0;">
											<label class="label" for="ef-url-{f.id}">URL</label>
											<input id="ef-url-{f.id}" name="url" type="url" class="input" value={f.url ?? ''} />
										</div>
										<div style="flex:1 1 100%; display:flex; gap:0.375rem; flex-wrap:wrap; margin:0.25rem 0 0;">
											<div class="field" style="flex:1 1 140px; margin:0;">
												<label class="label" for="fgs-{f.id}">Grants Skills</label>
												<input id="fgs-{f.id}" name="grantsSkills" class="input" placeholder="ATHLETICS,INSIGHT" value={f.grantsSkills ?? ''} />
											</div>
											<div class="field" style="flex:1 1 140px; margin:0;">
												<label class="label" for="fge-{f.id}">Expertise (auto)</label>
												<input id="fge-{f.id}" name="grantsExpertise" class="input" placeholder="ARCANA" value={f.grantsExpertise ?? ''} />
											</div>
											<div class="field" style="flex:0 0 80px; margin:0;">
												<label class="label" for="fecc-{f.id}">Exp. picks</label>
												<input id="fecc-{f.id}" name="expertiseChoiceCount" class="input" type="number" min="0" value={(f as any).expertiseChoiceCount ?? ''} />
											</div>
											<div class="field" style="flex:1 1 140px; margin:0;">
												<label class="label" for="fecp-{f.id}">Exp. pool</label>
												<input id="fecp-{f.id}" name="expertiseChoicePool" class="input" placeholder="ARCANA,HISTORY or *" value={(f as any).expertiseChoicePool ?? ''} />
											</div>
											<div class="field" style="flex:1 1 140px; margin:0;">
												<label class="label" for="fgh-{f.id}">Half Prof</label>
												<input id="fgh-{f.id}" name="grantsHalfSkills" class="input" placeholder="* or STEALTH" value={f.grantsHalfSkills ?? ''} />
											</div>
											<div class="field" style="flex:1 1 140px; margin:0;">
												<label class="label" for="fgsv-{f.id}">Grants Saves</label>
												<input id="fgsv-{f.id}" name="grantsSavingThrows" class="input" placeholder="STRENGTH,CONSTITUTION" value={f.grantsSavingThrows ?? ''} />
											</div>
											<div class="field" style="flex:0 0 80px; margin:0;">
												<label class="label" for="fscc-{f.id}">Skill picks</label>
												<input id="fscc-{f.id}" name="skillChoiceCount" class="input" type="number" min="0" value={f.skillChoiceCount ?? ''} />
											</div>
											<div class="field" style="flex:1 1 140px; margin:0;">
												<label class="label" for="fscp-{f.id}">Skill pool</label>
												<input id="fscp-{f.id}" name="skillChoicePool" class="input" placeholder="ARCANA,HISTORY" value={f.skillChoicePool ?? ''} />
											</div>
											<div class="field" style="flex:0 0 80px; margin:0;">
												<label class="label" for="fstcc-{f.id}">Save picks</label>
												<input id="fstcc-{f.id}" name="savingThrowChoiceCount" class="input" type="number" min="0" value={f.savingThrowChoiceCount ?? ''} />
											</div>
											<div class="field" style="flex:1 1 140px; margin:0;">
												<label class="label" for="fstcp-{f.id}">Save pool</label>
												<input id="fstcp-{f.id}" name="savingThrowChoicePool" class="input" placeholder="STRENGTH,CONSTITUTION" value={f.savingThrowChoicePool ?? ''} />
											</div>
										<div class="field" style="flex:1 1 120px; margin:0;">
											<label class="label" for="cf-{f.id}-gt">Grants Tools</label>
											<input id="cf-{f.id}-gt" name="grantsTools" class="input" placeholder="Thieves's Tools" value={f.grantsTools ?? ''} />
										</div>
										<div class="field" style="flex:0 0 60px; margin:0;"><label class="label" for="choice-toolChoiceCount-49713">Tool #</label><input id="choice-toolChoiceCount-49713" name="toolChoiceCount" type="number" min="0" class="input" value={f.toolChoiceCount ?? ''} /></div>
										<div class="field" style="flex:1 1 140px; margin:0;"><label class="label" for="choice-toolChoicePool-61918">Tool pool</label><input id="choice-toolChoicePool-61918" name="toolChoicePool" class="input" placeholder="Thieves's Tools,Smith's Tools" value={f.toolChoicePool ?? ''} /></div>
										<div class="field" style="flex:1 1 120px; margin:0;">
											<label class="label" for="cf-{f.id}-gl">Grants Languages</label>
											<input id="cf-{f.id}-gl" name="grantsLanguages" class="input" placeholder="Elvish,Dwarvish" value={f.grantsLanguages ?? ''} />
										</div>
										<div class="field" style="flex:0 0 60px; margin:0;"><label class="label" for="choice-languageChoiceCount-66388">Lang #</label><input id="choice-languageChoiceCount-66388" name="languageChoiceCount" type="number" min="0" class="input" value={f.languageChoiceCount ?? ''} /></div>
										<div class="field" style="flex:1 1 140px; margin:0;"><label class="label" for="choice-languageChoicePool-72023">Lang pool</label><input id="choice-languageChoicePool-72023" name="languageChoicePool" class="input" placeholder="Any,Elvish,Dwarvish" value={f.languageChoicePool ?? ''} /></div>
										<div class="field" style="flex:1 1 120px; margin:0;">
											<label class="label" for="cf-{f.id}-gr">Resistances</label>
											<input id="cf-{f.id}-gr" name="grantsResistances" class="input" placeholder="Fire,Cold" value={f.grantsResistances ?? ''} />
										</div>
										<div class="field" style="flex:1 1 120px; margin:0;">
											<label class="label" for="cf-{f.id}-gi">Immunities</label>
											<input id="cf-{f.id}-gi" name="grantsImmunities" class="input" placeholder="Necrotic,Radiant" value={f.grantsImmunities ?? ''} />
										</div>
										<div class="field" style="flex:1 1 120px; margin:0;">
											<label class="label" for="cf-{f.id}-gv">Vulnerabilities</label>
											<input id="cf-{f.id}-gv" name="grantsVulnerabilities" class="input" placeholder="Bludgeoning" value={f.grantsVulnerabilities ?? ''} />
										</div>
										<div class="field" style="flex:0 0 70px; margin:0;">
											<label class="label" for="cf-{f.id}-rcc">Res.picks</label>
											<input id="cf-{f.id}-rcc" name="resistanceChoiceCount" type="number" min="0" class="input" value={(f as any).resistanceChoiceCount ?? ''} />
										</div>
										<div class="field" style="flex:1 1 100px; margin:0;">
											<label class="label" for="cf-{f.id}-rcp">Res. pool</label>
											<input id="cf-{f.id}-rcp" name="resistanceChoicePool" class="input" placeholder="FIRE,COLD" value={(f as any).resistanceChoicePool ?? ''} />
										</div>
										<div class="field" style="flex:0 0 70px; margin:0;">
											<label class="label" for="cf-{f.id}-icc">Imm.picks</label>
											<input id="cf-{f.id}-icc" name="immunityChoiceCount" type="number" min="0" class="input" value={(f as any).immunityChoiceCount ?? ''} />
										</div>
										<div class="field" style="flex:1 1 100px; margin:0;">
											<label class="label" for="cf-{f.id}-icp">Imm. pool</label>
											<input id="cf-{f.id}-icp" name="immunityChoicePool" class="input" placeholder="FIRE,COLD" value={(f as any).immunityChoicePool ?? ''} />
										</div>
										<div class="field" style="flex:0 0 70px; margin:0;">
											<label class="label" for="cf-{f.id}-vcc">Vul.picks</label>
											<input id="cf-{f.id}-vcc" name="vulnerabilityChoiceCount" type="number" min="0" class="input" value={(f as any).vulnerabilityChoiceCount ?? ''} />
										</div>
										<div class="field" style="flex:1 1 100px; margin:0;">
											<label class="label" for="cf-{f.id}-vcp">Vul. pool</label>
											<input id="cf-{f.id}-vcp" name="vulnerabilityChoicePool" class="input" placeholder="FIRE,COLD" value={(f as any).vulnerabilityChoicePool ?? ''} />
										</div>
										<div class="field" style="flex:1 1 160px; margin:0;">
											<label class="label" for="cf-{f.id}-gsp">Speed Bonuses</label>
											<input id="cf-{f.id}-gsp" name="grantsSpeed" class="input" placeholder="WALK:10,SWIM:30" value={f.grantsSpeed ?? ''} />
											<p style="font-size:0.6875rem;color:var(--text-muted);margin:0.25rem 0 0;">Format: <code>WALK:10,FLY:30</code> — additive speed bonus in feet per movement type</p>
										</div>
										<div class="field" style="flex:1 1 160px; margin:0;">
											<label class="label" for="cf-{f.id}-gse">Grants Senses</label>
											<input id="cf-{f.id}-gse" name="grantsSenses" class="input" placeholder="Blindsense 10 ft" value={f.grantsSenses ?? ''} />
										</div>
										<div class="field" style="flex:1 1 140px; margin:0;">
											<label class="label" for="cf-{f.id}-gfc">Feat Category</label>
											<input id="cf-{f.id}-gfc" name="grantsFeatCategory" class="input" placeholder="Origin" value={(f as any).grantsFeatCategory ?? ''} />
										</div>
										<div class="field" style="flex:1 1 140px; margin:0;">
											<label class="label" for="cf-{f.id}-gfi">Grants Feat ID</label>
											<input id="cf-{f.id}-gfi" name="grantsFeatId" class="input" placeholder="UUID or name" value={(f as any).grantsFeatId ?? ''} />
										</div>
										<div class="field" style="flex:2 1 180px; margin:0;">
											<label class="label" for="cf-{f.id}-gis">Innate Spells</label>
											<input id="cf-{f.id}-gis" name="grantsInnateSpells" class="input" placeholder="Faerie Fire:1:0,Darkness:3:1" value={f.grantsInnateSpells ?? ''} />
											<p style="font-size:0.6875rem;color:var(--text-muted);margin:0.25rem 0 0;">Format: <code>SpellName:minLvl:uses[/:true]</code> · uses 0=at will · last seg=can use slots · e.g. <code>Faerie Fire:1:0,Darkness:3:1,Daylight:5:1:true</code></p>
										</div>
										</div>
										<button type="submit" class="btn btn-primary btn-sm" style="flex-shrink:0;">Save</button>
									</div>
								</form>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
			<form method="post" action="?/addFeature" use:enhance={() => {
				return async ({ update }) => { await update(); await invalidateAll(); };
			}}>
				<div style="display:flex; gap:0.5rem; align-items:flex-end; flex-wrap:wrap;">
					<div class="field" style="flex:0 0 60px; margin:0;">
						<label class="label" for="feat-level">Level</label>
						<input id="feat-level" name="requiredLevel" type="number" class="input" min="1" max="20" value="1" required />
					</div>
					<div class="field" style="flex:1 1 160px; margin:0;">
						<label class="label" for="feat-name">Feature name</label>
						<input id="feat-name" name="name" type="text" class="input" placeholder="e.g. Action Surge" required />
					</div>
					<div class="field" style="flex:2 1 200px; margin:0;">
						<label class="label" for="feat-desc">Description</label>
						<input id="feat-desc" name="description" type="text" class="input" placeholder="Short description" />
					</div>
					<button type="submit" class="btn btn-primary btn-sm" style="flex-shrink:0;">Add</button>
				</div>
					<div class="field" style="flex:1 1 130px; margin:0;">
						<label class="label" for="cf-gt">Grants Tools</label>
						<input id="cf-gt" name="grantsTools" class="input" placeholder="Thieves's Tools" />
					</div>
					<div class="field" style="flex:0 0 60px; margin:0;"><label class="label" for="choice-toolChoiceCount-52306">Tool #</label><input id="choice-toolChoiceCount-52306" name="toolChoiceCount" type="number" min="0" class="input" /></div>
					<div class="field" style="flex:1 1 140px; margin:0;"><label class="label" for="choice-toolChoicePool-18185">Tool pool</label><input id="choice-toolChoicePool-18185" name="toolChoicePool" class="input" placeholder="Thieves's Tools,Smith's Tools" /></div>
					<div class="field" style="flex:1 1 130px; margin:0;">
						<label class="label" for="cf-gl">Grants Languages</label>
						<input id="cf-gl" name="grantsLanguages" class="input" placeholder="Elvish,Dwarvish" />
					</div>
					<div class="field" style="flex:0 0 60px; margin:0;"><label class="label" for="choice-languageChoiceCount-22355">Lang #</label><input id="choice-languageChoiceCount-22355" name="languageChoiceCount" type="number" min="0" class="input" /></div>
					<div class="field" style="flex:1 1 140px; margin:0;"><label class="label" for="choice-languageChoicePool-87357">Lang pool</label><input id="choice-languageChoicePool-87357" name="languageChoicePool" class="input" placeholder="Any,Elvish,Dwarvish" /></div>
					<div class="field" style="flex:1 1 130px; margin:0;">
						<label class="label" for="cf-gr">Resistances</label>
						<input id="cf-gr" name="grantsResistances" class="input" placeholder="Fire,Cold" />
					</div>
					<div class="field" style="flex:1 1 130px; margin:0;">
						<label class="label" for="cf-gi">Immunities</label>
						<input id="cf-gi" name="grantsImmunities" class="input" placeholder="Necrotic,Radiant" />
					</div>
					<div class="field" style="flex:1 1 130px; margin:0;">
						<label class="label" for="cf-gv">Vulnerabilities</label>
						<input id="cf-gv" name="grantsVulnerabilities" class="input" placeholder="Bludgeoning" />
					</div>
					<div class="field" style="flex:1 1 160px; margin:0;">
						<label class="label" for="cf-gsp">Speed Bonuses</label>
						<input id="cf-gsp" name="grantsSpeed" class="input" placeholder="WALK:10,SWIM:30" />
						<p style="font-size:0.6875rem;color:var(--text-muted);margin:0.25rem 0 0;">Format: <code>WALK:10,FLY:30</code> — additive speed bonus in feet per movement type</p>
					</div>
					<div class="field" style="flex:1 1 160px; margin:0;">
						<label class="label" for="cf-gse">Grants Senses</label>
						<input id="cf-gse" name="grantsSenses" class="input" placeholder="Blindsense 10 ft" />
					</div>
					<div class="field" style="flex:2 1 180px; margin:0;">
						<label class="label" for="cf-gis">Innate Spells</label>
						<input id="cf-gis" name="grantsInnateSpells" class="input" placeholder="Faerie Fire:1:0,Darkness:3:1" />
						<p style="font-size:0.6875rem;color:var(--text-muted);margin:0.25rem 0 0;">Format: <code>SpellName:minLvl:uses[/:true]</code> · uses 0=at will · last seg=can use slots · e.g. <code>Faerie Fire:1:0,Darkness:3:1,Daylight:5:1:true</code></p>
					</div>
			</form>
		</div>

		<!-- Subclasses -->
		<div class="card">
			<h3 class="section-title">Subclasses ({cls.subclasses?.length ?? 0})</h3>
			{#each cls.subclasses ?? [] as sub}
				<div style="margin-bottom:0.5rem; border:1px solid var(--border-muted); border-radius:var(--radius-md); overflow:hidden;">
					<div style="display:flex; align-items:center; gap:0.5rem; padding:0.625rem 0.75rem; background:var(--bg-overlay); flex-wrap:wrap">
						<button type="button" style="flex:1; text-align:left; background:none; border:none; cursor:pointer; font-weight:600; font-size:0.875rem;"
							onclick={() => expandedSubclass = expandedSubclass === sub.id ? null : sub.id}>
							{sub.name}
							<span class="badge badge-muted" style="margin-left:0.5rem;">{sub.features?.length ?? 0} features</span>
						</button>
						<!-- Toggle canCastSpells — only relevant if parent class can't cast -->
						{#if !cls.canCastSpells}
						<form method="post" action="?/toggleSubclassCasting" use:enhance={() => { return async ({ update }) => { await update(); await invalidateAll(); }; }} style="margin:0;">
							<input type="hidden" name="id" value={sub.id} />
							<input type="hidden" name="canCastSpells" value={sub.canCastSpells ? 'false' : 'true'} />
							<button type="submit" class="btn btn-ghost btn-sm" style="font-size:0.75rem;" title="Toggle spellcasting">
								{sub.canCastSpells ? '✦ Caster' : '○ Not Caster'}
							</button>
						</form>
						{/if}
						<form id="cf-{sub.id}-del" method="post" action="?/deleteSubclass" use:enhance={() => {
				return async ({ update }) => { await update(); await invalidateAll(); };
			}} style="margin:0;">
							<input type="hidden" name="id" value={sub.id} />
							<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger); font-size:0.75rem;" onclick={() => window.confirmModal('Confirm', `Delete subclass "${sub.name}"?`).then(ok => { if(ok)(document.getElementById(`cf-${sub.id}-del`) as HTMLFormElement).requestSubmit(); })}>✕</button>
						</form>
					</div>

					{#if expandedSubclass === sub.id}
						<div style="padding:0.75rem; border-top:1px solid var(--border-muted);">
							<!-- Subclass features -->
							{#if sub.features?.length}
								<div style="display:flex; flex-direction:column; gap:0.25rem; margin-bottom:0.5rem;">
									{#each sub.features as sf}
										<div style="background:var(--bg-surface); border-radius:var(--radius-sm); overflow:hidden;">
											<div style="display:flex; align-items:center; gap:0.5rem; padding:0.375rem 0.5rem; flex-wrap:wrap">
												<span class="badge badge-muted">Lv {sf.requiredLevel}</span>
												<span style="flex:1; font-size:0.8125rem;">{sf.name}</span>
												<button type="button" class="btn btn-ghost btn-sm" style="font-size:0.75rem;"
													onclick={() => editingSubFeat = editingSubFeat === sf.id ? null : sf.id}>
													{editingSubFeat === sf.id ? 'Cancel' : 'Edit'}
												</button>
												<form method="post" action="?/deleteSubclassFeature" use:enhance={() => {
													return async ({ update }) => { await update(); await invalidateAll(); };
												}} style="margin:0;">
													<input type="hidden" name="id" value={sf.id} />
													<button type="submit" class="btn btn-ghost btn-sm" style="color:var(--color-danger); font-size:0.75rem;">✕</button>
												</form>
											</div>
											{#if editingSubFeat === sf.id}
												<form method="post" action="?/updateSubclassFeature" use:enhance={() => {
													return async ({ update }) => { await update(); await invalidateAll(); editingSubFeat = null; };
												}} style="padding:0.5rem 0.625rem; border-top:1px solid var(--border-muted); background:var(--bg-muted);">
													<input type="hidden" name="id" value={sf.id} />
													<div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:flex-end;">
														<div class="field" style="flex:0 0 60px; margin:0;">
															<label class="label" for="sf-lv-{sf.id}">Level</label>
															<input id="sf-lv-{sf.id}" name="requiredLevel" type="number" class="input" min="1" max="20" value={sf.requiredLevel} />
														</div>
														<div class="field" style="flex:1 1 140px; margin:0;">
															<label class="label" for="sf-name-{sf.id}">Name</label>
															<input id="sf-name-{sf.id}" name="name" type="text" class="input" value={sf.name} required />
														</div>
														<div class="field" style="flex:2 1 180px; margin:0;">
															<label class="label" for="sf-desc-{sf.id}">Description</label>
															<input id="sf-desc-{sf.id}" name="description" type="text" class="input" value={sf.description ?? ''} />
														</div>
														<div class="field" style="flex:1 1 100%; margin:0.25rem 0 0;">
															<div style="display:flex;gap:0.375rem;flex-wrap:wrap;">
																<div class="field" style="flex:1 1 120px; margin:0;">
																	<label class="label" for="sfgs-{sf.id}">Grants Skills</label>
																	<input id="sfgs-{sf.id}" name="grantsSkills" class="input" placeholder="ARCANA,HISTORY" value={sf.grantsSkills ?? ''} />
																</div>
																<div class="field" style="flex:1 1 120px; margin:0;">
																	<label class="label" for="sfge-{sf.id}">Expertise (auto)</label>
																	<input id="sfge-{sf.id}" name="grantsExpertise" class="input" placeholder="ARCANA" value={sf.grantsExpertise ?? ''} />
																</div>
																<div class="field" style="flex:0 0 80px; margin:0;">
																	<label class="label" for="sfecc-{sf.id}">Exp. picks</label>
																	<input id="sfecc-{sf.id}" name="expertiseChoiceCount" class="input" type="number" min="0" value={(sf as any).expertiseChoiceCount ?? ''} />
																</div>
																<div class="field" style="flex:1 1 120px; margin:0;">
																	<label class="label" for="sfecp-{sf.id}">Exp. pool</label>
																	<input id="sfecp-{sf.id}" name="expertiseChoicePool" class="input" placeholder="ARCANA,HISTORY or *" value={(sf as any).expertiseChoicePool ?? ''} />
																</div>
																<div class="field" style="flex:1 1 120px; margin:0;">
																	<label class="label" for="sfgh-{sf.id}">Half Prof</label>
																	<input id="sfgh-{sf.id}" name="grantsHalfSkills" class="input" placeholder="* or STEALTH" value={sf.grantsHalfSkills ?? ''} />
																</div>
																<div class="field" style="flex:1 1 120px; margin:0;">
																	<label class="label" for="sfgsv-{sf.id}">Grants Saves</label>
																	<input id="sfgsv-{sf.id}" name="grantsSavingThrows" class="input" placeholder="STRENGTH" value={sf.grantsSavingThrows ?? ''} />
																</div>
																<div class="field" style="flex:0 0 80px; margin:0;">
																	<label class="label" for="sfscc-{sf.id}">Skill picks</label>
																	<input id="sfscc-{sf.id}" name="skillChoiceCount" class="input" type="number" min="0" value={sf.skillChoiceCount ?? ''} />
																</div>
																<div class="field" style="flex:1 1 120px; margin:0;">
																	<label class="label" for="sfscp-{sf.id}">Skill pool</label>
																	<input id="sfscp-{sf.id}" name="skillChoicePool" class="input" placeholder="ARCANA,HISTORY" value={sf.skillChoicePool ?? ''} />
																</div>
																<div class="field" style="flex:0 0 80px; margin:0;">
																	<label class="label" for="sfstcc-{sf.id}">Save picks</label>
																	<input id="sfstcc-{sf.id}" name="savingThrowChoiceCount" class="input" type="number" min="0" value={sf.savingThrowChoiceCount ?? ''} />
																</div>
																<div class="field" style="flex:1 1 120px; margin:0;">
																	<label class="label" for="sfstcp-{sf.id}">Save pool</label>
																	<input id="sfstcp-{sf.id}" name="savingThrowChoicePool" class="input" placeholder="STRENGTH,CONSTITUTION" value={sf.savingThrowChoicePool ?? ''} />
																</div>
																<div class="field" style="flex:1 1 120px; margin:0;">
																	<label class="label" for="sf-gt-{sf.id}">Grants Tools</label>
																	<input id="sf-gt-{sf.id}" name="grantsTools" class="input" placeholder="Thieves's Tools" value={sf.grantsTools ?? ''} />
																</div>
																<div class="field" style="flex:0 0 60px; margin:0;"><label class="label" for="choice-toolChoiceCount-56425">Tool #</label><input id="choice-toolChoiceCount-56425" name="toolChoiceCount" type="number" min="0" class="input" value={sf.toolChoiceCount ?? ''} /></div>
																<div class="field" style="flex:1 1 140px; margin:0;"><label class="label" for="choice-toolChoicePool-16654">Tool pool</label><input id="choice-toolChoicePool-16654" name="toolChoicePool" class="input" placeholder="Thieves's Tools,Smith's Tools" value={sf.toolChoicePool ?? ''} /></div>
																<div class="field" style="flex:1 1 120px; margin:0;">
																	<label class="label" for="sf-gl-{sf.id}">Grants Languages</label>
																	<input id="sf-gl-{sf.id}" name="grantsLanguages" class="input" placeholder="Elvish,Dwarvish" value={sf.grantsLanguages ?? ''} />
																</div>
																<div class="field" style="flex:0 0 60px; margin:0;"><label class="label" for="choice-languageChoiceCount-89886">Lang #</label><input id="choice-languageChoiceCount-89886" name="languageChoiceCount" type="number" min="0" class="input" value={sf.languageChoiceCount ?? ''} /></div>
																<div class="field" style="flex:1 1 140px; margin:0;"><label class="label" for="choice-languageChoicePool-55593">Lang pool</label><input id="choice-languageChoicePool-55593" name="languageChoicePool" class="input" placeholder="Any,Elvish,Dwarvish" value={sf.languageChoicePool ?? ''} /></div>
																<div class="field" style="flex:1 1 120px; margin:0;">
																	<label class="label" for="sf-gr-{sf.id}">Resistances</label>
																	<input id="sf-gr-{sf.id}" name="grantsResistances" class="input" placeholder="Fire,Cold" value={sf.grantsResistances ?? ''} />
																</div>
																<div class="field" style="flex:1 1 120px; margin:0;">
																	<label class="label" for="sf-gi-{sf.id}">Immunities</label>
																	<input id="sf-gi-{sf.id}" name="grantsImmunities" class="input" placeholder="Necrotic,Radiant" value={sf.grantsImmunities ?? ''} />
																</div>
																<div class="field" style="flex:1 1 120px; margin:0;">
																	<label class="label" for="sf-gv-{sf.id}">Vulnerabilities</label>
																	<input id="sf-gv-{sf.id}" name="grantsVulnerabilities" class="input" placeholder="Bludgeoning" value={sf.grantsVulnerabilities ?? ''} />
																</div>
																<div class="field" style="flex:0 0 70px; margin:0;">
																	<label class="label" for="sf-{sf.id}-rcc">Res.picks</label>
																	<input id="sf-{sf.id}-rcc" name="resistanceChoiceCount" type="number" min="0" class="input" value={(sf as any).resistanceChoiceCount ?? ''} />
																</div>
																<div class="field" style="flex:1 1 100px; margin:0;">
																	<label class="label" for="sf-{sf.id}-rcp">Res. pool</label>
																	<input id="sf-{sf.id}-rcp" name="resistanceChoicePool" class="input" placeholder="FIRE,COLD" value={(sf as any).resistanceChoicePool ?? ''} />
																</div>
																<div class="field" style="flex:0 0 70px; margin:0;">
																	<label class="label" for="sf-{sf.id}-icc">Imm.picks</label>
																	<input id="sf-{sf.id}-icc" name="immunityChoiceCount" type="number" min="0" class="input" value={(sf as any).immunityChoiceCount ?? ''} />
																</div>
																<div class="field" style="flex:1 1 100px; margin:0;">
																	<label class="label" for="sf-{sf.id}-icp">Imm. pool</label>
																	<input id="sf-{sf.id}-icp" name="immunityChoicePool" class="input" placeholder="FIRE,COLD" value={(sf as any).immunityChoicePool ?? ''} />
																</div>
																<div class="field" style="flex:0 0 70px; margin:0;">
																	<label class="label" for="sf-{sf.id}-vcc">Vul.picks</label>
																	<input id="sf-{sf.id}-vcc" name="vulnerabilityChoiceCount" type="number" min="0" class="input" value={(sf as any).vulnerabilityChoiceCount ?? ''} />
																</div>
																<div class="field" style="flex:1 1 100px; margin:0;">
																	<label class="label" for="sf-{sf.id}-vcp">Vul. pool</label>
																	<input id="sf-{sf.id}-vcp" name="vulnerabilityChoicePool" class="input" placeholder="FIRE,COLD" value={(sf as any).vulnerabilityChoicePool ?? ''} />
																</div>
																<div class="field" style="flex:1 1 160px; margin:0;">
																	<label class="label" for="sf-{sf.id}-gsp">Speed Bonuses</label>
																	<input id="sf-{sf.id}-gsp" name="grantsSpeed" class="input" placeholder="WALK:10,SWIM:30" value={sf.grantsSpeed ?? ''} />
																	<p style="font-size:0.6875rem;color:var(--text-muted);margin:0.25rem 0 0;">Format: <code>WALK:10,FLY:30</code> — additive speed bonus in feet per movement type</p>
																</div>
																<div class="field" style="flex:1 1 160px; margin:0;">
																	<label class="label" for="sf-{sf.id}-gse">Grants Senses</label>
																	<input id="sf-{sf.id}-gse" name="grantsSenses" class="input" placeholder="Blindsense 10 ft" value={sf.grantsSenses ?? ''} />
																</div>
																<div class="field" style="flex:1 1 140px; margin:0;">
																	<label class="label" for="sf-{sf.id}-gfc">Feat Category</label>
																	<input id="sf-{sf.id}-gfc" name="grantsFeatCategory" class="input" placeholder="Origin" value={(sf as any).grantsFeatCategory ?? ''} />
																</div>
																<div class="field" style="flex:1 1 140px; margin:0;">
																	<label class="label" for="sf-{sf.id}-gfi">Grants Feat ID</label>
																	<input id="sf-{sf.id}-gfi" name="grantsFeatId" class="input" placeholder="UUID or name" value={(sf as any).grantsFeatId ?? ''} />
																</div>
																<div class="field" style="flex:2 1 180px; margin:0;">
																	<label class="label" for="sf-gis-{sf.id}">Innate Spells</label>
																	<input id="sf-gis-{sf.id}" name="grantsInnateSpells" class="input" placeholder="Faerie Fire:1:0,Darkness:3:1" value={sf.grantsInnateSpells ?? ''} />
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
							<form method="post" action="?/addSubclassFeature" use:enhance={() => {
								return async ({ update }) => { await update(); await invalidateAll(); };
							}}>
								<input type="hidden" name="subclassId" value={sub.id} />
								<div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:flex-end;">
									<div class="field" style="flex:0 0 55px; margin:0;">
										<label class="label" for="sf-level-{sub.id}">Level</label>
										<input id="sf-level-{sub.id}" name="requiredLevel" type="number" class="input" min="1" max="20" value="3" required />
									</div>
									<div class="field" style="flex:1 1 140px; margin:0;">
										<label class="label" for="sf-name-{sub.id}">Feature</label>
										<input id="sf-name-{sub.id}" name="name" type="text" class="input" placeholder="Feature name" required />
									</div>
									<button type="submit" class="btn btn-ghost btn-sm">Add feature</button>
								</div>
									<div class="field" style="flex:1 1 130px; margin:0;">
										<label class="label" for="sf-gt">Grants Tools</label>
										<input id="sf-gt" name="grantsTools" class="input" placeholder="Thieves's Tools" />
									</div>
									<div class="field" style="flex:0 0 60px; margin:0;"><label class="label" for="choice-toolChoiceCount-52306">Tool #</label><input id="choice-toolChoiceCount-52306" name="toolChoiceCount" type="number" min="0" class="input" /></div>
									<div class="field" style="flex:1 1 140px; margin:0;"><label class="label" for="choice-toolChoicePool-18185">Tool pool</label><input id="choice-toolChoicePool-18185" name="toolChoicePool" class="input" placeholder="Thieves's Tools,Smith's Tools" /></div>
									<div class="field" style="flex:1 1 130px; margin:0;">
										<label class="label" for="sf-gl">Grants Languages</label>
										<input id="sf-gl" name="grantsLanguages" class="input" placeholder="Elvish,Dwarvish" />
									</div>
									<div class="field" style="flex:0 0 60px; margin:0;"><label class="label" for="choice-languageChoiceCount-22355">Lang #</label><input id="choice-languageChoiceCount-22355" name="languageChoiceCount" type="number" min="0" class="input" /></div>
									<div class="field" style="flex:1 1 140px; margin:0;"><label class="label" for="choice-languageChoicePool-87357">Lang pool</label><input id="choice-languageChoicePool-87357" name="languageChoicePool" class="input" placeholder="Any,Elvish,Dwarvish" /></div>
									<div class="field" style="flex:1 1 130px; margin:0;">
										<label class="label" for="sf-gr">Resistances</label>
										<input id="sf-gr" name="grantsResistances" class="input" placeholder="Fire,Cold" />
									</div>
									<div class="field" style="flex:1 1 130px; margin:0;">
										<label class="label" for="sf-gi">Immunities</label>
										<input id="sf-gi" name="grantsImmunities" class="input" placeholder="Necrotic,Radiant" />
									</div>
									<div class="field" style="flex:1 1 130px; margin:0;">
										<label class="label" for="sf-gv">Vulnerabilities</label>
										<input id="sf-gv" name="grantsVulnerabilities" class="input" placeholder="Bludgeoning" />
									</div>
									<div class="field" style="flex:1 1 160px;">
										<label class="label" for="sf-gsp">Speed Bonuses</label>
										<input id="sf-gsp" name="grantsSpeed" class="input" placeholder="WALK:10,SWIM:30" />
										<p style="font-size:0.6875rem;color:var(--text-muted);margin:0.25rem 0 0;">Format: <code>WALK:10,FLY:30</code> — additive speed bonus in feet per movement type</p>
									</div>
									<div class="field" style="flex:1 1 160px;">
										<label class="label" for="sf-gse">Grants Senses</label>
										<input id="sf-gse" name="grantsSenses" class="input" placeholder="Blindsense 10 ft" />
									</div>
									<div class="field" style="flex:2 1 180px; margin:0;">
										<label class="label" for="sf-gis">Innate Spells</label>
										<input id="sf-gis" name="grantsInnateSpells" class="input" placeholder="Faerie Fire:1:0,Darkness:3:1" />
										<p style="font-size:0.6875rem;color:var(--text-muted);margin:0.25rem 0 0;">Format: <code>SpellName:minLvl:uses[/:true]</code> · uses 0=at will · last seg=can use slots · e.g. <code>Faerie Fire:1:0,Darkness:3:1,Daylight:5:1:true</code></p>
									</div>
							</form>
						</div>
					{/if}
				</div>
			{/each}

			<!-- Add subclass -->
			<form method="post" action="?/addSubclass" use:enhance={() => {
				return async ({ update }) => { await update(); await invalidateAll(); };
			}} style="margin-top:0.5rem;">
				<div style="display:flex; gap:0.5rem; align-items:flex-end; flex-wrap:wrap;">
					<div class="field" style="flex:1 1 160px; margin:0;">
						<label class="label" for="sub-name">New subclass name</label>
						<input id="sub-name" name="name" type="text" class="input" placeholder="e.g. Champion" required />
					</div>
					<div class="field" style="flex:2 1 200px; margin:0;">
						<label class="label" for="sub-desc">Description <span class="optional">(optional)</span></label>
						<input id="sub-desc" name="description" type="text" class="input" />
					</div>
					<button type="submit" class="btn btn-primary btn-sm">Add subclass</button>
				</div>
			</form>
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