import { form, getRequestEvent } from '$app/server';
import { JASMIN_PASSWORD, JIM_PASSWORD } from '$env/static/private';
import { createUser, getUserByName, setUserToken } from '$lib/server/db/queries';
import { fail, redirect } from '@sveltejs/kit';

export const login = form(async (formData) => {
	const event = getRequestEvent();
	const password = formData.get('password');
	let user: { id: number; name: string } | null = null;
	if (password === JIM_PASSWORD) {
		user = await getUserByName('Jim');
		if (!user) user = await createUser('Jim');
	} else if (password === JASMIN_PASSWORD) {
		user = await getUserByName('Jasmin');
		if (!user) user = await createUser('Jasmin');
	}
	if (user) {
		const token = crypto.randomUUID();
		await setUserToken(user.id, token);
		event.cookies.set('token', token, { path: '/', httpOnly: true, secure: true });
		redirect(303, '/calendar');
	} else {
		return fail(422, { message: 'Invalid credentials' });
	}
});
