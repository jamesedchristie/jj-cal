<script lang="ts">
	import { flip } from 'svelte/animate';
	import { getToastService } from './toastService.svelte';
	import { scale } from 'svelte/transition';

	let toastService = getToastService();
	let toasts = $derived(toastService().toasts);
</script>

<div class="toast-box">
	{#each toasts as t (t.id)}
		<article animate:flip transition:scale>
			{t.message}
		</article>
	{/each}
</div>

<style>
	.toast-box {
		position: fixed;
		top: 0;
		right: 0;
		padding: var(--space-8);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		pointer-events: none;
		z-index: var(--z-toast);

		article {
			display: flex;
			justify-content: center;
			align-items: center;
			background-color: var(--color-surface-raised);
			color: var(--color-text);
			padding: var(--space-4) var(--space-8);
			border-radius: var(--radius-md);
			box-shadow: var(--shadow-md);
		}
	}
</style>
