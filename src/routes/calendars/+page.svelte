<script lang="ts">
	import { page } from '$app/state';
	import Button from '$lib/components/Button.svelte';
	import Textarea from '$lib/components/Textarea.svelte';
	import { tick } from 'svelte';
	import { addEventToDate, editEvent, getCalendars, loadEvents, removeEvent, createNewCalendar } from './data.remote';
	import { CalendarEvent } from './events.svelte';
	import EventsList from './EventsList.svelte';
	import { flip } from 'svelte/animate';
	import { getToastService, ToastMessage } from '$lib/components/toast/toastService.svelte';
	import Toast from '$lib/components/toast/Toast.svelte';

	const toastService = getToastService();

	let now = new Date();
	let year = $derived(Number(page.url.searchParams.get('year') || now.getFullYear()));
	let month = $derived(Number(page.url.searchParams.get('month') || now.getMonth() + 1));

	let prevMonthHref = $derived.by(() => {
		const date = new Date(year, month - 2);
		return `/calendars?year=${date.getFullYear()}&month=${date.getMonth() + 1}`;
	});
	let monthName = $derived.by(() => {
		const date = new Date(year, month - 1);
		return date.toLocaleString('default', { month: 'long' });
	});
	let nextMonthHref = $derived.by(() => {
		const date = new Date(year, month);
		return `/calendars?year=${date.getFullYear()}&month=${date.getMonth() + 1}`;
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

	// All calendars (for filter chips + event creation picker)
	let calendars = $derived(await getCalendars());

	// Hidden calendar IDs (filter state)
	let hiddenCalendarIds = $state(new Set<number>());

	function toggleCalendarFilter(id: number) {
		const next = new Set(hiddenCalendarIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		hiddenCalendarIds = next;
	}

	// Events for the current month
	let monthEventsData = $derived(await loadEvents({ year, month }));
	let allMonthEvents = $derived(monthEventsData.map((e) => new CalendarEvent(e)));
	let monthEvents = $derived(
		allMonthEvents.filter((e) => !hiddenCalendarIds.has(e.calendar_id))
	);

	let selectedDate = $state<Date | null>(null);
	let selectedDateEvents = $derived(
		monthEvents.filter((e) => selectedDate && isSameDay(e.datetime, selectedDate))
	);

	// Calendar picker for new events — default to first calendar
	let selectedCalendarId = $derived(calendars[0]?.id ?? 0);
	let newEventCalendarId = $state<number | null>(null);
	let effectiveCalendarId = $derived(newEventCalendarId ?? selectedCalendarId);

	let editingText = $state('');
	let showCreateCalendar = $state(false);
	let newCalName = $state('');
	let newCalSlug = $derived(
		newCalName
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
	);

	let dialog = $state<HTMLDialogElement>();

	function handleDateClick(date: Date) {
		selectedDate = date;
		showDialog();
	}

	async function showDialog() {
		if (!dialog) await tick();
		dialog?.showModal();
	}

	function hideDialog() {
		dialog?.close();
	}

	function isSameDay(datetime: number, date: Date) {
		const eventDate = new Date(datetime);
		return (
			eventDate.getFullYear() === date.getFullYear() &&
			eventDate.getMonth() === date.getMonth() &&
			eventDate.getDate() === date.getDate()
		);
	}

	async function createEvent(date: Date, text: string) {
		const newEvent: (typeof allMonthEvents)[number] = {
			id: Infinity,
			calendar_id: effectiveCalendarId,
			calendar_slug: '',
			calendar_name: calendars.find((c) => c.id === effectiveCalendarId)?.name ?? '',
			calendar_colour: calendars.find((c) => c.id === effectiveCalendarId)?.colour ?? null,
			datetime: date.getTime(),
			text,
			created_by_name: '',
			created_by_id: ''
		};
		await addEventToDate({
			calendarId: effectiveCalendarId,
			year: date.getFullYear(),
			month: date.getMonth() + 1,
			date: date.getDate(),
			text
		}).updates(
			loadEvents({ year, month }).withOverride((events) => [...events, newEvent])
		);
		toastService().show(new ToastMessage('Event created!'));
		return true;
	}

	async function editEventText(event: (typeof allMonthEvents)[number], text: string) {
		if (!text.trim()) {
			await deleteEvent(event);
			return true;
		}
		await editEvent({ id: event.id, text }).updates(
			loadEvents({ year, month }).withOverride((events) =>
				events.map((e) => (e.id === event.id ? { ...e, text } : e))
			)
		);
		return true;
	}

	async function deleteEvent(event: (typeof allMonthEvents)[number]) {
		await removeEvent({ id: event.id }).updates(
			loadEvents({ year, month }).withOverride((events) =>
				events.filter((e) => e.id !== event.id)
			)
		);
	}
</script>

<div class="calendar-wrapper">
	<!-- Calendar filter chips -->
	{#if calendars.length > 0}
		<section class="filter-bar">
			{#each calendars as cal (cal.id)}
				<button
					type="button"
					class="filter-chip"
					class:hidden={hiddenCalendarIds.has(cal.id)}
					onclick={() => toggleCalendarFilter(cal.id)}
					style="--chip-color: var(--color-{cal.colour ?? 'text-muted'})"
				>
					<span class="chip-dot"></span>
					{cal.name}
				</button>
			{/each}
			<button
				type="button"
				class="add-cal-btn"
				onclick={() => (showCreateCalendar = !showCreateCalendar)}
				aria-label="Add calendar"
			>+</button>
		</section>
	{/if}

	{#if showCreateCalendar}
		<section class="create-calendar">
			<form {...createNewCalendar}>
				<input type="hidden" name="slug" value={newCalSlug} />
				<input
					name="name"
					type="text"
					placeholder="Calendar name"
					bind:value={newCalName}
					required
				/>
				<Button type="submit">Create</Button>
				<Button onclick={() => (showCreateCalendar = false)}>Cancel</Button>
			</form>
		</section>
	{/if}

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
									selected: selectedDate !== null && date.getDate() === selectedDate.getDate()
										&& date.getMonth() === selectedDate.getMonth()
										&& date.getFullYear() === selectedDate.getFullYear()
								}}
							>
								<div class="date-content">
									<div class="date-label">
										{date.getDate()}
									</div>
									<button type="button" onclick={() => handleDateClick(date)}>
										<EventsList {events} />
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
							{#if event.calendar_colour}
								<span
									class="event-cal-badge"
									style="background: var(--color-{event.calendar_colour})"
								>{event.calendar_name}</span>
							{/if}
							<Textarea
								bind:value={event.text}
								onchange={() => editEventText(event, event.text || '')}
								style="width: 100%"
							></Textarea>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p>No events for this date.</p>
		{/if}
	</section>

	<section class="new-event">
		{#if calendars.length > 1}
			<div class="cal-picker">
				{#each calendars as cal (cal.id)}
					<button
						type="button"
						class="cal-pick-btn"
						class:active={effectiveCalendarId === cal.id}
						onclick={() => (newEventCalendarId = cal.id)}
						style="--chip-color: var(--color-{cal.colour ?? 'text-muted'})"
					>
						<span class="chip-dot"></span>
						{cal.name}
					</button>
				{/each}
			</div>
		{/if}
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
	}

	/* ---- Filter bar ---- */
	.filter-bar {
		flex: none;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		flex-wrap: wrap;
	}

	.filter-chip {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-full);
		border: 1px solid var(--chip-color, var(--color-border));
		background: transparent;
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-text);
		cursor: pointer;
		transition: opacity var(--duration-fast) var(--ease-standard);

		.chip-dot {
			width: 8px;
			height: 8px;
			border-radius: var(--radius-full);
			background: var(--chip-color, var(--color-border));
			flex: none;
		}

		&.hidden {
			opacity: 0.35;
		}
	}

	.add-cal-btn {
		background: none;
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-full);
		width: var(--space-6);
		height: var(--space-6);
		font-size: var(--font-size-base);
		color: var(--color-text-subtle);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;

		&:hover {
			color: var(--color-text);
			border-color: var(--color-border-strong);
		}
	}

	/* ---- Create calendar inline form ---- */
	.create-calendar {
		flex: none;
		padding: var(--space-2) var(--space-4);
		border-bottom: 1px solid var(--color-border-subtle);

		form {
			display: flex;
			align-items: center;
			gap: var(--space-2);

			input[type='text'] {
				flex: 1;
				border: 1px solid var(--color-border);
				border-radius: var(--radius-sm);
				padding: var(--space-1) var(--space-2);
				font-size: var(--font-size-sm);
				font-family: var(--font-body);
				background: var(--color-surface);
				color: var(--color-text);
				outline: none;

				&:focus {
					border-color: var(--color-accent);
				}
			}
		}
	}

	/* ---- Calendar grid ---- */
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

	/* ---- Month nav ---- */
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

	/* ---- Dialog ---- */
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

		.event-cal-badge {
			display: inline-block;
			font-size: var(--font-size-xs);
			font-family: var(--font-body);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-inverse);
			padding: 2px var(--space-2);
			border-radius: var(--radius-full);
			line-height: var(--line-height-normal);
		}

		/* Calendar picker in the new-event form */
		.cal-picker {
			display: flex;
			gap: var(--space-2);
			padding: var(--space-2) var(--space-4) 0;
			flex-wrap: wrap;
		}

		.cal-pick-btn {
			display: inline-flex;
			align-items: center;
			gap: var(--space-1);
			padding: var(--space-1) var(--space-3);
			border-radius: var(--radius-full);
			border: 1px solid var(--chip-color, var(--color-border));
			background: transparent;
			font-size: var(--font-size-xs);
			font-family: var(--font-body);
			color: var(--color-text);
			cursor: pointer;
			transition: background var(--duration-fast) var(--ease-standard);

			.chip-dot {
				width: 8px;
				height: 8px;
				border-radius: var(--radius-full);
				background: var(--chip-color, var(--color-border));
				flex: none;
			}

			&.active {
				background: var(--chip-color, var(--color-border));
				color: var(--color-text-inverse);
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
