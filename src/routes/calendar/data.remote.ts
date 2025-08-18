import { command, query } from '$app/server';
import { createEvent, getEventsForMonth, updateEventText } from '$lib/server/db/queries';
import { Temporal } from 'temporal-polyfill';

export const loadEvents = query('unchecked', async ({ year, month }) => {
	const events = await getEventsForMonth(year, month);
	return events;
});

export const addEventToDate = command('unchecked', async ({ year, month, date, text, name }) => {
	try {
		const datetime = Temporal.ZonedDateTime.from({
			year,
			month,
			day: date,
			timeZone: 'Australia/Sydney'
		}).epochMilliseconds;
		await createEvent({ datetime, text, name });
		return { success: true };
	} catch (err) {
		console.log(err);
		return { success: false };
	}
});

export const editEvent = command('unchecked', async ({ id, text }) => {
	try {
		await updateEventText(id, text);
		return { success: true };
	} catch (err) {
		console.log(err);
		return { success: false };
	}
});
