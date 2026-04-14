import { form, getRequestEvent } from '$app/server';
import { createAuth } from '$lib/server/auth';
import { fail } from '@sveltejs/kit';
import * as v from 'valibot';

const VALID_COLOURS = [
	'family-1',
	'family-2',
	'family-3',
	'family-4',
	'family-5',
	'family-6',
	'family-7',
	'family-8'
] as const;

export const updateProfile = form(
	v.object({
		displayName: v.pipe(v.string(), v.maxLength(50)),
		colour: v.pipe(v.string(), v.picklist(VALID_COLOURS))
	}),
	async ({ displayName, colour }) => {
		const { locals, request } = getRequestEvent();
		if (!locals.user) return fail(401, { message: 'Not authenticated' });

		const auth = createAuth(locals.db);
		await auth.api.updateUser({
			body: { displayName, colour },
			headers: request.headers
		});
	}
);
