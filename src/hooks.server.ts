import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { createAuth } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { maybeSeedAdmin } from '$lib/server/seed';
import { redirect, type Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.db = getDb(event.platform?.env?.DB, env.DATABASE_URL);
	const auth = createAuth(event.locals.db);

	// On first boot (no users in DB), create the seed admin from env vars.
	// The check is cheap (COUNT query) and short-circuits once users exist.
	await maybeSeedAdmin(event.locals.db, auth, {
		SEED_ADMIN_USERNAME: env.SEED_ADMIN_USERNAME,
		SEED_ADMIN_PASSWORD: env.SEED_ADMIN_PASSWORD
	});

	// Load the current session (DB-backed, no in-memory state).
	const session = await auth.api.getSession({ headers: event.request.headers });

	// Treat soft-deleted users as unauthenticated.
	const user = session?.user && !session.user.deletedAt ? session.user : null;
	event.locals.user = user;
	event.locals.session = user ? session!.session : null;

	// Guard calendar and task routes (and anything else we add later).
	if (!user && event.url.pathname.startsWith('/calendars')) {
		redirect(303, '/');
	}
	if (!user && event.url.pathname.startsWith('/tasks')) {
		redirect(303, '/');
	}
	// Admin routes: must be logged in AND be an admin.
	if (event.url.pathname.startsWith('/admin')) {
		if (!user) redirect(303, '/');
		if (!user.isAdmin) redirect(303, '/calendars');
	}

	// Route /api/auth/* requests to better-auth; pass everything else through.
	return svelteKitHandler({ auth, event, resolve, building });
};
