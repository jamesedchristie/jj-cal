<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getToastService, ToastMessage } from '$lib/components/toast/toastService.svelte';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import { INTERVAL_LABELS, RECURRENCE_INTERVALS, type RecurrenceInterval } from '$lib/recurrence';
	import { tick } from 'svelte';
	import {
		addItem,
		editItem,
		getList,
		getUsers,
		removeItem,
		reorderItems,
		renameList,
		toggleItem
	} from './data.remote';
	import { sortable } from '$lib/sortable';
	import { createListStore } from './list-store.svelte';

	const toastService = getToastService();

	const list = $derived(await getList());
	const users = $derived(await getUsers());

	const store = createListStore(page.params.listId!);

	const showDueDate = $derived(list.type !== 'shopping');
	const canEdit = $derived(list.role === 'owner' || list.role === 'editor');

	const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(
		new Date()
	);

	let selectedAssigneeId = $state<string | null>(null);
	let selectedRecurrence = $state<RecurrenceInterval | ''>('');
	let showMeta = $state(false);
	let textInputEl = $state<HTMLInputElement | undefined>();
	let scrollAreaEl = $state<HTMLElement | undefined>();
	let listEl = $state<HTMLUListElement | undefined>();
	let addFormEl = $state<HTMLFormElement | undefined>();
	let inputText = $state('');
	// Regenerated after each add so the server receives the same id the optimistic
	// override applies, keeping the upsert idempotent across refresh.
	let newItemId = $state(crypto.randomUUID());

	const suggestions = $derived.by(() => {
		const q = inputText.trim().toLowerCase();
		if (!q || list.type === 'todo') return [];
		const seen = new Set<string>();
		const out: string[] = [];
		for (const item of store.items) {
			const t = item.text.toLowerCase();
			if (t.startsWith(q) && !seen.has(t)) {
				seen.add(t);
				out.push(item.text);
				if (out.length >= 5) break;
			}
		}
		return out;
	});
	let editingId = $state<string | null>(null);
	let editInputEl = $state<HTMLInputElement | undefined>();
	let editingListName = $state(false);
	let listNameInputEl = $state<HTMLInputElement | undefined>();
	let reorderFormEl = $state<HTMLFormElement>();
	let reorderIds = $state('');

	function handleItemsReorder(ids: string[]) {
		reorderIds = ids.join(',');
		tick().then(() => reorderFormEl?.requestSubmit());
	}

	$effect(() => {
		if (editingId !== null) tick().then(() => editInputEl?.select());
	});

	$effect(() => {
		if (editingListName)
			tick().then(() => {
				listNameInputEl?.select();
			});
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
		{#if editingListName && canEdit}
			<form
				{...renameList.enhance(async ({ form, submit }) => {
					const ok = await submit();
					if (ok) editingListName = false;
					else toastService().show(new ToastMessage('Failed to rename list', { type: 'error' }));
				})}
				class="rename-form"
			>
				<input
					bind:this={listNameInputEl}
					{...renameList.fields.name.as('text')}
					value={list.name}
					class="rename-input"
					autocapitalize="sentences"
					onkeydown={(e) => {
						if (e.key === 'Escape') editingListName = false;
					}}
					onblur={(e) => {
						const v = e.currentTarget.value.trim();
						if (v && v !== list.name) e.currentTarget.form?.requestSubmit();
						else editingListName = false;
					}}
				/>
			</form>
		{:else}
			<h1>
				{list.name}{#if canEdit}<button
						class="rename-btn"
						type="button"
						aria-label="Rename list"
						onclick={() => (editingListName = true)}
						><svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
							><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path
								d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
							/></svg
						></button
					>{/if}
			</h1>
		{/if}
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

	<div class="scroll-area" bind:this={scrollAreaEl}>
		<ul
			class="item-list"
			bind:this={listEl}
			{@attach sortable({ onReorder: handleItemsReorder, disabled: !canEdit })}
		>
			{#each store.incomplete as item (item.id)}
				{@const toggle = toggleItem.for(item.id)}
				{@const remove = removeItem.for(item.id)}
				{@const status = item.dueDate ? dueDateStatus(item.dueDate) : null}
				{@const assignee = userById(item.assignedToId ?? null)}
				<li data-id={item.id} class:overdue={status === 'overdue'}>
					{#if canEdit}
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
					{/if}
					<form {...toggle.enhance(store.toggleHandler(item.id, true))}>
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
					{#if editingId === item.id && canEdit}
						{@const edit = editItem.for(item.id)}
						<form
							{...edit.enhance((ctx) => {
								const newText = (new FormData(ctx.form).get('text') as string | null)?.trim() ?? '';
								editingId = null;
								if (!newText || newText === item.text) return;
								store.editHandler(item.id, newText)(ctx);
							})}
							class="text-edit-form"
						>
							<input {...edit.fields.id.as('hidden', item.id)} />
							<input {...edit.fields.list_id.as('hidden', list.id)} />
							<input
								bind:this={editInputEl}
								{...edit.fields.text.as('text')}
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
							class="text"
							class:editable={canEdit}
							role={canEdit ? 'button' : undefined}
							tabindex={canEdit ? 0 : undefined}
							onclick={() => {
								if (canEdit) editingId = item.id;
							}}
							onkeydown={(e) => {
								if (canEdit && (e.key === 'Enter' || e.key === ' ')) editingId = item.id;
							}}>{item.text}</span
						>
					{/if}
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
						<form {...remove.enhance(store.removeHandler(item.id))}>
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

		{#if store.recentlyCompleted.length > 0}
			<details class="completed-section">
				<summary>{store.recentlyCompleted.length} completed</summary>
				<ul class="item-list completed">
					{#each store.recentlyCompleted as item (item.id)}
						{@const toggle = toggleItem.for(`uncomplete-${item.id}`)}
						{@const remove = removeItem.for(`done-${item.id}`)}
						{@const assignee = userById(item.assignedToId ?? null)}
						<li>
							<form {...toggle.enhance(store.toggleHandler(item.id, false))}>
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
							{#if canEdit}
								<form {...remove.enhance(store.removeHandler(item.id))}>
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
											<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
										</svg>
									</button>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			</details>
		{/if}

		{#if store.archivedCompleted.length > 0}
			<details class="completed-section archived-section">
				<summary>{store.archivedCompleted.length} archived</summary>
				<ul class="item-list completed">
					{#each store.archivedCompleted as item (item.id)}
						{@const toggle = toggleItem.for(`unarchive-${item.id}`)}
						{@const remove = removeItem.for(`archive-${item.id}`)}
						{@const assignee = userById(item.assignedToId ?? null)}
						<li>
							<form {...toggle.enhance(store.toggleHandler(item.id, false))}>
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
							{#if canEdit}
								<form {...remove.enhance(store.removeHandler(item.id))}>
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
											<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
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

	{#if canEdit}
		<form
			bind:this={reorderFormEl}
			{...reorderItems.enhance(store.reorderHandler())}
			style="display:none"
		>
			<input {...reorderItems.fields.list_id.as('hidden', list.id)} />
			<input type="hidden" name="ids" value={reorderIds} />
		</form>

		<form
			bind:this={addFormEl}
			{...addItem.enhance(async (ctx) => {
				const fd = new FormData(ctx.form);
				const text = ((fd.get('text') as string | null) ?? '').trim();
				if (!text) return;
				store.addHandler({
					id: newItemId,
					text,
					dueDate: (fd.get('due_date') as string | null) || null,
					assignedToId: (fd.get('assigned_to_id') as string | null) || null,
					recurrenceInterval: ((fd.get('recurrence_interval') as string | null) ||
						null) as RecurrenceInterval | null
				})(ctx);
				newItemId = crypto.randomUUID();
				ctx.form.reset();
				inputText = '';
				selectedAssigneeId = null;
				selectedRecurrence = '';
				showMeta = false;
				await tick();
				requestAnimationFrame(() =>
					scrollAreaEl?.scrollTo({ top: scrollAreaEl.scrollHeight, behavior: 'smooth' })
				);
				textInputEl?.focus();
			})}
			class="add-form"
		>
			<input {...addItem.fields.list_id.as('hidden', list.id)} />
			<input type="hidden" name="id" value={newItemId} />
			<div class="add-row">
				<input
					bind:this={textInputEl}
					bind:value={inputText}
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
							<circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle
								cx="19"
								cy="12"
								r="1"
							/>
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

			{#if suggestions.length > 0}
				<ul class="suggestions">
					{#each suggestions as s (s)}
						<li>
							<button
								type="button"
								class="suggestion"
								onmousedown={(e) => {
									e.preventDefault();
									inputText = s;
									tick().then(() => addFormEl?.requestSubmit());
								}}>{s}</button
							>
						</li>
					{/each}
				</ul>
			{/if}

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

	.scroll-area {
		flex: 1;
		overflow-y: auto;
		padding-bottom: var(--space-4);
	}

	.item-list {
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

	.rename-form {
		flex: 1;
	}

	.rename-input {
		width: 100%;
		border: none;
		outline: none;
		padding: 0;
		font-size: var(--font-size-lg);
		font-family: var(--font-heading);
		font-weight: var(--font-weight-bold);
		color: var(--color-text);
		background: transparent;
	}

	h1 {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.rename-btn {
		flex: none;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: var(--color-text-subtle);
		display: flex;
		align-items: center;
		opacity: 0;
		transition: opacity var(--duration-fast) var(--ease-standard);

		svg {
			width: var(--space-4);
			height: var(--space-4);
		}
	}

	.page-header:hover .rename-btn,
	.page-header:focus-within .rename-btn {
		opacity: 1;
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

		.item-list {
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

	.suggestions {
		border-top: 1px solid var(--color-border-subtle);
	}

	.suggestion {
		display: block;
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		padding: var(--space-2) var(--space-4);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		color: var(--color-text-muted);
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-standard);

		&:hover {
			background: var(--color-surface-raised);
			color: var(--color-text);
		}
	}
</style>
