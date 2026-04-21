import { form, getRequestEvent, query } from '$app/server';
import {
	createBudgetItem,
	createExpense,
	deleteBudgetItem,
	deleteExpense,
	getBudgetItemsForBudget,
	getExpensesForBudget,
	getOrCreateHouseholdBudget,
	updateBudgetItem
} from '$lib/server/db/queries';
import * as v from 'valibot';

export const getBudget = query(async () => {
	const { locals } = getRequestEvent();
	if (!locals.user) throw 'Not authenticated';
	return getOrCreateHouseholdBudget(locals.db, locals.user.id);
});

export const getBudgetItems = query(async () => {
	const { locals } = getRequestEvent();
	if (!locals.user) throw 'Not authenticated';
	const budget = await getOrCreateHouseholdBudget(locals.db, locals.user.id);
	return getBudgetItemsForBudget(locals.db, budget.id);
});

export const getExpenses = query(async () => {
	const { locals } = getRequestEvent();
	if (!locals.user) throw 'Not authenticated';
	const budget = await getOrCreateHouseholdBudget(locals.db, locals.user.id);
	return getExpensesForBudget(locals.db, budget.id);
});

export const addBudgetItem = form(
	v.object({
		budget_id: v.pipe(v.string(), v.nonEmpty()),
		name: v.pipe(v.string(), v.trim(), v.nonEmpty()),
		type: v.string(),
		amount: v.pipe(v.string(), v.transform((s) => Math.round(parseFloat(s) * 100))),
		frequency: v.string()
	}),
	async ({ budget_id, name, type, amount, frequency }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		await createBudgetItem(locals.db, {
			budgetId: budget_id,
			name,
			type: type as any,
			amount,
			frequency: frequency as any,
			sortOrder: Date.now()
		});
		void getBudgetItems().refresh();
	}
);

export const editBudgetItem = form(
	v.object({
		id: v.pipe(v.string(), v.nonEmpty()),
		name: v.pipe(v.string(), v.trim(), v.nonEmpty()),
		amount: v.pipe(v.string(), v.transform((s) => Math.round(parseFloat(s) * 100))),
		frequency: v.string()
	}),
	async ({ id, name, amount, frequency }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		await updateBudgetItem(locals.db, id, { name, amount, frequency: frequency as any });
		void getBudgetItems().refresh();
	}
);

export const removeBudgetItem = form(
	v.object({ id: v.pipe(v.string(), v.nonEmpty()) }),
	async ({ id }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		await deleteBudgetItem(locals.db, id);
		void getBudgetItems().refresh();
	}
);

export const addExpense = form(
	v.object({
		budget_id: v.pipe(v.string(), v.nonEmpty()),
		description: v.pipe(v.string(), v.trim(), v.nonEmpty()),
		amount: v.pipe(v.string(), v.transform((s) => Math.round(parseFloat(s) * 100))),
		date: v.pipe(v.string(), v.nonEmpty()),
		category_id: v.pipe(
			v.optional(v.string(), ''),
			v.transform((s) => s || null)
		)
	}),
	async ({ budget_id, description, amount, date, category_id }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		await createExpense(locals.db, {
			budgetId: budget_id,
			amount,
			description,
			date,
			categoryId: category_id,
			createdById: locals.user.id
		});
		void getExpenses().refresh();
	}
);

export const removeExpense = form(
	v.object({ id: v.pipe(v.string(), v.nonEmpty()) }),
	async ({ id }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		await deleteExpense(locals.db, id);
		void getExpenses().refresh();
	}
);
