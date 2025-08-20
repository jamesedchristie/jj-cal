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
		min-height: var(--button-height, 30px);
		background-color: var(--button-bg-color, black);
		border: var(--button-border-width, 2px) solid;
		border-color: var(--button-border-color, black);
		border-radius: var(--button-border-radius, 4px);
		color: var(--button-text-color, white);
		text-decoration: none;
		cursor: pointer;
		padding: var(--button-padding, 0.3rem 0.7rem);
		transition:
			background-color 0.2s ease,
			color 0.2s ease;
		&:hover {
			background-color: var(--button-hover-bg-color, #333);
		}
		&:disabled {
			opacity: 0.5;
			cursor: default;
		}
	}
</style>
