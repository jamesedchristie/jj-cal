import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { createAuth } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { redirect, type Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.db = getDb(event.platform?.env?.DB, env.DATABASE_URL);
	const auth = createAuth(event.locals.db);

	// Load the current session (DB-backed, no in-memory state).
	// better-auth reads the session token from the request cookie.
	const session = await auth.api.getSession({ headers: event.request.headers });
	event.locals.user = session?.user ?? null;
	event.locals.session = session?.session ?? null;

	// Guard calendar routes (and anything else we add later).
	if (!session?.user && event.url.pathname.startsWith('/calendars')) {
		redirect(303, '/');
	}

	// Route /api/auth/* requests to better-auth; pass everything else through.
	return svelteKitHandler({ auth, event, resolve, building });
};
