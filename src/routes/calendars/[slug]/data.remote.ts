import { command, getRequestEvent, query, requested } from '$app/server';
import {
	createEvent,
	deleteEvent,
	getCalendarBySlug,
	getEventsForMonth,
	updateEventText
} from '$lib/server/db/queries';
import { error } from '@sveltejs/kit';
import { Temporal } from 'temporal-polyfill';

export const loadCalendar = query('unchecked', async (slug: string) => {
	const { locals } = getRequestEvent();
	const calendar = await getCalendarBySlug(locals.db, slug);
	if (!calendar) error(404, 'Calendar not found');
	return calendar;
});

export const loadEvents = query('unchecked', async ({ calendarSlug, year, month }) => {
	const { locals } = getRequestEvent();
	const events = await getEventsForMonth(locals.db, calendarSlug, year, month);
	return events;
});

export const addEventToDate = command(
	'unchecked',
	async ({ calendarSlug, year, month, date, text }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) return { success: false };
		try {
			const calendar = await getCalendarBySlug(locals.db, calendarSlug);
			if (!calendar) return { success: false };
			const datetime = Temporal.ZonedDateTime.from({
				year,
				month,
				day: date,
				timeZone: 'Australia/Sydney'
			}).epochMilliseconds;
			await createEvent(locals.db, {
				calendarSlug,
				calendarId: calendar.id,
				datetime,
				text,
				created_by_name: locals.user.name,
				created_by_id: locals.user.id
			});
			for (const arg of requested(loadEvents, 1)) {
				void loadEvents(arg).refresh();
			}
			return { success: true };
		} catch (err) {
			console.log(err);
			return { success: false };
		}
	}
);

export const editEvent = command('unchecked', async ({ id, text }) => {
	const { locals } = getRequestEvent();
	try {
		await updateEventText(locals.db, id, text);
		for (const arg of requested(loadEvents, 1)) {
			void loadEvents(arg).refresh();
		}
		return { success: true };
	} catch (err) {
		console.log(err);
		return { success: false };
	}
});

export const removeEvent = command('unchecked', async ({ id }) => {
	const { locals } = getRequestEvent();
	try {
		await deleteEvent(locals.db, id);
		for (const arg of requested(loadEvents, 1)) {
			void loadEvents(arg).refresh();
		}
		return { success: true };
	} catch (err) {
		console.log(err);
		return { success: false };
	}
});
