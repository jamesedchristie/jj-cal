<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<svelte:boundary>
	{#snippet pending()}
		<div>Loading...</div>
	{/snippet}
	{@render children?.()}
</svelte:boundary>

<style>
	div {
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
