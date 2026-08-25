<!-- apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/backgrounds/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { ALL_SKILLS, SKILL_DISPLAY } from '@core/ui/gamesystems/dnd5e/skills.ts';
	import { ConfirmModal } from '@core/ui';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const system      = $derived((data as any).system);
	const backgrounds = $derived((data as any).backgrounds ?? []);
	let showNew  = $state(false);
	let expanded = $state<string | null>(null);
	let editing  = $state<string | null>(null);

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
			<a href="/game-systems" class="back-link">← Game Systems</a>
			<h2 class="page__title">{system.name} — Backgrounds</h2>
		</div>
		<div style="display:flex; gap:0.5rem; flex-wrap:wrap">
			<a href="/game-systems/{system.id}/dnd5e/classes" class="btn btn-ghost btn-sm">Classes</a>
			<a href="/game-systems/{system.id}/dnd5e/species" class="btn btn-ghost btn-sm">Species</a>
			<button type="button" class="btn btn-primary btn-sm" onclick={() => showNew = !showNew}>+ New background</button>
		</div>
	</div>

	{#if showNew}
		<div class="card" style="margin-bottom:1rem;">
			<h3 class="section-title">New background</h3>
			<form method="post" action="?/create" use:enhance={() => {
				return async ({ update }) => { await update(); await invalidateAll(); showNew = false; };
			}}>
				<div class="fields">
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:2 1 200px;">
							<label class="label" for="bname">Name</label>
							<input id="bname" name="name" type="text" class="input" required />
						</div>
						<div class="field" style="flex:2 1 200px;">
							<label class="label" for="bfeat">Feature name <span class="optional">(optional)</span></label>
							<input id="bfeat" name="featureName" type="text" class="input" placeholder="e.g. Researcher" />
						<div class="field">
							<label class="label" for="bgrantsfeat">Grants Feat Category</label>
							<input id="bgrantsfeat" name="grantsFeatCategory" type="text" class="input" placeholder="e.g. Origin" />
						</div>
						<div class="field">
							<label class="label" for="bgrantsfeatid">Grants Specific Feat</label>
							<select id="bgrantsfeatid" name="grantsFeatId" class="input input--select">
								<option value="">— None —</option>
								{#each (data.feats ?? []) as f}
									<option value={f.id}>{f.name}</option>
								{/each}
							</select>
						</div>
						</div>
					</div>
					<div class="field">
						<label class="label" for="bshort">Short description</label>
						<textarea id="bshort" name="shortDescription" class="input" rows="2"></textarea>
					</div>
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:1 1 180px;">
							<label class="label" for="bskill1">Fixed skill 1</label>
							<select id="bskill1" name="skill1" class="input input--select">
								<option value="">— none —</option>
								{#each ALL_SKILLS as s}<option value={s}>{SKILL_DISPLAY[s] ?? s}</option>{/each}
							</select>
							<label class="label" for="bskill2">Fixed skill 2</label>
							<select id="bskill2" name="skill2" class="input input--select">
								<option value="">— none —</option>
								{#each ALL_SKILLS as s}<option value={s}>{SKILL_DISPLAY[s] ?? s}</option>{/each}
							</select>
							<label class="label" for="bskillcount">Skill choice count</label>
							<input id="bskillcount" name="skillChoiceCount" type="number" min="1" max="6" class="input" placeholder="e.g. 2" />
							<label class="label" for="bskillpool">Skill choice pool (comma-sep enum)</label>
							<input id="bskillpool" name="skillChoicePool" type="text" class="input" placeholder="ARCANA,HISTORY,NATURE,RELIGION" />
						</div>
						<div class="field" style="flex:1 1 180px;">
							<label class="label" for="bgtool">Grants Tools</label>
							<input id="bgtool" name="grantsTools" type="text" class="input" placeholder="Thieves's Tools" />
						</div>
						<div class="field" style="flex:0 0 80px; margin:0;"><label class="label" for="choice-toolChoiceCount-8983">Tool #</label><input id="choice-toolChoiceCount-8983" name="toolChoiceCount" type="number" min="0" class="input" placeholder="1" /></div>
						<div class="field" style="flex:1 1 160px; margin:0;"><label class="label" for="choice-toolChoicePool-18185">Tool pool</label><input id="choice-toolChoicePool-18185" name="toolChoicePool" class="input" placeholder="Thieves's Tools,Smith's Tools" /></div>
						<div class="field" style="flex:1 1 180px;">
							<label class="label" for="bglang">Grants Languages</label>
							<input id="bglang" name="grantsLanguages" type="text" class="input" placeholder="Elvish,Dwarvish" />
						</div>
						<div class="field" style="flex:0 0 80px; margin:0;"><label class="label" for="choice-languageChoiceCount-66046">Lang #</label><input id="choice-languageChoiceCount-66046" name="languageChoiceCount" type="number" min="0" class="input" placeholder="1" /></div>
						<div class="field" style="flex:1 1 160px; margin:0;"><label class="label" for="choice-languageChoicePool-87357">Lang pool</label><input id="choice-languageChoicePool-87357" name="languageChoicePool" class="input" placeholder="Any,Elvish,Dwarvish" /></div>
						<div class="field" style="flex:1 1 140px;">
							<label class="label" for="bgres">Resistances</label>
							<input id="bgres" name="grantsResistances" type="text" class="input" placeholder="Fire,Cold" />
						</div>
						<div class="field" style="flex:1 1 140px;">
							<label class="label" for="bgimm">Immunities</label>
							<input id="bgimm" name="grantsImmunities" type="text" class="input" placeholder="Necrotic,Radiant" />
						</div>
						<div class="field" style="flex:1 1 140px;">
							<label class="label" for="bgvul">Vulnerabilities</label>
							<input id="bgvul" name="grantsVulnerabilities" type="text" class="input" placeholder="Bludgeoning" />
						</div>
						<div class="field" style="flex:1 1 160px;">
							<label class="label" for="bg-gsp">Speed Bonuses</label>
							<input id="bg-gsp" name="grantsSpeed" class="input" placeholder="WALK:10,SWIM:30" />
							<p style="font-size:0.6875rem;color:var(--text-muted);margin:0.25rem 0 0;">Format: <code>WALK:10,FLY:30</code> — additive speed bonus in feet per movement type</p>
						</div>
						<div class="field" style="flex:1 1 160px;">
							<label class="label" for="bg-gse">Grants Senses</label>
							<input id="bg-gse" name="grantsSenses" class="input" placeholder="Blindsense 10 ft" />
						</div>
						<div class="field" style="flex:2 1 200px;">
							<label class="label" for="bgis">Innate Spells</label>
							<input id="bgis" name="grantsInnateSpells" type="text" class="input" placeholder="Faerie Fire:1:0,Darkness:3:1" />
							<p style="font-size:0.6875rem;color:var(--text-muted);margin:0.25rem 0 0;">Format: <code>SpellName:minLvl:uses[/:true]</code> · uses 0=at will · last seg=can use slots · e.g. <code>Faerie Fire:1:0,Darkness:3:1,Daylight:5:1:true</code></p>
						</div>
						<div class="field" style="flex:1 1 180px;">
							<label class="label" for="burl">URL <span class="optional">(optional)</span></label>
							<input id="burl" name="url" type="text" class="input" />
						</div>
					</div>
				</div>
				<div class="form-actions">
					<button type="button" class="btn btn-ghost btn-sm" onclick={() => showNew = false}>Cancel</button>
					<button type="submit" class="btn btn-primary btn-sm">Create</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="card" style="padding:0;">
		{#if backgrounds.length}
			{#each backgrounds as b}
				<!-- Row header — always visible -->
				<div
					onclick={() => toggle(b.id)} onkeydown={(e) => e.key === "Enter" && toggle(b.id)} role="button" tabindex="0"
					style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1rem; cursor:pointer; border-bottom:1px solid var(--border-muted); flex-wrap:wrap; {expanded === b.id ? 'background:var(--bg-overlay);' : ''}"
				>
					<div style="flex:2 1 140px; min-width:0;">
						<div style="font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{b.name}</div>
						{#if b.featureName}<div style="font-size:0.8125rem; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{b.featureName}</div>{/if}
					</div>
					<div style="flex:2 1 120px; min-width:0; font-size:0.8125rem; color:var(--text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{(b as any).grantsSkills?.split(',').map((s: string) => SKILL_DISPLAY[s.trim()] ?? s.trim()).join(', ') || '—'}</div>
					<div style="flex:1 1 80px; min-width:0; font-size:0.8125rem; color:var(--text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{b.languages ?? '—'}</div>
					<div style="display:flex; align-items:center; gap:0.5rem; flex-shrink:0;" onclick={(e) => e.stopPropagation()} role="presentation">
						{#if b.isAvailable}<span class="badge badge-success" style="font-size:0.75rem;">✓</span>{:else}<span class="badge badge-muted" style="font-size:0.75rem;">—</span>{/if}
						<form id="cf-2767ad" method="post" action="?/deleteBackground" use:enhance={() => {
				return async ({ update }) => { await update(); await invalidateAll(); };
			}} style="margin:0;">
							<input type="hidden" name="id" value={b.id} />
							<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);"  onclick={() => window.confirmModal('Confirm', `Delete "${b.name}"?`).then(ok => { if(ok)(document.getElementById("cf-2767ad") as HTMLFormElement).requestSubmit(); })}>✕</button>
						</form>
					</div>
				</div>

				<!-- Expanded panel -->
				{#if expanded === b.id}
					<div style="padding:1rem; background:var(--bg-muted); border-bottom:1px solid var(--border-accent); word-break:break-word; overflow-wrap:anywhere;">
						{#if editing === b.id}
							<form method="post" action="?/updateBackground" use:enhance={() => {
								return async ({ update }) => { await update(); await invalidateAll(); editing = null; };
							}}>
								<input type="hidden" name="id" value={b.id} />
								<div class="fields">
									<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
										<div class="field" style="flex:2 1 180px;">
											<label class="label" for="ename-{b.id}">Name</label>
											<input id="ename-{b.id}" name="name" type="text" class="input" value={b.name} required />
										</div>
										<div class="field" style="flex:2 1 180px;">
											<label class="label" for="efeat-{b.id}">Feature name</label>
											<input id="efeat-{b.id}" name="featureName" type="text" class="input" value={b.featureName ?? ''} />
											<div class="field">
												<label class="label" for="egrantsfeat-{b.id}">Grants Feat Category</label>
												<input id="egrantsfeat-{b.id}" name="grantsFeatCategory" type="text" class="input" value={b.grantsFeatCategory ?? ''} placeholder="e.g. Origin" />
											</div>
											<div class="field">
												<label class="label" for="egrantsfeatid-{b.id}">Grants Specific Feat</label>
												<select id="egrantsfeatid-{b.id}" name="grantsFeatId" class="input input--select">
													<option value="">— None —</option>
													{#each (data.feats ?? []) as f}
														<option value={f.id} selected={b.grantsFeatId === f.id}>{f.name}</option>
													{/each}
												</select>
											</div>
										</div>
									</div>
									<div class="field">
										<label class="label" for="eshort-{b.id}">Short description</label>
										<textarea id="eshort-{b.id}" name="shortDescription" class="input" rows="3">{b.shortDescription ?? ''}</textarea>
									</div>
									<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
										<div class="field" style="flex:1 1 150px;">
											<label class="label" for="eskill-{b.id}">Skill proficiencies</label>
											<select id="eskill1-{b.id}" name="skill1" class="input input--select">
												<option value="">— none —</option>
												{#each ALL_SKILLS as s}<option value={s} selected={(b as any).grantsSkills?.split(',').map((x: string) => x.trim().toUpperCase().replace(/ /g, '_'))[0] === s}>{SKILL_DISPLAY[s] ?? s}</option>{/each}
											</select>
											<select id="eskill2-{b.id}" name="skill2" class="input input--select">
												<option value="">— none —</option>
												{#each ALL_SKILLS as s}<option value={s} selected={(b as any).grantsSkills?.split(',').map((x: string) => x.trim().toUpperCase().replace(/ /g, '_'))[1] === s}>{SKILL_DISPLAY[s] ?? s}</option>{/each}
											</select>
											<label class="label" for="eskillcount-{b.id}">Skill choice count</label>
											<input id="eskillcount-{b.id}" name="skillChoiceCount" type="number" min="1" max="6" class="input" value={(b as any).skillChoiceCount ?? ''} />
											<label class="label" for="eskillpool-{b.id}">Skill choice pool</label>
											<input id="eskillpool-{b.id}" name="skillChoicePool" type="text" class="input" value={(b as any).skillChoicePool ?? ''} placeholder="ARCANA,HISTORY,NATURE,RELIGION" />
										</div>
										<div class="field" style="flex:1 1 150px;">
											<label class="label" for="etool-{b.id}">Grants Tools</label>
											<input id="etool-{b.id}" name="grantsTools" type="text" class="input" value={(b as any).grantsTools ?? b.toolProficiencies ?? ''} />
										</div>
										<div class="field" style="flex:0 0 80px; margin:0;"><label class="label" for="choice-toolChoiceCount-69310">Tool #</label><input id="choice-toolChoiceCount-69310" name="toolChoiceCount" type="number" min="0" class="input" placeholder="1" value={(b as any).toolChoiceCount ?? ''} /></div>
										<div class="field" style="flex:1 1 160px; margin:0;"><label class="label" for="choice-toolChoicePool-70169">Tool pool</label><input id="choice-toolChoicePool-70169" name="toolChoicePool" class="input" placeholder="Thieves's Tools,Smith's Tools" value={(b as any).toolChoicePool ?? ''} /></div>
										<div class="field" style="flex:1 1 150px;">
											<label class="label" for="elang-{b.id}">Grants Languages</label>
											<input id="elang-{b.id}" name="grantsLanguages" type="text" class="input" value={(b as any).grantsLanguages ?? b.languages ?? ''} />
										</div>
										<div class="field" style="flex:1 1 150px;">
											<label class="label" for="eurl-{b.id}">URL</label>
											<input id="eurl-{b.id}" name="url" type="text" class="input" value={b.url ?? ''} />
										</div>
										<div class="field" style="flex:0 0 100px;">
											<label class="label" for="eavail-{b.id}">Available</label>
											<select id="eavail-{b.id}" name="isAvailable" class="input input--select">
												<option value="true"  selected={b.isAvailable}>Yes</option>
												<option value="false" selected={!b.isAvailable}>No</option>
											</select>
										</div>
									</div>
									<div class="field" style="flex:0 0 80px; margin:0;"><label class="label" for="choice-languageChoiceCount-8062">Lang #</label><input id="choice-languageChoiceCount-8062" name="languageChoiceCount" type="number" min="0" class="input" placeholder="1" value={(b as any).languageChoiceCount ?? ''} /></div>
									<div class="field" style="flex:1 1 160px; margin:0;"><label class="label" for="choice-languageChoicePool-72534">Lang pool</label><input id="choice-languageChoicePool-72534" name="languageChoicePool" class="input" placeholder="Any,Elvish,Dwarvish" value={(b as any).languageChoicePool ?? ''} /></div>
									<div class="field" style="flex:1 1 140px;">
										<label class="label" for="eres-{b.id}">Resistances</label>
										<input id="eres-{b.id}" name="grantsResistances" type="text" class="input" placeholder="Fire,Cold" value={(b as any).grantsResistances ?? ''} />
									</div>
									<div class="field" style="flex:1 1 140px;">
										<label class="label" for="eimm-{b.id}">Immunities</label>
										<input id="eimm-{b.id}" name="grantsImmunities" type="text" class="input" placeholder="Necrotic,Radiant" value={(b as any).grantsImmunities ?? ''} />
									</div>
									<div class="field" style="flex:1 1 140px;">
										<label class="label" for="evul-{b.id}">Vulnerabilities</label>
										<input id="evul-{b.id}" name="grantsVulnerabilities" type="text" class="input" placeholder="Bludgeoning" value={(b as any).grantsVulnerabilities ?? ''} />
									</div>
									<div class="field" style="flex:1 1 160px; ">
										<label class="label" for="bg-{b.id}-gsp">Speed Bonuses</label>
										<input id="bg-{b.id}-gsp" name="grantsSpeed" class="input" placeholder="WALK:10,SWIM:30" value={b.grantsSpeed ?? ''} />
										<p style="font-size:0.6875rem;color:var(--text-muted);margin:0.25rem 0 0;">Format: <code>WALK:10,FLY:30</code> — additive speed bonus in feet per movement type</p>
									</div>
									<div class="field" style="flex:1 1 160px; ">
										<label class="label" for="bg-{b.id}-gse">Grants Senses</label>
										<input id="bg-{b.id}-gse" name="grantsSenses" class="input" placeholder="Blindsense 10 ft" value={b.grantsSenses ?? ''} />
									</div>
									<div class="field" style="flex:2 1 200px;">
										<label class="label" for="gis-{b.id}">Innate Spells</label>
										<input id="gis-{b.id}" name="grantsInnateSpells" type="text" class="input" placeholder="Faerie Fire:1:0,Darkness:3:1" value={(b as any).grantsInnateSpells ?? ''} />
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
								{#if b.shortDescription}
									<div>
										<p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.25rem;">Description</p>
										<p style="margin:0; font-size:0.875rem; color:var(--text-secondary); line-height:1.6;">{b.shortDescription}</p>
									</div>
								{/if}
								<div style="display:flex; gap:1.5rem; flex-wrap:wrap;">
									{#if (b as any).grantsSkills}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">Skills</p><p style="margin:0; font-size:0.875rem;">{(b as any).grantsSkills.split(',').map((s: string) => SKILL_DISPLAY[s.trim()] ?? s.trim()).join(', ')}</p></div>
									{/if}
									{#if b.toolProficiencies}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">Tools</p><p style="margin:0; font-size:0.875rem;">{b.toolProficiencies}</p></div>
									{/if}
									{#if b.languages}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">Languages</p><p style="margin:0; font-size:0.875rem;">{b.languages}</p></div>
									{/if}
									{#if b.url}
										<div><p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.125rem;">URL</p><a href={b.url} target="_blank" style="font-size:0.875rem;">↗ Link</a></div>
									{/if}
								</div>
								<div><button class="btn btn-ghost btn-sm" onclick={() => editing = b.id}>Edit</button></div>
							</div>
						{/if}
					</div>
				{/if}
			{/each}
		{:else}
			<p class="table__empty">No backgrounds yet.</p>
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