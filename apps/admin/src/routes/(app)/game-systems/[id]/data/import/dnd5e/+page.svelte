<!-- apps/admin/src/routes/(app)/game-systems/[id]/data/import/dnd5e/+page.svelte -->
<script lang="ts">
	import * as XLSX from 'xlsx';
	import { ConfirmModal } from '@core/ui';
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const system = $derived((data as any).system);

	type ImportTab = 'classes' | 'classFeatures' | 'subclasses' | 'subclassFeatures' | 'species' | 'speciesTraits' | 'backgrounds' | 'feats' | 'spells' | 'spellSlots' | 'spellsKnown';
	let activeTab = $state<ImportTab>('classes');

	let parsedJson  = $state('');
	let previewRows = $state<any[]>([]);
	let fileName    = $state('');
	let parseError  = $state('');
	let importing   = $state(false);

	const TABS: { key: ImportTab; label: string; action: string; columns: string[] }[] = [
		{ key: 'classes',         label: 'Classes',          action: '?/importClasses',         columns: ['name','hitDice','canCastSpells','subclassAvailableAtLevel','primaryAbilities','equipmentDescription','description','source','link','sortOrder','skillChoiceCount','grantsSavingThrows','skillPool'] },
		{ key: 'classFeatures',   label: 'Class Features',   action: '?/importClassFeatures',   columns: ['className','name','requiredLevel','description','url','grantsSkills','grantsExpertise','grantsHalfSkills','grantsSavingThrows','skillChoiceCount','skillChoicePool'] },
		{ key: 'subclasses',      label: 'Subclasses',       action: '?/importSubclasses',      columns: ['className','name','description','source','link','canCastSpells','sortOrder'] },
		{ key: 'subclassFeatures',label: 'Subclass Features',action: '?/importSubclassFeatures',columns: ['className','subclassName','name','requiredLevel','description','url','grantsSkills','grantsExpertise','grantsHalfSkills','grantsSavingThrows','skillChoiceCount','skillChoicePool'] },
		{ key: 'species',         label: 'Species',          action: '?/importSpecies',         columns: ['name','description','source','link','isSubrace','isLegacy','sortOrder'] },
		{ key: 'speciesTraits',   label: 'Species Traits',   action: '?/importSpeciesTraits',   columns: ['speciesName','name','description','requiredLevel','grantsSkills','grantsExpertise','grantsHalfSkills','skillChoiceCount','skillChoicePool'] },
		{ key: 'backgrounds',     label: 'Backgrounds',      action: '?/importBackgrounds',     columns: ['name','shortDescription','featureName','grantsFeatCategory','grantsFeatId','grantsSkills','skillChoiceCount','skillChoicePool','toolProficiencies','languages','url','sortOrder'] },
		{ key: 'feats',           label: 'Feats',            action: '?/importFeats',           columns: ['name','description','snippet','repeatable','categories','prerequisites','detailsUrl','isEpicBoon','asiAmount','asiStatFixed','asiStatChoices','grantsSkills','grantsExpertise','grantsHalfSkills','grantsSavingThrows','skillChoiceCount','skillChoicePool','sortOrder'] },
		{ key: 'spells',          label: 'Spells',           action: '?/importSpells',          columns: ['Spell ID','Name','Link','Level','School','Concentration','Ritual','Is Homebrew','Is Legacy','Cantrip Damage','Cantrip Dmg Lvl 5','Cantrip Dmg Lvl 11','Cantrip Dmg Lvl 17','Spell Damage','Upcast Per Slot','Upcast Every 2 Slots','Spell Progression','Progression Note','Range Origin','Range Value (ft)','AoE Type','AoE Value (ft)','Duration Type','Duration Interval','Duration Unit','Requires Saving Throw','Saving Throw','Requires Attack Roll','Can Cast Higher Level','Casting Time','Components','Description','Source Book','Tags','Spell List'] },
		{ key: 'spellSlots',      label: 'Spell Slots',      action: '?/importSpellSlots',      columns: ['Class Name','Subclass Name','Caster Type','Level','Slot 1','Slot 2','Slot 3','Slot 4','Slot 5','Slot 6','Slot 7','Slot 8','Slot 9'] },
		{ key: 'spellsKnown',     label: 'Spells Known',     action: '?/importSpellsKnown',     columns: ['Class Name','Subclass Name','Level','Cantrips','Prepared','Additional','Note'] },
	];

	const activeTabDef = $derived(TABS.find(t => t.key === activeTab)!);

	function downloadTemplate() {
		const ws = XLSX.utils.aoa_to_sheet([activeTabDef.columns]);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, activeTab);
		XLSX.writeFile(wb, `template_${activeTab}.xlsx`);
	}

	function handleFile(e: Event) {
		parseError  = '';
		parsedJson  = '';
		previewRows = [];
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		fileName = file.name;
		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const wb   = XLSX.read(ev.target?.result, { type: 'array' });
				const ws   = wb.Sheets[wb.SheetNames[0]];
				const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];

				if (!rows.length) {
					parseError = 'File is empty.';
					return;
				}

				// ── Header validation ────────────────────────────────────────
				// Uploaded file headers must contain ALL required columns for
				// the active tab. Extra columns are ignored (e.g. notes cols).
				const fileHeaders    = Object.keys(rows[0]);
				const requiredCols   = activeTabDef.columns;
				const missingCols    = requiredCols.filter(c => !fileHeaders.includes(c));

				if (missingCols.length) {
					parseError = `Wrong file for "${activeTabDef.label}" import.\n`
						+ `Missing columns: ${missingCols.join(', ')}.\n`
						+ `File has: ${fileHeaders.join(', ')}`;
					return;
				}

				parsedJson  = JSON.stringify(rows);
				previewRows = rows.slice(0, 5);
			} catch (err: any) {
				parseError = `Could not parse file: ${err.message}`;
			}
		};
		reader.readAsArrayBuffer(file);
	}

	function switchTab(tab: ImportTab) {
		activeTab   = tab;
		parsedJson  = '';
		previewRows = [];
		fileName    = '';
		parseError  = '';
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
			<h2 class="page__title">{system.name} — Import</h2>
		</div>
		<div style="display:flex; gap:0.5rem; flex-wrap:wrap">
			<a href="/game-systems/{system.id}/dnd5e/classes"     class="btn btn-ghost btn-sm">Classes</a>
			<a href="/game-systems/{system.id}/dnd5e/species"     class="btn btn-ghost btn-sm">Species</a>
			<a href="/game-systems/{system.id}/dnd5e/backgrounds" class="btn btn-ghost btn-sm">Backgrounds</a>
		</div>
	</div>

	{#if (form as any)?.success}
		<div class="form-success" style="margin-bottom:1rem;">
			✓ {(form as any).type}:
			{#if (form as any).imported != null}
				<strong>{(form as any).imported}</strong> imported
				{#if (form as any).skipped}, <strong>{(form as any).skipped}</strong> skipped{/if}
			{:else}
				{(form as any).created} created,
				{(form as any).updated ?? 0} updated
				{#if (form as any).skipped}, <strong>{(form as any).skipped} skipped</strong>{/if}
			{/if}.
		</div>
		{#if (form as any)?.skipReasons?.length}
			<div class="form-error" style="margin-bottom:1rem;">
				<strong>Skip reasons (first {(form as any).skipReasons.length}):</strong>
				<ul style="margin:0.5rem 0 0;padding-left:1.25rem;font-size:0.8125rem;">
					{#each (form as any).skipReasons as reason}
						<li>{reason}</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if (form as any)?.warnings?.length}
			<div class="form-warning" style="margin-bottom:1rem;background:var(--color-warning-dim,rgba(234,179,8,0.12));border:1px solid var(--color-warning,#eab308);border-radius:var(--radius-md);padding:0.75rem 1rem;">
				<strong>⚠ {(form as any).warnings.length} skill/stat value{(form as any).warnings.length !== 1 ? 's' : ''} could not be parsed and were skipped.</strong>
				<p style="font-size:0.8125rem;margin:0.25rem 0 0.5rem;color:var(--text-secondary);">Fix your spreadsheet and re-import these rows.</p>
				<ul style="margin:0;padding-left:1.25rem;font-size:0.8125rem;">
					{#each (form as any).warnings as w}
						<li>{w}</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/if}
	{#if (form as any)?.message}
		<div class="form-error" style="margin-bottom:1rem;">{(form as any).message}</div>
	{/if}
	{#if (form as any)?.deleteSuccess}
		<div class="form-success" style="margin-bottom:1rem;">
			🗑 Deleted {(form as any).deleted} {(form as any).type}.
		</div>
	{/if}

	<!-- Tab selector -->
	<div style="display:flex; gap:0.375rem; flex-wrap:wrap; margin-bottom:1rem;">
		{#each TABS as tab}
			<button type="button"
				class="btn btn-sm {activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}"
				onclick={() => switchTab(tab.key)}>
				{tab.label}
			</button>
		{/each}
	</div>

	<div class="card">
		<h3 class="section-title">Import — {activeTabDef.label}</h3>

		<div style="margin-bottom:1rem;">
			<p class="field-hint">
				Download the template, fill it in Excel, then upload it here.
				{#if activeTab === 'classFeatures' || activeTab === 'subclasses' || activeTab === 'subclassFeatures'}
					The <code>className</code> column must match an existing class name exactly.
				{/if}
				{#if activeTab === 'subclassFeatures'}
					The <code>subclassName</code> column must match an existing subclass name exactly.
				{/if}
				{#if activeTab === 'speciesTraits'}
					The <code>speciesName</code> column must match an existing species name exactly.
				{/if}
			</p>
			<div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
				<button type="button" class="btn btn-ghost btn-sm" onclick={downloadTemplate}>
					↓ Download {activeTabDef.label} template
				</button>
				<a href="/game-systems/{system.id}/data/export/dnd5e?type={activeTab}"
					class="btn btn-ghost btn-sm" download>
					↓ Export current {activeTabDef.label}
				</a>
			</div>
		</div>

		<div style="margin-bottom:0.75rem;">
			<p class="label" style="margin-bottom:0.375rem;">Required columns:</p>
			<div style="display:flex; flex-wrap:wrap; gap:0.375rem;">
				{#each activeTabDef.columns as col}
					<code style="background:var(--bg-overlay); padding:0.125rem 0.375rem; border-radius:var(--radius-sm); font-size:0.75rem;">{col}</code>
				{/each}
			</div>
		</div>

		<div class="field">
			<label class="label" for="xlsxFile">Upload Excel file (.xlsx)</label>
			<input id="xlsxFile" type="file" accept=".xlsx,.xls,.csv" class="input"
				onchange={handleFile} />
			{#if fileName}<p class="field-hint">File: {fileName}</p>{/if}
			{#if parseError}<p class="form-error" style="white-space:pre-line;">{parseError}</p>{/if}
		</div>

		{#if previewRows.length}
			<div style="margin-bottom:0.75rem;">
				<p class="label" style="margin-bottom:0.375rem;">Preview (first {previewRows.length} rows):</p>
				<div style="overflow-x:auto;">
					<table class="table" style="font-size:0.8125rem;">
						<thead>
							<tr>{#each Object.keys(previewRows[0]) as col}<th>{col}</th>{/each}</tr>
						</thead>
						<tbody>
							{#each previewRows as row}
								<tr>{#each Object.values(row) as val}<td>{val}</td>{/each}</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<form method="post" action={activeTabDef.action} use:enhance={() => {
				importing = true;
				return async ({ update }) => {
					await update();
					importing = false;
				};
			}}>
				<input type="hidden" name="json" value={parsedJson} />
				<div style="display:flex; align-items:center; gap:1rem; margin-bottom:0.75rem; padding:0.625rem 0.75rem; background:var(--bg-overlay); border-radius:var(--radius-md); flex-wrap:wrap">
					<input type="checkbox" id="allowUpdate" name="allowUpdate" value="true" />
					<label for="allowUpdate" style="font-size:0.875rem; cursor:pointer;">
						<strong>Update existing records</strong> — if unchecked, duplicate rows are skipped
					</label>
				</div>
				{#if importing}
					<div style="margin-bottom:0.75rem;">
						<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.375rem;">
							<span style="font-size:0.875rem;color:var(--text-secondary);">Importing {activeTabDef.label}…</span>
							<span style="font-size:0.75rem;color:var(--text-muted);">{previewRows.length > 0 ? 'Processing rows' : ''}</span>
						</div>
						<div style="height:6px;background:var(--bg-overlay);border-radius:99px;overflow:hidden;">
							<div class="import-progress-bar"></div>
						</div>
					</div>
				{/if}
				<button type="submit" class="btn btn-primary" disabled={importing || !parsedJson || !!parseError}>
					{#if importing}⏳ Importing…{:else}Import {activeTabDef.label}{/if}
				</button>
			</form>
		{/if}
	</div>

	<!-- Danger zone: bulk delete by category -->
	<div class="card" style="margin-top:1.5rem;border-color:var(--color-danger);">
		<h3 class="section-title" style="color:var(--color-danger);">⚠ Danger Zone — Delete All Records</h3>
		<p class="field-hint" style="margin-bottom:1rem;">
			Permanently deletes all records of the selected type for this game system. Use before re-importing to avoid duplicates.
			This cannot be undone.
		</p>
		<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
			{#each [
				{ action: '?/deleteSubclassFeatures', label: 'Subclass Features' },
				{ action: '?/deleteSubclasses',       label: 'Subclasses' },
				{ action: '?/deleteClassFeatures',    label: 'Class Features' },
				{ action: '?/deleteClasses',          label: 'Classes' },
				{ action: '?/deleteSpeciesTraits',    label: 'Species Traits' },
				{ action: '?/deleteSpecies',          label: 'Species' },
				{ action: '?/deleteBackgrounds',      label: 'Backgrounds' },
				{ action: '?/deleteFeats',            label: 'Feats' },
				{ action: '?/deleteSpells',           label: 'Spells' },
				{ action: '?/deleteSpellSlots',       label: 'Spell Slots' },
				{ action: '?/deleteSpellsKnown',      label: 'Spells Known' },
			] as btn}
				<form id="cf-ebe9cc" method="post" action={btn.action} use:enhance={() => {
				return async ({ update }) => { await update(); };
			}}>
					<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);border-color:var(--color-danger);" onclick={() => window.confirmModal('Confirm', `Delete ALL ${btn.label} for ${system.name}? This cannot be undone.`).then(ok => { if(ok)(document.getElementById("cf-ebe9cc") as HTMLFormElement).requestSubmit(); })}>
						🗑 {btn.label}
					</button>
				</form>
			{/each}
		</div>
		<p class="field-hint" style="margin-top:0.75rem;">
			<strong>Recommended deletion order:</strong> Subclass Features → Subclasses → Class Features → Classes
		</p>
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