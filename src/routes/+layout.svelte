<script lang="ts">
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import Button from '$lib/components/Button.svelte';
	import FAB from '$lib/components/FAB.svelte';
	import Toast from '$lib/components/toast/Toast.svelte';
	import { setToastService, ToastService } from '$lib/components/toast/toastService.svelte';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { pwaInfo } from 'virtual:pwa-info';
	import '../app.css';
	import type { LayoutData } from './$types';

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
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html webManifestLink}
</svelte:head>

<Toast />

<div class="layout-wrapper">
	<header>
		<a href={resolve('/calendars')}>
			<h1>JJ Cal</h1>
		</a>
		<div class="header-right">
			{#if data.user}
				{#if data.user.isAdmin}
					<a href={resolve('/admin/invites')} class="admin-link">Invites</a>
				{/if}
				<a href={resolve('/profile')} class="profile-link" aria-label="Edit profile">
					<UserAvatar
						name={data.user.name}
						displayName={data.user.displayName}
						colour={data.user.colour}
						size="sm"
					/>
				</a>
				<form method="post" action="/api/auth/sign-out">
					<Button type="submit">Logout</Button>
				</form>
			{/if}
		</div>
	</header>
	<main>
		{@render children?.()}
	</main>
	{#if data.user}
		<FAB />
		<BottomNav />
	{/if}
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
		padding: var(--space-4);

		a {
			text-decoration: none;
			color: inherit;
		}
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.admin-link {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-muted);
	}

	.profile-link {
		display: flex;
		align-items: center;
	}

	main {
		flex: auto;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
</style>
