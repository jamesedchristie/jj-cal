<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Toast from '$lib/components/toast/Toast.svelte';
	import { enqueueOrSubmit } from '$lib/offline-queue.svelte';
	import type { EventRecurrenceRule } from '$lib/server/db/schema';
	import { flip } from 'svelte/animate';
	import { SvelteSet } from 'svelte/reactivity';
	import { slide } from 'svelte/transition';
	import { createCalendarStore } from './calendar-store.svelte';
	import { createNewCalendar, getCalendars, loadEvents } from './data.remote';
	import { CalendarEvent } from './events.svelte';
	import MonthGrid from './MonthGrid.svelte';

	const today = new Date();
	const todayY = today.getFullYear();
	const todayM = today.getMonth() + 1;
	const todayD = today.getDate();

	// 2 months prior + current + 11 months forward = 14 months
	const months = Array.from({ length: 14 }, (_, i) => {
		const d = new Date(todayY, todayM - 1 + (i - 2));
		return { year: d.getFullYear(), month: d.getMonth() + 1 };
	});

	const store = createCalendarStore(months);

	// ---- Calendars & filters ----
	let calendars = $derived(await getCalendars());
	let hiddenCalendarIds = $state(new Set<number>());

	function toggleCalendarFilter(id: number) {
		const next = new SvelteSet(hiddenCalendarIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		hiddenCalendarIds = next;
	}

	// ---- Selected date & events ----
	let selectedDate = $state<Date>(new Date(today));

	function isSameDay(datetime: number, date: Date) {
		const e = new Date(datetime);
		return (
			e.getFullYear() === date.getFullYear() &&
			e.getMonth() === date.getMonth() &&
			e.getDate() === date.getDate()
		);
	}

	function formatSelectedDate(date: Date): string {
		return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
	}

	// Derive events for the selected date — shares cache with MonthGrid's loadEvents call
	const rawSelectedMonthEvents = $derived(
		await loadEvents({ year: selectedDate.getFullYear(), month: selectedDate.getMonth() + 1 })
	);
	const selectedDateEvents = $derived(
		rawSelectedMonthEvents
			.map((e) => new CalendarEvent(e))
			.filter((e) => !hiddenCalendarIds.has(e.calendar_id))
			.filter((e) => isSameDay(e.datetime, selectedDate))
	);

	// ---- Scroll area ----
	let scrollAreaEl = $state<HTMLDivElement>();
	let showTodayBtn = $state(false);

	function scrollToToday() {
		const id = `month-${todayY}-${String(todayM).padStart(2, '0')}`;
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	// Track whether current month is visible to show/hide back-to-today
	$effect(() => {
		if (!scrollAreaEl) return;
		const id = `month-${todayY}-${String(todayM).padStart(2, '00')}`;
		const target = document.getElementById(id);
		if (!target) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				showTodayBtn = !entry.isIntersecting;
			},
			{ root: scrollAreaEl, threshold: 0.1 }
		);
		observer.observe(target);
		return () => observer.disconnect();
	});

	// Scroll to current month on first mount
	$effect(() => {
		if (!scrollAreaEl) return;
		requestAnimationFrame(scrollToToday);
	});

	// Auto-select date based on scroll position: pick the topmost visible month
	function updateSelectedDateFromScroll() {
		if (!scrollAreaEl) return;
		const scrollTop = scrollAreaEl.scrollTop;

		let currentMonth = months[0];
		for (const m of months) {
			const id = `month-${m.year}-${String(m.month).padStart(2, '0')}`;
			const el = document.getElementById(id);
			if (el && el.offsetTop <= scrollTop + 10) {
				currentMonth = m;
			}
		}

		const { year, month } = currentMonth;
		if (selectedDate.getFullYear() !== year || selectedDate.getMonth() + 1 !== month) {
			selectedDate =
				year === todayY && month === todayM ? new Date(today) : new Date(year, month - 1, 1);
		}
	}

	$effect(() => {
		const el = scrollAreaEl;
		if (!el) return;
		el.addEventListener('scroll', updateSelectedDateFromScroll, { passive: true });
		return () => el.removeEventListener('scroll', updateSelectedDateFromScroll);
	});

	// ---- Event form state ----
	let selectedCalendarId = $derived(calendars[0]?.id ?? 0);
	let newEventCalendarId = $state<number | null>(null);
	let effectiveCalendarId = $derived(newEventCalendarId ?? selectedCalendarId);

	let editingText = $state('');
	let newEventRepeat = $state<EventRecurrenceRule | ''>('');
	let newEventEndsOn = $state('');
	let showCreateCalendar = $state(false);
	let showAddForm = $state(false);
	let newCalName = $state('');
	let newCalSlug = $derived(
		newCalName
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
	);

	// ---- Event menu ----
	let openMenuId = $state<string | null>(null);

	function eventKey(event: CalendarEvent) {
		return event.isRecurring ? `${event.recurrenceGroupId}:${event.datetime}` : `${event.id}`;
	}

	function handleDateClick(date: Date) {
		selectedDate = date;
	}

	// ---- Mutations ----
	function createEvent(date: Date, text: string) {
		const cal = calendars.find((c) => c.id === effectiveCalendarId);
		store.addEvent({
			calendarId: effectiveCalendarId,
			calendarName: cal?.name ?? '',
			calendarColour: cal?.colour ?? null,
			year: date.getFullYear(),
			month: date.getMonth() + 1,
			date: date.getDate(),
			text,
			recurrenceRule: newEventRepeat || null,
			recurrenceEndsOn: newEventEndsOn || null
		});
		newEventRepeat = '';
		newEventEndsOn = '';
		editingText = '';
		showAddForm = false;
	}

	function editEventText(event: CalendarEvent, text: string) {
		if (!text.trim()) {
			deleteThisEvent(event);
			return;
		}
		store.editEvent(event.id, event.datetime, text);
	}

	function deleteThisEvent(event: CalendarEvent) {
		store.removeEvent(event.id, event.datetime);
		openMenuId = null;
	}

	function deleteThisAndFuture(event: CalendarEvent) {
		if (!event.recurrenceGroupId) return;
		store.removeFutureEvents(event.recurrenceGroupId, event.datetime);
		openMenuId = null;
	}
