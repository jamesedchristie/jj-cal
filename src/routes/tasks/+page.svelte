<script lang="ts">
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import { INTERVAL_LABELS, RECURRENCE_INTERVALS } from '$lib/recurrence';
	import { sortable } from '$lib/sortable';
	import { tick } from 'svelte';
	import {
		addItem,
		editItem,
		getTodoLists,
		getUsers,
		removeItem,
		reorderItems,
		toggleItem
	} from './data.remote';
	import { createTasksStore } from './tasks-store.svelte';

	// 'mine' = tasks assigned to me or unassigned ones I created
	// 'all'  = every task in every accessible todo list
	let viewMode = $state<'mine' | 'all'>('mine');

	const store = createTasksStore(() => viewMode);
	const incomplete = $derived(store.incomplete);
	const recentlyCompleted = $derived(store.recentlyCompleted);
	const archivedCompleted = $derived(store.archivedCompleted);

	const todoLists = $derived(await getTodoLists());
	const users = $derived(await getUsers());

	// Default add-form target: the user's first owned list (or first accessible)
	let selectedListId = $state<string | null>(null);
	let effectiveListId = $derived(selectedListId ?? todoLists[0]?.id ?? '');
	let effectiveListName = $derived(todoLists.find((l) => l.id === effectiveListId)?.name ?? '');
	let newItemId = $state(crypto.randomUUID());

	// Today's date in Sydney time as YYYY-MM-DD
	const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(
		new Date()
	);

	let selectedAssigneeId = $state<string | null>(null);
	let selectedRecurrence = $state('');
	let showMeta = $state(false);
	let textInputEl = $state<HTMLInputElement | undefined>();
	let listEl = $state<HTMLUListElement | undefined>();
	let editingId = $state<string | null>(null);
	let editInputEl = $state<HTMLInputElement | undefined>();
	let reorderFormEl = $state<HTMLFormElement>();
	let reorderIds = $state('');

	function handleItemsReorder(ids: string[]) {
		reorderIds = ids.join(',');
		tick().then(() => reorderFormEl?.requestSubmit());
	}

	$effect(() => {
		if (editingId !== null) tick().then(() => editInputEl?.select());
	});

	function formatDueDate(due: string): string {
		if (due === today) return 'Today';
		const d = new Date(due + 'T00:00:00');
		return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
	}

	function dueDateStatus(due: string): 'overdue' | 'today' | 'upcoming' {
		if (due < today) return 'overdue';
		if (due === today) return 'today';
		return 'upcoming';
	}

	function userById(id: string | null) {
		if (!id) return null;
		return users.find((u) => u.id === id) ?? null;
	}
</script>

