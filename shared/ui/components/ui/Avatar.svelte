<!-- shared/ui/components/ui/Avatar.svelte -->
<script lang="ts">
	interface Props {
		name:   string;
		image?: string | null;
		size?:  'sm' | 'md' | 'lg';
	}

	let { name, image, size = 'md' }: Props = $props();

	const initials = $derived(
		name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
	);

	const sizePx = $derived({ sm: '1.5rem', md: '2rem', lg: '2.5rem' }[size]);
</script>

<div class="avatar" style="width:{sizePx};height:{sizePx};">
	{#if image}
		<img src={image} alt={name} />
	{:else}
		<span>{initials}</span>
	{/if}
</div>

<style>
	.avatar {
		border-radius: 50%;
		background-color: var(--accent-dim);
		border: 1px solid var(--border-accent);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		flex-shrink: 0;
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar span {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--accent-light);
	}
</style>
