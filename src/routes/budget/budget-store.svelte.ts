import type { RemoteQueryUpdate } from '@sveltejs/kit';
import { getToastService, ToastMessage } from '$lib/components/toast/toastService.svelte';
import { encodeForm, offlineQueue } from '$lib/offline-queue.svelte';
import type { BudgetFrequency, BudgetItemType } from '$lib/server/db/schema';
import { getBudgetItems, getExpenses } from './data.remote';

export type BudgetItem = {
	id: string;
	budgetId: string;
	name: string;
	type: BudgetItemType;
	amount: number; // cents
	frequency: BudgetFrequency;
	sortOrder: number;
	createdAt: Date;
};

export type Expense = {
	id: string;
	budgetId: string;
	amount: number; // cents
	description: string;
	date: string; // YYYY-MM-DD
	categoryId: string | null;
	createdById: string;
	createdAt: Date;
};

type EnhanceSubmit = () => Promise<boolean> & {
	updates: (...updates: RemoteQueryUpdate[]) => Promise<boolean>;
};
type EnhanceArgs = { form: HTMLFormElement; submit: EnhanceSubmit };

export function toMonthlyCents(amount: number, frequency: BudgetFrequency): number {
	switch (frequency) {
		case 'weekly':      return Math.round(amount * 52 / 12);
		case 'fortnightly': return Math.round(amount * 26 / 12);
		case 'monthly':     return amount;
		case 'quarterly':   return Math.round(amount / 3);
		case 'yearly':      return Math.round(amount / 12);
	}
}

export function toPeriodCents(
	amount: number,
	frequency: BudgetFrequency,
	period: 'weekly' | 'monthly'
): number {
	const monthly = toMonthlyCents(amount, frequency);
	return period === 'monthly' ? monthly : Math.round(monthly * 12 / 52);
}

export function createBudgetStore() {
	const toast = getToastService();
	const offlineReleases = new Set<() => void>();

	$effect(() =>
		offlineQueue.onDrained(() => {
			void getBudgetItems().refresh();
			void getExpenses().refresh();
			for (const r of offlineReleases) r();
			offlineReleases.clear();
		})
	);

	const allItems = $derived<BudgetItem[]>(getBudgetItems().current ?? []);
	const allExpenses = $derived<Expense[]>(getExpenses().current ?? []);

	const incomings    = $derived(allItems.filter((i) => i.type === 'incoming'));
	const outgoings    = $derived(allItems.filter((i) => i.type === 'outgoing'));
	const allocations  = $derived(allItems.filter((i) => i.type === 'allocation'));
	const savings      = $derived(allItems.filter((i) => i.type === 'savings'));

	const monthlyIncome      = $derived(incomings.reduce((s, i) => s + toMonthlyCents(i.amount, i.frequency), 0));
	const monthlyOutgoings   = $derived(outgoings.reduce((s, i) => s + toMonthlyCents(i.amount, i.frequency), 0));
	const monthlyAllocations = $derived(allocations.reduce((s, i) => s + toMonthlyCents(i.amount, i.frequency), 0));
	const monthlySavings     = $derived(savings.reduce((s, i) => s + toMonthlyCents(i.amount, i.frequency), 0));
	const monthlyNet         = $derived(monthlyIncome - monthlyOutgoings - monthlyAllocations - monthlySavings);

	function dispatch({ form, submit }: EnhanceArgs, override: () => void, errorMsg: string) {
		if (!offlineQueue.online) {
			offlineQueue.enqueue(form.action, encodeForm(form));
			offlineReleases.add(override);
			return;
		}
		submit()
			.updates(override)
			.then((ok) => {
				if (!ok) toast().show(new ToastMessage(errorMsg, { type: 'error' }));
			});
	}

	return {
		get incomings()          { return incomings; },
		get outgoings()          { return outgoings; },
		get allocations()        { return allocations; },
		get savings()            { return savings; },
		get monthlyIncome()      { return monthlyIncome; },
		get monthlyOutgoings()   { return monthlyOutgoings; },
		get monthlyAllocations() { return monthlyAllocations; },
		get monthlySavings()     { return monthlySavings; },
		get monthlyNet()         { return monthlyNet; },
		get expenses()           { return allExpenses; },

		expensesInPeriod(from: string, to: string): Expense[] {
			return allExpenses.filter((e) => e.date >= from && e.date <= to);
		},

		categoryProgress(from: string, to: string, period: 'weekly' | 'monthly') {
			const inPeriod = allExpenses.filter((e) => e.date >= from && e.date <= to);
			return allocations.map((a) => {
				const target = toPeriodCents(a.amount, a.frequency, period);
				const spent  = inPeriod
					.filter((e) => e.categoryId === a.id)
					.reduce((s, e) => s + e.amount, 0);
				return { allocation: a, target, spent };
			});
		},

		surplusData(from: string, to: string, period: 'weekly' | 'monthly') {
			const periodNet        = toPeriodCents(monthlyIncome - monthlyOutgoings, 'monthly', period);
			const periodAllocs     = toPeriodCents(monthlyAllocations, 'monthly', period);
			const periodSavings    = toPeriodCents(monthlySavings, 'monthly', period);
			if (periodNet <= 0) return null;

			const spent     = allExpenses.filter(e => e.date >= from && e.date <= to).reduce((s, e) => s + e.amount, 0);
			const remaining = periodNet - spent;

			const remainingPct     = Math.max(0, Math.min(remaining / periodNet, 1)) * 100;
			// Markers are absolute positions from left (0 = nothing left, 100 = nothing spent)
			const allocationLinePct = Math.max(0, Math.min((periodNet - periodAllocs) / periodNet, 1)) * 100;
			const savingsLinePct    = Math.max(0, Math.min(periodSavings / periodNet, 1)) * 100;

			const status: 'good' | 'warning' | 'danger' =
				remaining <= periodSavings            ? 'danger'  :
				remaining <= periodNet - periodAllocs ? 'warning' : 'good';

			return { max: periodNet, remaining, spent, remainingPct, allocationLinePct, savingsLinePct, periodAllocs, periodSavings, status };
		},

		editItemHandler(itemId: string, updates: { name: string; amount: number; frequency: BudgetFrequency }) {
			return (ctx: EnhanceArgs) => {
				const override = getBudgetItems().withOverride((items) =>
					items.map((i) => (i.id === itemId ? { ...i, ...updates } : i))
				);
				dispatch(ctx, override, 'Failed to save changes');
			};
		},

		addItemHandler(optimistic: BudgetItem) {
			return (ctx: EnhanceArgs) => {
				const override = getBudgetItems().withOverride((items) => [
					...items.filter((i) => i.id !== optimistic.id),
					optimistic
				]);
				dispatch(ctx, override, 'Failed to add item');
			};
		},

		removeItemHandler(itemId: string) {
			return (ctx: EnhanceArgs) => {
				const override = getBudgetItems().withOverride((items) =>
					items.filter((i) => i.id !== itemId)
				);
				dispatch(ctx, override, 'Failed to delete item');
			};
		},

		addExpenseHandler(optimistic: Expense) {
			return (ctx: EnhanceArgs) => {
				const override = getExpenses().withOverride((expenses) => [
					optimistic,
					...expenses.filter((e) => e.id !== optimistic.id)
				]);
				dispatch(ctx, override, 'Failed to log expense');
			};
		},

		removeExpenseHandler(expenseId: string) {
			return (ctx: EnhanceArgs) => {
				const override = getExpenses().withOverride((expenses) =>
					expenses.filter((e) => e.id !== expenseId)
				);
				dispatch(ctx, override, 'Failed to delete expense');
			};
		}
	};
}
