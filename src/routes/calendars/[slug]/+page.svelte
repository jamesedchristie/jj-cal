<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Button from '$lib/components/Button.svelte';
	import NameTag from '$lib/components/NameTag.svelte';
	import Textarea from '$lib/components/Textarea.svelte';
	import { tick } from 'svelte';
	import type { PageData } from './$types';
	import { addEventToDate, editEvent, loadEvents, removeEvent } from './data.remote';
	import { CalendarEvent } from './events.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let { user, calendar } = $derived(data);

	let now = new Date();
	let calendarSlug = $derived(page.params.slug!);
	let year = $derived(Number(page.url.searchParams.get('year') || now.getFullYear()));
	let month = $derived(Number(page.url.searchParams.get('month') || now.getMonth() + 1));

	let prevMonthName = $derived.by(() => {
		const date = new Date(year, month - 2);
		return date.toLocaleString('default', { month: 'long' });
	});
	let prevMonthHref = $derived.by(() => {
		const date = new Date(year, month - 2);
		return `${resolve('/calendars/[slug]', { slug: calendarSlug })}?year=${date.getFullYear()}&month=${date.getMonth() + 1}`;
	});
	let monthName = $derived.by(() => {
		const date = new Date(year, month - 1);
		return date.toLocaleString('default', { month: 'long' });
	});
	let nextMonthName = $derived.by(() => {
		const date = new Date(year, month);
		return date.toLocaleString('default', { month: 'long' });
	});
	let nextMonthHref = $derived.by(() => {
		const date = new Date(year, month);
		return `${resolve('/calendars/[slug]', { slug: calendarSlug })}?year=${date.getFullYear()}&month=${date.getMonth() + 1}`;
	});

	let monthWeeks = $derived.by(() => {
		const weeks: Date[][] = [];
		let first = new Date(year, month - 1, 1);
		if (first.getDay() !== 0) {
			first.setDate(first.getDate() - first.getDay());
		}
		let last = new Date(year, month - 1, 1);
		last.setMonth(last.getMonth() + 1);
		if (last.getDay() !== 6) {
			last.setDate(last.getDate() + (6 - last.getDay()));
		}
		let week: Date[] = [];
		for (let d = first; d <= last; d.setDate(d.getDate() + 1)) {
			week.push(new Date(d));
			if (d.getDay() === 6) {
				weeks.push(week);
				week = [];
			}
		}
		return weeks;
	});

	let monthEventsData = $derived(await loadEvents({ calendarSlug, year, month }));
	let monthEvents = $derived(monthEventsData.map((e) => new CalendarEvent(e)));
	let selectedDate = $state<Date | null>(null);

	let selectedDateEvents = $derived(
		monthEvents.filter((e) => selectedDate && isSameDay(e.datetime, selectedDate))
	);

	let selectedEvent = $state<(typeof monthEvents)[number] | null>(null);
	let editingText = $state('');

	let dialog = $state<HTMLDialogElement>();

	function handleDateClick(date: Date) {
		selectedDate = date;
		showDialog();
	}

	// function onEventEdit(date: Date, event: typeof selectedEvent = null) {
	// 	selectedDate = date;
	// 	selectedEvent = event;
	// 	editingText = event?.text ?? '';
	// 	toggleDialog();
	// }

	async function showDialog() {
		if (!dialog) await tick();
		dialog?.showModal();
	}

	function hideDialog() {
		dialog?.requestClose();
	}

	// function onsubmit(e: SubmitEvent, event: (typeof monthEvents)[number]) {
	// 	e.preventDefault();
	// 	if (!selectedDate) return;
	// 	if (event) {
	// 		if (event.text) editEventText(event, event.text);
	// 		else deleteEvent(event);
	// 	} else {
	// 		createEvent(selectedDate, editingText);
	// 	}
	// 	toggleDialog();
	// }

	function isSameDay(datetime: number, date: Date) {
		const eventDate = new Date(datetime);
		return (
			eventDate.getFullYear() === date.getFullYear() &&
			eventDate.getMonth() === date.getMonth() &&
			eventDate.getDate() === date.getDate()
		);
	}

	async function createEvent(date: Date, text: string) {
		if (!user) return false;
		const newEvent: (typeof monthEvents)[number] = {
			id: Infinity,
			calendar_id: 0, // This will be set by the server
			calendar_slug: calendarSlug,
			datetime: date.getTime(),
			text,
			created_by_name: user?.name ?? '',
			created_by_id: user?.id ?? 1
		};
		await addEventToDate({
			calendarSlug,
			year: date.getFullYear(),
			month: date.getMonth() + 1,
			date: date.getDate(),
			text,
			name: user.name
		}).updates(
			loadEvents({ calendarSlug, year, month }).withOverride((events) => [...events, newEvent])
		);
		return true;
	}

	async function editEventText(event: (typeof monthEvents)[number], text: string) {
		if (!user) return false;
		await editEvent({ id: event.id, text }).updates(
			loadEvents({ calendarSlug, year, month }).withOverride((events) =>
				events.map((e) => (e.id === event.id ? { ...e, text } : e))
			)
		);
		return true;
	}

	async function deleteEvent(event: (typeof monthEvents)[number]) {
		await removeEvent({ id: event.id }).updates(
			loadEvents({ calendarSlug, year, month }).withOverride((events) =>
				events.filter((e) => e.id !== event.id)
			)
		);
	}
</script>

