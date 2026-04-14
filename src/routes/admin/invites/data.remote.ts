import { form, getRequestEvent, query } from '$app/server';
import { createInvite, getAllInvites, revokeInvite } from '$lib/server/db/queries';
import { fail } from '@sveltejs/kit';
import * as v from 'valibot';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const getInvites = query(async () => {
	const { locals } = getRequestEvent();
	if (!locals.user?.isAdmin) return [];
	return getAllInvites(locals.db);
});

export const generateInvite = form(
	v.object({}),
	async () => {
		const { locals } = getRequestEvent();
		if (!locals.user?.isAdmin) return fail(403, { message: 'Forbidden' });

		// Generate a cryptographically random token (48 hex chars).
		const bytes = new Uint8Array(24);
		crypto.getRandomValues(bytes);
		const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

		const now = new Date();
		const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);

		await createInvite(locals.db, {
			id: crypto.randomUUID(),
			token,
			createdById: locals.user.id,
			createdAt: now,
			expiresAt
		});

		void getInvites().refresh();
	}
);

export const revokeInviteAction = form(
	v.object({ id: v.pipe(v.string(), v.nonEmpty()) }),
	async ({ id }) => {
		const { locals } = getRequestEvent();
		if (!locals.user?.isAdmin) return fail(403, { message: 'Forbidden' });

		await revokeInvite(locals.db, id);
		void getInvites().refresh();
	}
);
