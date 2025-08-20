<script lang="ts">
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
		if (!el) return;
		el.style.height = 'auto'; // Reset height to auto to get the scrollHeight correctly
		const newHeight = Math.max(el.scrollHeight + 2, 27) + 'px';
		if (el.style.height !== newHeight) {
			el.style.height = newHeight;
		}
	});
</script>

<textarea bind:this={el} bind:value {rows} {...rest}></textarea>

<style>
	textarea {
		display: block;
		font: inherit;
		border: 1px solid lightgray;
		border-radius: 4px;
		box-shadow: none;
		font-size: 14px;
		padding: 5px;
		resize: none;
	}
</style>
