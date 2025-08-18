<script lang="ts">
	interface Props {
		event?: { text: string; created_by_name: string };
		onedit: () => void;
	}

	let { event, onedit }: Props = $props();
</script>

{#if event}
	<div class="event">
		<span class="event-text">[{event.created_by_name}] {event.text}</span>
		<button type="button" class="edit-event" onclick={onedit}> Edit </button>
	</div>
{:else}
	<button type="button" class="add-event" onclick={onedit}> + </button>
{/if}

<style>
	.event {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 12px;
		padding: 2px;
		background-color: rgba(0, 0, 0, 0.05);
		border-radius: 4px;
		border: 1px solid lightgray;
		& button {
			font-size: 10px;
		}
	}
	button.add-event {
		width: 100%;
	}
</style>
