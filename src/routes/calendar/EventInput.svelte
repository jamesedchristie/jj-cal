<script lang="ts">
	interface Props {
		event?: { text: string; created_by_name: string };
		oncreate?: (text: string) => Promise<boolean>;
		onedit?: (text: string) => Promise<boolean>;
	}

	let { event, oncreate, onedit }: Props = $props();

	let showInput = $state(false);
	let text = $derived.by(() => {
		const value = $state(event?.text ?? '');
		return { value };
	});

	function onsubmit(e: SubmitEvent) {
		e.preventDefault();
		if (event) {
			onedit?.(text.value);
		} else {
			oncreate?.(text.value);
			text.value = '';
		}
		showInput = false;
	}
</script>

{#if showInput}
	<form class="new-event" {onsubmit}>
		<input type="text" placeholder="Add event..." bind:value={text.value} />
		<button type="submit">Save</button>
	</form>
{:else if event}
	<div class="event">
		<span class="event-text">[{event.created_by_name}] {event.text}</span>
		<button type="button" class="edit-event" onclick={() => (showInput = true)}> Edit </button>
	</div>
{:else}
	<button type="button" class="add-event" onclick={() => (showInput = true)}> + </button>
{/if}

<style>
	.event {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	button.add-event {
		width: 100%;
	}
</style>
