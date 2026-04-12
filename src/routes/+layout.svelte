<script lang="ts">
	import { onMount } from 'svelte';
	import { pwaInfo } from 'virtual:pwa-info';
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import Button from '$lib/components/Button.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import type { Snippet } from 'svelte';
	import '../app.css';
	import type { LayoutData } from './$types';
	import { logout } from './login.remote';
	import { setToastService, ToastService } from '$lib/components/toast/toastService.svelte';
	import Toast from '$lib/components/toast/Toast.svelte';

	interface Props {
		data: LayoutData;
		children: Snippet;
	}

	let { children, data }: Props = $props();

	const toastService = new ToastService();

	setToastService(() => toastService);

	const webManifestLink = pwaInfo?.webManifest.linkTag ?? '';

	onMount(() => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js', { scope: '/' });
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	{@html webManifestLink}
</svelte:head>

<Toast />

<div class="layout-wrapper">
	<header>
		<a href={resolve('/calendars')}>
			<h1>JJ Cal</h1>
		</a>
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
		{@render children?.()}
	</main>
	<BottomNav />
</div>

<style>
	.layout-wrapper {
		height: 100dvh;
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
		a {
			text-decoration: none;
			color: inherit;
		}
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
