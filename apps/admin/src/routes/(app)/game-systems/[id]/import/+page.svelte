<!-- apps/admin/src/routes/(app)/game-systems/[id]/import/+page.svelte -->
<script lang="ts">
	import * as XLSX from 'xlsx';
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const system = $derived((data as any).system);

	type ImportTab = 'classes' | 'classFeatures' | 'subclasses' | 'subclassFeatures' | 'species' | 'speciesTraits' | 'backgrounds';
	let activeTab = $state<ImportTab>('classes');

	let parsedJson  = $state('');
	let previewRows = $state<any[]>([]);
	let fileName    = $state('');
	let parseError  = $state('');

	const TABS: { key: ImportTab; label: string; action: string; columns: string[] }[] = [
		{ key: 'classes',         label: 'Classes',          action: '?/importClasses',         columns: ['name','hitDice','canCastSpells','primaryAbilities','equipmentDescription','description','source','link','sortOrder'] },
		{ key: 'classFeatures',   label: 'Class Features',   action: '?/importClassFeatures',   columns: ['className','name','requiredLevel','description','url'] },
		{ key: 'subclasses',      label: 'Subclasses',       action: '?/importSubclasses',      columns: ['className','name','description','source','link','sortOrder'] },
		{ key: 'subclassFeatures',label: 'Subclass Features',action: '?/importSubclassFeatures',columns: ['className','subclassName','name','requiredLevel','description','url'] },
		{ key: 'species',         label: 'Species',          action: '?/importSpecies',         columns: ['name','description','source','link','isSubrace','isLegacy','sortOrder'] },
		{ key: 'speciesTraits',   label: 'Species Traits',   action: '?/importSpeciesTraits',   columns: ['speciesName','name','description','requiredLevel'] },
		{ key: 'backgrounds',     label: 'Backgrounds',      action: '?/importBackgrounds',     columns: ['name','shortDescription','featureName','skillProficiencies','toolProficiencies','languages','url','sortOrder'] },
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
				const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
				parsedJson  = JSON.stringify(rows);
				previewRows = (rows as any[]).slice(0, 5);
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
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/game-systems" class="back-link">← Game Systems</a>
			<h2 class="page__title">{system.name} — Import</h2>
		</div>
		<div style="display:flex; gap:0.5rem;">
			<a href="/game-systems/{system.id}/classes"     class="btn btn-ghost btn-sm">Classes</a>
			<a href="/game-systems/{system.id}/species"     class="btn btn-ghost btn-sm">Species</a>
			<a href="/game-systems/{system.id}/backgrounds" class="btn btn-ghost btn-sm">Backgrounds</a>
		</div>
	</div>

	{#if (form as any)?.success}
		<div class="form-success" style="margin-bottom:1rem;">
			✓ {(form as any).type}: {(form as any).created} created,
			{(form as any).updated ?? 0} updated
			{#if (form as any).skipped}, {(form as any).skipped} skipped (class/species not found){/if}.
		</div>
	{/if}
	{#if (form as any)?.message}
		<div class="form-error" style="margin-bottom:1rem;">{(form as any).message}</div>
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
			<button type="button" class="btn btn-ghost btn-sm" onclick={downloadTemplate}>
				↓ Download {activeTabDef.label} template
			</button>
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
			{#if parseError}<p class="form-error">{parseError}</p>{/if}
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

			<form method="post" action={activeTabDef.action} use:enhance>
				<input type="hidden" name="json" value={parsedJson} />
				<div style="display:flex; align-items:center; gap:1rem; margin-bottom:0.75rem; padding:0.625rem 0.75rem; background:var(--bg-overlay); border-radius:var(--radius-md);">
					<input type="checkbox" id="allowUpdate" name="allowUpdate" value="true" />
					<label for="allowUpdate" style="font-size:0.875rem; cursor:pointer;">
						<strong>Update existing records</strong> — if unchecked, duplicate rows are skipped
					</label>
				</div>
				<button type="submit" class="btn btn-primary">Import {activeTabDef.label}</button>
			</form>
		{/if}
	</div>
</div>