<div class="page">
	<div class="page-header">
		<h1>Tasks</h1>
		<div class="view-toggle">
			<button
				type="button"
				class="toggle-btn"
				class:active={viewMode === 'mine'}
				onclick={() => (viewMode = 'mine')}>Mine</button
			>
			<button
				type="button"
				class="toggle-btn"
				class:active={viewMode === 'all'}
				onclick={() => (viewMode = 'all')}>All</button
			>
		</div>
	</div>

	<form
		bind:this={reorderFormEl}
		{...reorderItems.enhance((ctx) =>
			store.reorderHandler()({ ...ctx, data: { ids: reorderIds } })
		)}
		style="display:none"
	>
		<input type="hidden" name="ids" value={reorderIds} />
	</form>

	<div class="scroll-area">
		<ul class="todo-list" bind:this={listEl} {@attach sortable({ onReorder: handleItemsReorder })}>
			{#each incomplete as item (item.id)}
				{@const status = item.dueDate ? dueDateStatus(item.dueDate) : null}
				{@const assignee = userById(item.assignedToId ?? null)}
				<li data-id={item.id} class:overdue={status === 'overdue'}>
					<span class="drag-handle" aria-hidden="true">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="currentColor"
							aria-hidden="true"
							><circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" /><circle
								cx="9"
								cy="12"
								r="1.5"
							/><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="19" r="1.5" /><circle
								cx="15"
								cy="19"
								r="1.5"
							/></svg
						>
					</span>
					<form {...toggleItem.for(item.id).enhance(store.toggleHandler(item.id, true))}>
						<input {...toggleItem.for(item.id).fields.id.as('hidden', item.id)} />
						<input {...toggleItem.for(item.id).fields.completed.as('hidden', 'true')} />
						<button type="submit" class="check" aria-label="Mark complete">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="10" />
							</svg>
						</button>
					</form>
					{#if editingId === item.id}
						<form
							{...editItem.enhance((ctx) => {
								const input = ctx.form.elements.namedItem('text') as HTMLInputElement | null;
								const newText = input?.value.trim() ?? '';
								if (!newText || newText === item.text) {
									editingId = null;
									return;
								}
								store.editHandler(item.id, newText)(ctx);
								editingId = null;
							})}
							class="text-edit-form"
						>
							<input {...editItem.fields.id.as('hidden', item.id)} />
							<input
								bind:this={editInputEl}
								{...editItem.fields.text.as('text')}
								value={item.text}
								class="text-edit"
								autocapitalize="sentences"
								onkeydown={(e) => {
									if (e.key === 'Escape') editingId = null;
								}}
								onblur={(e) => {
									const v = e.currentTarget.value.trim();
									if (v && v !== item.text) e.currentTarget.form?.requestSubmit();
									else editingId = null;
								}}
							/>
						</form>
					{:else}
						<span
							class="text editable"
							role="button"
							tabindex="0"
							onclick={() => (editingId = item.id)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') editingId = item.id;
							}}>{item.text}</span
						>
					{/if}
					{#if viewMode === 'all' && item.listName}
						<span class="list-chip">{item.listName}</span>
					{/if}
					{#if item.dueDate}
						<span class="due-chip {status}">{formatDueDate(item.dueDate)}</span>
					{/if}
					{#if item.recurrenceInterval}
						<span class="recurrence-chip">{INTERVAL_LABELS[item.recurrenceInterval]}</span>
					{/if}
					{#if assignee}
						<span class="assignee-chip">
							<UserAvatar
								name={assignee.name}
								displayName={assignee.displayName}
								colour={assignee.colour}
								size="sm"
							/>
						</span>
					{/if}
					<form {...removeItem.for(item.id).enhance(store.removeHandler(item.id))}>
						<input {...removeItem.for(item.id).fields.id.as('hidden', item.id)} />
						<button type="submit" class="delete" aria-label="Delete task">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					</form>
				</li>
			{/each}
		</ul>

		{#if recentlyCompleted.length > 0}
			<details class="completed-section">
				<summary>{recentlyCompleted.length} completed</summary>
				<ul class="todo-list completed">
					{#each recentlyCompleted as item (item.id)}
						{@const assignee = userById(item.assignedToId ?? null)}
						<li>
							<form {...toggleItem.for(item.id).enhance(store.toggleHandler(item.id, false))}>
								<input {...toggleItem.for(item.id).fields.id.as('hidden', item.id)} />
								<input {...toggleItem.for(item.id).fields.completed.as('hidden', 'false')} />
								<button type="submit" class="check done" aria-label="Mark incomplete">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"
									>
										<circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-5" />
									</svg>
								</button>
							</form>
							<span class="text">{item.text}</span>
							{#if assignee}
								<span class="assignee-chip">
									<UserAvatar
										name={assignee.name}
										displayName={assignee.displayName}
										colour={assignee.colour}
										size="sm"
									/>
								</span>
							{/if}
							<form {...removeItem.for(item.id).enhance(store.removeHandler(item.id))}>
								<input {...removeItem.for(item.id).fields.id.as('hidden', item.id)} />
								<button type="submit" class="delete" aria-label="Delete task">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"
									>
										<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
									</svg>
								</button>
							</form>
						</li>
					{/each}
				</ul>
			</details>
		{/if}

		{#if archivedCompleted.length > 0}
			<details class="completed-section archived-section">
				<summary>{archivedCompleted.length} archived</summary>
				<ul class="todo-list completed">
					{#each archivedCompleted as item (item.id)}
						{@const assignee = userById(item.assignedToId ?? null)}
						<li>
							<form {...toggleItem.for(item.id).enhance(store.toggleHandler(item.id, false))}>
								<input {...toggleItem.for(item.id).fields.id.as('hidden', item.id)} />
								<input {...toggleItem.for(item.id).fields.completed.as('hidden', 'false')} />
								<button type="submit" class="check done" aria-label="Mark incomplete">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"
									>
										<circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-5" />
									</svg>
								</button>
							</form>
							<span class="text">{item.text}</span>
							{#if assignee}
								<span class="assignee-chip">
									<UserAvatar
										name={assignee.name}
										displayName={assignee.displayName}
										colour={assignee.colour}
										size="sm"
									/>
								</span>
							{/if}
							<form {...removeItem.enhance(store.removeHandler(item.id))}>
								<input {...removeItem.fields.id.as('hidden', item.id)} />
								<button type="submit" class="delete" aria-label="Delete task">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"
									>
										<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
									</svg>
								</button>
							</form>
						</li>
					{/each}
				</ul>
			</details>
		{/if}
	</div>

	<form
		{...addItem.enhance((ctx) => {
			const textInput = ctx.form.elements.namedItem('text') as HTMLInputElement | null;
			const dueInput = ctx.form.elements.namedItem('due_date') as HTMLInputElement | null;
			const text = textInput?.value.trim() ?? '';
			if (!text) return;
			store.addHandler({
				id: newItemId,
				listId: effectiveListId,
				listName: effectiveListName,
				text,
				dueDate: dueInput?.value || null,
				assignedToId: selectedAssigneeId,
				recurrenceInterval: (selectedRecurrence || null) as any
			})(ctx);
			ctx.form.reset();
			selectedAssigneeId = null;
			selectedRecurrence = '';
			showMeta = false;
			newItemId = crypto.randomUUID();
			tick().then(() => {
				requestAnimationFrame(() =>
					listEl?.scrollTo({ top: listEl.scrollHeight, behavior: 'smooth' })
				);
				textInputEl?.focus();
			});
		})}
		class="add-form"
	>
		<input type="hidden" name="id" value={newItemId} />
		<input {...addItem.fields.list_id.as('hidden', effectiveListId)} />
		<div class="add-row">
			<input
				bind:this={textInputEl}
				{...addItem.fields.text.as('text')}
				placeholder="Add a task…"
				autocomplete="off"
				autocapitalize="sentences"
			/>
			<button
				type="button"
				class="meta-toggle"
				class:active={showMeta}
				onclick={() => (showMeta = !showMeta)}
				aria-label="More options"
				aria-expanded={showMeta}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle
						cx="19"
						cy="12"
						r="1"
					/>
				</svg>
			</button>
			<button type="submit" aria-label="Add task">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
			</button>
		</div>

		{#if showMeta}
			{#if todoLists.length > 1}
				<div class="add-meta add-list">
					<span class="meta-label">List</span>
					<div class="list-row">
						{#each todoLists as l (l.id)}
							<button
								type="button"
								class="list-btn"
								class:selected={effectiveListId === l.id}
								onclick={() => (selectedListId = l.id)}>{l.name}</button
							>
						{/each}
					</div>
				</div>
			{/if}

			{#if users.length > 0}
				<div class="add-meta add-assignee">
					{#if selectedAssigneeId}
						<input {...addItem.fields.assigned_to_id.as('hidden', selectedAssigneeId)} />
					{/if}
					<span class="meta-label">Assign</span>
					<div class="assignee-row">
						{#each users as u (u.id)}
							<button
								type="button"
								class="assignee-btn"
								class:selected={selectedAssigneeId === u.id}
								title={u.displayName ?? u.name}
								onclick={() => {
									selectedAssigneeId = selectedAssigneeId === u.id ? null : u.id;
								}}
							>
								<UserAvatar name={u.name} displayName={u.displayName} colour={u.colour} size="sm" />
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<div class="add-meta">
				<label class="due-label">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<rect x="3" y="4" width="18" height="18" rx="2" />
						<line x1="16" y1="2" x2="16" y2="6" />
						<line x1="8" y1="2" x2="8" y2="6" />
						<line x1="3" y1="10" x2="21" y2="10" />
					</svg>
					<input {...addItem.fields.due_date.as('date')} />
				</label>
			</div>

			<div class="add-meta add-recurrence">
				{#if selectedRecurrence}
					<input {...addItem.fields.recurrence_interval.as('hidden', selectedRecurrence)} />
				{/if}
				<span class="meta-label">Repeat</span>
				<div class="recurrence-row">
					{#each RECURRENCE_INTERVALS as interval (interval)}
						<button
							type="button"
							class="recurrence-btn"
							class:selected={selectedRecurrence === interval}
							onclick={() => {
								selectedRecurrence = selectedRecurrence === interval ? '' : interval;
							}}>{INTERVAL_LABELS[interval]}</button
						>
					{/each}
				</div>
			</div>
		{/if}
	</form>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.page-header {
		flex: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-4) var(--space-2);
	}

	h1 {
		font-size: var(--font-size-lg);
		font-family: var(--font-heading);
		font-weight: var(--font-weight-bold);
	}

	.view-toggle {
		display: flex;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.toggle-btn {
		background: none;
		border: none;
		padding: var(--space-1) var(--space-3);
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-text-muted);
		cursor: pointer;
		transition:
			background var(--duration-fast) var(--ease-standard),
			color var(--duration-fast) var(--ease-standard);

		&.active {
			background: var(--color-primary);
			color: var(--color-primary-text);
		}
	}

	.add-form {
		flex: none;
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: var(--space-2) var(--space-4) var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
		background: var(--color-surface);
	}

	.meta-toggle {
		flex: none;
		background: none;
		border: none;
		padding: 0 var(--space-2);
		cursor: pointer;
		color: var(--color-text-subtle);
		display: flex;
		align-items: center;
		transition: color var(--duration-fast) var(--ease-standard);

		svg {
			width: var(--space-5);
			height: var(--space-5);
		}

		&:hover,
		&.active {
			color: var(--color-text-muted);
		}
	}

	.add-row {
		display: flex;

		input {
			flex: 1;
			border: none;
			outline: none;
			padding: var(--space-3) var(--space-4);
			font-size: var(--font-size-base);
			font-family: var(--font-body);
			background: transparent;
			color: var(--color-text);

			&::placeholder {
				color: var(--color-text-subtle);
			}
		}

		button {
			flex: none;
			background: var(--color-primary);
			border: none;
			color: var(--color-primary-text);
			width: var(--space-10);
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: background var(--duration-fast) var(--ease-standard);

			svg {
				width: var(--size-icon-sm);
				height: var(--size-icon-sm);
			}

			&:active {
				background: var(--color-primary-hover);
			}
		}
	}

	.add-meta {
		border-top: 1px solid var(--color-border-subtle);
		padding: var(--space-1) var(--space-3);
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.add-assignee,
	.add-list,
	.add-recurrence {
		padding: var(--space-2) var(--space-3);
	}

	.meta-label {
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-text-subtle);
		white-space: nowrap;
	}

	.list-row,
	.assignee-row,
	.recurrence-row {
		display: flex;
		gap: var(--space-1);
		flex-wrap: wrap;
	}

	.list-btn {
		background: var(--color-surface-sunken);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		padding: var(--space-1) var(--space-2);
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-text-muted);
		cursor: pointer;
		transition:
			background var(--duration-fast) var(--ease-standard),
			color var(--duration-fast) var(--ease-standard);

		&.selected {
			background: var(--color-primary);
			border-color: var(--color-primary);
			color: var(--color-primary-text);
		}
	}

	.assignee-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		border-radius: var(--radius-full);
		outline: none;
		opacity: 0.5;
		transition:
			opacity var(--duration-fast) var(--ease-standard),
			box-shadow var(--duration-fast) var(--ease-standard);

		&:hover {
			opacity: 0.85;
		}

		&.selected {
			opacity: 1;
			box-shadow: 0 0 0 2px var(--color-text);
			border-radius: var(--radius-full);
		}
	}

	.due-label {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--color-text-subtle);
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		cursor: pointer;

		svg {
			width: var(--size-icon-sm);
			height: var(--size-icon-sm);
			flex: none;
		}

		input[type='date'] {
			border: none;
			outline: none;
			font-size: var(--font-size-xs);
			font-family: var(--font-body);
			color: var(--color-text-muted);
			background: transparent;
			cursor: pointer;
			padding: 0;

			&::-webkit-calendar-picker-indicator {
				display: none;
			}
		}
	}

	.recurrence-btn {
		background: var(--color-surface-sunken);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		padding: var(--space-1) var(--space-2);
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-text-muted);
		cursor: pointer;
		transition:
			background var(--duration-fast) var(--ease-standard),
			color var(--duration-fast) var(--ease-standard),
			border-color var(--duration-fast) var(--ease-standard);

		&:hover {
			background: var(--color-surface-raised);
			color: var(--color-text);
		}

		&.selected {
			background: var(--color-primary);
			border-color: var(--color-primary);
			color: var(--color-primary-text);
		}
	}

	.scroll-area {
		flex: 1;
		overflow-y: auto;
		padding-bottom: var(--space-4);
		display: flex;
		flex-direction: column;
	}

	.todo-list {
		flex: 1;
		padding: 0 var(--space-4) var(--space-3);
		display: flex;
		flex-direction: column;
		gap: 2px;

		li {
			display: flex;
			align-items: center;
			gap: var(--space-2);
			padding: var(--space-2);
			border-radius: var(--radius-md);
		}
	}

	.check {
		flex: none;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: var(--color-border-strong);
		display: flex;
		align-items: center;
		transition: color var(--duration-fast) var(--ease-standard);

		svg {
			width: var(--space-6);
			height: var(--space-6);
		}

		&:hover {
			color: var(--color-text-muted);
		}

		&.done {
			color: var(--color-success);

			&:hover {
				color: var(--color-accent);
			}
		}
	}

	.text {
		flex: 1;
		font-size: var(--font-size-base);
		font-family: var(--font-body);
		line-height: var(--line-height-normal);
		color: var(--color-text);

		&.editable {
			cursor: text;
		}

		.completed & {
			text-decoration: line-through;
			color: var(--color-text-subtle);
		}
	}

	.text-edit-form {
		flex: 1;
		display: flex;
	}

	.text-edit {
		flex: 1;
		border: none;
		outline: none;
		padding: 0;
		font-size: var(--font-size-base);
		font-family: var(--font-body);
		line-height: var(--line-height-normal);
		color: var(--color-text);
		background: transparent;
		min-width: 0;
	}

	.list-chip {
		flex: none;
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		background: var(--color-surface-sunken);
		color: var(--color-text-subtle);
		white-space: nowrap;
	}

	.due-chip {
		flex: none;
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		font-weight: var(--font-weight-medium);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		white-space: nowrap;

		&.overdue {
			background: var(--color-danger-bg);
			color: var(--color-danger-text);
		}

		&.today {
			background: var(--color-warning-bg);
			color: var(--color-warning-text);
		}

		&.upcoming {
			background: var(--color-surface-sunken);
			color: var(--color-text-muted);
		}
	}

	.assignee-chip {
		flex: none;
		display: flex;
		align-items: center;
	}

	li.overdue > .check {
		color: var(--color-danger);
		opacity: 0.6;
	}

	.delete {
		flex: none;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: var(--color-border);
		display: flex;
		align-items: center;
		opacity: 0;
		transition:
			opacity var(--duration-fast) var(--ease-standard),
			color var(--duration-fast) var(--ease-standard);

		svg {
			width: var(--size-icon-sm);
			height: var(--size-icon-sm);
		}

		&:hover {
			color: var(--color-danger);
		}
	}

	li:hover .delete,
	li:focus-within .delete {
		opacity: 1;
	}

	.recurrence-chip {
		flex: none;
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		font-weight: var(--font-weight-medium);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		white-space: nowrap;
		background: var(--color-surface-sunken);
		color: var(--color-text-subtle);
	}

	.completed-section {
		margin-top: var(--space-8);
		padding: var(--space-2) var(--space-4) 0;

		summary {
			cursor: pointer;
			font-size: var(--font-size-sm);
			font-family: var(--font-body);
			color: var(--color-text-subtle);
			padding: var(--space-2) 0;
			user-select: none;
		}

		.todo-list {
			padding: 0;
			margin-top: var(--space-1);
		}
	}

	.archived-section summary {
		font-size: var(--font-size-xs);
		color: var(--color-text-subtle);
		opacity: 0.7;
	}

	.drag-handle {
		flex: none;
		display: flex;
		align-items: center;
		color: var(--color-border);
		cursor: grab;
		touch-action: none;
		opacity: 0;
		transition: opacity var(--duration-fast) var(--ease-standard);

		svg {
			width: var(--space-4);
			height: var(--space-4);
		}
	}

	li:hover .drag-handle,
	li:focus-within .drag-handle {
		opacity: 1;
	}

	@media (pointer: coarse) {
		.drag-handle,
		.delete {
			opacity: 1;
		}
	}

	:global(.drag-ghost) {
		opacity: 0.4;
	}

	:global(.drag-chosen) {
		background: var(--color-surface-raised);
		border-radius: var(--radius-md);
	}
</style>
