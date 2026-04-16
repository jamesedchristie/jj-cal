import { command, form, getRequestEvent, query, requested } from '$app/server';
import {
	createCalendar,
	createEvent,
	deleteEvent,
	getAllCalendars,
	getCalendarBySlug,
	getEventsForMonthAllCalendars,
	updateEventText
} from '$lib/server/db/queries';
import { redirect } from '@sveltejs/kit';
import { Temporal } from 'temporal-polyfill';
import * as v from 'valibot';

export const getCalendars = query(async () => {
	const { locals } = getRequestEvent();
	return getAllCalendars(locals.db);
});

export const loadEvents = query('unchecked', async ({ year, month }: { year: number; month: number }) => {
	const { locals } = getRequestEvent();
	return getEventsForMonthAllCalendars(locals.db, year, month);
});

export const addEventToDate = command(
	'unchecked',
	async ({
		calendarId,
		year,
		month,
		date,
		text
	}: {
		calendarId: number;
		year: number;
		month: number;
		date: number;
		text: string;
	}) => {
		const { locals } = getRequestEvent();
		if (!locals.user) return { success: false };
		try {
			const calendars = await getAllCalendars(locals.db);
			const calendar = calendars.find((c) => c.id === calendarId);
			if (!calendar) return { success: false };
			const datetime = Temporal.ZonedDateTime.from({
				year,
				month,
				day: date,
				timeZone: 'Australia/Sydney'
			}).epochMilliseconds;
			await createEvent(locals.db, {
				calendarSlug: calendar.slug,
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

export const editEvent = command('unchecked', async ({ id, text }: { id: number; text: string }) => {
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

export const removeEvent = command('unchecked', async ({ id }: { id: number }) => {
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

export const quickAddEventToday = command('unchecked', async ({ text }: { text: string }) => {
	const { locals } = getRequestEvent();
	if (!locals.user) return { success: false };
	try {
		const calendars = await getAllCalendars(locals.db);
		if (calendars.length === 0) return { success: false };
		// Default to the first calendar — FAB is a quick-add, full dialog handles calendar choice
		const calendar = calendars[0];
		const now = Temporal.Now.zonedDateTimeISO('Australia/Sydney');
		const datetime = Temporal.ZonedDateTime.from({
			year: now.year,
			month: now.month,
			day: now.day,
			timeZone: 'Australia/Sydney'
		}).epochMilliseconds;
		await createEvent(locals.db, {
			calendarSlug: calendar.slug,
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
});

export const createNewCalendar = form(
	v.object({
		name: v.pipe(v.string(), v.nonEmpty()),
		slug: v.pipe(v.string(), v.nonEmpty())
	}),
	async ({ name, slug }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'User not authenticated';
		await createCalendar(locals.db, {
			name: name.trim(),
			slug: slug.trim(),
			created_by_name: locals.user.name,
			created_by_id: locals.user.id
		});
		redirect(303, '/calendars');
	}
);