</script>

<svelte:window onclick={() => (openMenuId = null)} />

<Toast />

<div class="calendar-wrapper">
	{#if showCreateCalendar}
		<section class="create-calendar">
			<form {...createNewCalendar.enhance(({ form, submit }) => enqueueOrSubmit(form, submit))}>
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

	<div class="split-area">
		<!-- Top half: scrollable months -->
		<div class="top-panel">
			<!-- Filter chips overlaid top-right -->
			<div class="filter-bar">
				{#each calendars as cal (cal.id)}
					<button
						type="button"
						class="filter-chip"
						class:dimmed={hiddenCalendarIds.has(cal.id)}
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
					aria-label="Add calendar">+</button
				>
			</div>

			{#if calendars.length === 0 && !showCreateCalendar}
				<div class="no-calendars">
					<p>No calendars yet.</p>
					<button type="button" onclick={() => (showCreateCalendar = true)}
						>Create your first calendar →</button
					>
				</div>
			{:else}
				<div class="scroll-area" bind:this={scrollAreaEl}>
					{#each months as { year, month } (`${year}-${month}`)}
						<MonthGrid
							{year}
							{month}
							{todayY}
							{todayM}
							{todayD}
							{hiddenCalendarIds}
							{selectedDate}
							onDateClick={handleDateClick}
						/>
					{/each}
				</div>
			{/if}

			{#if showTodayBtn}
				<button type="button" class="today-fab" onclick={scrollToToday}>Today</button>
			{/if}
		</div>

		<!-- Bottom half: events for selected date -->
		<div class="bottom-panel">
			<div class="panel-header">
				<h2 class="panel-date">{formatSelectedDate(selectedDate)}</h2>
			</div>

			<div class="panel-body">
				<section class="events">
					{#if selectedDateEvents.length}
						<ul>
							{#each selectedDateEvents as event (event.isRecurring ? `${event.recurrenceGroupId}:${event.datetime}` : event.id)}
								{@const key = eventKey(event)}
								<li class="event-row" animate:flip>
									{#if event.calendar_colour}
										<span class="ev-chip" style="background: var(--color-{event.calendar_colour})"
											>{event.calendar_name}</span
										>
									{/if}
									{#if event.isRecurring}
										<span class="recur-icon" title="Recurring event">↻</span>
									{/if}
									<input
										class="ev-input"
										type="text"
										bind:value={event.text}
										onchange={() => editEventText(event, event.text || '')}
									/>
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div class="ev-menu" onclick={(e) => e.stopPropagation()}>
										<button
											type="button"
											class="ev-menu-btn"
											onclick={() => (openMenuId = openMenuId === key ? null : key)}
											aria-label="Event options">⋯</button
										>
										{#if openMenuId === key}
											<div class="ev-menu-popup" transition:slide={{ duration: 120 }}>
												{#if event.isRecurring}
													<button
														type="button"
														class="menu-item danger"
														onclick={() => deleteThisEvent(event)}>Delete this</button
													>
													<button
														type="button"
														class="menu-item danger"
														onclick={() => deleteThisAndFuture(event)}>Delete future</button
													>
												{:else}
													<button
														type="button"
														class="menu-item danger"
														onclick={() => deleteThisEvent(event)}>Delete</button
													>
												{/if}
											</div>
										{/if}
									</div>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="no-events">No events</p>
					{/if}
				</section>

				<section class="new-event">
					{#if showAddForm}
						<div class="add-form">
							<form
								onsubmit={(e) => {
									e.preventDefault();
									if (editingText.trim()) createEvent(selectedDate, editingText);
								}}
							>
								<!-- Row 1: event name -->
								<!-- svelte-ignore a11y_autofocus -->
								<input
									class="add-text-input"
									type="text"
									placeholder="Event name…"
									bind:value={editingText}
									autofocus
									onkeydown={(e) => {
										if (e.key === 'Enter' && e.metaKey) {
											e.preventDefault();
											if (editingText.trim()) createEvent(selectedDate, editingText);
										}
										if (e.key === 'Escape') showAddForm = false;
									}}
								/>
								<!-- Row 2: selects + optional ends -->
								<div class="add-controls-row">
									{#if calendars.length > 1}
										<select class="inline-select cal-select" bind:value={newEventCalendarId}>
											{#each calendars as cal (cal.id)}
												<option value={cal.id}>{cal.name}</option>
											{/each}
										</select>
									{/if}
									<select class="inline-select" bind:value={newEventRepeat}>
										<option value="">No repeat</option>
										<option value="daily">Daily</option>
										<option value="weekly">Weekly</option>
										<option value="fortnightly">Fortnightly</option>
										<option value="monthly">Monthly</option>
										<option value="yearly">Yearly</option>
									</select>
									{#if newEventRepeat}
										<div class="ends-inline" transition:slide={{ axis: 'x', duration: 150 }}>
											<span class="ends-label">Ends</span>
											<input type="date" class="ends-input" bind:value={newEventEndsOn} />
										</div>
									{/if}
								</div>
								<!-- Row 3: actions -->
								<div class="add-actions-row">
									<button type="button" class="add-cancel-btn" onclick={() => (showAddForm = false)}
										>Cancel</button
									>
									<button
										type="submit"
										class="add-submit-btn"
										disabled={!editingText.length || calendars.length === 0}>Add event</button
									>
								</div>
							</form>
						</div>
					{:else}
						<button
							type="button"
							class="add-trigger"
							onclick={() => {
								newEventCalendarId = selectedCalendarId;
								showAddForm = true;
							}}>+ Add event</button
						>
					{/if}
				</section>
			</div>
		</div>
	</div>
</div>

<style>
	.calendar-wrapper {
		flex: auto;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: relative;
	}

	/* ---- Create calendar ---- */
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

	/* ---- Split area ---- */
	.split-area {
		flex: auto;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	/* ---- Top panel: scrollable months ---- */
	.top-panel {
		flex: 1;
		min-height: 0;
		position: relative;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	/* ---- Filter bar: overlaid top-right ---- */
	.filter-bar {
		position: absolute;
		top: 0;
		right: 0;
		z-index: calc(var(--z-sticky) + 1);
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-3);
		pointer-events: auto;
	}

	.filter-chip {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: 2px var(--space-2);
		border-radius: var(--radius-full);
		border: 1px solid var(--chip-color, var(--color-border));
		background: var(--color-bg);
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-text);
		cursor: pointer;
		transition: opacity var(--duration-fast) var(--ease-standard);

		.chip-dot {
			width: 6px;
			height: 6px;
			border-radius: var(--radius-full);
			background: var(--chip-color, var(--color-border));
			flex: none;
		}

		&.dimmed {
			opacity: 0.35;
		}
	}

	.add-cal-btn {
		background: none;
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-full);
		width: var(--space-5);
		height: var(--space-5);
		font-size: var(--font-size-sm);
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

	.no-calendars {
		flex: auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		color: var(--color-text-subtle);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);

		button {
			background: none;
			border: none;
			cursor: pointer;
			color: var(--color-accent);
			font-size: var(--font-size-sm);
			font-family: var(--font-body);
			text-decoration: underline;
			text-underline-offset: 2px;
		}
	}

	.scroll-area {
		flex: auto;
		overflow-y: auto;
		padding-bottom: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	/* ---- Back to today FAB ---- */
	.today-fab {
		position: absolute;
		bottom: var(--space-4);
		left: 50%;
		transform: translateX(-50%);
		background: var(--color-accent);
		color: var(--color-text-inverse);
		border: none;
		border-radius: var(--radius-full);
		padding: var(--space-2) var(--space-5);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		box-shadow: var(--shadow-lg);
		transition: background var(--duration-fast) var(--ease-standard);
		pointer-events: auto;
		z-index: var(--z-sticky);

		&:active {
			background: color-mix(in srgb, var(--color-accent) 85%, var(--color-primary));
		}
	}

	/* ---- Bottom panel: selected date events ---- */
	.bottom-panel {
		flex: 0 0 38%;
		min-height: 0;
		border-top: 2px solid var(--color-border);
		display: flex;
		flex-direction: column;
	}

	.panel-header {
		flex: none;
		padding: var(--space-2) var(--space-4) var(--space-1);
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.panel-date {
		font-size: var(--font-size-sm);
		font-family: var(--font-heading);
		font-weight: var(--font-weight-bold);
	}

	.panel-body {
		flex: auto;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	/* ---- Events list ---- */
	.events {
		flex: auto;
		padding: var(--space-2) var(--space-3);

		ul {
			display: flex;
			flex-direction: column;
			gap: var(--space-1);
		}
	}

	.no-events {
		color: var(--color-text-subtle);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
	}

	/* ---- Inline event row ---- */
	.event-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
	}

	.ev-chip {
		flex: none;
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-inverse);
		padding: 1px var(--space-2);
		border-radius: var(--radius-full);
		white-space: nowrap;
	}

	.recur-icon {
		flex: none;
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.ev-input {
		flex: 1;
		min-width: 0;
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		color: var(--color-text);
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		padding: 2px var(--space-1);
		outline: none;
		transition: border-color var(--duration-fast) var(--ease-standard);

		&:hover {
			border-color: var(--color-border);
		}
		&:focus {
			border-color: var(--color-accent);
			background: var(--color-surface);
		}
	}

	/* ---- 3-dot menu ---- */
	.ev-menu {
		flex: none;
		position: relative;
	}

	.ev-menu-btn {
		background: none;
		border: none;
		padding: 2px var(--space-1);
		font-size: var(--font-size-base);
		color: var(--color-text-subtle);
		cursor: pointer;
		border-radius: var(--radius-sm);
		line-height: 1;
		letter-spacing: 1px;

		&:hover {
			color: var(--color-text);
			background: var(--color-surface-sunken);
		}
	}

	.ev-menu-popup {
		position: absolute;
		right: 0;
		top: calc(100% + var(--space-1));
		background: var(--color-surface-raised);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
		z-index: var(--z-sticky);
		min-width: 120px;
		overflow: hidden;

		.menu-item {
			display: block;
			width: 100%;
			text-align: left;
			background: none;
			border: none;
			padding: var(--space-2) var(--space-3);
			font-size: var(--font-size-sm);
			font-family: var(--font-body);
			color: var(--color-text);
			cursor: pointer;

			&:hover {
				background: var(--color-surface-sunken);
			}

			&.danger {
				color: var(--color-danger);
			}
		}
	}

	/* ---- Add event section ---- */
	.new-event {
		flex: none;
		padding: var(--space-2) var(--space-3) var(--space-3);
		border-top: 1px solid var(--color-border-subtle);
		display: flex;
		justify-content: flex-end;
	}

	.add-trigger {
		background: var(--color-primary);
		color: var(--color-primary-text);
		border: none;
		border-radius: var(--radius-sm);
		padding: var(--space-2) var(--space-4);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-standard);

		&:hover {
			background: var(--color-primary-hover);
		}
	}

	.add-form {
		width: 100%;
	}

	.add-form form {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.add-controls-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.add-actions-row {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-2);
	}

	.add-text-input {
		width: 100%;
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		color: var(--color-text);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: var(--space-1) var(--space-2);
		outline: none;

		&:focus {
			border-color: var(--color-accent);
		}
	}

	.inline-select {
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-text);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: var(--space-1) var(--space-1);
		outline: none;
		cursor: pointer;
		max-width: 100px;

		&:focus {
			border-color: var(--color-accent);
		}
	}

	.cal-select {
		max-width: 90px;
	}

	.ends-inline {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		overflow: hidden;
	}

	.add-submit-btn {
		flex: none;
		background: var(--color-primary);
		color: var(--color-primary-text);
		border: none;
		border-radius: var(--radius-sm);
		padding: var(--space-1) var(--space-6);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-standard);

		&:hover:not(:disabled) {
			background: var(--color-primary-hover);
		}

		&:disabled {
			opacity: 0.4;
			cursor: not-allowed;
		}
	}

	.add-cancel-btn {
		flex: none;
		background: none;
		border: 1px solid var(--color-border);
		padding: var(--space-1) var(--space-2);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		color: var(--color-text-muted);
		cursor: pointer;
		border-radius: var(--radius-sm);

		&:hover {
			color: var(--color-text);
			border-color: var(--color-border-strong);
		}
	}

	.ends-label {
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-text-muted);
		flex: none;
	}

	.ends-input {
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-text);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: 2px var(--space-2);
		outline: none;

		&:focus {
			border-color: var(--color-accent);
		}
	}
</style>
