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
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		pointer-events: none;
		z-index: 99;
		& article {
			display: flex;
			justify-content: center;
			align-items: center;
			background-color: white;
			padding: 1rem 2rem;
			border: black;
			box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.5);
		}
	}
</style>
