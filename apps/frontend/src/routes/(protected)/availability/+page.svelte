<!-- apps/frontend/src/routes/(protected)/availability/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const DAYS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
	const SLOTS = Array.from({ length: 48 }, (_, i) => ({
		idx:   i,
		label: `${Math.floor(i/2).toString().padStart(2,'0')}:${i%2===0?'00':'30'}`,
	}));

	const heatmap      = $derived((data as any).heatmapData  as Record<string,number>);
	const mySlotMap    = $derived((data as any).mySlotMap    as Record<string,{date:string;scope:string;worldIds:string[]}>);
	const totalPlayers = $derived((data as any).totalPlayers as number);
	const allWorlds    = $derived((data as any).allWorlds    ?? []);
	const weekStart    = $derived(new Date((data as any).weekStart));
	const maxCount     = $derived(Math.max(1,...Object.values(heatmap??{}).map(Number)));

	function dayDate(i: number) { const d=new Date(weekStart); d.setUTCDate(weekStart.getUTCDate()+i); return d; }
	function dateKey(d: Date)   { return d.toISOString().split('T')[0]; }
	const weekLabel = $derived(()=>{
		const end=new Date(weekStart); end.setDate(weekStart.getDate()+6);
		const f=(d:Date)=>d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
		return `${f(weekStart)} – ${f(end)}`;
	});
	function prevWeek() { const d=new Date(weekStart); d.setUTCDate(d.getUTCDate()-7); goto(`/availability?week=${dateKey(d)}`); }
	function nextWeek() { const d=new Date(weekStart); d.setUTCDate(d.getUTCDate()+7); goto(`/availability?week=${dateKey(d)}`); }

	function getCount(di:number,si:number)  { return (heatmap??{})[`${di}:${si}`]??0; }
	function getMySlot(di:number,si:number) { return (mySlotMap??{})[`${di}:${si}`]??null; }

	const C:[number,number,number][] = [[24,12,4],[70,35,10],[120,58,16],[175,95,24],[220,140,36],[248,185,65]];
	function lerpColor(t:number) {
		const s=Math.max(0,Math.min(1,t))*5,lo=Math.floor(s),hi=Math.min(lo+1,5),f=s-lo;
		const [r,g,b]=[0,1,2].map(i=>Math.round(C[lo][i]+f*(C[hi][i]-C[lo][i])));
		return `rgb(${r},${g},${b})`;
	}
	function cellStyle(di:number,si:number) {
		const count=getCount(di,si),isMine=!!getMySlot(di,si);
		if(count===0) return `background:#180a02;${isMine?' outline:1.5px solid rgba(245,175,70,.7); outline-offset:-1px;':''}`;
		const t=count/maxCount,bg=lerpColor(t);
		const op=(0.18+t*0.62).toFixed(2),r=(0.65+t*0.65).toFixed(1),sp=Math.max(2.5,7.5-t*5).toFixed(1);
		let s=`background-color:${bg}; background-image:radial-gradient(circle,rgba(255,210,110,${op}) ${r}px,transparent ${r}px); background-size:${sp}px ${sp}px;`;
		if(isMine) s+=' outline:1.5px solid rgba(245,175,70,.75); outline-offset:-1px;';
		return s;
	}

	// ── Tooltip — click only ─────────────────────────────────────────
	type Tip = { di:number;si:number;x:number;y:number;flipped:boolean;count:number;isMine:boolean };
	let tip = $state<Tip|null>(null);

	function onCellClick(e: MouseEvent, di:number, si:number) {
		if(selecting){ toggleCell(di,si); return; }
		if(tip?.di===di&&tip?.si===si){ tip=null; return; }
		const r=(e.currentTarget as HTMLElement).getBoundingClientRect();
		const vw=window.innerWidth;
		const vh=window.innerHeight;
		const x=Math.min(Math.max(r.left+r.width/2-74,6),vw-160);
		// Flip tooltip below the cell if there's not enough space above
		const tipH=120; // approx tooltip height
		const y=r.top>tipH ? r.top : r.bottom;
		const flipped=r.top<=tipH;
		tip={di,si,x,y,flipped,count:getCount(di,si),isMine:!!getMySlot(di,si)};
	}
	function onPageClick(e: MouseEvent) {
		const t=e.target as HTMLElement;
		if(tip&&!t.closest('.avail__cell')&&!t.closest('.avail__tooltip')) tip=null;
	}

	// ── Modal ────────────────────────────────────────────────────────
	type Modal = {di:number;si:number;date:string;label:string;scope:'GLOBAL'|'WORLD';worldIds:Set<string>;isSaved:boolean};
	let modal = $state<Modal|null>(null);

	function openModal() {
		if(!tip) return;
		const {di,si}=tip,ex=getMySlot(di,si);
		modal={di,si,date:dateKey(dayDate(di)),label:`${DAYS[di]} · ${SLOTS[si].label}`,
			scope:(ex?.scope as any)??'GLOBAL',worldIds:new Set(ex?.worldIds??[]),isSaved:!!ex};
		tip=null;
	}
	function closeModal() { modal=null; }

	// ── Multi-select ────────────────────────────────────────────────
	let selecting = $state(false);
	let selected  = $state<Set<string>>(new Set());

	function toggleSelect() { selecting = !selecting; selected = new Set(); tip = null; }
	function toggleCell(di:number,si:number) {
		const key=`${di}:${si}`, s=new Set(selected);
		if(s.has(key))s.delete(key); else s.add(key);
		selected=s;
	}
	function clearSelection() { selected=new Set(); selecting=false; }

	type BulkModal = { cells:{di:number;si:number;date:string}[]; scope:'GLOBAL'|'WORLD'; worldIds:Set<string>; };
	let bulkModal = $state<BulkModal|null>(null);
	function openBulkModal() {
		const cells=[...selected].map(k=>{const[di,si]=k.split(':').map(Number);return{di,si,date:dateKey(dayDate(di))};});
		bulkModal={cells,scope:'GLOBAL',worldIds:new Set()};
	}
	function closeBulkModal() { bulkModal=null; }

	const LEGEND=[0,0.2,0.4,0.6,0.8,1.0];
