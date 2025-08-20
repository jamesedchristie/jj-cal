import { resolve } from '$app/paths';
import { form, getRequestEvent, query } from '$app/server';
import { createCalendar, getAllCalendars } from '$lib/server/db/queries';
import { redirect } from '@sveltejs/kit';

export const getCalendars = query(async () => {
	const { locals } = getRequestEvent();
	const calendars = await getAllCalendars(locals.db);
	return calendars;
});

export const createNewCalendar = form(async (formData) => {
	const { locals } = getRequestEvent();
	if (!locals.user) throw 'User not authenticated';
	const name = formData.get('name')?.toString().trim();
	const slug = formData.get('slug')?.toString().trim();
	if (!name || !slug) throw 'Name and slug are required';
	const calendar = await createCalendar(locals.db, {
		name,
		slug,
		created_by_name: locals.user.name,
		created_by_id: locals.user.id
	});
	redirect(303, resolve('/calendars/[slug]', { slug: calendar.slug }));
});
