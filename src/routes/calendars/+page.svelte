<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
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
	<div class="add-calendar">
		<form {...createNewCalendar}>
			<label>
				New Calendar Name:
				<input type="text" name="name" bind:value={name} required />
			</label>
			<label>
				Slug:
				<input type="text" name="slug" value={slug} required />
			</label>
			<Button type="submit" style="padding: 0.5rem">Create Calendar</Button>
		</form>
	</div>
</section>

<style>
	section {
		flex: auto;
		padding: 1rem;
		overflow: hidden;
		& h1 {
			text-align: center;
		}
		& ul {
			margin: 2rem 0;
			display: flex;
			flex-direction: column;
			gap: 1rem;
			overflow-y: auto;
		}
		& div.add-calendar {
			margin-top: 2rem;
			& form {
				display: flex;
				flex-direction: column;
				gap: 0.5rem;
				& label {
					display: flex;
					flex-direction: column;
					gap: 0.2rem;
				}
				& input {
					width: 100%;
				}
			}
		}
	}
</style>