</script>

<svelte:window onclick={onPageClick} />

<div class="avail">
	<div class="avail__header">
		<div>
			<h2 class="avail__title">Availability</h2>
			<p class="avail__week-label">{weekLabel()}</p>
		</div>
		<div class="avail__header-actions">
			<button class="avail__nav-btn" onclick={prevWeek}>‹</button>
			<button class="avail__nav-btn avail__nav-btn--today" onclick={()=>goto('/availability')}>Today</button>
			<button class="avail__nav-btn" onclick={nextWeek}>›</button>
			<button class="avail__nav-btn {selecting?'avail__nav-btn--selecting':''}"
				onclick={toggleSelect}>
				{selecting ? '✕ Cancel' : 'Select slots'}
			</button>
		</div>
	</div>

	<div class="avail__scroll">
		<div class="avail__grid">
			<div class="avail__corner"></div>
			{#each DAYS as day, di}
				<div class="avail__day-head">
					<span class="avail__day-name">{day}</span>
					<span class="avail__day-date">{dayDate(di).getDate()}/{dayDate(di).getMonth()+1}</span>
				</div>
			{/each}

			{#each SLOTS as {idx:si,label}}
				<div class="avail__time {si%2===0?'avail__time--hour':''}">
					{#if si===0}<span class="avail__time-icon">🌙</span>
					{:else if si===22}<span class="avail__time-icon">☀️</span>{/if}
					{#if si%2===0}{label}{/if}
				</div>
				{#each DAYS as _, di}
					<button
						class="avail__cell {getMySlot(di,si)?'avail__cell--mine':''} {tip?.di===di&&tip?.si===si?'avail__cell--active':''} {selected.has(`${di}:${si}`)?'avail__cell--selected':''}"
						style={cellStyle(di,si)}
						onclick={(e)=>onCellClick(e,di,si)}
						aria-label="{DAYS[di]} {label}: {getCount(di,si)} players"
					></button>
				{/each}
			{/each}

			<div class="avail__trend" aria-hidden="true">
				<svg viewBox="0 0 700 576" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
					<defs>
						<filter id="avail-glow">
							<feGaussianBlur stdDeviation="2.5" result="blur"/>
							<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
						</filter>
					</defs>
					<path d="M 0,296 C 80,280 160,310 240,292 C 320,274 400,306 480,288 C 540,274 600,298 700,284"
						fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="8" stroke-linecap="round" filter="url(#avail-glow)"/>
					<path d="M 0,296 C 80,280 160,310 240,292 C 320,274 400,306 480,288 C 540,274 600,298 700,284"
						fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.8" stroke-linecap="round"/>
				</svg>
			</div>
		</div>
	</div>

	<div class="avail__footer">
		<span class="avail__footer-note">Based on {totalPlayers} active player account{totalPlayers!==1?'s':''}</span>
		<div class="avail__legend">
			<span class="avail__legend-lbl">Less</span>
			{#each LEGEND as t}
				<div class="avail__legend-swatch" style="background:{lerpColor(t)};"></div>
			{/each}
			<span class="avail__legend-lbl">More</span>
		</div>
	</div>
</div>

{#if selecting && selected.size > 0}
	<div class="avail__bulk-bar">
		<span class="avail__bulk-count">{selected.size} slot{selected.size!==1?'s':''} selected</span>
		<div style="display:flex;gap:0.5rem; flex-wrap:wrap">
			<button class="btn btn-ghost btn-sm" onclick={clearSelection}>Clear</button>
			<button class="btn btn-primary btn-sm" onclick={openBulkModal}>Set availability</button>
		</div>
	</div>
{/if}

{#if tip}
	<div class="avail__tooltip" style="left:{tip.x}px; top:{tip.flipped ? tip.y + 'px' : (tip.y - 130) + 'px'};" role="tooltip">
		<div class="avail__tip-day">{DAYS[tip.di]}</div>
		<div class="avail__tip-time">{SLOTS[tip.si].label}</div>
		<div class="avail__tip-count">{tip.count} {tip.count===1?'Player':'Players'} 🐾</div>
		<button class="avail__tip-btn" onclick={openModal}>
			{tip.isMine?'Edit my slot':'Set availability'}
		</button>
	</div>
{/if}

{#if modal}
	<div class="avail__backdrop" role="presentation" onclick={closeModal}
		onkeydown={(e)=>{if(e.key==='Escape')closeModal();}}>
		<div class="avail__modal" role="dialog" aria-modal="true" aria-label="Set availability"
			onclick={(e)=>e.stopPropagation()}
			onkeydown={(e)=>{if(e.key==='Escape')closeModal();}}
			tabindex="0">
			<div class="avail__modal-hdr">
				<h3 class="avail__modal-title">{modal.label}</h3>
				<button class="avail__modal-close" onclick={closeModal} aria-label="Close">✕</button>
			</div>
			<form method="post" action="?/setSlot" use:enhance={()=>{
				return async({update})=>{closeModal();await update();await invalidateAll();};
			}}>
				<input type="hidden" name="date" value={modal.date}/>
				<input type="hidden" name="slot" value={modal.si}/>
				<div class="avail__scopes">
					<label class="avail__scope {modal.scope==='GLOBAL'?'avail__scope--on':''}">
						<input type="radio" name="scope" value="GLOBAL" bind:group={modal.scope}/>
						<div><p class="avail__scope-name">🌐 Global</p><p class="avail__scope-desc">Available for quests in any world</p></div>
					</label>
					<label class="avail__scope {modal.scope==='WORLD'?'avail__scope--on':''}">
						<input type="radio" name="scope" value="WORLD" bind:group={modal.scope}/>
						<div><p class="avail__scope-name">🌍 World-specific</p><p class="avail__scope-desc">Available only for selected worlds</p></div>
					</label>
				</div>
				{#if modal.scope==='WORLD'&&allWorlds.length}
					<div class="avail__worlds">
						{#each allWorlds as w}
							<label class="avail__world-opt">
								<input type="checkbox" name="worldIds" value={(w as any).id}
									checked={modal.worldIds.has((w as any).id)}
									onchange={(e)=>{
										if((e.currentTarget as HTMLInputElement).checked)modal!.worldIds.add((w as any).id);
										else modal!.worldIds.delete((w as any).id);
										modal!.worldIds=new Set(modal!.worldIds);
									}}/>
								{(w as any).name}
							</label>
						{/each}
					</div>
				{/if}
				<div class="avail__modal-actions">
					<button type="button" class="btn btn-ghost btn-sm" onclick={closeModal}>Cancel</button>
					<button type="submit" class="btn btn-primary btn-sm"
						disabled={modal.scope==='WORLD'&&modal.worldIds.size===0}>
						{modal.isSaved?'Update':'Save'}
					</button>
				</div>
			</form>
			{#if modal.isSaved}
				<form method="post" action="?/clearSlot" use:enhance={()=>{
					return async({update})=>{closeModal();await update();await invalidateAll();};
				}}>
					<input type="hidden" name="date" value={modal.date}/>
					<input type="hidden" name="slot" value={modal.si}/>
					<button type="submit" class="avail__remove-btn">Remove this slot</button>
				</form>
			{/if}
		</div>
	</div>
{/if}

{#if bulkModal}
	<div class="avail__backdrop" role="presentation" onclick={closeBulkModal}
		onkeydown={(e)=>{if(e.key==='Escape')closeBulkModal();}}>
		<div class="avail__modal" role="dialog" aria-modal="true" tabindex="0"
			onclick={(e)=>e.stopPropagation()}
			onkeydown={(e)=>{if(e.key==='Escape')closeBulkModal();}}>
			<div class="avail__modal-hdr">
				<h3 class="avail__modal-title">Set {bulkModal.cells.length} slot{bulkModal.cells.length!==1?'s':''}</h3>
				<button class="avail__modal-close" onclick={closeBulkModal}>✕</button>
			</div>
			<form method="post" action="?/setSlots" use:enhance={()=>{
				return async({update})=>{closeBulkModal();clearSelection();await update();await invalidateAll();};
			}}>
				{#each bulkModal.cells as c}
					<input type="hidden" name="dates" value={c.date}/>
					<input type="hidden" name="slots" value={c.si}/>
				{/each}
				<div class="avail__scopes">
					<label class="avail__scope {bulkModal.scope==='GLOBAL'?'avail__scope--on':''}">
						<input type="radio" name="scope" value="GLOBAL" bind:group={bulkModal.scope}/>
						<div><p class="avail__scope-name">🌐 Global</p><p class="avail__scope-desc">Available for quests in any world</p></div>
					</label>
					<label class="avail__scope {bulkModal.scope==='WORLD'?'avail__scope--on':''}">
						<input type="radio" name="scope" value="WORLD" bind:group={bulkModal.scope}/>
						<div><p class="avail__scope-name">🌍 World-specific</p><p class="avail__scope-desc">Selected worlds only</p></div>
					</label>
				</div>
				{#if bulkModal.scope==='WORLD'&&allWorlds.length}
					<div class="avail__worlds">
						{#each allWorlds as w}
							<label class="avail__world-opt">
								<input type="checkbox" name="worldIds" value={(w as any).id}
									checked={bulkModal.worldIds.has((w as any).id)}
									onchange={(e)=>{
										if((e.currentTarget as HTMLInputElement).checked)bulkModal!.worldIds.add((w as any).id);
										else bulkModal!.worldIds.delete((w as any).id);
										bulkModal!.worldIds=new Set(bulkModal!.worldIds);
									}}/>
								{(w as any).name}
							</label>
						{/each}
					</div>
				{/if}
				<div class="avail__modal-actions">
					<button type="button" class="btn btn-ghost btn-sm" onclick={closeBulkModal}>Cancel</button>
					<button type="submit" class="btn btn-primary btn-sm"
						disabled={bulkModal.scope==='WORLD'&&bulkModal.worldIds.size===0}>
						Save all
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}