<div class="calendar-wrapper">
	<section class="heading">
		<h2>{calendar.name}</h2>
	</section>
	<section class={{ calendar: true }} style:--numWeeks={monthWeeks.length}>
		<table>
			<thead>
				<tr>
					<th>Sun</th>
					<th>Mon</th>
					<th>Tue</th>
					<th>Wed</th>
					<th>Thu</th>
					<th>Fri</th>
					<th>Sat</th>
				</tr>
			</thead>
			<tbody>
				{#each monthWeeks as week}
					<tr>
						{#each week as date}
							{@const events = monthEvents.filter((event) => isSameDay(event.datetime, date))}
							<td
								class={{
									day: true,
									differentMonth: date.getMonth() + 1 !== month,
									selected: selectedDate && date.getDate() === selectedDate.getDate()
								}}
								style:height="{Math.floor(100 / monthWeeks.length)}%"
							>
								<div class="date-content">
									<div class="date-label">
										{date.getDate()}
									</div>
									<button type="button" onclick={() => handleDateClick(date)}>
										<ul>
											{#each events as event}
												<li class="event">
													<span class="event-text"
														><NameTag name={event.created_by_name} /> {event.text}</span
													>
												</li>
											{/each}
										</ul>
									</button>
								</div>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
	<section class="controls">
		<div class="controls-left">
			<Button href={prevMonthHref}>&lt;</Button>
		</div>
		<div class="controls-center">
			<h3>{monthName} {year}</h3>
		</div>
		<div class="controls-right">
			<Button href={nextMonthHref}>&gt;</Button>
		</div>
	</section>
</div>

<dialog bind:this={dialog} closedby="any">
	<div class="close-dialog">
		<Button onclick={hideDialog}>Close</Button>
	</div>
	<section class="events">
		{#if selectedDateEvents.length}
			<ul>
				{#each selectedDateEvents as event}
					<li>
						<div class="event-input">
							<NameTag name={event.created_by_name} />
							<Textarea
								bind:value={event.text}
								onchange={() => editEventText(event, event.text || '')}
								style="width: 100%"
							></Textarea>
							<!-- <button>{event.text ? 'Save' : 'Remove Event'}</button> -->
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p>No events for this date.</p>
		{/if}
	</section>
	<section class="new-event">
		<form
			onsubmit={(e) => {
				e.preventDefault();
				if (selectedDate) createEvent(selectedDate, editingText);
				editingText = '';
			}}
		>
			<div class="text-input">
				<Textarea
					bind:value={editingText}
					placeholder="Add event"
					style="width: 100%"
					onkeydown={(e) => {
						if (e.key === 'Enter' && e.metaKey) {
							e.preventDefault();
							if (selectedDate) createEvent(selectedDate, editingText);
							editingText = '';
						}
					}}
				></Textarea>
			</div>
			<div class="actions">
				<Button type="submit" disabled={!editingText.length}>Create</Button>
			</div>
		</form>
	</section>
</dialog>

<style>
	.calendar-wrapper {
		flex: auto;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		& section.heading {
			display: flex;
			justify-content: center;
			padding: 0 1rem 1rem;
			& h2 {
				font-size: 1.2rem;
			}
		}
		& .calendar {
			flex: auto;
			overflow-y: auto;
			& table {
				width: 100%;
				height: 100%;
				border-collapse: collapse;
				& thead {
					& tr {
						& th {
							font-weight: normal;
							font-size: 12px;
						}
					}
				}
				& td.day {
					position: relative;
					border: 1px solid black;
					width: 14%;
					& div.date-content {
						display: flex;
						flex-direction: column;
						width: 100%;
						height: 100%;
						& div.date-label {
							position: absolute;
							top: 0;
							right: 0;
							display: flex;
							justify-content: flex-end;
							padding: 2px;
							font-size: 14px;
						}
						& button {
							width: 100%;
							flex: auto;
							min-height: 80px;
							padding: 2px;
							background-color: transparent;
							border: none;
							text-align: left;
							hyphens: auto;
							font-size: 10px;
							cursor: pointer;
							&:hover {
								background-color: rgba(0, 0, 0, 0.1);
							}
							& ul {
								display: flex;
								flex-direction: column;
								justify-content: center;
								gap: 5px;
							}
						}
					}
					&.differentMonth {
						& div.date-content {
							& div.date-label {
								color: gray;
							}
							& button {
								background-color: rgba(0, 0, 0, 0.05);
							}
						}
					}
				}
			}
		}
		& section.controls {
			flex: none;
			width: 100%;
			display: flex;
			max-width: 400px;
			justify-content: space-between;
			align-items: center;
			padding: 1rem 1rem 2rem;
			margin: 0 auto;
			gap: 2rem;
			& .controls-center {
				& h3 {
					font-size: 1.5rem;
				}
			}
		}
	}
	dialog {
		padding: 0;
		border: 1px solid lightgray;
		border-radius: 6px;
		width: calc(min(90vw, 600px));
		& .close-dialog {
			display: flex;
			justify-content: flex-end;
			padding: 1rem 1rem 0;
		}
		& section.events {
			padding: 0 1rem;
			& ul {
				display: flex;
				flex-direction: column;
				gap: 0.5rem;
				& li {
					& .event-input {
						display: flex;
						flex-direction: column;
						gap: 3px;
						align-items: flex-start;
					}
				}
			}
			& p {
				color: gray;
				font-size: 14px;
			}
		}
		& section.new-event {
			padding: 0.5rem 1rem 1rem;
			& form {
				& .actions {
					display: flex;
					justify-content: flex-end;
					gap: 0.5rem;
					margin-top: 0.5rem;
				}
			}
		}
	}
</style>
