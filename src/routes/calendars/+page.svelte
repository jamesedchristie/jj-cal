<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
	import TextInput from '$lib/components/TextInput.svelte';
	import { createNewCalendar, getCalendars } from './data.remote';

	let calendars = await getCalendars();

	let name = $state('');
	let slug = $derived(
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
	);
</script>

<section>
	<h1>Calendars</h1>
	<div class="calendars">
		{#if calendars.length}
			<ul>
				{#each calendars as calendar}
					<li>
						<Button
							href={resolve('/calendars/[slug]', { slug: calendar.slug })}
							style="padding: 2rem; text-align: center;">{calendar.name}</Button
						>
					</li>
				{/each}
			</ul>
		{/if}

		<div class="add-calendar">
			<form {...createNewCalendar}>
				<label>
					New Calendar Name:
					<TextInput name="name" bind:value={name} required />
				</label>
				<label>
					Slug:
					<TextInput name="slug" value={slug} required />
				</label>
				<Button type="submit" style="padding: 0.5rem">Create Calendar</Button>
			</form>
		</div>
	</div>
</section>

<style>
	section {
		flex: auto;
		padding: 1rem;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		& h1 {
			text-align: center;
		}
		& div.calendars {
			flex: auto;
			display: flex;
			flex-direction: column;
			justify-content: space-evenly;
			align-items: stretch;
			gap: 1rem;
			width: 400px;
			max-width: 100%;
			margin: 0 auto;
		}
		& ul {
			display: flex;
			flex-direction: column;
			gap: 1rem;
			overflow-y: auto;
		}
		& div.add-calendar {
			& form {
				display: flex;
				flex-direction: column;
				gap: 0.5rem;
				& label {
					display: flex;
					flex-direction: column;
					gap: 0.2rem;
				}
			}
		}
	}
</style>
