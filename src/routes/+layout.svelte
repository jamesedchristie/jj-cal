<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	interface Props {
		data: LayoutData;
		children: Snippet;
	}

	let { children, data }: Props = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="layout-wrapper">
	<header>
		<h1>JJ Cal</h1>
		<div>
			<span>Logged in as: {data.user?.name ?? 'Not logged in'}</span>
		</div>
	</header>
	<main>
		<svelte:boundary>
			{#snippet pending()}
				Loading...
			{/snippet}
			{@render children?.()}
		</svelte:boundary>
	</main>
</div>

<style>
	.layout-wrapper {
		height: 100dvh;
		display: flex;
		flex-direction: column;
	}
	header {
		flex: none;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	main {
		flex: auto;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
</style>
