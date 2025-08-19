import { form, getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { createUser, getUserByName, setUserToken } from '$lib/server/db/queries';
import { fail, redirect } from '@sveltejs/kit';

export const login = form(async (formData) => {
	const { locals, cookies } = getRequestEvent();
	const password = formData.get('password');
	let user: { id: number; name: string } | null = null;
	if (password === env.JIM_PASSWORD) {
		user = await getUserByName(locals.db, 'Jim');
		if (!user) user = await createUser(locals.db, 'Jim');
	} else if (password === env.JASMIN_PASSWORD) {
		user = await getUserByName(locals.db, 'Jasmin');
		if (!user) user = await createUser(locals.db, 'Jasmin');
	}
	if (user) {
		const token = crypto.randomUUID();
		await setUserToken(locals.db, user.id, token);
		cookies.set('token', token, { path: '/', httpOnly: true, secure: true });
		redirect(303, '/calendar');
	} else {
		return fail(422, { message: 'Invalid credentials' });
	}
});

export const logout = form(async () => {
	const { cookies } = getRequestEvent();
	cookies.delete('token', { path: '/' });
	redirect(303, '/');
});
