<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<svelte:boundary>
	{#snippet pending()}
		Loading...
	{/snippet}
	{@render children?.()}
</svelte:boundary>
