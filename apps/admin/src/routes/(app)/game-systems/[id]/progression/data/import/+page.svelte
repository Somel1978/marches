<!-- apps/admin/src/routes/(app)/game-systems/[id]/progression/data/import/+page.svelte -->
<script lang="ts">
	import * as XLSX from 'xlsx';
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const system = $derived((data as any).system);

	const COLUMNS = ['label', 'xpRequired', 'description', 'sortOrder'];

	let parsedJson  = $state('');
	let previewRows = $state<any[]>([]);
	let fileName    = $state('');
	let parseError  = $state('');

	function downloadTemplate() {
		const ws = XLSX.utils.aoa_to_sheet([COLUMNS]);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, 'progression');
		XLSX.writeFile(wb, 'template_progression.xlsx');
	}

	function handleFile(e: Event) {
		parseError = ''; parsedJson = ''; previewRows = [];
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
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/game-systems/{system.id}/progression" class="back-link">← Progression</a>
			<h2 class="page__title">{system.name} — Import Progression</h2>
		</div>
		<a href="/game-systems/{system.id}/progression/data/export" class="btn btn-ghost btn-sm" download>↓ Export current</a>
	</div>

	{#if (form as any)?.success}
		<div class="form-success">
			Import complete — {(form as any).created} created, {(form as any).updated} updated, {(form as any).skipped} skipped.
		</div>
	{/if}
	{#if (form as any)?.message}<div class="form-error">{(form as any).message}</div>{/if}

	<div class="card">
		<h3 class="section-title">Import Progression Thresholds</h3>

		<div style="margin-bottom:1rem;">
			<p class="field-hint">
				<code>label</code> is used to match existing thresholds for updates.
				<code>xpRequired</code> must be a whole number.
			</p>
			<div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
				<button type="button" class="btn btn-ghost btn-sm" onclick={downloadTemplate}>
					↓ Download template
				</button>
			</div>
		</div>

		<div style="margin-bottom:0.75rem;">
			<p class="label" style="margin-bottom:0.375rem;">Columns:</p>
			<div style="display:flex; flex-wrap:wrap; gap:0.375rem;">
				{#each COLUMNS as col}
					<code style="background:var(--bg-overlay); padding:0.125rem 0.375rem; border-radius:var(--radius-sm); font-size:0.75rem;">{col}</code>
				{/each}
			</div>
		</div>

		<div class="field">
			<label class="label" for="xlsxFile">Upload Excel file (.xlsx)</label>
			<input id="xlsxFile" type="file" accept=".xlsx,.xls,.csv" class="input" onchange={handleFile} />
			{#if fileName}<p class="field-hint">File: {fileName}</p>{/if}
			{#if parseError}<p class="form-error">{parseError}</p>{/if}
		</div>

		{#if previewRows.length}
			<div style="margin-bottom:0.75rem;">
				<p class="label" style="margin-bottom:0.375rem;">Preview (first {previewRows.length} rows):</p>
				<div class="table-wrap">
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

			<form method="post" use:enhance>
				<input type="hidden" name="json" value={parsedJson} />
				<div style="display:flex; align-items:center; gap:1rem; margin-bottom:0.75rem; padding:0.625rem 0.75rem; background:var(--bg-overlay); border-radius:var(--radius-md); flex-wrap:wrap">
					<input type="checkbox" id="allowUpdate" name="allowUpdate" value="true" />
					<label for="allowUpdate" style="font-size:0.875rem; cursor:pointer;">
						<strong>Update existing records</strong> — if unchecked, duplicate rows are skipped
					</label>
				</div>
				<button type="submit" class="btn btn-primary">Import Progression</button>
			</form>
		{/if}
	</div>
</div>
