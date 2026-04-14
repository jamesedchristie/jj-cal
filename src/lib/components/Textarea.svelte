<script lang="ts">
	import { tick } from 'svelte';
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	interface Props extends HTMLTextareaAttributes {
		value?: string;
		rows?: number;
	}

	let { value = $bindable(''), rows = 1, ...rest }: Props = $props();

	let el = $state<HTMLTextAreaElement>();

	$effect(() => {
		value;
		// Calculate height of the textarea based on its content
		tick().then(() => {
			if (!el) return;
			el.style.height = 'auto'; // Reset height to auto to get the scrollHeight correctly
			const newHeight = Math.max(el.scrollHeight + 2, 27) + 'px';
			if (el.style.height !== newHeight) {
				el.style.height = newHeight;
			}
		});
	});
</script>

<textarea bind:this={el} bind:value {rows} {...rest}></textarea>

<style>
	textarea {
		display: block;
		font: inherit;
		font-size: var(--font-size-sm);
		color: var(--color-text);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		box-shadow: none;
		padding: var(--space-1) var(--space-2);
		resize: none;
		outline: none;
		transition: border-color var(--duration-fast) var(--ease-standard);

		&:focus {
			border-color: var(--color-focus-ring);
		}
	}
</style>
