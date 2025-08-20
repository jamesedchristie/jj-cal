import { command, getRequestEvent, query } from '$app/server';
import {
	createEvent,
	deleteEvent,
	getCalendarBySlug,
	getEventsForMonth,
	updateEventText
} from '$lib/server/db/queries';
import { Temporal } from 'temporal-polyfill';

export const loadCalendar = query('unchecked', async (slug: string) => {
	const { locals } = getRequestEvent();
	const calendar = await getCalendarBySlug(locals.db, slug);
	if (!calendar) throw 'Calendar not found';
	return calendar;
});

export const loadEvents = query('unchecked', async ({ calendarSlug, year, month }) => {
	const { locals } = getRequestEvent();
	const events = await getEventsForMonth(locals.db, calendarSlug, year, month);
	return events;
});

export const addEventToDate = command(
	'unchecked',
	async ({ calendarSlug, year, month, date, text, name }) => {
		const { locals } = getRequestEvent();
		try {
			const datetime = Temporal.ZonedDateTime.from({
				year,
				month,
				day: date,
				timeZone: 'Australia/Sydney'
			}).epochMilliseconds;
			await createEvent(locals.db, { calendarSlug, datetime, text, name });
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
		return { success: true };
	} catch (err) {
		console.log(err);
		return { success: false };
	}
});
