<script lang="ts">
	import type { BudgetFrequency, BudgetItemType } from '$lib/server/db/schema';
	import { addBudgetItem, addExpense, editBudgetItem, getBudget, removeBudgetItem, removeExpense } from './data.remote';
	import { createBudgetStore, type BudgetItem, type Expense } from './budget-store.svelte';

	const store = createBudgetStore();
	const budget = $derived(getBudget().current);

	// --- View ---
	let view = $state<'plan' | 'log'>('plan');

	// --- Plan state ---
	let addingSection = $state<BudgetItemType | null>(null);
	let addName = $state('');
	let addAmount = $state('');
	let addFrequency = $state<BudgetFrequency>('monthly');
	let pendingItemId = $state(crypto.randomUUID());

	// --- Edit state ---
	let editingItemId = $state<string | null>(null);
	let editName = $state('');
	let editAmount = $state('');
	let editFrequency = $state<BudgetFrequency>('monthly');

	// --- Period options (generated once) ---
	type PeriodOption = { label: string; from: string; to: string };

	function isoDate(d: Date): string {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	function generateMonths(count: number): PeriodOption[] {
		const now = new Date();
		return Array.from({ length: count }, (_, i) => {
			const d    = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
			return {
				label: d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }),
				from:  isoDate(d),
				to:    isoDate(last)
			};
		});
	}

	function generateWeeks(count: number): PeriodOption[] {
		const now = new Date();
		const daysToMon = now.getDay() === 0 ? 6 : now.getDay() - 1;
		const thisMon = new Date(now);
		thisMon.setDate(now.getDate() - daysToMon);
		return Array.from({ length: count }, (_, i) => {
			const mon = new Date(thisMon);
			mon.setDate(thisMon.getDate() - i * 7);
			const sun = new Date(mon);
			sun.setDate(mon.getDate() + 6);
			const short = (d: Date) => d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
			return { from: isoDate(mon), to: isoDate(sun), label: `${short(mon)} – ${short(sun)}` };
		});
	}

	const MONTHS = generateMonths(6);
	const WEEKS  = generateWeeks(16);

	// --- Log state ---
	// monthFrom drives the period when weekFrom is empty
	let monthFrom = $state(MONTHS[0].from);
	let weekFrom  = $state('');
	let expDesc = $state('');
	let expAmount = $state('');
	let expDate = $state(todaySydney());
	let expCategoryId = $state('');
	let pendingExpenseId = $state(crypto.randomUUID());

	// --- Derived log data ---
	const activePeriodType = $derived<'weekly' | 'monthly'>(weekFrom ? 'weekly' : 'monthly');
	const periodRange = $derived(
		weekFrom
			? (WEEKS.find((w) => w.from === weekFrom) ?? WEEKS[0])
			: (MONTHS.find((m) => m.from === monthFrom) ?? MONTHS[0])
	);
	const surplus = $derived(
		store.surplusData(periodRange.from, periodRange.to, activePeriodType)
	);
	const categoryProgress = $derived(
		store.categoryProgress(periodRange.from, periodRange.to, activePeriodType)
	);
	const periodExpenses = $derived(store.expensesInPeriod(periodRange.from, periodRange.to));
	const categoryMap = $derived(new Map(store.allocations.map((a) => [a.id, a.name])));

	const groupedExpenses = $derived(
		(() => {
			const groups = new Map<string, Expense[]>();
			for (const e of periodExpenses) {
				if (!groups.has(e.date)) groups.set(e.date, []);
				groups.get(e.date)!.push(e);
			}
			return Array.from(groups.entries()).map(([date, expenses]) => ({ date, expenses }));
		})()
	);

	const periodTotal = $derived(periodExpenses.reduce((s, e) => s + e.amount, 0));

	// --- Helpers ---
	function todaySydney(): string {
		return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());
	}

	function fmt(cents: number): string {
		const d = cents / 100;
		return (
			'$' +
			(d % 1 === 0
				? d.toLocaleString('en-AU')
				: d.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
		);
	}

	function fmtDate(dateStr: string): string {
		return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-AU', {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		});
	}

	const FREQ_LABELS: Record<BudgetFrequency, string> = {
		weekly: '/wk',
		fortnightly: '/ftnght',
		monthly: '/mo',
		quarterly: '/qtr',
		yearly: '/yr'
	};

	const SECTIONS: { type: BudgetItemType; title: string; empty: string }[] = [
		{ type: 'incoming',   title: 'Income',               empty: 'No income added yet' },
		{ type: 'outgoing',   title: 'Fixed outgoings',      empty: 'No fixed outgoings added yet' },
		{ type: 'allocation', title: 'Spending allocations', empty: 'No allocations added yet — add one to track spending categories' },
		{ type: 'savings',    title: 'Savings target',       empty: 'No savings target set' }
	];

	function sectionItems(type: BudgetItemType): BudgetItem[] {
		return type === 'incoming'   ? store.incomings
			 : type === 'outgoing'   ? store.outgoings
			 : type === 'allocation' ? store.allocations
			 : store.savings;
	}

	function toggleSection(type: BudgetItemType) {
		editingItemId = null;
		if (addingSection === type) {
			addingSection = null;
		} else {
			addingSection = type;
			addName = '';
			addAmount = '';
			addFrequency = 'monthly';
		}
	}

	function startEdit(item: BudgetItem) {
		addingSection = null;
		editingItemId = item.id;
		editName = item.name;
		editAmount = (item.amount / 100).toString();
		editFrequency = item.frequency;
	}

	function cancelEdit() {
		editingItemId = null;
	}
</script>

<div class="page">
	<!-- Header -->
	<header class="page-header">
		<h1>Budget</h1>
		<div class="tab-toggle">
			<button
				type="button"
				class="tab-btn"
				class:active={view === 'plan'}
				onclick={() => view = 'plan'}
			>Plan</button>
			<button
				type="button"
				class="tab-btn"
				class:active={view === 'log'}
				onclick={() => view = 'log'}
			>Log</button>
		</div>
	</header>

	<!-- Plan view -->
	{#if view === 'plan'}
		<div class="scroll-area">
			<!-- Monthly summary -->
			{#if store.incomings.length > 0 || store.outgoings.length > 0 || store.allocations.length > 0 || store.savings.length > 0}
				<div class="summary-card">
					<h2 class="summary-title">Monthly snapshot</h2>
					<div class="summary-rows">
						{#if store.monthlyIncome > 0}
							<div class="summary-row">
								<span>Income</span>
								<span class="amount income">{fmt(store.monthlyIncome)}</span>
							</div>
						{/if}
						{#if store.monthlyOutgoings > 0}
							<div class="summary-row">
								<span>Fixed costs</span>
								<span class="amount outgoing">−{fmt(store.monthlyOutgoings)}</span>
							</div>
						{/if}
						{#if store.monthlyAllocations > 0}
							<div class="summary-row">
								<span>Allocations</span>
								<span class="amount outgoing">−{fmt(store.monthlyAllocations)}</span>
							</div>
						{/if}
						{#if store.monthlySavings > 0}
							<div class="summary-row">
								<span>Savings</span>
								<span class="amount outgoing">−{fmt(store.monthlySavings)}</span>
							</div>
						{/if}
						<div class="summary-divider"></div>
						<div class="summary-row net">
							<span>Net</span>
							<span class="amount" class:income={store.monthlyNet >= 0} class:danger={store.monthlyNet < 0}>
								{store.monthlyNet >= 0 ? '' : '−'}{fmt(Math.abs(store.monthlyNet))}
							</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- Plan sections -->
			{#each SECTIONS as { type, title, empty }}
				{@const items = sectionItems(type)}
				<section class="plan-section">
					<div class="section-header">
						<h2 class="section-title">{title}</h2>
						<button
							type="button"
							class="add-btn"
							aria-label="Add {title}"
							onclick={() => toggleSection(type)}
						>{addingSection === type ? '×' : '+'}</button>
					</div>

					{#if items.length === 0 && addingSection !== type}
						<p class="empty-msg">{empty}</p>
					{:else}
						<ul class="item-list">
							{#each items as item (item.id)}
								{#if editingItemId === item.id}
									{@const editForm   = editBudgetItem.for(item.id)}
									{@const deleteForm = removeBudgetItem.for(item.id)}
									<li class="item-edit">
										<form
											action={editForm.action}
											{...editForm.enhance((ctx) => {
												const name = editName.trim();
												const dollars = parseFloat(editAmount);
												if (!name || isNaN(dollars) || dollars <= 0) return;
												const amount = Math.round(dollars * 100);
												store.editItemHandler(item.id, { name, amount, frequency: editFrequency })(ctx);
												editingItemId = null;
											})}
										>
											<input type="hidden" name="id" value={item.id} />
											<div class="add-row">
												<input
													class="input name-input"
													type="text"
													name="name"
													bind:value={editName}
													required
													autocomplete="off"
												/>
												<div class="amount-wrap">
													<span class="dollar-sign">$</span>
													<input
														class="input amount-input"
														type="number"
														name="amount"
														step="0.01"
														min="0.01"
														bind:value={editAmount}
														required
													/>
												</div>
												<select class="input freq-select" name="frequency" bind:value={editFrequency}>
													<option value="weekly">Weekly</option>
													<option value="fortnightly">Fortnightly</option>
													<option value="monthly">Monthly</option>
													<option value="quarterly">Quarterly</option>
													<option value="yearly">Yearly</option>
												</select>
											</div>
											<div class="add-actions">
												<button type="submit" class="btn-primary">Save</button>
												<button type="button" class="btn-ghost" onclick={cancelEdit}>Cancel</button>
											</div>
										</form>
										<form
											action={deleteForm.action}
											{...deleteForm.enhance((ctx) => {
												store.removeItemHandler(item.id)(ctx);
												editingItemId = null;
											})}
											class="item-delete-form"
										>
											<input type="hidden" name="id" value={item.id} />
											<button type="submit" class="btn-danger">Delete</button>
										</form>
									</li>
								{:else}
									<li class="item-row" role="button" tabindex="0"
										onclick={() => startEdit(item)}
										onkeydown={(e) => e.key === 'Enter' && startEdit(item)}
									>
										<span class="item-name">{item.name}</span>
										<span class="item-meta">
											{fmt(item.amount)}<span class="freq">{FREQ_LABELS[item.frequency]}</span>
										</span>
										<span class="edit-hint" aria-hidden="true">›</span>
									</li>
								{/if}
							{/each}
						</ul>
					{/if}

					{#if addingSection === type}
						<form
							action={addBudgetItem.action}
							{...addBudgetItem.enhance((ctx) => {
								const name = addName.trim();
								const dollars = parseFloat(addAmount);
								if (!name || isNaN(dollars) || dollars <= 0) return;
								const optimistic: BudgetItem = {
									id: pendingItemId,
									budgetId: budget?.id ?? '',
									name,
									type,
									amount: Math.round(dollars * 100),
									frequency: addFrequency,
									sortOrder: Date.now(),
									createdAt: new Date()
								};
								store.addItemHandler(optimistic)(ctx);
								addName = '';
								addAmount = '';
								addingSection = null;
								pendingItemId = crypto.randomUUID();
							})}
							class="inline-add-form"
						>
							<input type="hidden" name="budget_id" value={budget?.id ?? ''} />
							<input type="hidden" name="type" value={type} />
							<input type="hidden" name="id" value={pendingItemId} />
							<div class="add-row">
								<input
									class="input name-input"
									type="text"
									name="name"
									placeholder="Name"
									bind:value={addName}
									required
									autocomplete="off"
								/>
								<div class="amount-wrap">
									<span class="dollar-sign">$</span>
									<input
										class="input amount-input"
										type="number"
										name="amount"
										placeholder="0.00"
										step="0.01"
										min="0.01"
										bind:value={addAmount}
										required
									/>
								</div>
								<select class="input freq-select" name="frequency" bind:value={addFrequency}>
									<option value="weekly">Weekly</option>
									<option value="fortnightly">Fortnightly</option>
									<option value="monthly">Monthly</option>
									<option value="quarterly">Quarterly</option>
									<option value="yearly">Yearly</option>
								</select>
							</div>
							<div class="add-actions">
								<button type="submit" class="btn-primary">Add</button>
								<button type="button" class="btn-ghost" onclick={() => addingSection = null}>Cancel</button>
							</div>
						</form>
					{/if}
				</section>
			{/each}
		</div>

	<!-- Log view -->
	{:else}
		<div class="scroll-area">
			<!-- Period selectors -->
			<div class="period-selects">
				<select
					class="input period-select"
					class:active={activePeriodType === 'monthly'}
					bind:value={monthFrom}
					onchange={() => weekFrom = ''}
				>
					{#each MONTHS as m}
						<option value={m.from}>{m.label}</option>
					{/each}
				</select>
				<select
					class="input period-select"
					class:active={activePeriodType === 'weekly'}
					value={weekFrom}
					onchange={(e) => weekFrom = (e.target as HTMLSelectElement).value}
				>
					<option value="">— Week —</option>
					{#each WEEKS as w}
						<option value={w.from}>{w.label}</option>
					{/each}
				</select>
			</div>

			<!-- Surplus bar -->
			{#if surplus}
				<div class="surplus-card">
					<div class="surplus-header">
						<span class="surplus-label">Surplus</span>
						<span class="surplus-amount" class:warning={surplus.status === 'warning'} class:danger={surplus.status === 'danger'}>
							{fmt(Math.max(surplus.remaining, 0))} remaining of {fmt(surplus.max)}
						</span>
					</div>
					<div class="surplus-track">
						<div
							class="surplus-fill"
							class:warning={surplus.status === 'warning'}
							class:danger={surplus.status === 'danger'}
							style="width: {surplus.remainingPct}%"
						></div>
						<div class="surplus-marker allocations" style="left: {surplus.allocationLinePct}%"></div>
						<div class="surplus-marker savings" style="left: {surplus.savingsLinePct}%"></div>
					</div>
					<div class="surplus-legend">
						<span class="legend-item">
							<span class="legend-pip allocations"></span>
							Allocations ({fmt(surplus.periodAllocs)})
						</span>
						<span class="legend-item">
							<span class="legend-pip savings"></span>
							Savings target ({fmt(surplus.periodSavings)})
						</span>
					</div>
				</div>
			{/if}

			<!-- Category progress -->
			{#if store.allocations.length > 0}
				<div class="progress-section">
					{#each categoryProgress as { allocation, target, spent }}
						{@const pct = target > 0 ? spent / target : 0}
						<div class="progress-row">
							<div class="progress-labels">
								<span class="progress-name">{allocation.name}</span>
								<span class="progress-amounts">
									{fmt(spent)} <span class="of">of</span> {fmt(target)}
								</span>
							</div>
							<div class="progress-track">
								<div
									class="progress-fill"
									class:warning={pct >= 0.75 && pct < 1}
									class:danger={pct >= 1}
									style="width: {Math.min(pct * 100, 100)}%"
								></div>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Expense list -->
			{#if periodExpenses.length === 0}
				<p class="empty-msg">No expenses logged for this period.</p>
			{:else}
				<div class="expense-list">
					{#each groupedExpenses as { date, expenses }}
						<div class="date-group">
							<div class="date-label">{fmtDate(date)}</div>
							{#each expenses as expense (expense.id)}
								{@const remover = removeExpense.for(expense.id)}
								<div class="expense-row">
									<div class="expense-info">
										<span class="expense-desc">{expense.description}</span>
										{#if expense.categoryId}
											<span class="category-chip">{categoryMap.get(expense.categoryId) ?? 'Other'}</span>
										{:else}
											<span class="category-chip other">Other</span>
										{/if}
									</div>
									<div class="expense-right">
										<span class="expense-amount">{fmt(expense.amount)}</span>
										<form
											action={remover.action}
											{...remover.enhance((ctx) => {
												store.removeExpenseHandler(expense.id)(ctx);
											})}
											class="delete-form"
										>
											<input type="hidden" name="id" value={expense.id} />
											<button type="submit" class="delete-btn" aria-label="Remove expense">×</button>
										</form>
									</div>
								</div>
							{/each}
						</div>
					{/each}

					<div class="period-total">
						<span>Total</span>
						<span>{fmt(periodTotal)}</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Add expense form -->
		<form
			action={addExpense.action}
			{...addExpense.enhance((ctx) => {
				const desc = expDesc.trim();
				const dollars = parseFloat(expAmount);
				if (!desc || isNaN(dollars) || dollars <= 0 || !expDate) return;
				const optimistic: Expense = {
					id: pendingExpenseId,
					budgetId: budget?.id ?? '',
					amount: Math.round(dollars * 100),
					description: desc,
					date: expDate,
					categoryId: expCategoryId || null,
					createdById: '',
					createdAt: new Date()
				};
				store.addExpenseHandler(optimistic)(ctx);
				expDesc = '';
				expAmount = '';
				expDate = todaySydney();
				expCategoryId = '';
				pendingExpenseId = crypto.randomUUID();
			})}
			class="expense-add-bar"
		>
			<input type="hidden" name="budget_id" value={budget?.id ?? ''} />
			<input type="hidden" name="id" value={pendingExpenseId} />
			<div class="expense-add-row">
				<input
					class="input exp-desc"
					type="text"
					name="description"
					placeholder="Description"
					bind:value={expDesc}
					required
					autocomplete="off"
				/>
				<div class="amount-wrap">
					<span class="dollar-sign">$</span>
					<input
						class="input exp-amount"
						type="number"
						name="amount"
						placeholder="0.00"
						step="0.01"
						min="0.01"
						bind:value={expAmount}
						required
					/>
				</div>
			</div>
			<div class="expense-add-row">
				<input
					class="input exp-date"
					type="date"
					name="date"
					bind:value={expDate}
					required
				/>
				<select class="input exp-category" name="category_id" bind:value={expCategoryId}>
					<option value="">Other</option>
					{#each store.allocations as a}
						<option value={a.id}>{a.name}</option>
					{/each}
				</select>
				<button type="submit" class="btn-primary add-exp-btn">Add</button>
			</div>
		</form>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	/* Header */
	.page-header {
		flex: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4);
		border-bottom: 1px solid var(--color-border);
	}

	.page-header h1 {
		font-family: var(--font-heading);
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-semibold);
		margin: 0;
	}

	/* Tab toggle */
	.tab-toggle {
		display: flex;
		gap: var(--space-1);
		background: var(--color-surface-sunken);
		border-radius: var(--radius-md);
		padding: 2px;
	}

	.tab-btn {
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-sm);
		border: none;
		background: transparent;
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-standard),
		            color var(--duration-fast) var(--ease-standard);
	}

	.tab-btn.active {
		background: var(--color-surface);
		color: var(--color-text);
		font-weight: var(--font-weight-medium);
		box-shadow: var(--shadow-sm);
	}

	/* Scroll area */
	.scroll-area {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	/* Summary card */
	.summary-card {
		background: var(--color-surface-raised);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		box-shadow: var(--shadow-sm);
	}

	.summary-title {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-muted);
		letter-spacing: var(--letter-spacing-wide);
		text-transform: uppercase;
		margin: 0 0 var(--space-3) 0;
	}

	.summary-rows {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.summary-row.net {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
	}

	.summary-divider {
		height: 1px;
		background: var(--color-border);
		margin: var(--space-1) 0;
	}

	.amount { font-variant-numeric: tabular-nums; }
	.amount.income { color: var(--color-success); }
	.amount.outgoing { color: var(--color-text-muted); }
	.amount.danger { color: var(--color-danger); }

	/* Plan sections */
	.plan-section {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.section-title {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-muted);
		letter-spacing: var(--letter-spacing-wide);
		text-transform: uppercase;
		margin: 0;
	}

	.add-btn {
		width: var(--space-6);
		height: var(--space-6);
		border-radius: var(--radius-full);
		border: 1px solid var(--color-border);
		background: var(--color-surface-sunken);
		color: var(--color-text-muted);
		font-size: var(--font-size-md);
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background var(--duration-fast) var(--ease-standard);
	}

	.add-btn:hover {
		background: var(--color-border);
		color: var(--color-text);
	}

	.empty-msg {
		padding: var(--space-4);
		color: var(--color-text-subtle);
		font-size: var(--font-size-sm);
		margin: 0;
	}

	/* Item list */
	.item-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.item-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--color-border-subtle);
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-standard);
	}

	.item-row:hover {
		background: var(--color-surface-sunken);
	}

	.item-edit {
		position: relative;
		border-bottom: 1px solid var(--color-border-subtle);
		background: var(--color-surface-sunken);
	}

	.item-edit > form:first-child {
		padding: var(--space-3) var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.item-delete-form {
		position: absolute;
		right: var(--space-4);
		bottom: var(--space-3);
	}

	.edit-hint {
		color: var(--color-text-subtle);
		font-size: var(--font-size-md);
		margin-left: auto;
	}

	.item-row:last-child,
	.item-edit:last-child {
		border-bottom: none;
	}

	.item-name {
		flex: 1;
		font-size: var(--font-size-base);
	}

	.item-meta {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.freq {
		color: var(--color-text-subtle);
		margin-left: var(--space-1);
	}

	/* Inline add form */
	.inline-add-form {
		padding: var(--space-3) var(--space-4);
		border-top: 1px solid var(--color-border-subtle);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		background: var(--color-surface-sunken);
	}

	.add-row {
		display: flex;
		gap: var(--space-2);
	}

	.add-actions {
		display: flex;
		gap: var(--space-2);
	}

	/* Inputs */
	.input {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-3);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		color: var(--color-text);
		outline: none;
	}

	.input:focus {
		border-color: var(--color-focus-ring);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-focus-ring) 20%, transparent);
	}

	.name-input { flex: 2; min-width: 0; }

	.amount-wrap {
		position: relative;
		display: flex;
		align-items: center;
		flex: 1;
		min-width: 0;
	}

	.dollar-sign {
		position: absolute;
		left: var(--space-3);
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		pointer-events: none;
	}

	.amount-input,
	.exp-amount {
		padding-left: var(--space-6);
		width: 100%;
	}

	.freq-select { flex: 1; min-width: 0; }

	/* Buttons */
	.btn-primary {
		background: var(--color-primary);
		color: var(--color-primary-text);
		border: none;
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-4);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-standard);
	}

	.btn-primary:hover { background: var(--color-primary-hover); }

	.btn-ghost {
		background: transparent;
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-3);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		cursor: pointer;
	}

	.btn-danger {
		background: transparent;
		color: var(--color-danger);
		border: 1px solid var(--color-danger);
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-3);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		cursor: pointer;
	}

	/* Delete button */
	.delete-form { display: contents; }

	.delete-btn {
		background: transparent;
		border: none;
		color: var(--color-text-subtle);
		font-size: var(--font-size-md);
		line-height: 1;
		cursor: pointer;
		padding: var(--space-1);
		border-radius: var(--radius-sm);
		opacity: 0;
		transition: opacity var(--duration-fast) var(--ease-standard),
		            color var(--duration-fast) var(--ease-standard);
	}

	.expense-row:hover .delete-btn,
	.expense-row:focus-within .delete-btn {
		opacity: 1;
	}

	.delete-btn:hover { color: var(--color-danger); }

	/* Log view */
	.period-selects {
		display: flex;
		gap: var(--space-2);
	}

	.period-select {
		flex: 1;
		cursor: pointer;
	}

	.period-select.active {
		border-color: var(--color-primary);
		font-weight: var(--font-weight-medium);
	}

	/* Surplus bar */
	.surplus-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.surplus-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.surplus-label {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-muted);
		letter-spacing: var(--letter-spacing-wide);
		text-transform: uppercase;
	}

	.surplus-amount {
		font-size: var(--font-size-sm);
		font-variant-numeric: tabular-nums;
		color: var(--color-text);
	}

	.surplus-amount.warning { color: var(--color-warning); }
	.surplus-amount.danger  { color: var(--color-danger); }

	.surplus-track {
		height: var(--space-4);
		background: var(--color-border);
		border-radius: var(--radius-full);
		position: relative;
		overflow: hidden;
	}

	.surplus-fill {
		height: 100%;
		background: var(--color-success);
		border-radius: var(--radius-full);
		transition: width var(--duration-base) var(--ease-out);
	}

	.surplus-fill.warning { background: var(--color-warning); }
	.surplus-fill.danger  { background: var(--color-danger); }

	.surplus-marker {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		transform: translateX(-50%);
		z-index: var(--z-base);
	}

	.surplus-marker.allocations { background: var(--color-text); opacity: 0.6; }
	.surplus-marker.savings     { background: var(--color-accent); }

	.surplus-legend {
		display: flex;
		gap: var(--space-4);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.legend-pip {
		width: var(--space-2);
		height: var(--space-4);
		border-radius: 1px;
		flex-shrink: 0;
	}

	.legend-pip.allocations { background: var(--color-text); opacity: 0.6; }
	.legend-pip.savings     { background: var(--color-accent); }

	/* Progress bars */
	.progress-section {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.progress-row { display: flex; flex-direction: column; gap: var(--space-2); }

	.progress-labels {
		display: flex;
		justify-content: space-between;
		font-size: var(--font-size-sm);
	}

	.progress-name { font-weight: var(--font-weight-medium); }

	.progress-amounts {
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
	}

	.of { color: var(--color-text-subtle); }

	.progress-track {
		height: var(--space-2);
		background: var(--color-border);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-success);
		border-radius: var(--radius-full);
		transition: width var(--duration-base) var(--ease-out);
	}

	.progress-fill.warning { background: var(--color-warning); }
	.progress-fill.danger  { background: var(--color-danger); }

	/* Expense list */
	.expense-list {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.date-group { border-bottom: 1px solid var(--color-border-subtle); }
	.date-group:last-of-type { border-bottom: none; }

	.date-label {
		padding: var(--space-2) var(--space-4);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-subtle);
		letter-spacing: var(--letter-spacing-wide);
		text-transform: uppercase;
		background: var(--color-surface-sunken);
	}

	.expense-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.expense-row:last-child { border-bottom: none; }

	.expense-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.expense-desc {
		font-size: var(--font-size-base);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.category-chip {
		display: inline-block;
		font-size: var(--font-size-xs);
		padding: 1px var(--space-2);
		border-radius: var(--radius-full);
		background: var(--color-info-bg);
		color: var(--color-info-text);
		width: fit-content;
	}

	.category-chip.other {
		background: var(--color-border);
		color: var(--color-text-muted);
	}

	.expense-right {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.expense-amount {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-medium);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.period-total {
		display: flex;
		justify-content: space-between;
		padding: var(--space-3) var(--space-4);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-muted);
		border-top: 1px solid var(--color-border);
	}

	/* Add expense form */
	.expense-add-bar {
		flex: none;
		border-top: 1px solid var(--color-border);
		background: var(--color-surface);
		padding: var(--space-3) var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.expense-add-row {
		display: flex;
		gap: var(--space-2);
	}

	.exp-desc { flex: 2; min-width: 0; }
	.exp-date { flex: 1; min-width: 0; }
	.exp-category { flex: 1; min-width: 0; }
	.add-exp-btn { flex: none; }
</style>
