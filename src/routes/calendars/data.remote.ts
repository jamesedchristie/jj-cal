import { resolve } from '$app/paths';
import { form, getRequestEvent, query } from '$app/server';
import { createCalendar, getAllCalendars } from '$lib/server/db/queries';
import { redirect } from '@sveltejs/kit';
import * as v from 'valibot';

export const getCalendars = query(async () => {
	const { locals } = getRequestEvent();
	const calendars = await getAllCalendars(locals.db);
	return calendars;
});

export const createNewCalendar = form(
	v.object({
		name: v.pipe(v.string(), v.nonEmpty()),
		slug: v.pipe(v.string(), v.nonEmpty())
	}),
	async ({ name, slug }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'User not authenticated';
		if (!name || !slug) throw 'Name and slug are required';
		const calendar = await createCalendar(locals.db, {
			name: name.trim(),
			slug: slug.trim(),
			created_by_name: locals.user.name,
			created_by_id: locals.user.id
		});
		redirect(303, resolve('/calendars/[slug]', { slug: calendar.slug }));
	}
);
