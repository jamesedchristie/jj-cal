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
		min-height: var(--space-8);
		background-color: var(--color-primary);
		border: 1px solid var(--color-primary);
		border-radius: var(--radius-sm);
		color: var(--color-primary-text);
		text-decoration: none;
		cursor: pointer;
		padding: var(--space-1) var(--space-3);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		font-weight: var(--font-weight-medium);
		transition: background-color var(--duration-base) var(--ease-standard),
			color var(--duration-base) var(--ease-standard);

		&:hover {
			background-color: var(--color-primary-hover);
			border-color: var(--color-primary-hover);
		}

		&:disabled {
			opacity: 0.5;
			cursor: default;
		}
	}
</style>
