<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Button from '$lib/components/Button.svelte';
	import type { Snippet } from 'svelte';
	import '../app.css';
	import type { LayoutData } from './$types';
	import { logout } from './login.remote';

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
		<div class="header-right">
			<span>Logged in as: {data.user?.name ?? 'Not logged in'}</span>
			{#if data.user}
				<form {...logout}>
					<Button type="submit">Logout</Button>
				</form>
			{/if}
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
		height: 100vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	header {
		flex: none;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		& .header-right {
			display: flex;
			justify-content: flex-end;
			align-items: center;
			gap: 1rem;
		}
	}
	main {
		flex: auto;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
</style>
