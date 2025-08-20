<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		href?: string;
		children?: Snippet;
	}

	let { href, children, type = 'button', ...rest }: Props = $props();
</script>

<svelte:element this={href ? 'a' : 'button'} {href} {type} {...rest}>
	{@render children?.()}
</svelte:element>

<style>
	a,
	button {
		display: block;
		background-color: black;
		border: none;
		color: white;
		text-decoration: none;
		cursor: pointer;
		padding: 0.3rem 0.7rem;
		border-radius: 4px;
		&:hover {
			background-color: darkgray;
		}
		&:disabled {
			opacity: 0.5;
			cursor: default;
		}
	}
</style>
