<!-- shared/ui/components/ui/NotificationBell.svelte -->
<script lang="ts">
	interface Props {
		count:         number;
		notifications: any[];
	}

	let { count, notifications }: Props = $props();
	let open       = $state(false);
	let panelRef   = $state<HTMLDivElement | null>(null);
	let buttonRef  = $state<HTMLButtonElement | null>(null);

	function toggleOpen(e: MouseEvent) {
		e.stopPropagation();
		open = !open;
	}

	function clickOutside(node: HTMLElement) {
		function handleClick(e: MouseEvent) {
			if (!node.contains(e.target as Node)) open = false;
		}
		document.addEventListener('click', handleClick, true);
		return { destroy() { document.removeEventListener('click', handleClick, true); } };
	}
</script>

<div class="notif-bell" style="position:relative;" use:clickOutside>
	<button
		type="button"
		class="notif-bell__btn"
		aria-label="Notifications"
		bind:this={buttonRef}
		onclick={toggleOpen}>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
			<path d="M13.73 21a2 2 0 0 1-3.46 0"/>
		</svg>
		{#if count > 0}
			<span class="notif-bell__badge">{count > 99 ? '99+' : count}</span>
		{/if}
	</button>

	{#if open}
		<div class="notif-panel" role="dialog" aria-label="Notifications" bind:this={panelRef}>
			<div class="notif-panel__header">
				<span class="notif-panel__title">Notifications</span>
				{#if count > 0}
					<form method="post" action="/notifications?/readAll" style="display:contents;">
						<button type="submit" class="notif-panel__mark-all">Mark all read</button>
					</form>
				{/if}
			</div>
			<div class="notif-panel__list">
				{#each notifications as n}
					<form method="post" action="/notifications?id={n.id}&to={encodeURIComponent(n.actionUrl ?? '')}&/read" style="display:contents;">
						<button type="submit" class="notif-item" class:notif-item--unread={!n.isRead}>
							<p class="notif-item__title">{n.title}</p>
							<p class="notif-item__msg">{n.message}</p>
							<p class="notif-item__time">{new Date(n.createdAt).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</p>
						</button>
					</form>
				{:else}
					<p class="notif-panel__empty">No notifications</p>
				{/each}
			</div>
		</div>
	{/if}
</div>