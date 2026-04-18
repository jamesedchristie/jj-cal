<script lang="ts">
	import { resolve } from '$app/paths';
	import { getToastService, ToastMessage } from '$lib/components/toast/toastService.svelte';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import { INTERVAL_LABELS, isEffectivelyComplete, RECURRENCE_INTERVALS } from '$lib/recurrence';
	import { tick } from 'svelte';
	import { addItem, getItems, getList, getUsers, removeItem, toggleItem } from './data.remote';

	const toastService = getToastService();

	const list = $derived(await getList());
	const allItems = $derived(await getItems());
	const incomplete = $derived(allItems.filter((t) => !isEffectivelyComplete(t)));
	const complete = $derived(allItems.filter((t) => isEffectivelyComplete(t)));
	const users = $derived(await getUsers());

	// Shopping lists don't need due dates
	const showDueDate = $derived(list.type !== 'shopping');
	// Viewers can see items but cannot add/edit/delete
	const canEdit = $derived(list.role === 'owner' || list.role === 'editor');

	// Today's date in Sydney time as YYYY-MM-DD
	const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(
		new Date()
	);

	let selectedAssigneeId = $state<string | null>(null);
	let selectedRecurrence = $state('');
	let showMeta = $state(false);
	let textInputEl = $state<HTMLInputElement | undefined>();
	let listEl = $state<HTMLUListElement | undefined>();

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
		<a href={resolve('/lists')} class="back-link" aria-label="Back to lists">
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
				<polyline points="15 18 9 12 15 6" />
			</svg>
		</a>
		<h1>{list.name}</h1>
		{#if list.role === 'owner'}
			<a href={resolve(`/lists/${list.id}/share`)} class="share-link" aria-label="Manage sharing">
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
					<circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle
						cx="18"
						cy="19"
						r="3"
					/>
					<line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
					<line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
				</svg>
			</a>
		{/if}
	</div>

	<ul class="item-list" bind:this={listEl}>
		{#each incomplete as item (item.id)}
			{@const toggle = toggleItem.for(item.id)}
			{@const remove = removeItem.for(item.id)}
			{@const status = item.dueDate ? dueDateStatus(item.dueDate) : null}
			{@const assignee = userById(item.assignedToId ?? null)}
			<li class:pending={!!toggle.pending || !!remove.pending} class:overdue={status === 'overdue'}>
				<form {...toggle}>
					<input {...toggle.fields.id.as('hidden', item.id)} />
					<input {...toggle.fields.list_id.as('hidden', list.id)} />
					<input {...toggle.fields.completed.as('hidden', 'true')} />
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
				<span class="text">{item.text}</span>
				{#if item.dueDate && showDueDate}
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
				{#if canEdit}
					<form {...remove}>
						<input {...remove.fields.id.as('hidden', item.id)} />
						<input {...remove.fields.list_id.as('hidden', list.id)} />
						<button type="submit" class="delete" aria-label="Delete item">
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
				{/if}
			</li>
		{/each}
	</ul>

	{#if canEdit}
		<form
			{...addItem.enhance(async ({ form, submit }) => {
				const ok = await submit();
				if (ok) {
					form.reset();
					selectedAssigneeId = null;
					selectedRecurrence = '';
					showMeta = false;
					await tick();
					requestAnimationFrame(() => listEl?.scrollTo({ top: listEl.scrollHeight, behavior: 'smooth' }));
					textInputEl?.focus();
				} else {
					toastService().show(new ToastMessage('Failed to add item', { type: 'error' }));
				}
			})}
			class="add-form"
		>
			<input {...addItem.fields.list_id.as('hidden', list.id)} />
			<div class="add-row">
				<input
					bind:this={textInputEl}
					{...addItem.fields.text.as('text')}
					placeholder="Add an item…"
					autocomplete="off"
					autocapitalize="sentences"
				/>
				{#if list.type === 'todo'}
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
							<circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" />
						</svg>
					</button>
				{/if}
				<button type="submit" aria-label="Add item">
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
				{#if users.length > 0}
					<div class="add-meta add-assignee">
						{#if selectedAssigneeId}
							<input {...addItem.fields.assigned_to_id.as('hidden', selectedAssigneeId)} />
						{/if}
						<span class="meta-label">Assign to</span>
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
									<UserAvatar
										name={u.name}
										displayName={u.displayName}
										colour={u.colour}
										size="sm"
									/>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				{#if showDueDate}
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
				{/if}

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
	{/if}

	{#if complete.length > 0}
		<details class="completed-section">
			<summary>{complete.length} completed</summary>
			<ul class="item-list completed">
				{#each complete as item (item.id)}
					{@const toggle = toggleItem.for(`uncomplete-${item.id}`)}
					{@const remove = removeItem.for(`done-${item.id}`)}
					{@const assignee = userById(item.assignedToId ?? null)}
					<li>
						<form {...toggle}>
							<input {...toggle.fields.id.as('hidden', item.id)} />
							<input {...toggle.fields.list_id.as('hidden', list.id)} />
							<input {...toggle.fields.completed.as('hidden', 'false')} />
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
									<circle cx="12" cy="12" r="10" />
									<path d="M8 12l3 3 5-5" />
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
						{#if canEdit}
							<form {...remove}>
								<input {...remove.fields.id.as('hidden', item.id)} />
								<input {...remove.fields.list_id.as('hidden', list.id)} />
								<button type="submit" class="delete" aria-label="Delete item">
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
						{/if}
					</li>
				{/each}
			</ul>
		</details>
	{/if}
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
		gap: var(--space-2);
		padding: var(--space-4) var(--space-4) var(--space-2);

		h1 {
			flex: 1;
		}
	}

	.share-link {
		flex: none;
		display: flex;
		align-items: center;
		color: var(--color-text-muted);
		text-decoration: none;
		transition: color var(--duration-fast) var(--ease-standard);

		svg {
			width: var(--space-5);
			height: var(--space-5);
		}

		&:hover {
			color: var(--color-text);
		}
	}

	.back-link {
		display: flex;
		align-items: center;
		color: var(--color-text-muted);
		text-decoration: none;
		transition: color var(--duration-fast) var(--ease-standard);

		svg {
			width: var(--space-6);
			height: var(--space-6);
		}

		&:hover {
			color: var(--color-text);
		}
	}

	h1 {
		font-size: var(--font-size-lg);
		font-family: var(--font-heading);
		font-weight: var(--font-weight-bold);
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
				width: var(--space-5);
				height: var(--space-5);
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

	.add-assignee {
		padding: var(--space-2) var(--space-3);
	}

	.meta-label {
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-text-subtle);
		white-space: nowrap;
	}

	.assignee-row {
		display: flex;
		gap: var(--space-1);
		flex-wrap: wrap;
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
			width: var(--space-4);
			height: var(--space-4);
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

	.item-list {
		flex: 1;
		overflow-y: auto;
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
			transition: opacity var(--duration-fast) var(--ease-standard);

			&.pending {
				opacity: 0.4;
			}
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

		.completed & {
			text-decoration: line-through;
			color: var(--color-text-subtle);
		}
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
			width: var(--space-5);
			height: var(--space-5);
		}

		&:hover {
			color: var(--color-danger);
		}
	}

	li:hover .delete,
	li:focus-within .delete {
		opacity: 1;
	}

	.add-recurrence {
		padding: var(--space-2) var(--space-3);
	}

	.recurrence-row {
		display: flex;
		gap: var(--space-1);
		flex-wrap: wrap;
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
		flex: none;
		padding: var(--space-2) var(--space-4) var(--space-4);

		summary {
			cursor: pointer;
			font-size: var(--font-size-sm);
			font-family: var(--font-body);
			color: var(--color-text-subtle);
			padding: var(--space-2) 0;
			user-select: none;
		}

		.item-list {
			flex: none;
			overflow: visible;
			padding: 0;
			margin-top: var(--space-1);
		}
	}
</style>
