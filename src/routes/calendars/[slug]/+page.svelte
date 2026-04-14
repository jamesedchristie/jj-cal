<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Button from '$lib/components/Button.svelte';
	import NameTag from '$lib/components/NameTag.svelte';
	import Textarea from '$lib/components/Textarea.svelte';
	import { tick } from 'svelte';
	import type { PageData } from './$types';
	import { addEventToDate, editEvent, loadEvents, loadUserColours, removeEvent } from './data.remote';
	import { CalendarEvent } from './events.svelte';
	import EventsList from './EventsList.svelte';
	import { flip } from 'svelte/animate';
	import { getToastService, ToastMessage } from '$lib/components/toast/toastService.svelte';
	import Toast from '$lib/components/toast/Toast.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let { user, calendar } = $derived(data);

	const toastService = getToastService();

	let now = new Date();
	let calendarSlug = $derived(page.params.slug!);
	let year = $derived(Number(page.url.searchParams.get('year') || now.getFullYear()));
	let month = $derived(Number(page.url.searchParams.get('month') || now.getMonth() + 1));

	let prevMonthHref = $derived.by(() => {
		const date = new Date(year, month - 2);
		return `${resolve('/calendars/[slug]', { slug: calendarSlug })}?year=${date.getFullYear()}&month=${date.getMonth() + 1}`;
	});
	let monthName = $derived.by(() => {
		const date = new Date(year, month - 1);
		return date.toLocaleString('default', { month: 'long' });
	});
	let nextMonthHref = $derived.by(() => {
		const date = new Date(year, month);
		return `${resolve('/calendars/[slug]', { slug: calendarSlug })}?year=${date.getFullYear()}&month=${date.getMonth() + 1}`;
	});

	let monthWeeks = $derived.by(() => {
		const weeks: Date[][] = [];
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		let first = new Date(year, month - 1, 1);
		if (first.getDay() !== 0) {
			first.setDate(first.getDate() - first.getDay());
		}
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
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
	let userColourRows = $derived(await loadUserColours());
	const colourOf = $derived(
		(id: string) => userColourRows.find((u) => u.id === id)?.colour ?? null
	);
	let selectedDate = $state<Date | null>(null);

	let selectedDateEvents = $derived(
		monthEvents.filter((e) => selectedDate && isSameDay(e.datetime, selectedDate))
	);

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
		dialog?.close();
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
			created_by_id: user?.id ?? ''
		};
		await addEventToDate({
			calendarSlug,
			year: date.getFullYear(),
			month: date.getMonth() + 1,
			date: date.getDate(),
			text
		}).updates(
			loadEvents({ calendarSlug, year, month }).withOverride((events) => [...events, newEvent])
		);
		toastService().show(new ToastMessage('Event created successfully!'));
		return true;
	}

	async function editEventText(event: (typeof monthEvents)[number], text: string) {
		if (!user) return false;
		if (!text.trim()) {
			await deleteEvent(event);
			return true;
		}
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
				{#each monthWeeks as week (week[0]?.getTime())}
					<tr style:flex="1 1 {Math.floor(100 / monthWeeks.length)}%">
						{#each week as date (date.getTime())}
							{@const events = monthEvents.filter((event) => isSameDay(event.datetime, date))}
							<td
								class={{
									day: true,
									differentMonth: date.getMonth() + 1 !== month,
									selected: selectedDate && date.getDate() === selectedDate.getDate()
								}}
							>
								<div class="date-content">
									<div class="date-label">
										{date.getDate()}
									</div>
									<button type="button" onclick={() => handleDateClick(date)}>
										<EventsList {events} {colourOf} />
										<!-- <ul>
											{#each events as event}
												<li class="event">
													<span class="event-text"
														><NameTag name={event.created_by_name} /> {event.text}</span
													>
												</li>
											{/each}
										</ul> -->
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
	<Toast />
	<div class="close-dialog">
		<Button onclick={hideDialog}>Close</Button>
	</div>
	<section class="events">
		{#if selectedDateEvents.length}
			<ul>
				{#each selectedDateEvents as event (event.id)}
					<li animate:flip>
						<div class="event-input">
							<NameTag name={event.created_by_name} colour={colourOf(event.created_by_id)} />
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

		section.heading {
			display: flex;
			justify-content: center;
			padding: 0 var(--space-4) var(--space-4);

			h2 {
				font-size: var(--font-size-lg);
				font-family: var(--font-heading);
				font-weight: var(--font-weight-bold);
			}
		}

		.calendar {
			flex: auto;
			overflow-y: auto;

			table {
				width: 100%;
				height: 100%;
				border-collapse: collapse;
				display: flex;
				flex-direction: column;
				align-items: stretch;

				thead {
					flex: none;
					display: block;
					width: 100%;

					tr {
						width: 100%;
						display: flex;

						th {
							flex: 1 1 14%;
							height: var(--space-5);
							font-weight: var(--font-weight-regular);
							font-size: var(--font-size-xs);
							font-family: var(--font-body);
							color: var(--color-text-muted);
						}
					}
				}

				tbody {
					flex: auto;
					display: flex;
					flex-direction: column;

					tr {
						width: 100%;
						display: flex;
						border-top: 1px solid var(--color-border);
						overflow: hidden;

						&:last-child {
							border-bottom: 1px solid var(--color-border);
						}

						td.day {
							flex: 1 1 14%;
							position: relative;
							width: 14%;
							border-left: 1px solid var(--color-border);
							padding: 0;

							&:last-child {
								border-right: 1px solid var(--color-border);
							}

							div.date-content {
								display: flex;
								flex-direction: column;
								width: 100%;
								height: 100%;
								overflow: hidden;

								div.date-label {
									position: absolute;
									top: 0;
									right: 0;
									display: flex;
									justify-content: flex-end;
									padding: 2px;
									font-size: var(--font-size-xs);
									font-family: var(--font-body);
									color: var(--color-text);
								}

								button {
									width: 100%;
									flex: auto;
									min-height: var(--space-10);
									padding: 2px;
									background-color: transparent;
									border: none;
									text-align: left;
									hyphens: auto;
									font-size: var(--font-size-xs);
									cursor: pointer;
									display: flex;
									flex-direction: column;
									justify-content: center;

									&:hover {
										background-color: color-mix(in srgb, var(--color-text) 8%, transparent);
									}
								}
							}

							&.differentMonth {
								div.date-content {
									div.date-label {
										color: var(--color-text-subtle);
									}

									button {
										background-color: color-mix(in srgb, var(--color-text) 4%, transparent);
									}
								}
							}
						}
					}
				}
			}
		}

		section.controls {
			flex: none;
			width: 100%;
			display: flex;
			max-width: 400px;
			justify-content: space-between;
			align-items: center;
			padding: var(--space-4) var(--space-4) var(--space-8);
			margin: 0 auto;
			gap: var(--space-8);

			.controls-center h3 {
				font-size: var(--font-size-xl);
				font-family: var(--font-heading);
				font-weight: var(--font-weight-bold);
			}
		}
	}

	dialog {
		padding: 0;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text);
		width: calc(min(90vw, 600px));

		.close-dialog {
			display: flex;
			justify-content: flex-end;
			padding: var(--space-4) var(--space-4) 0;
		}

		section.events {
			padding: 0 var(--space-4);

			ul {
				display: flex;
				flex-direction: column;
				gap: var(--space-2);

				li .event-input {
					display: flex;
					flex-direction: column;
					gap: var(--space-1);
					align-items: flex-start;
				}
			}

			p {
				color: var(--color-text-muted);
				font-size: var(--font-size-sm);
				font-family: var(--font-body);
			}
		}

		section.new-event {
			padding: var(--space-2) var(--space-4) var(--space-4);

			form .actions {
				display: flex;
				justify-content: flex-end;
				gap: var(--space-2);
				margin-top: var(--space-2);
			}
		}
	}
</style>
