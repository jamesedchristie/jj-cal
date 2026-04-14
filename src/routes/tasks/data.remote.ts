import { form, getRequestEvent, query } from '$app/server';
import { createTodo, deleteTodo, getAllTodos, getUsersBasic, setTodoCompleted } from '$lib/server/db/queries';
import * as v from 'valibot';

export const getTodos = query(async () => {
	const { locals } = getRequestEvent();
	return getAllTodos(locals.db);
});

export const getUsers = query(async () => {
	const { locals } = getRequestEvent();
	return getUsersBasic(locals.db);
});

export const addTodo = form(
	v.object({
		text: v.pipe(v.string(), v.nonEmpty()),
		due_date: v.pipe(v.string(), v.transform((s) => s || null)),
		assignee_id: v.pipe(v.string(), v.transform((s) => s || null))
	}),
	async ({ text, due_date, assignee_id }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		await createTodo(locals.db, {
			text: text.trim(),
			created_by_id: locals.user.id,
			created_by_name: locals.user.name,
			sort_order: Date.now(),
			due_date,
			assignee_id
		});
		// Single-flight: refresh the query as part of this same request
		void getTodos().refresh();
	}
);

export const toggleTodo = form(
	v.object({
		id: v.pipe(v.string(), v.transform(Number)),
		completed: v.pipe(v.string(), v.transform((val) => val === 'true'))
	}),
	async ({ id, completed }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		await setTodoCompleted(locals.db, id, completed);
		void getTodos().refresh();
	}
);

export const removeTodo = form(
	v.object({ id: v.pipe(v.string(), v.transform(Number)) }),
	async ({ id }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		await deleteTodo(locals.db, id);
		void getTodos().refresh();
	}
);
