import { env } from '$env/dynamic/private';
import { getDb } from '$lib/server/db';
import { getUserByToken } from '$lib/server/db/queries';
import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.db = getDb(event.platform?.env?.DB, env.DATABASE_URL);
	const token = event.cookies.get('token');
	const user = token ? await getUserByToken(event.locals.db, token) : null;
	event.locals.user = user;
	if (!user && event.url.pathname.startsWith('/calendar')) {
		redirect(303, '/');
	}
	const response = await resolve(event);
	return response;
};
