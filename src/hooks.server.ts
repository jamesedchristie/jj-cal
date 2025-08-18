import { getUserByToken } from '$lib/server/db/queries';
import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('token');
	const user = token ? await getUserByToken(token) : null;
	event.locals.user = user;
	if (!user && event.url.pathname.startsWith('/calendar')) {
		redirect(303, '/');
	}
	const response = await resolve(event);
	return response;
};
